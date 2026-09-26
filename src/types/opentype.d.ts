/**
 * Minimal type declarations for the parts of opentype.js 2.x that Qalam
 * Studio uses (the package ships without types).
 */
declare module 'opentype.js' {
  export interface PathCommand {
    type: 'M' | 'L' | 'C' | 'Q' | 'Z';
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export class Path {
    commands: PathCommand[];
    /** SVG path data. A number argument sets the decimal places. */
    toPathData(decimalPlaces?: number): string;
    getBoundingBox(): BoundingBox;
  }

  export class Glyph {
    index: number;
    name: string | null;
    unicode?: number;
    unicodes: number[];
    advanceWidth?: number;
    /** Path of the glyph at (x, y) = origin on the baseline, y axis pointing down. */
    getPath(x?: number, y?: number, fontSize?: number): Path;
    getBoundingBox(): BoundingBox;
  }

  export interface GlyphSet {
    length: number;
    get(index: number): Glyph;
  }

  export class Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    numGlyphs: number;
    glyphs: GlyphSet;
  }

  export function parse(buffer: ArrayBuffer, options?: { lowMemory?: boolean }): Font;
}
