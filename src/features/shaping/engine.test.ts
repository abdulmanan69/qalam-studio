// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ShapingEngine } from './engine';

const FONT_DIR = resolve(__dirname, '../../../public/fonts');

function fontBytes(file: string): ArrayBuffer {
  const bytes = readFileSync(resolve(FONT_DIR, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const engine = new ShapingEngine();
const UR = { language: 'ur' } as const;
const AR = { language: 'ar' } as const;

beforeAll(() => {
  engine.loadFont('amiri', fontBytes('amiri/Amiri-Regular.ttf'));
  engine.loadFont('nastaliq', fontBytes('noto-nastaliq-urdu/NotoNastaliqUrdu-Variable.ttf'));
  engine.loadFont('gulzar', fontBytes('gulzar/Gulzar-Regular.ttf'));
  engine.loadFont('naskh', fontBytes('noto-naskh-arabic/NotoNaskhArabic-Variable.ttf'));
  engine.loadFont('scheherazade', fontBytes('scheherazade-new/ScheherazadeNew-Regular.ttf'));
});

describe('shaping', () => {
  it('uses contextual forms for joined letters', () => {
    // Isolated beh vs. initial/medial/final beh are different glyphs.
    const isolated = engine.shape('amiri', 'ب', AR);
    const joined = engine.shape('amiri', 'ببب', AR);
    expect(joined).toHaveLength(3);
    const ids = new Set(joined.map((g) => g.glyphId));
    expect(ids.size).toBe(3);
    expect(ids.has(isolated[0]?.glyphId ?? -1)).toBe(false);
  });

  it('returns glyphs in visual order with UTF-16 clusters', () => {
    const glyphs = engine.shape('amiri', 'سلم', AR);
    // Right-to-left text: the leftmost glyph is the last character.
    expect(glyphs.map((g) => g.cluster)).toEqual([2, 1, 0]);
  });

  it.each(['amiri', 'naskh', 'scheherazade'])('applies the mandatory lam-alef form in %s', (key) => {
    // Fonts implement lam-alef either as one ligature glyph or as two dedicated
    // contextual glyphs; either way, the ordinary lam/alef forms must not appear.
    const lamAlef = engine.shape(key, 'لا', AR).map((g) => g.glyphId);
    const ordinaryLam = engine.shape(key, 'لم', AR).at(-1)?.glyphId; // visual order: lam is last
    const ordinaryAlef = engine.shape(key, 'ما', AR)[0]?.glyphId; // alef is first
    expect(lamAlef.length === 1 || !lamAlef.some((id) => id === ordinaryLam || id === ordinaryAlef)).toBe(
      true,
    );
  });

  it('positions diacritics as zero-advance marks', () => {
    const glyphs = engine.shape('amiri', 'بِ', AR);
    const mark = glyphs.find((g) => g.kind === 'mark');
    expect(mark).toBeDefined();
    expect(mark?.xAdvance).toBe(0);
    // Character-level clusters: the mark keeps its own index.
    expect(mark?.cluster).toBe(1);
  });

  it('shapes Urdu Nastaliq without missing glyphs', () => {
    for (const key of ['nastaliq', 'gulzar']) {
      const glyphs = engine.shape(key, 'خوش آمدید ۔ ہمارا پاکستان', UR);
      expect(glyphs.length).toBeGreaterThan(0);
      expect(glyphs.some((g) => g.glyphId === 0)).toBe(false);
    }
  });

  it('applies the Nastaliq cascading baseline (glyphs are vertically offset)', () => {
    const glyphs = engine.shape('nastaliq', 'بستی', UR);
    expect(glyphs.some((g) => g.yOffset !== 0)).toBe(true);
  });

  it('accepts OpenType feature settings and ignores malformed tags', () => {
    expect(() =>
      engine.shape('amiri', 'سلام', { ...AR, features: { kern: false, ss01: true, bad: true } }),
    ).not.toThrow();
  });

  it('throws for fonts that were never loaded', () => {
    expect(() => engine.shape('missing', 'a', AR)).toThrow(/Font not loaded/);
  });
});

describe('layout', () => {
  const options = { ...UR, fontSize: 100 };

  it('produces a sized box with drawable glyph paths', () => {
    const layout = engine.layout('nastaliq', 'خوش آمدید', options);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeCloseTo(layout.ascent + layout.descent);
    const drawable = layout.glyphs.filter((g) => g.path.length > 0);
    expect(drawable.length).toBeGreaterThan(3);
    expect(drawable[0]?.path).toMatch(/^M/);
    // The space has no outline.
    expect(layout.glyphs.some((g) => g.path === '')).toBe(true);
  });

  it('keeps glyph origins inside the horizontal extent', () => {
    const layout = engine.layout('amiri', 'بسم الله', options);
    for (const g of layout.glyphs) {
      expect(g.x).toBeGreaterThanOrEqual(-1);
      expect(g.x).toBeLessThanOrEqual(layout.width + 1);
    }
  });

  it('scales linearly with font size', () => {
    const small = engine.layout('amiri', 'سلام', { ...AR, fontSize: 50 });
    const large = engine.layout('amiri', 'سلام', { ...AR, fontSize: 100 });
    expect(large.width).toBeCloseTo(small.width * 2, 5);
  });

  it('lays out multiple lines, right-aligned by default for RTL', () => {
    const layout = engine.layout('amiri', 'سلام\nبسم الله الرحمن', { ...AR, fontSize: 40 });
    expect(layout.lines).toHaveLength(2);
    const [short, long] = layout.lines;
    expect(long?.width).toBeCloseTo(layout.width);
    // The short line hugs the right edge.
    expect((short?.x ?? 0) + (short?.width ?? 0)).toBeCloseTo(layout.width);
    expect(long?.baseline).toBeCloseTo((short?.baseline ?? 0) + layout.lineAdvance);
    // Clusters index into the full text: line 2 starts after "سلام\n".
    expect(long?.start).toBe(5);
    expect(Math.min(...layout.glyphs.filter((g) => g.line === 1).map((g) => g.cluster))).toBe(5);
  });

  it('supports center and end alignment', () => {
    const text = 'سلام\nبسم الله الرحمن';
    const centered = engine.layout('amiri', text, { ...AR, fontSize: 40, align: 'center' });
    const end = engine.layout('amiri', text, { ...AR, fontSize: 40, align: 'end' });
    const shortCentered = centered.lines[0];
    expect(shortCentered?.x).toBeCloseTo((centered.width - (shortCentered?.width ?? 0)) / 2);
    expect(end.lines[0]?.x).toBe(0);
  });

  it('tightens lines with a smaller line height (Nastaliq stacking)', () => {
    const text = 'خوش\nآمدید';
    const normal = engine.layout('nastaliq', text, { ...options, lineHeight: 1 });
    const tight = engine.layout('nastaliq', text, { ...options, lineHeight: 0.5 });
    expect(tight.height).toBeLessThan(normal.height);
    expect(tight.lineAdvance).toBeCloseTo(normal.lineAdvance / 2);
  });

  it('handles empty text and trailing line breaks', () => {
    const empty = engine.layout('amiri', '', options);
    expect(empty.width).toBe(0);
    expect(empty.glyphs).toEqual([]);
    expect(engine.layout('amiri', 'سلام\n', options).lines).toHaveLength(2);
  });
});
