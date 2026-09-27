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

function isDigit(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) || (code >= 0x0660 && code <= 0x0669) || (code >= 0x06f0 && code <= 0x06f9)
  );
}

function isLatinLetter(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) || (code >= 0xc0 && code <= 0x24f);
}

/** Separators that stay inside a number or Latin word: 12:30, 3.5, 1/2, a@b.com, 021-123. */
// . , : / @ _ - + and the Arabic decimal and thousands separators.
const RUN_JOINERS = new Set([0x2e, 0x2c, 0x3a, 0x2f, 0x40, 0x5f, 0x2d, 0x2b, 0x066b, 0x066c]);

/**
 * Left-to-right runs inside right-to-left text (a simplified bidi pass):
 * numbers and Latin words, with separators between them, are read left to
 * right. Returns a run number per UTF-16 position, or -1 outside a run.
 */
export function ltrRunIds(text: string): number[] {
  const ids: number[] = new Array<number>(text.length).fill(-1);
  const strong = (i: number) => {
    const c = text.charCodeAt(i);
    return isDigit(c) || isLatinLetter(c);
  };
  let run = -1;
  let next = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const inRun = run >= 0 && ids[i - 1] === run;
    if (strong(i)) {
      if (!inRun) run = next++;
      ids[i] = run;
    } else if (inRun && i + 1 < text.length && strong(i + 1)) {
      // A separator, or a space between two Latin words, continues the run.
      const joins =
        RUN_JOINERS.has(code) ||
        (code === 0x20 && isLatinLetter(text.charCodeAt(i - 1)) && isLatinLetter(text.charCodeAt(i + 1)));
      if (joins) ids[i] = run;
    }
  }
  return ids;
}
