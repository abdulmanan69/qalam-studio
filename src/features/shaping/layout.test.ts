import { describe, expect, it } from 'vitest';

import { layoutText, splitLines, type LayoutFont } from './layout';
import type { ShapedGlyph } from './types';

/** A fake monospaced font: every character is one 500-unit glyph, left to right. */
const fakeFont: LayoutFont = {
  metrics: () => ({ unitsPerEm: 1000, ascender: 800, descender: -200, lineGap: 0 }),
  shape: (text) =>
    Array.from(text).map<ShapedGlyph>((ch, i) => ({
      glyphId: ch.charCodeAt(0),
      cluster: i,
      xAdvance: 500,
      yAdvance: 0,
      xOffset: 0,
      yOffset: ch === '^' ? 100 : 0,
      kind: 'base',
    })),
  // Each glyph is a 100 × 100 unit square sitting on the baseline.
  glyphShapes: () => [
    {
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 100, y: 0 },
        { type: 'L', x: 100, y: -100 },
        { type: 'L', x: 0, y: -100 },
        { type: 'Z' },
      ],
      area: 10_000,
      box: { x: 0, y: -100, width: 100, height: 100 },
    },
  ],
  glyphName: () => null,
  hasCodePoint: () => false,
};

describe('splitLines', () => {
  it('splits on LF, CR and CRLF, keeping offsets', () => {
    expect(splitLines('ab\ncd\r\nef\rg')).toEqual([
      { text: 'ab', start: 0 },
      { text: 'cd', start: 3 },
      { text: 'ef', start: 7 },
      { text: 'g', start: 10 },
    ]);
  });
});

describe('layoutText', () => {
  it('computes metrics from the font and size', () => {
    const layout = layoutText(fakeFont, 'abcd', { language: 'en', fontSize: 10 });
    expect(layout).toMatchObject({ width: 20, height: 10, ascent: 8, descent: 2, lineAdvance: 10 });
    expect(layout.glyphs.map((g) => g.x)).toEqual([0, 5, 10, 15]);
    expect(layout.glyphs.every((g) => g.y === 8)).toBe(true);
  });

  it('applies vertical offsets upward (y-down coordinates)', () => {
    const layout = layoutText(fakeFont, 'a^', { language: 'en', fontSize: 10 });
    expect(layout.glyphs[1]?.y).toBe(7);
  });

  it('aligns lines for RTL and LTR', () => {
    const rtl = layoutText(fakeFont, 'ab\nabcd', { language: 'ur', fontSize: 10 });
    expect(rtl.lines[0]?.x).toBe(10);
    const ltr = layoutText(fakeFont, 'ab\nabcd', { language: 'en', fontSize: 10, direction: 'ltr' });
    expect(ltr.lines[0]?.x).toBe(0);
    const ltrEnd = layoutText(fakeFont, 'ab\nabcd', {
      language: 'en',
      fontSize: 10,
      direction: 'ltr',
      align: 'end',
    });
    expect(ltrEnd.lines[0]?.x).toBe(10);
  });

  it('places glyph outlines at their origins, split into keyed parts', () => {
    const layout = layoutText(fakeFont, 'ab', { language: 'en', fontSize: 10, direction: 'ltr' });
    const glyph = layout.glyphs[1];
    expect(glyph?.parts).toHaveLength(1);
    expect(glyph?.parts[0]?.key).toBe('1:98:0:0');
    expect(glyph?.parts[0]?.kind).toBe('body');
    expect(glyph?.parts[0]?.box).toEqual({ x: 5, y: 7, width: 1, height: 1 });
  });

  it('stretches letters for kashida when the font has no tatweel', () => {
    const plain = layoutText(fakeFont, 'بب', { language: 'ar', fontSize: 10 });
    const long = layoutText(fakeFont, 'بب', { language: 'ar', fontSize: 10, kashida: { '0': 2 } });
    expect(plain.extendable).toEqual([0]);
    expect(long.width).toBeCloseTo(plain.width + 20);
  });
});

describe('spacing', () => {
  // The fake font lays glyphs out in logical order, i.e. left to right.
  const base = { language: 'ar', fontSize: 10, direction: 'ltr' } as const;

  it('adds letter spacing only between letters that do not connect', () => {
    // "ا" never connects to the next letter; "بب" is one connected group.
    const plain = layoutText(fakeFont, 'ابب', base);
    const spaced = layoutText(fakeFont, 'ابب', { ...base, letterSpacing: 1 });
    expect(spaced.width).toBeCloseTo(plain.width + 10);
    expect(layoutText(fakeFont, 'بب', { ...base, letterSpacing: 1 }).width).toBeCloseTo(
      layoutText(fakeFont, 'بب', base).width,
    );
  });

  it('adds word spacing once per gap between words', () => {
    const plain = layoutText(fakeFont, 'ب ب ب', base);
    const spaced = layoutText(fakeFont, 'ب ب ب', { ...base, wordSpacing: 0.5 });
    expect(spaced.width).toBeCloseTo(plain.width + 10);
  });

  it('moves glyphs apart in visual order, keeping parts with their glyph', () => {
    const spaced = layoutText(fakeFont, 'اب', { ...base, letterSpacing: 1 });
    const [left, right] = spaced.glyphs;
    expect(left?.cluster).toBe(0);
    expect((right?.x ?? 0) - (left?.x ?? 0)).toBeCloseTo(15);
    expect(right?.parts[0]?.box.x).toBeCloseTo(right?.x ?? 0);
  });

  it('optical spacing evens out gaps without joining separate letters', () => {
    const optical = layoutText(fakeFont, 'اا', { ...base, opticalSpacing: true });
    const [left, right] = optical.glyphs;
    const gap =
      (right?.parts[0]?.box.x ?? 0) - ((left?.parts[0]?.box.x ?? 0) + (left?.parts[0]?.box.width ?? 0));
    // Natural gap 4 px; the target is 0.08 em, but a gap shrinks by at most 0.2 em (2 px).
    expect(gap).toBeCloseTo(2);
  });
});
