import { Blob, Buffer, ClusterLevel, Direction, Face, Feature, Font, GlyphClass, shape } from 'harfbuzzjs';

import type { FontMetrics, GlyphKind, ShapedGlyph, ShapeOptions } from './types';

const KIND_BY_CLASS: Record<number, GlyphKind> = {
  [GlyphClass.UNCLASSIFIED]: 'unclassified',
  [GlyphClass.BASE_GLYPH]: 'base',
  [GlyphClass.LIGATURE]: 'ligature',
  [GlyphClass.MARK]: 'mark',
  [GlyphClass.COMPONENT]: 'component',
};

const FEATURE_TAG = /^[\x20-\x7e]{4}$/;

/** Alternate-form features a user can pick per letter. */
export const ALTERNATE_FEATURE = /^(salt|swsh|ss\d\d|cv\d\d)$/;

export function toHarfBuzzFeatures(options: Pick<ShapeOptions, 'features' | 'rangeFeatures'>): Feature[] {
  const global = Object.entries(options.features ?? {})
    .filter(([tag]) => FEATURE_TAG.test(tag))
    .map(([tag, value]) => new Feature(tag, typeof value === 'boolean' ? Number(value) : value));
  const ranged = (options.rangeFeatures ?? [])
    .filter((f) => FEATURE_TAG.test(f.tag) && f.end > f.start)
    .map((f) => new Feature(f.tag, f.value, f.start, f.end));
  return [...global, ...ranged];
}

/**
 * A font loaded into HarfBuzz (WebAssembly) for shaping: contextual forms,
 * ligatures, kerning and mark positioning all come from here.
 */
export class HarfBuzzFont {
  private readonly face: Face;
  private readonly font: Font;
  private readonly kinds = new Map<number, GlyphKind>();
  private cachedFeatureTags: string[] | undefined;

  constructor(bytes: ArrayBuffer | Uint8Array) {
    this.face = new Face(new Blob(bytes));
    this.font = new Font(this.face);
  }

  metrics(): FontMetrics {
    const extents = this.font.hExtents();
    return {
      unitsPerEm: this.face.upem,
      ascender: extents.ascender,
      descender: extents.descender,
      lineGap: extents.lineGap,
    };
  }

  /** True if the font maps this code point to a real glyph. */
  hasCodePoint(codePoint: number): boolean {
    const glyph = this.font.nominalGlyph(codePoint);
    return glyph !== undefined && glyph !== 0;
  }

  glyphKind(glyphId: number): GlyphKind {
    let kind = this.kinds.get(glyphId);
    if (!kind) {
      kind = KIND_BY_CLASS[this.face.getGlyphClass(glyphId)] ?? 'unclassified';
      this.kinds.set(glyphId, kind);
    }
    return kind;
  }

  glyphName(glyphId: number): string | null {
    const name = this.font.glyphName(glyphId);
    return name && !/^gid\d+$/.test(name) ? name : null;
  }

  /** GSUB features this font offers for alternate letter forms. */
  alternateFeatureTags(): string[] {
    if (!this.cachedFeatureTags) {
      const tags = new Set(this.face.getTableFeatureTags('GSUB'));
      this.cachedFeatureTags = [...tags].filter((tag) => ALTERNATE_FEATURE.test(tag)).sort();
    }
    return this.cachedFeatureTags;
  }

  /**
   * Shape one line of text. Glyphs come back in visual order (left to right)
   * with character-level clusters, so every glyph — including marks — maps
   * back to the exact character it was shaped from.
   */
  shape(text: string, options: ShapeOptions): ShapedGlyph[] {
    if (text.length === 0) return [];
    const buffer = new Buffer();
    buffer.addText(text);
    buffer.setDirection(options.direction === 'ltr' ? Direction.LTR : Direction.RTL);
    buffer.setScript(options.script ?? 'Arab');
    buffer.setLanguage(options.language);
    buffer.setClusterLevel(ClusterLevel.MONOTONE_CHARACTERS);
    shape(this.font, buffer, toHarfBuzzFeatures(options));
    return buffer.getGlyphInfosAndPositions().map((g) => ({
      glyphId: g.codepoint,
      cluster: g.cluster,
      xAdvance: g.xAdvance ?? 0,
      yAdvance: g.yAdvance ?? 0,
      xOffset: g.xOffset ?? 0,
      yOffset: g.yOffset ?? 0,
      kind: this.glyphKind(g.codepoint),
    }));
  }
}
