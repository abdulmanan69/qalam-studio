import { transformPathData, translate } from '@/lib/matrix';

import { layoutText, type LayoutFont } from './layout';
import type { KashidaMode, TextLayout } from './types';

/**
 * Text flow for publishing: break paragraphs into lines, fill the columns of
 * a chain of text frames (continuing from frame to frame, on any page), keep
 * lines clear of text-wrap areas, and justify lines the traditional way —
 * with kashida — or with wider word spaces. Pure: fonts come in, positioned
 * outlines come out.
 */

export interface FlowStyle {
  fontKey: string;
  language: string;
  /** px per em */
  fontSize: number;
  lineHeight: number;
  align: 'justify' | 'right' | 'center' | 'left';
  justify: 'kashida' | 'space';
  /** em */
  firstIndent: number;
  /** px */
  spaceBefore: number;
  spaceAfter: number;
  color: string;
  features?: Readonly<Record<string, boolean | number>>;
  kashidaMode?: KashidaMode;
}

export interface FlowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowFrame {
  id: string;
  width: number;
  height: number;
  inset: number;
  columns: { count: number; gutter: number };
  /** Areas to keep clear (text wrap), in frame coordinates. */
  exclusions: FlowRect[];
  /** Where the text sits when it does not fill the frame. Default "top". */
  verticalAlign?: 'top' | 'center' | 'bottom';
  /** Balance the columns (used for the story's last frame). */
  balance?: boolean;
}

export interface FlowInput {
  frames: FlowFrame[];
  styles: FlowStyle[];
  paragraphs: { text: string; style: number }[];
  /** Column order and default alignment. Default "rtl". */
  direction?: 'rtl' | 'ltr';
}

export interface FlowLine {
  /** Outline, already positioned in frame coordinates. */
  d: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowFrameResult {
  id: string;
  lines: FlowLine[];
}

export interface FlowResult {
  frames: FlowFrameResult[];
  /** Text left over after the last frame. */
  overflow: boolean;
  /** Words placed / total. */
  placedWords: number;
  totalWords: number;
}

/** Most kashida a single letter gets when justifying (em). */
const MAX_KASHIDA_PER_LETTER = 2.5;
/** Lines with more free space than this share are not stretched (it looks broken). */
const MAX_JUSTIFY_SHARE = 0.45;

interface Slot {
  frame: number;
  x0: number;
  x1: number;
  top: number;
}

interface StyleMetrics {
  font: LayoutFont;
  scale: number;
  lineAdvance: number;
  /** Shift that centers the font's natural line box in the (tighter or looser) line band. */
  baselineShift: number;
  spaceWidth: number;
}

/** Column boxes of a frame, in reading order. */
function columnBoxes(
  frame: FlowFrame,
  rtl: boolean,
): { x0: number; x1: number; top: number; bottom: number }[] {
  const { count, gutter } = frame.columns;
  const inner = Math.max(0, frame.width - frame.inset * 2);
  const width = Math.max(1, (inner - gutter * (count - 1)) / count);
  const boxes = Array.from({ length: count }, (_, i) => ({
    x0: frame.inset + i * (width + gutter),
    x1: frame.inset + i * (width + gutter) + width,
    top: frame.inset,
    bottom: frame.height - frame.inset,
  }));
  return rtl ? boxes.reverse() : boxes;
}

/** Free intervals of [x0, x1] in a horizontal band, after removing exclusions. */
export function freeIntervals(
  x0: number,
  x1: number,
  top: number,
  bottom: number,
  exclusions: readonly FlowRect[],
): { x0: number; x1: number }[] {
  let intervals = [{ x0, x1 }];
  for (const ex of exclusions) {
    if (ex.y >= bottom || ex.y + ex.height <= top) continue;
    const a = ex.x;
    const b = ex.x + ex.width;
    intervals = intervals.flatMap((iv) => {
      if (b <= iv.x0 || a >= iv.x1) return [iv];
      const out: { x0: number; x1: number }[] = [];
      if (a > iv.x0) out.push({ x0: iv.x0, x1: a });
      if (b < iv.x1) out.push({ x0: b, x1: iv.x1 });
      return out;
    });
  }
  return intervals;
}

/** Indices (in `text`) of one kashida letter per word: the last letter that can stretch. */
function kashidaCandidates(text: string, extendable: readonly number[]): number[] {
  const byWord = new Map<number, number>();
  let word = 0;
  const wordOf: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/\s/u.test(text.charAt(i))) word++;
    wordOf.push(word);
  }
  for (const index of extendable) {
    const w = wordOf[index] ?? 0;
    const current = byWord.get(w);
    if (current === undefined || index > current) byWord.set(w, index);
  }
  return [...byWord.values()];
}

function countSpaces(text: string): number {
  return (text.match(/\s/gu) ?? []).length;
}

/** Lay out one line; stretch it to `target` width when justifying. */
/** Horizontal extent of the ink (outlines), which can differ from the advance widths. */
function inkOf(layout: TextLayout): { left: number; right: number } {
  let left = Infinity;
  let right = -Infinity;
  for (const glyph of layout.glyphs) {
    for (const part of glyph.parts) {
      if (!part.path) continue;
      left = Math.min(left, part.box.x);
      right = Math.max(right, part.box.x + part.box.width);
    }
  }
  return Number.isFinite(left) ? { left, right } : { left: 0, right: layout.width };
}

interface LaidLine {
  layout: TextLayout;
  ink: { left: number; right: number };
}

/**
 * Lay out one line; when justifying, stretch it so its ink spans exactly
 * `target` (Nastaliq ink often starts or ends inside the advance widths, so
 * justifying advances alone leaves ragged edges).
 */
function layoutLine(
  font: LayoutFont,
  text: string,
  style: FlowStyle,
  target: number | null,
  rtl: boolean,
): LaidLine {
  const base = {
    language: style.language,
    fontSize: style.fontSize,
    features: style.features,
    kashidaMode: style.kashidaMode,
    direction: rtl ? ('rtl' as const) : ('ltr' as const),
    simple: true,
  };
  const natural = layoutText(font, text, base);
  const naturalInk = inkOf(natural);
  const plain = { layout: natural, ink: naturalInk };
  if (target === null) return plain;
  const extra = target - (naturalInk.right - naturalInk.left);
  const spaces = countSpaces(text);
  const em = style.fontSize;
  if (extra < -0.5 && spaces > 0) {
    // Ink slightly wider than the column: tighten the word spaces instead.
    return fitWithSpacing(font, text, base, {}, extra / spaces / em, target, spaces, em);
  }
  if (extra <= 0.5 || extra > target * MAX_JUSTIFY_SHARE) return plain;
  let kashida: Record<string, number> = {};
  let used = 0;
  if (style.justify === 'kashida' || spaces === 0) {
    const candidates = kashidaCandidates(text, natural.extendable);
    if (candidates.length > 0) {
      const per = Math.min(extra / em / candidates.length, MAX_KASHIDA_PER_LETTER);
      kashida = Object.fromEntries(candidates.map((i) => [String(i), per]));
      used = per * candidates.length * em;
    }
  }
  const remaining = extra - used;
  const wordSpacing = spaces > 0 && remaining > 0 ? remaining / spaces / em : 0;
  if (used === 0 && wordSpacing === 0) return plain;
  return fitWithSpacing(font, text, base, kashida, wordSpacing, target, spaces, em);
}

/**
 * Lay out with the given kashida and word spacing, then refine the word
 * spacing until the ink spans `target` (tatweel widths are quantized and ink
 * edges shift, so two refinements are applied at most).
 */
function fitWithSpacing(
  font: LayoutFont,
  text: string,
  base: Parameters<typeof layoutText>[2],
  kashida: Record<string, number>,
  wordSpacing: number,
  target: number,
  spaces: number,
  em: number,
): LaidLine {
  let spacing = wordSpacing;
  let layout = layoutText(font, text, { ...base, kashida, wordSpacing: spacing });
  let ink = inkOf(layout);
  for (let pass = 0; pass < 2 && spaces > 0; pass++) {
    const gap = target - (ink.right - ink.left);
    if (Math.abs(gap) <= 0.5) break;
    spacing += gap / spaces / em;
    layout = layoutText(font, text, { ...base, kashida, wordSpacing: spacing });
    ink = inkOf(layout);
  }
  return { layout, ink };
}

function linePath(layout: TextLayout, x: number, y: number): string {
  const m = translate(x, y);
  return layout.glyphs
    .map((g) => g.path)
    .filter((d) => d.length > 0)
    .map((d) => transformPathData(d, m))
    .join('');
}

/**
 * Flow paragraphs through frames. `fonts` must contain every style's font.
 * When the last frame balances its columns, the text is flowed into the
 * shortest version of that frame that still holds it, so all columns end
 * at about the same line.
 */
export function flowText(fonts: ReadonlyMap<string, LayoutFont>, input: FlowInput): FlowResult {
  const last = input.frames.at(-1);
  if (!last?.balance || last.columns.count < 2) return flowOnce(fonts, input, false);
  // Line breaks depend only on word widths, so the search measures without
  // building outlines; only the final flow is drawn.
  const probe = flowOnce(fonts, input, true);
  const lines = probe.frames.at(-1)?.lines ?? [];
  if (probe.overflow || lines.length === 0) return flowOnce(fonts, input, false);
  const withHeight = (height: number): FlowInput => ({
    ...input,
    frames: input.frames.map((f) => (f === last ? { ...f, height } : f)),
  });
  // Binary search the lowest height that still fits everything.
  let low = last.inset * 2 + Math.min(...lines.map((l) => l.height));
  let high = last.height;
  for (let step = 0; step < 12 && high - low > 1; step++) {
    const mid = (low + high) / 2;
    if (flowOnce(fonts, withHeight(mid), true).overflow) low = mid;
    else high = mid;
  }
  if (high >= last.height) return flowOnce(fonts, input, false);
  const best = flowOnce(fonts, withHeight(high), false);
  // Vertical alignment is relative to the frame's real height.
  const result = best.frames.at(-1);
  if (result) alignVertically(last, result);
  return best;
}

/** One pass through the frames; `measure` places lines without drawing them. */
function flowOnce(fonts: ReadonlyMap<string, LayoutFont>, input: FlowInput, measure: boolean): FlowResult {
  const rtl = (input.direction ?? 'rtl') === 'rtl';
  const results: FlowFrameResult[] = input.frames.map((f) => ({ id: f.id, lines: [] }));
  const metrics = input.styles.map<StyleMetrics | null>((style) => {
    const font = fonts.get(style.fontKey);
    if (!font) return null;
    const m = font.metrics();
    const scale = style.fontSize / m.unitsPerEm;
    const space = font.shape(' ', { language: style.language })[0]?.xAdvance ?? m.unitsPerEm * 0.25;
    const natural = (m.ascender - m.descender) * scale;
    const lineAdvance = natural * style.lineHeight;
    return {
      font,
      scale,
      lineAdvance,
      baselineShift: (lineAdvance - natural) / 2,
      spaceWidth: space * scale,
    };
  });
  const widthCache = new Map<string, number>();
  const wordWidth = (styleIndex: number, word: string): number => {
    const key = `${String(styleIndex)}|${word}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      const style = input.styles[styleIndex];
      const m = metrics[styleIndex];
      w =
        style && m
          ? m.font
              .shape(word, { language: style.language, features: style.features })
              .reduce((sum, g) => sum + g.xAdvance, 0) * m.scale
          : 0;
      widthCache.set(key, w);
    }
    return w;
  };

  // Cursor: frame, column, vertical position inside the column.
  let frame = 0;
  let column = 0;
  let y = 0;
  let atColumnTop = true;
  const columnsOf = input.frames.map((f) => columnBoxes(f, rtl));

  const advanceColumn = () => {
    column++;
    const cols = columnsOf[frame];
    if (!cols || column >= cols.length) {
      frame++;
      column = 0;
    }
    y = columnsOf[frame]?.[column]?.top ?? 0;
    atColumnTop = true;
  };
  if (columnsOf[0]?.[0]) y = columnsOf[0][0].top;

  /** The free slots of the next line band, or null when the frames are full. */
  const nextBand = (height: number): Slot[] | null => {
    for (let guard = 0; guard < 100_000; guard++) {
      const f = input.frames[frame];
      const col = columnsOf[frame]?.[column];
      if (!f || !col) return null;
      if (y + height > col.bottom + 0.01) {
        advanceColumn();
        continue;
      }
      const free = freeIntervals(col.x0, col.x1, y, y + height, f.exclusions);
      const min = Math.min(col.x1 - col.x0, Math.max(height * 1.2, (col.x1 - col.x0) * 0.2));
      const usable = free.filter((iv) => iv.x1 - iv.x0 >= min);
      if (usable.length === 0) {
        y += Math.max(1, height / 4);
        continue;
      }
      if (rtl) usable.reverse();
      return usable.map((iv) => ({ frame, x0: iv.x0, x1: iv.x1, top: y }));
    }
    return null;
  };

  let placedWords = 0;
  const totalWords = input.paragraphs.reduce((n, p) => n + p.text.split(/\s+/u).filter(Boolean).length, 0);
  let overflow = false;

  paragraphs: for (const paragraph of input.paragraphs) {
    const style = input.styles[paragraph.style];
    const m = metrics[paragraph.style];
    if (!style || !m) continue;
    if (!atColumnTop) y += style.spaceBefore;
    const words = paragraph.text.split(/\s+/u).filter(Boolean);
    if (words.length === 0) {
      // An empty paragraph is a blank line.
      if (!nextBand(m.lineAdvance)) {
        overflow = true;
        break;
      }
      y += m.lineAdvance;
      atColumnTop = false;
      continue;
    }
    let next = 0;
    let firstLine = true;
    while (next < words.length) {
      const slots = nextBand(m.lineAdvance);
      if (!slots) {
        overflow = true;
        break paragraphs;
      }
      for (const slot of slots) {
        if (next >= words.length) break;
        const indent = firstLine ? style.firstIndent * style.fontSize : 0;
        const available = slot.x1 - slot.x0 - indent;
        let width = 0;
        let count = 0;
        while (next + count < words.length) {
          const w = wordWidth(paragraph.style, words[next + count] ?? '');
          const add = count === 0 ? w : m.spaceWidth + w;
          if (width + add > available && count > 0) break;
          if (count === 0 && w > available && slot !== slots[slots.length - 1] && slots.length > 1) break;
          width += add;
          count++;
          if (width > available) break;
        }
        if (count === 0) continue;
        const lineText = words.slice(next, next + count).join(' ');
        next += count;
        const last = next >= words.length;
        const result = results[slot.frame];
        if (measure) {
          result?.lines.push({
            d: '',
            color: style.color,
            x: slot.x0,
            y: slot.top,
            width: 0,
            height: m.lineAdvance,
          });
          placedWords += count;
          firstLine = false;
          continue;
        }
        const target = style.align === 'justify' && !last ? available : null;
        const { layout, ink } = layoutLine(m.font, lineText, style, target, rtl);
        const align = style.align === 'justify' ? (rtl ? 'right' : 'left') : style.align;
        // Align on the ink, so column edges look straight.
        let x: number;
        if (align === 'center') x = (slot.x0 + slot.x1) / 2 - (ink.left + ink.right) / 2;
        else if (align === 'left') x = slot.x0 + (rtl ? 0 : indent) - ink.left;
        else x = slot.x1 - (rtl ? indent : 0) - ink.right;
        result?.lines.push({
          d: linePath(layout, x, slot.top + m.baselineShift),
          color: style.color,
          x: x + ink.left,
          y: slot.top,
          width: ink.right - ink.left,
          height: m.lineAdvance,
        });
        placedWords += count;
        firstLine = false;
      }
      y += m.lineAdvance;
      atColumnTop = false;
    }
    y += style.spaceAfter;
  }

  input.frames.forEach((f, i) => {
    const result = results[i];
    if (result) alignVertically(f, result);
  });
  return { frames: results, overflow, placedWords, totalWords };
}

/** Move a frame's lines down to center or bottom-align the text block. */
function alignVertically(frame: FlowFrame, result: FlowFrameResult): void {
  const align = frame.verticalAlign ?? 'top';
  if (align === 'top' || result.lines.length === 0) return;
  const top = Math.min(...result.lines.map((l) => l.y));
  const bottom = Math.max(...result.lines.map((l) => l.y + l.height));
  const free = frame.height - frame.inset - bottom;
  const shift = align === 'center' ? (frame.height - (bottom - top)) / 2 - top : free;
  if (shift <= 0.01) return;
  const m = translate(0, shift);
  for (const line of result.lines) {
    line.d = transformPathData(line.d, m);
    line.y += shift;
  }
}
