import { describe, expect, it } from 'vitest';

import {
  centeredPosition,
  createTextRun,
  defaultFontSize,
  fitFontSize,
  normalizeText,
  textRunLabel,
} from './text-runs';

describe('text runs', () => {
  it('creates a valid run with sensible defaults', () => {
    const run = createTextRun({
      artboardId: 'a1',
      text: 'خوش آمدید\r\n',
      fontId: 'gulzar',
      language: 'ur',
      fontSize: 80,
    });
    expect(run).toMatchObject({
      kind: 'text',
      text: 'خوش آمدید',
      lineHeight: 1,
      align: 'start',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      hidden: false,
    });
    expect(run.id).toMatch(/[0-9a-f-]{36}/);
  });

  it('rejects empty text', () => {
    expect(() =>
      createTextRun({ artboardId: 'a1', text: '  \n ', fontId: 'amiri', language: 'ar', fontSize: 40 }),
    ).toThrow();
  });

  it('normalizes to NFC with LF line breaks and no trailing whitespace', () => {
    // Alef + madda above composes to the single code point U+0622 (آ).
    expect(normalizeText('آ\r\nب  \n\n')).toBe('آ\nب');
  });

  it('picks a default size from the artboard and fits wide text', () => {
    expect(defaultFontSize({ width: 1080, height: 1080 })).toBe(108);
    expect(defaultFontSize({ width: 50, height: 50 })).toBe(12);
    expect(fitFontSize(100, 500, { width: 1000 })).toBe(100);
    expect(fitFontSize(100, 2000, { width: 1000 })).toBe(40);
  });

  it('centers a box on the artboard', () => {
    expect(centeredPosition({ width: 1000, height: 800 }, 200, 100)).toEqual({ x: 400, y: 350 });
  });

  it('labels layers with the first line, truncated by characters', () => {
    expect(textRunLabel('پہلی سطر\nدوسری')).toBe('پہلی سطر');
    expect(textRunLabel('abcdef', 3)).toBe('abc…');
  });
});
