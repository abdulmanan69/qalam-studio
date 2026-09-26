import { describe, expect, it } from 'vitest';

import { deleteBackward, insertText } from './text-editing';

describe('insertText', () => {
  it('inserts at the caret', () => {
    expect(insertText('بس', 1, 1, 'ِ')).toEqual({ value: 'بِس', caret: 2 });
  });

  it('replaces a selection, in either direction', () => {
    expect(insertText('abcd', 1, 3, 'X')).toEqual({ value: 'aXd', caret: 2 });
    expect(insertText('abcd', 3, 1, 'X')).toEqual({ value: 'aXd', caret: 2 });
  });

  it('clamps out-of-range positions', () => {
    expect(insertText('ab', 10, 10, 'c')).toEqual({ value: 'abc', caret: 3 });
  });
});

describe('deleteBackward', () => {
  it('deletes the character before the caret', () => {
    expect(deleteBackward('بِس', 3, 3)).toEqual({ value: 'بِ', caret: 2 });
  });

  it('deletes a selection', () => {
    expect(deleteBackward('abcd', 1, 3)).toEqual({ value: 'ad', caret: 1 });
  });

  it('does nothing at the start', () => {
    expect(deleteBackward('ab', 0, 0)).toEqual({ value: 'ab', caret: 0 });
  });

  it('removes surrogate pairs as one character', () => {
    expect(deleteBackward('a😀', 3, 3)).toEqual({ value: 'a', caret: 1 });
  });
});
