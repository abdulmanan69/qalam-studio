import { describe, expect, it } from 'vitest';

import { clamp, cn, createId, formatBytes, toSafeFileName } from './utils';

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    const hidden = false as boolean;
    expect(cn('px-2 py-1', hidden && 'hidden', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5 MB'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it('returns a dash for invalid input', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('clamp', () => {
  it('keeps values within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('createId', () => {
  it('returns unique RFC 4122 v4 ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});

describe('toSafeFileName', () => {
  it('removes characters that are invalid in file names', () => {
    expect(toSafeFileName('a/b:c*d?"e<f>g|h')).toBe('abcdefgh');
  });

  it('keeps Arabic-script names intact', () => {
    expect(toSafeFileName('بسم اللہ')).toBe('بسم اللہ');
  });

  it('trims trailing dots and falls back when empty', () => {
    expect(toSafeFileName('design...')).toBe('design');
    expect(toSafeFileName('   ', 'fallback')).toBe('fallback');
  });
});
