import { HarfBuzzFont } from './harfbuzz-font';
import { findAlternates, layoutText, type LayoutFont } from './layout';
import { OutlineFont } from './outline-font';
import type { Shape } from './parts';
import type {
  AlternateForm,
  FontMetrics,
  LayoutOptions,
  ShapedGlyph,
  ShapeOptions,
  TextLayout,
} from './types';

export class FontNotLoadedError extends Error {
  constructor(public readonly fontKey: string) {
    super(`Font not loaded: ${fontKey}`);
    this.name = 'FontNotLoadedError';
  }
}

/** HarfBuzz for shaping + opentype.js for outlines, behind one interface. */
export class LoadedFont implements LayoutFont {
  private readonly harfbuzz: HarfBuzzFont;
  private readonly outlines: OutlineFont;
  private readonly cachedMetrics: FontMetrics;

  constructor(bytes: ArrayBuffer) {
    // HarfBuzz copies the bytes into WebAssembly memory; opentype.js keeps a view.
    this.harfbuzz = new HarfBuzzFont(bytes);
    this.outlines = new OutlineFont(bytes);
    this.cachedMetrics = this.harfbuzz.metrics();
  }

  metrics(): FontMetrics {
    return this.cachedMetrics;
  }

  shape(text: string, options: ShapeOptions): ShapedGlyph[] {
    return this.harfbuzz.shape(text, options);
  }

  glyphShapes(glyphId: number): Shape[] {
    return this.outlines.glyphShapes(glyphId);
  }

  glyphName(glyphId: number): string | null {
    return this.harfbuzz.glyphName(glyphId);
  }

  glyphPath(glyphId: number, x: number, y: number, fontSize: number): string {
    return this.outlines.glyphPath(glyphId, x, y, fontSize);
  }

  hasCodePoint(codePoint: number): boolean {
    return this.harfbuzz.hasCodePoint(codePoint);
  }

  alternateFeatureTags(): string[] {
    return this.harfbuzz.alternateFeatureTags();
  }
}

/**
 * Framework-independent shaping engine. Load fonts once by key, then shape
 * or lay out text synchronously. Runs in a Web Worker in the app, and
 * directly in Node for tests.
 */
export class ShapingEngine {
  private readonly fonts = new Map<string, LoadedFont>();

  hasFont(fontKey: string): boolean {
    return this.fonts.has(fontKey);
  }

  loadFont(fontKey: string, bytes: ArrayBuffer): LoadedFont {
    const font = new LoadedFont(bytes);
    this.fonts.set(fontKey, font);
    return font;
  }

  getFont(fontKey: string): LoadedFont {
    const font = this.fonts.get(fontKey);
    if (!font) throw new FontNotLoadedError(fontKey);
    return font;
  }

  shape(fontKey: string, text: string, options: ShapeOptions): ShapedGlyph[] {
    return this.getFont(fontKey).shape(text, options);
  }

  layout(fontKey: string, text: string, options: LayoutOptions): TextLayout {
    return layoutText(this.getFont(fontKey), text, options);
  }

  /** For each string: true if the font has a glyph for every character (whitespace ignored). */
  coverage(fontKey: string, strings: readonly string[]): boolean[] {
    const font = this.getFont(fontKey);
    return strings.map((s) => {
      const visible = s.replace(/\s+/gu, '');
      if (!visible) return true;
      return font.shape(visible, { language: 'ar' }).every((g) => g.glyphId !== 0);
    });
  }

  /** Alternate forms of the letter at `letterIndex` (UTF-16 index into `text`). */
  alternates(fontKey: string, text: string, letterIndex: number, options: ShapeOptions): AlternateForm[] {
    const font = this.getFont(fontKey);
    return findAlternates(font, text, letterIndex, options, font.alternateFeatureTags());
  }
}
