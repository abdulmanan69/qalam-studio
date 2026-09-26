/**
 * Minimal keyboard-shortcut parsing/matching.
 *
 * Combos are written like "mod+shift+z", "alt+n", "?" or "delete".
 * `mod` means ⌘ on Apple platforms and Ctrl elsewhere. Letter and digit keys
 * are matched on `event.code` so they work on any keyboard layout (including
 * Urdu/Arabic/Persian layouts, where `event.key` is not a Latin letter).
 */

export interface KeyCombo {
  mod: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

export const IS_MAC: boolean =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function parseCombo(combo: string): KeyCombo {
  const parts = combo.toLowerCase().split('+');
  // "plus" names the + key, since "+" is the separator.
  const key = parts.pop() ?? '';
  return {
    mod: parts.includes('mod'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key: key === 'plus' ? '+' : key,
  };
}

interface KeyEventLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const CODE_KEYS: Record<string, string> = { '[': 'BracketLeft', ']': 'BracketRight', "'": 'Quote' };

export function matchesCombo(event: KeyEventLike, combo: string, isMac: boolean = IS_MAC): boolean {
  const c = parseCombo(combo);
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  if (c.mod !== modPressed) return false;
  if (c.alt !== event.altKey) return false;

  if (/^[a-z]$/.test(c.key)) {
    if (c.shift !== event.shiftKey) return false;
    return event.code === `Key${c.key.toUpperCase()}`;
  }
  if (/^[0-9]$/.test(c.key)) {
    if (c.shift !== event.shiftKey) return false;
    return event.code === `Digit${c.key}`;
  }
  // Brackets and quote are matched by physical key, so Shift combos work on any layout.
  const code = CODE_KEYS[c.key];
  if (code) {
    if (c.shift !== event.shiftKey) return false;
    return event.code === code;
  }
  // Symbols ("?", "/", "=") already encode shift in `event.key`.
  if (c.shift && !event.shiftKey) return false;
  return event.key.toLowerCase() === c.key;
}

const KEY_LABELS: Record<string, string> = {
  delete: 'Del',
  backspace: '⌫',
  escape: 'Esc',
  enter: '↵',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ' ': 'Space',
};

/** Display tokens for a combo, e.g. "mod+shift+z" → ["Ctrl", "Shift", "Z"]. */
export function formatCombo(combo: string, isMac: boolean = IS_MAC): string[] {
  const c = parseCombo(combo);
  const tokens: string[] = [];
  if (c.mod) tokens.push(isMac ? '⌘' : 'Ctrl');
  if (c.alt) tokens.push(isMac ? '⌥' : 'Alt');
  if (c.shift) tokens.push(isMac ? '⇧' : 'Shift');
  tokens.push(KEY_LABELS[c.key] ?? (c.key.length === 1 ? c.key.toUpperCase() : c.key));
  return tokens;
}

/** Plain-text combo for menus and tooltips, e.g. "mod+o" → "Ctrl+O". */
export function shortcutText(combo: string, isMac: boolean = IS_MAC): string {
  return formatCombo(combo, isMac).join('+');
}

/** True when keystrokes should go to a text field rather than app shortcuts. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset'].includes(
      target.type,
    );
  }
  return false;
}
