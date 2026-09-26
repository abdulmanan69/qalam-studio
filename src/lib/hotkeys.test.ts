import { describe, expect, it } from 'vitest';

import { formatCombo, isEditableTarget, matchesCombo, parseCombo, shortcutText } from './hotkeys';

function key(overrides: Partial<Parameters<typeof matchesCombo>[0]>) {
  return { key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides };
}

describe('parseCombo', () => {
  it('parses modifiers and key', () => {
    expect(parseCombo('mod+shift+z')).toEqual({ mod: true, alt: false, shift: true, key: 'z' });
    expect(parseCombo('mod+plus')).toEqual({ mod: true, alt: false, shift: false, key: '+' });
  });
});

describe('matchesCombo', () => {
  it('maps mod to Ctrl on Windows/Linux and ⌘ on macOS', () => {
    const ctrlO = key({ key: 'o', code: 'KeyO', ctrlKey: true });
    const cmdO = key({ key: 'o', code: 'KeyO', metaKey: true });
    expect(matchesCombo(ctrlO, 'mod+o', false)).toBe(true);
    expect(matchesCombo(cmdO, 'mod+o', false)).toBe(false);
    expect(matchesCombo(cmdO, 'mod+o', true)).toBe(true);
  });

  it('matches letters by physical key so non-Latin layouts work', () => {
    // Urdu layout: the "N" key produces "ن".
    expect(matchesCombo(key({ key: 'ن', code: 'KeyN', altKey: true }), 'alt+n', false)).toBe(true);
  });

  it('requires exact shift state for letters and digits', () => {
    expect(matchesCombo(key({ key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true }), 'mod+z', false)).toBe(
      false,
    );
    expect(matchesCombo(key({ key: '!', code: 'Digit1', shiftKey: true }), 'shift+1', false)).toBe(true);
    expect(matchesCombo(key({ key: '1', code: 'Digit1' }), 'shift+1', false)).toBe(false);
  });

  it('matches symbol keys by produced character', () => {
    expect(matchesCombo(key({ key: '?', code: 'Slash', shiftKey: true }), '?', false)).toBe(true);
    expect(matchesCombo(key({ key: '/', code: 'Slash' }), '/', false)).toBe(true);
  });

  it('rejects extra modifiers', () => {
    expect(matchesCombo(key({ key: '/', code: 'Slash', ctrlKey: true }), '/', false)).toBe(false);
  });
});

describe('formatCombo / shortcutText', () => {
  it('uses platform-specific labels', () => {
    expect(formatCombo('mod+shift+z', false)).toEqual(['Ctrl', 'Shift', 'Z']);
    expect(formatCombo('mod+shift+z', true)).toEqual(['⌘', '⇧', 'Z']);
    expect(shortcutText('mod+o', false)).toBe('Ctrl+O');
    expect(shortcutText('delete', false)).toBe('Del');
  });
});

describe('isEditableTarget', () => {
  it('detects text fields but not buttons', () => {
    const input = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const button = document.createElement('button');
    const textarea = document.createElement('textarea');
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(checkbox)).toBe(false);
    expect(isEditableTarget(button)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
