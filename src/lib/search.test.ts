import { describe, expect, it } from 'vitest';

import { normalizeForSearch } from './search';

describe('normalizeForSearch', () => {
  it('is case-insensitive and ignores Latin accents', () => {
    expect(normalizeForSearch('  Café DESIGN ')).toBe('cafe design');
  });

  it('ignores Arabic-script harakat so vowelled text matches plain text', () => {
    expect(normalizeForSearch('بِسْمِ اللّٰہِ')).toBe(normalizeForSearch('بسم اللہ'));
  });
});
