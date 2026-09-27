/**
 * Public data types of the shaping engine. Plain serializable objects only,
 * so results can cross the Web Worker boundary unchanged.
 */

import type { Box, PartKind } from './parts';

export type { Box, PartKind } from './parts';

export type ScriptDirection = 'rtl' | 'ltr';

/** Line alignment relative to the writing direction ("start" is the right edge for RTL). */
export type TextAlign = 'start' | 'center' | 'end';

/** OpenType glyph class (GDEF). */
export type GlyphKind = 'base' | 'ligature' | 'mark' | 'component' | 'unclassified';

/** An OpenType feature applied to a range of characters, e.g. an alternate form of one letter. */
export interface RangeFeature {
  tag: string;
  value: number;
  /** UTF-16 range in the full text, end exclusive. */
  start: number;
  end: number;
}

export interface ShapeOptions {
  /** BCP 47 language tag ("ur", "ar", "fa", …). Selects language-specific forms. */
  language: string;
  /** ISO 15924 script tag. Default: "Arab". */
  script?: string;
  /** Default: "rtl". */
  direction?: ScriptDirection;
  /** OpenType features for the whole text, e.g. `{ kern: true, ss01: true, salt: 2 }`. */
  features?: Readonly<Record<string, boolean | number>>;
  /** Features for character ranges (indices into the shaped string). */
  rangeFeatures?: readonly RangeFeature[];
}

/** One glyph as returned by HarfBuzz, in font units, in visual (left-to-right) order. */
export interface ShapedGlyph {
  glyphId: number;
  /** UTF-16 index of the character this glyph belongs to (character-level clusters). */
  cluster: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
  kind: GlyphKind;
}

export interface FontMetrics {
  unitsPerEm: number;
  /** Distance above the baseline (positive). */
  ascender: number;
  /** Distance below the baseline (negative, as in the font). */
  descender: number;
  lineGap: number;
}

/**
 * How kashida (letter extension) is produced: by inserting tatweel characters
 * and re-shaping (Naskh fonts), or by stretching the joining stroke of the
 * glyph outline (Nastaliq fonts, where tatweel is not idiomatic).
 */
export type KashidaMode = 'tatweel' | 'stretch';

export interface LayoutOptions extends ShapeOptions {
  /** Font size in pixels (1 em). */
  fontSize: number;
  /** Multiplier of the font's natural line height. Values below 1 overlap lines. Default 1. */
  lineHeight?: number;
  /** Default "start". */
  align?: TextAlign;
  /** Extra length per letter, in em, keyed by the letter's UTF-16 index in the text. */
  kashida?: Readonly<Record<string, number>>;
  /** Default "tatweel" (falls back to stretching where tatweel cannot join). */
  kashidaMode?: KashidaMode;
  /** Extra space (em) between letters that do not connect, within a word. May be negative. */
  letterSpacing?: number;
  /** Extra space (em) between words. May be negative. */
  wordSpacing?: number;
  /**
   * Even out the ink gaps between unconnected letter groups and between words
   * (automatic kerning for Nastaliq and other scripts). Connected letters are
   * never pulled apart.
   */
  opticalSpacing?: boolean;
}

/** A separately movable piece of a glyph: the letter body, a dot or a mark. */
export interface GlyphPart {
  /**
   * Stable identity: `${cluster}:${glyphId}:${occurrence}:${index}`. Survives
   * re-shaping as long as the letter keeps the same glyph.
   */
  key: string;
  index: number;
  kind: PartKind;
  /** SVG path data in layout coordinates. */
  path: string;
  box: Box;
}

/** A glyph placed in the layout box (pixels, origin top-left, y down). */
export interface PositionedGlyph {
  glyphId: number;
  /** UTF-16 index into the full layout text. */
  cluster: number;
  /** Index of the letter (base character) this glyph belongs to. */
  letter: number;
  /** Word number (words are separated by whitespace). */
  word: number;
  /** Nth glyph with this id in this cluster (keeps part keys unique). */
  occurrence: number;
  /** A tatweel inserted for kashida. */
  isKashida: boolean;
  line: number;
  kind: GlyphKind;
  /** Glyph origin on the baseline. */
  x: number;
  y: number;
  advance: number;
  /** All parts joined; empty for blank glyphs such as spaces. */
  path: string;
  parts: GlyphPart[];
}

export interface LineLayout {
  /** UTF-16 range of the line in the full text (end exclusive, line break excluded). */
  start: number;
  end: number;
  /** Left edge and width of the line's glyph run. */
  x: number;
  width: number;
  /** Baseline position from the top of the layout box. */
  baseline: number;
}

export interface TextLayout {
  width: number;
  height: number;
  fontSize: number;
  ascent: number;
  descent: number;
  /** Distance between consecutive baselines. */
  lineAdvance: number;
  lines: LineLayout[];
  glyphs: PositionedGlyph[];
  /** Letters (UTF-16 indices) that can be extended with kashida. */
  extendable: number[];
}

/** One alternate form of a letter offered by the font. */
export interface AlternateForm {
  /** Feature that selects it, e.g. "salt" value 2 or "ss03" value 1. */
  tag: string;
  value: number;
  glyphIds: number[];
  /** Preview outline normalized into a box of `size` × `size` pixels. */
  path: string;
  size: number;
}
