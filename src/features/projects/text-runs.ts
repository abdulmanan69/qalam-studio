import { clamp, createId } from '@/lib/utils';

import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  textRunSchema,
  type Artboard,
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
  fill?: string;
  x?: number;
  y?: number;
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
    text: normalizeText(input.text),
    fontId: input.fontId,
    language: input.language,
    fontSize: clamp(input.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
    lineHeight: input.lineHeight ?? 1,
    align: input.align ?? 'start',
    fill: input.fill ?? DEFAULT_TEXT_FILL,
    x: input.x ?? 0,
    y: input.y ?? 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    hidden: false,
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
