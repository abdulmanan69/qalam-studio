import { describe, expect, it } from 'vitest';

import { TEXT_LANGUAGES } from '@/features/projects/schema';

import { displayKey, EXTRA_LETTERS, keyboardLayoutFor, LETTER_ROWS, MARKS } from './keyboard-layouts';

const ARABIC_BLOCKS = /^[؀-ۿݐ-ݿ]$/;

describe('keyboard layouts', () => {
  it.each(Object.entries(LETTER_ROWS))('%s layout has only Arabic-script letters, each once', (_id, rows) => {
    const keys = rows.flat();
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(ARABIC_BLOCKS);
  });

  it('has language-specific letters for Kurdish, Pashto and Sindhi', () => {
    for (const language of ['ku', 'ps', 'sd'] as const) {
      expect(EXTRA_LETTERS[language]?.length).toBeGreaterThan(4);
    }
  });

  it('maps every content language to a layout', () => {
    for (const language of TEXT_LANGUAGES) expect(LETTER_ROWS[keyboardLayoutFor(language)]).toBeDefined();
    expect(keyboardLayoutFor('ur')).toBe('ur');
    expect(keyboardLayoutFor('fa')).toBe('fa');
  });

  it('shows combining marks on a dotted circle', () => {
    const zer = MARKS.find((mark) => mark.name === 'kasra');
    expect(zer?.char).toBe('ِ');
    expect(displayKey('ِ')).toBe('◌ِ');
    expect(displayKey('ب')).toBe('ب');
  });
});
