import { isCombiningMark } from './parts';

/**
 * Arabic-script joining behavior (Unicode ArabicShaping.txt, simplified to
 * what kashida placement needs): which letters connect to the following
 * letter, and which accept a connection from the previous one.
 */

/** Right-joining letters: connect to the previous letter only (ا د ذ ر ز و ے …). */
const RIGHT_JOINING: readonly [number, number][] = [
  [0x0622, 0x0625],
  [0x0627, 0x0627],
  [0x0629, 0x0629],
  [0x062f, 0x0632],
  [0x0648, 0x0648],
  [0x0671, 0x0673],
  [0x0675, 0x0677],
  [0x0688, 0x0699],
  [0x06c0, 0x06c0],
  [0x06c3, 0x06cb],
  [0x06cd, 0x06cd],
  [0x06cf, 0x06cf],
  [0x06d2, 0x06d3],
  [0x06d5, 0x06d5],
  [0x06ee, 0x06ef],
  [0x0759, 0x075b],
  [0x076b, 0x076c],
  [0x0771, 0x0771],
  [0x0773, 0x0774],
  [0x0778, 0x0779],
];

/** Letters that never join (hamza). */
const NON_JOINING = new Set([0x0621, 0x0674]);

const TATWEEL = 0x0640;

function inRanges(code: number, ranges: readonly [number, number][]): boolean {
  return ranges.some(([from, to]) => code >= from && code <= to);
}

export function isArabicLetter(code: number): boolean {
  if (isCombiningMark(code)) return false;
  return (
    (code >= 0x0620 && code <= 0x064a) ||
    (code >= 0x066e && code <= 0x06d3) ||
    code === 0x06d5 ||
    (code >= 0x06ee && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f)
  );
}

/** The letter connects to the letter after it (dual-joining, or tatweel). */
export function joinsNext(code: number): boolean {
  if (code === TATWEEL) return true;
  return isArabicLetter(code) && !NON_JOINING.has(code) && !inRanges(code, RIGHT_JOINING);
}

/** The letter accepts a connection from the letter before it. */
export function joinsPrevious(code: number): boolean {
  if (code === TATWEEL) return true;
  return isArabicLetter(code) && !NON_JOINING.has(code);
}

/**
 * Index of the letter each UTF-16 position belongs to: combining marks belong
 * to the preceding base character.
 */
export function letterIndices(text: string): number[] {
  const out: number[] = [];
  let current = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (!isCombiningMark(code) || i === 0) current = i;
    out.push(current);
  }
  return out;
}

/** Word number of each UTF-16 position (whitespace separates words; line breaks too). */
export function wordIndices(text: string): number[] {
  const out: number[] = [];
  let word = 0;
  let inSpace = false;
  for (let i = 0; i < text.length; i++) {
    const space = /\s/u.test(text.charAt(i));
    if (space && !inSpace) word += 1;
    inSpace = space;
    out.push(word);
  }
  return out;
}

/**
 * Letters that can take a kashida: they join the next letter (skipping
 * combining marks) and that letter accepts the connection.
 */
export function extendableLetters(text: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (!joinsNext(code) || code === TATWEEL) continue;
    let j = i + 1;
    while (j < text.length && isCombiningMark(text.charCodeAt(j))) j++;
    if (j < text.length && joinsPrevious(text.charCodeAt(j))) result.push(i);
  }
  return result;
}

/** Index just past a letter and its trailing combining marks. */
export function endOfLetter(text: string, index: number): number {
  let j = index + 1;
  while (j < text.length && isCombiningMark(text.charCodeAt(j))) j++;
  return j;
}
