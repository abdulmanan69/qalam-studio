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
  glyphPath: (id, x, y) => `M${x} ${y}#${id}`,
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

  it('passes positioned origins to the outline provider', () => {
    const layout = layoutText(fakeFont, 'ab', { language: 'en', fontSize: 10 });
    expect(layout.glyphs[1]?.path).toBe('M5 8#98');
  });
});
