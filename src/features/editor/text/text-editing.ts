/** Pure text-editing helpers used by the on-screen keyboard. */

export interface TextEdit {
  value: string;
  /** Caret position (UTF-16 index) after the edit. */
  caret: number;
}

function clampRange(value: string, start: number, end: number): [number, number] {
  const a = Math.max(0, Math.min(start, value.length));
  const b = Math.max(0, Math.min(end, value.length));
  return a <= b ? [a, b] : [b, a];
}

/** Replace the selection [start, end) with `text`. */
export function insertText(value: string, start: number, end: number, text: string): TextEdit {
  const [a, b] = clampRange(value, start, end);
  return { value: value.slice(0, a) + text + value.slice(b), caret: a + text.length };
}

/** Delete the selection, or the code point before the caret (surrogate-pair safe). */
export function deleteBackward(value: string, start: number, end: number): TextEdit {
  const [a, b] = clampRange(value, start, end);
  if (a !== b) return { value: value.slice(0, a) + value.slice(b), caret: a };
  if (a === 0) return { value, caret: 0 };
  const previous = value.charCodeAt(a - 1);
  const isLowSurrogate = previous >= 0xdc00 && previous <= 0xdfff;
  const cut = isLowSurrogate && a >= 2 ? 2 : 1;
  return { value: value.slice(0, a - cut) + value.slice(a), caret: a - cut };
}
