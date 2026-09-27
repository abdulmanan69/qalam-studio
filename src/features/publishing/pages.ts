import { fontFileUrl, resolveFont } from '@/features/fonts/registry';
import type {
  Artboard,
  Layer,
  ParagraphStyle,
  Project,
  Story,
  TextFrame,
  TextRun,
} from '@/features/projects/schema';
import type { FlowRequest } from '@/features/shaping/client';
import type { FlowFrame, FlowRect, FlowStyle } from '@/features/shaping/flow';
import type { TextLayout } from '@/features/shaping/types';
import { toArabicDigits } from '@/features/symbols/symbols';

import { layerBounds } from '../editor/units';

/**
 * Publishing helpers: pages and their numbers, master pages, margin and
 * column guides, story frame chains, text-wrap areas and flow requests.
 * Pure functions over the project document.
 */

/** Tokens replaced in text layers: current page number and page count. */
export const PAGE_TOKEN = '{page}';
export const PAGES_TOKEN = '{pages}';

/** Pages in order (master pages are not pages). */
export function pagesOf(project: Pick<Project, 'artboards'>): Artboard[] {
  return project.artboards.filter((a) => !a.master);
}

export function mastersOf(project: Pick<Project, 'artboards'>): Artboard[] {
  return project.artboards.filter((a) => a.master);
}

/** Printed page number of an artboard, or null for a master page. */
export function pageNumber(
  project: Pick<Project, 'artboards' | 'firstPageNumber'>,
  artboardId: string,
): number | null {
  const index = pagesOf(project).findIndex((a) => a.id === artboardId);
  return index < 0 ? null : project.firstPageNumber + index;
}

function digits(value: number, language: string): string {
  return language === 'ur' ||
    language === 'ar' ||
    language === 'fa' ||
    language === 'ps' ||
    language === 'sd' ||
    language === 'ku'
    ? `${value < 0 ? '-' : ''}${toArabicDigits(value, language)}`
    : String(value);
}

/** Text with page tokens replaced; masters show the token symbol "#". */
export function substitutePageTokens(
  text: string,
  page: number | null,
  pageCount: number,
  language: string,
): string {
  if (!text.includes('{')) return text;
  return text
    .split(PAGE_TOKEN)
    .join(page === null ? '#' : digits(page, language))
    .split(PAGES_TOKEN)
    .join(digits(pageCount, language));
}

/** The master page layers shown on a page (below the page's own layers). */
export function masterLayersFor(project: Pick<Project, 'artboards' | 'layers'>, artboard: Artboard): Layer[] {
  if (!artboard.masterId) return [];
  return project.layers.filter((l) => l.artboardId === artboard.masterId && !l.hidden && l.kind !== 'frame');
}

/** Margin box of a page (whole page without margins). */
export function marginBox(artboard: Artboard): FlowRect {
  const m = artboard.margins ?? { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    x: m.left,
    y: m.top,
    width: Math.max(1, artboard.width - m.left - m.right),
    height: Math.max(1, artboard.height - m.top - m.bottom),
  };
}

/** Column boxes of the page grid (left to right). */
export function pageColumns(artboard: Artboard): FlowRect[] {
  const box = marginBox(artboard);
  const count = artboard.columns?.count ?? 1;
  const gutter = artboard.columns?.gutter ?? 0;
  const width = (box.width - gutter * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: box.x + i * (width + gutter),
    y: box.y,
    width,
    height: box.height,
  }));
}

/** Vertical and horizontal guide lines for margins and columns (for drawing and snapping). */
export function layoutGuides(artboard: Artboard): { xs: number[]; ys: number[] } {
  if (!artboard.margins && !artboard.columns) return { xs: [], ys: [] };
  const box = marginBox(artboard);
  const xs = new Set<number>([box.x, box.x + box.width]);
  for (const col of pageColumns(artboard)) {
    xs.add(col.x);
    xs.add(col.x + col.width);
  }
  return { xs: [...xs], ys: [box.y, box.y + box.height] };
}

/**
 * Column rules of a frame: one vertical line down the middle of each gutter,
 * inside the frame's inset (frame coordinates).
 */
export function columnRuleLines(
  frame: Pick<TextFrame, 'width' | 'height' | 'inset' | 'columns'>,
): { x: number; y0: number; y1: number }[] {
  const { count, gutter } = frame.columns;
  if (count < 2) return [];
  const inner = Math.max(0, frame.width - frame.inset * 2);
  const width = (inner - gutter * (count - 1)) / count;
  return Array.from({ length: count - 1 }, (_, i) => ({
    x: frame.inset + (i + 1) * width + i * gutter + gutter / 2,
    y0: frame.inset,
    y1: frame.height - frame.inset,
  }));
}

/** Frames of a story in threading order. */
export function storyFrames(project: Pick<Project, 'layers'>, storyId: string): TextFrame[] {
  return project.layers
    .filter((l): l is TextFrame => l.kind === 'frame' && l.storyId === storyId)
    .sort((a, b) => a.order - b.order);
}

export function flowStyle(style: ParagraphStyle): FlowStyle {
  const font = resolveFont(style.fontId);
  return {
    fontKey: font.id,
    language: style.language,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    align: style.align,
    justify: style.justify,
    firstIndent: style.firstIndent,
    spaceBefore: style.spaceBefore,
    spaceAfter: style.spaceAfter,
    color: style.color,
    features: font.features,
    kashidaMode: font.kashida,
  };
}

/**
 * Areas a frame must keep clear: layers with text wrap on the same page (and
 * its master), in frame coordinates. Other frames of the same story are
 * ignored so a story never wraps around itself.
 */
export function frameExclusions(
  project: Pick<Project, 'layers' | 'artboards'>,
  frame: TextFrame,
  layouts: ReadonlyMap<string, TextLayout>,
): FlowRect[] {
  if (frame.ignoreWrap) return [];
  const artboard = project.artboards.find((a) => a.id === frame.artboardId);
  const onPage = project.layers.filter((l) => l.artboardId === frame.artboardId);
  const fromMaster = artboard ? masterLayersFor(project, artboard) : [];
  const out: FlowRect[] = [];
  for (const layer of [...fromMaster, ...onPage]) {
    if (!layer.wrap || layer.hidden || layer.id === frame.id) continue;
    if (layer.kind === 'frame' && layer.storyId === frame.storyId) continue;
    const box = layerBounds(layer, layer.kind === 'text' ? layouts.get(layer.id) : undefined);
    if (!box) continue;
    const o = layer.wrap.offset;
    out.push({
      x: box.x - o - frame.x,
      y: box.y - o - frame.y,
      width: box.width + o * 2,
      height: box.height + o * 2,
    });
  }
  return out;
}

/** The request that flows one story through all its frames. */
export function storyFlowRequest(
  project: Pick<Project, 'layers' | 'artboards' | 'paragraphStyles'>,
  story: Story,
  layouts: ReadonlyMap<string, TextLayout>,
): FlowRequest | null {
  const frames = storyFrames(project, story.id);
  if (frames.length === 0) return null;
  const styleIndex = new Map(project.paragraphStyles.map((s, i) => [s.id, i]));
  const styles = project.paragraphStyles.map(flowStyle);
  const fonts = new Map<string, string>();
  for (const s of project.paragraphStyles) {
    const font = resolveFont(s.fontId);
    fonts.set(font.id, fontFileUrl(font));
  }
  const flowFrames: FlowFrame[] = frames.map((f) => ({
    id: f.id,
    width: f.width,
    height: f.height,
    inset: f.inset,
    columns: f.columns,
    exclusions: frameExclusions(project, f, layouts),
    ...(f.verticalAlign && f.verticalAlign !== 'top' ? { verticalAlign: f.verticalAlign } : {}),
    ...(f.balanceColumns ? { balance: true } : {}),
  }));
  return {
    fonts: [...fonts].map(([key, url]) => ({ key, url })),
    input: {
      frames: flowFrames,
      styles,
      paragraphs: story.paragraphs.map((p) => ({ text: p.text, style: styleIndex.get(p.styleId) ?? 0 })),
      // Every supported script is written right to left; columns fill right to left too.
      direction: 'rtl',
    },
  };
}

/** Text layers whose layout a flow depends on (wrapped text anywhere in the project). */
export function wrapTextLayers(project: Pick<Project, 'layers'>): TextRun[] {
  return project.layers.filter((l): l is TextRun => l.kind === 'text' && l.wrap !== undefined);
}

/** Word count of a story. */
export function storyWordCount(story: Pick<Story, 'paragraphs'>): number {
  return story.paragraphs.reduce((n, p) => n + p.text.split(/\s+/u).filter(Boolean).length, 0);
}

/**
 * Snap a drawn frame to the page grid: edges within `tolerance` of a margin or
 * column edge snap to it, and the frame takes as many columns (with the
 * page's gutter) as it spans.
 */
export function fitToPageGrid(
  artboard: Artboard,
  rect: { x: number; y: number; width: number; height: number },
  tolerance = 12,
): {
  rect: { x: number; y: number; width: number; height: number };
  columns?: { count: number; gutter: number };
} {
  if (!artboard.margins && !artboard.columns) return { rect };
  const guides = layoutGuides(artboard);
  const snap = (value: number, lines: number[]) => {
    let best = value;
    let distance = tolerance;
    for (const line of lines) {
      const d = Math.abs(line - value);
      if (d <= distance) {
        best = line;
        distance = d;
      }
    }
    return best;
  };
  const x0 = snap(rect.x, guides.xs);
  const x1 = snap(rect.x + rect.width, guides.xs);
  const y0 = snap(rect.y, guides.ys);
  const y1 = snap(rect.y + rect.height, guides.ys);
  const snapped = { x: x0, y: y0, width: Math.max(8, x1 - x0), height: Math.max(8, y1 - y0) };
  const columns = pageColumns(artboard);
  const covered = columns.filter((c) => c.x >= x0 - 1 && c.x + c.width <= x1 + 1).length;
  if (covered > 1 && artboard.columns) {
    return { rect: snapped, columns: { count: covered, gutter: artboard.columns.gutter } };
  }
  return { rect: snapped };
}
