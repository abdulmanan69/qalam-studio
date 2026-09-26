import { parse, type Font } from 'opentype.js';

/**
 * Glyph outlines via opentype.js. Outlines are extracted by glyph id (as
 * produced by HarfBuzz), so they always match the shaped result.
 */
export class OutlineFont {
  private readonly font: Font;

  constructor(bytes: ArrayBuffer) {
    this.font = parse(bytes);
  }

  get unitsPerEm(): number {
    return this.font.unitsPerEm;
  }

  get glyphCount(): number {
    return this.font.numGlyphs;
  }

  /**
   * SVG path data for a glyph whose origin sits at (x, y), in a y-down
   * coordinate system scaled to `fontSize` pixels per em.
   */
  glyphPath(glyphId: number, x: number, y: number, fontSize: number, decimals = 2): string {
    if (glyphId < 0 || glyphId >= this.font.numGlyphs) return '';
    return this.font.glyphs.get(glyphId).getPath(x, y, fontSize).toPathData(decimals);
  }
}
