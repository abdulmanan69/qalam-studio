import { parse, type Font } from 'opentype.js';

import { groupShapes, type OutlineCommand, type Shape } from './parts';

/**
 * Glyph outlines via opentype.js. Outlines are extracted by glyph id (as
 * produced by HarfBuzz), so they always match the shaped result.
 */
export class OutlineFont {
  private readonly font: Font;
  private readonly shapeCache = new Map<number, Shape[]>();

  constructor(bytes: ArrayBuffer) {
    this.font = parse(bytes);
  }

  get unitsPerEm(): number {
    return this.font.unitsPerEm;
  }

  get glyphCount(): number {
    return this.font.numGlyphs;
  }

  /** Outline commands in font units, origin on the baseline, y axis pointing down. */
  glyphCommands(glyphId: number): OutlineCommand[] {
    if (glyphId < 0 || glyphId >= this.font.numGlyphs) return [];
    return this.font.glyphs.get(glyphId).getPath(0, 0, this.font.unitsPerEm).commands;
  }

  /** The glyph's outline grouped into filled shapes (cached per glyph). */
  glyphShapes(glyphId: number): Shape[] {
    let shapes = this.shapeCache.get(glyphId);
    if (!shapes) {
      shapes = groupShapes(this.glyphCommands(glyphId));
      this.shapeCache.set(glyphId, shapes);
    }
    return shapes;
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
