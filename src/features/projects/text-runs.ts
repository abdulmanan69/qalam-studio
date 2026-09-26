import { clamp, createId } from '@/lib/utils';

import {
  DEFAULT_TEXT_STYLE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  textRunSchema,
  type Artboard,
  type LayerStyle,
  type PartOverride,
  type RangeFeatureSpec,
  type TextAlign,
  type TextLanguage,
  type TextRun,
} from './schema';

export const DEFAULT_TEXT_FILL = '#1a1a1a';

export interface NewTextRunInput {
  artboardId: string;
  text: string;
  fontId: string;
  language: TextLanguage;
  fontSize: number;
  lineHeight?: number;
  align?: TextAlign;
  style?: LayerStyle;
  x?: number;
  y?: number;
  name?: string;
}

/** Canonical form for stored text: NFC, LF line breaks, no trailing blank lines. */
export function normalizeText(text: string): string {
  return text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\s+$/u, '');
}

export function createTextRun(input: NewTextRunInput): TextRun {
  return textRunSchema.parse({
    id: createId(),
    kind: 'text',
    artboardId: input.artboardId,
    name: input.name ?? '',
    hidden: false,
    locked: false,
    groupId: null,
    text: normalizeText(input.text),
    fontId: input.fontId,
    language: input.language,
    fontSize: clamp(input.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
    lineHeight: input.lineHeight ?? 1,
    align: input.align ?? 'start',
    style: input.style ?? DEFAULT_TEXT_STYLE,
    x: input.x ?? 0,
    y: input.y ?? 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    parts: {},
    kashida: {},
    features: [],
  });
}

/** A comfortable starting size: about a tenth of the artboard's shorter side. */
export function defaultFontSize(artboard: Pick<Artboard, 'width' | 'height'>): number {
  return clamp(Math.round(Math.min(artboard.width, artboard.height) / 10), 12, 400);
}

/**
 * Font size that makes a layout of `layoutWidth` (measured at `fontSize`)
 * fit within `maxFraction` of the artboard width.
 */
export function fitFontSize(
  fontSize: number,
  layoutWidth: number,
  artboard: Pick<Artboard, 'width'>,
  maxFraction = 0.8,
): number {
  const limit = artboard.width * maxFraction;
  if (layoutWidth <= limit || layoutWidth <= 0) return fontSize;
  return clamp(Math.floor((fontSize * limit) / layoutWidth), MIN_FONT_SIZE, MAX_FONT_SIZE);
}

/** Top-left position that centers a box of the given size on the artboard. */
export function centeredPosition(
  artboard: Pick<Artboard, 'width' | 'height'>,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: Math.round((artboard.width - width) / 2), y: Math.round((artboard.height - height) / 2) };
}

/** Short single-line label for layer lists: the first line, truncated. */
export function textRunLabel(text: string, maxLength = 32): string {
  const firstLine = text.split('\n', 1)[0]?.trim() ?? '';
  const chars = Array.from(firstLine);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join('')}…` : firstLine;
}

/** Character of a part key (`cluster:glyph:occurrence:index`). */
export function partKeyCluster(key: string): number {
  return Number.parseInt(key.split(':', 1)[0] ?? '', 10);
}

/**
 * Map old character indices to new ones after a text edit: characters in the
 * common prefix keep their index, those in the common suffix shift by the
 * length difference, and everything in between is treated as changed.
 */
export function textEditMapper(oldText: string, newText: string): (index: number) => number | null {
  let prefix = 0;
  const max = Math.min(oldText.length, newText.length);
  while (prefix < max && oldText.charCodeAt(prefix) === newText.charCodeAt(prefix)) prefix++;
  let suffix = 0;
  while (
    suffix < max - prefix &&
    oldText.charCodeAt(oldText.length - 1 - suffix) === newText.charCodeAt(newText.length - 1 - suffix)
  ) {
    suffix++;
  }
  const delta = newText.length - oldText.length;
  return (index) => {
    if (index < prefix) return index;
    if (index >= oldText.length - suffix) return index + delta;
    return null;
  };
}

/**
 * Carry per-letter adjustments (moved parts, kashida, alternate forms) over a
 * text edit. Adjustments of unchanged letters survive; those of edited
 * letters are dropped. Parts whose glyph changes shape (e.g. a letter that
 * now joins differently) simply stop matching when re-shaped.
 */
export function remapForTextEdit(
  run: Pick<TextRun, 'text' | 'parts' | 'kashida' | 'features'>,
  newText: string,
): Pick<TextRun, 'text' | 'parts' | 'kashida' | 'features'> {
  const map = textEditMapper(run.text, newText);

  const parts: Record<string, PartOverride> = {};
  for (const [key, override] of Object.entries(run.parts)) {
    const cluster = partKeyCluster(key);
    const mapped = Number.isNaN(cluster) ? null : map(cluster);
    if (mapped === null) continue;
    parts[[String(mapped), ...key.split(':').slice(1)].join(':')] = override;
  }

  const kashida: Record<string, number> = {};
  for (const [key, value] of Object.entries(run.kashida)) {
    const mapped = map(Number.parseInt(key, 10));
    if (mapped !== null) kashida[String(mapped)] = value;
  }

  const features: RangeFeatureSpec[] = [];
  for (const feature of run.features) {
    const start = map(feature.start);
    const last = map(feature.end - 1);
    if (start !== null && last !== null && last >= start) features.push({ ...feature, start, end: last + 1 });
  }

  return { text: newText, parts, kashida, features };
}
