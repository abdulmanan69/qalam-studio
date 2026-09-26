/**
 * Public data types of the shaping engine. Plain serializable objects only,
 * so results can cross the Web Worker boundary unchanged.
 */

export type ScriptDirection = 'rtl' | 'ltr';

/** Line alignment relative to the writing direction ("start" is the right edge for RTL). */
export type TextAlign = 'start' | 'center' | 'end';

/** OpenType glyph class (GDEF), used later to tell letter bodies from marks. */
export type GlyphKind = 'base' | 'ligature' | 'mark' | 'component' | 'unclassified';

export interface ShapeOptions {
  /** BCP 47 language tag ("ur", "ar", "fa", …). Selects language-specific forms. */
  language: string;
  /** ISO 15924 script tag. Default: "Arab". */
  script?: string;
  /** Default: "rtl". */
  direction?: ScriptDirection;
  /** OpenType features, e.g. `{ kern: true, ss01: true, salt: 2 }`. */
  features?: Readonly<Record<string, boolean | number>>;
}

/** One glyph as returned by HarfBuzz, in font units, in visual (left-to-right) order. */
export interface ShapedGlyph {
  glyphId: number;
  /** UTF-16 index of the first character this glyph belongs to. */
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

export interface LayoutOptions extends ShapeOptions {
  /** Font size in pixels (1 em). */
  fontSize: number;
  /** Multiplier of the font's natural line height. Values below 1 overlap lines. Default 1. */
  lineHeight?: number;
  /** Default "start". */
  align?: TextAlign;
}

/** A glyph placed in the layout box (pixels, origin top-left, y down). */
export interface PositionedGlyph {
  glyphId: number;
  /** UTF-16 index into the full layout text. */
  cluster: number;
  line: number;
  kind: GlyphKind;
  /** Glyph origin on the baseline. */
  x: number;
  y: number;
  advance: number;
  /** SVG path data in layout coordinates; empty for blank glyphs such as spaces. */
  path: string;
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
}
