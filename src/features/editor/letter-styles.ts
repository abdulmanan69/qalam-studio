import type { PartOverride, TextRun } from '@/features/projects/schema';
import { isArabicLetter } from '@/features/shaping/joining';
import type { AlternateForm, TextLayout } from '@/features/shaping/types';

/**
 * Letter styles ("text carving"): give one letter a calligraphic shape —
 * wider, taller, leaning, swashed, lengthened with kashida, or one of the
 * font's own alternate forms — everywhere in a text or only in one word.
 * Pure functions over the document; the panel previews them.
 */

export type LetterStyleId =
  | 'wide'
  | 'wider'
  | 'widest'
  | 'narrow'
  | 'tall'
  | 'taller'
  | 'short'
  | 'large'
  | 'small'
  | 'leanRight'
  | 'leanLeft'
  | 'swash'
  | 'flat'
  | 'sweep'
  | 'raised'
  | 'lowered'
  | 'kashidaShort'
  | 'kashidaMedium'
  | 'kashidaLong'
  | 'kashidaExtra';

export type LetterStyle =
  | {
      id: LetterStyleId;
      kind: 'shape';
      scaleX: number;
      scaleY: number;
      angle: number;
      /** Vertical shift of the whole letter, in em (negative = up). */
      rise: number;
    }
  | { id: LetterStyleId; kind: 'kashida'; em: number };

const shape = (id: LetterStyleId, scaleX: number, scaleY: number, angle = 0, rise = 0): LetterStyle => ({
  id,
  kind: 'shape',
  scaleX,
  scaleY,
  angle,
  rise,
});

export const LETTER_STYLES: readonly LetterStyle[] = [
  shape('wide', 1.25, 1),
  shape('wider', 1.5, 1),
  shape('widest', 1.85, 1),
  shape('narrow', 0.8, 1),
  shape('tall', 1, 1.25),
  shape('taller', 1, 1.5),
  shape('short', 1, 0.8),
  shape('large', 1.3, 1.3),
  shape('small', 0.8, 0.8),
  shape('leanRight', 1, 1, -10),
  shape('leanLeft', 1, 1, 10),
  shape('swash', 1.6, 0.85),
  shape('flat', 1.45, 0.7),
  shape('sweep', 1.35, 1.1, -4),
  shape('raised', 1, 1, 0, -0.12),
  shape('lowered', 1, 1, 0, 0.12),
  { id: 'kashidaShort', kind: 'kashida', em: 0.5 },
  { id: 'kashidaMedium', kind: 'kashida', em: 1 },
  { id: 'kashidaLong', kind: 'kashida', em: 2 },
  { id: 'kashidaExtra', kind: 'kashida', em: 3 },
];

export function getLetterStyle(id: string): LetterStyle | undefined {
  return LETTER_STYLES.find((s) => s.id === id);
}

/** Distinct letters of a text, in order of first appearance. */
export function distinctLetters(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (isArabicLetter(ch.charCodeAt(0)) && ch !== 'ـ') seen.add(ch);
  }
  return [...seen];
}

/** UTF-16 indices where `letter` occurs, optionally only within one word. */
export function letterOccurrences(
  text: string,
  letter: string,
  layout: Pick<TextLayout, 'glyphs'>,
  word: number | null,
): number[] {
  const wordOf = new Map(layout.glyphs.map((g) => [g.letter, g.word]));
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) !== letter) continue;
    if (word !== null && wordOf.get(i) !== word) continue;
    out.push(i);
  }
  return out;
}

/** Part keys of one letter, split into bodies (with their width) and all parts. */
function partsOfLetter(layout: Pick<TextLayout, 'glyphs'>, letter: number) {
  const body: { key: string; width: number }[] = [];
  const all: string[] = [];
  for (const glyph of layout.glyphs) {
    if (glyph.letter !== letter || glyph.isKashida) continue;
    for (const part of glyph.parts) {
      all.push(part.key);
      if (part.kind === 'body') body.push({ key: part.key, width: part.box.width });
    }
  }
  return { body, all };
}

/**
 * Horizontal shift that makes a width change grow away from the letter's
 * joining side: right-to-left letters connect on the right, so they grow to
 * the left and the connection stays in place.
 */
export function anchoredShift(scaleX: number, width: number): number {
  return Math.round((-((scaleX - 1) * width) / 2) * 1000) / 1000;
}

function neutral(existing: PartOverride | undefined): PartOverride {
  const next: PartOverride = { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1 };
  if (existing?.kind) next.kind = existing.kind;
  if (existing?.hidden) next.hidden = true;
  if (existing?.link) next.link = existing.link;
  return next;
}

function isEmpty(o: PartOverride): boolean {
  return (
    o.dx === 0 &&
    o.dy === 0 &&
    o.angle === 0 &&
    o.scaleX === 1 &&
    o.scaleY === 1 &&
    !o.kind &&
    !o.hidden &&
    !o.link
  );
}

/** Mutable subset of a text run that styles change (works on Immer drafts). */
type StyleTarget = Pick<TextRun, 'parts' | 'kashida' | 'features' | 'fontSize' | 'text'>;

/** Remove every letter style (shape, kashida, alternate form) from the given letters. */
export function clearLetterStyle(
  run: StyleTarget,
  layout: Pick<TextLayout, 'glyphs'>,
  letters: readonly number[],
): void {
  for (const letter of letters) {
    for (const key of partsOfLetter(layout, letter).all) {
      const existing = run.parts[key];
      if (!existing) continue;
      const next = neutral(existing);
      if (isEmpty(next)) {
        run.parts = Object.fromEntries(Object.entries(run.parts).filter(([k]) => k !== key));
      } else {
        run.parts[key] = next;
      }
    }
    run.kashida = Object.fromEntries(Object.entries(run.kashida).filter(([k]) => k !== String(letter)));
    run.features = run.features.filter((f) => !(f.start === letter && f.end === letter + 1));
  }
}

/**
 * Apply a style to the given letters (replacing any earlier style on them).
 * Kashida only applies to letters that connect to the next one.
 */
export function applyLetterStyle(
  run: StyleTarget,
  layout: Pick<TextLayout, 'glyphs' | 'extendable'>,
  letters: readonly number[],
  style: LetterStyle,
): void {
  clearLetterStyle(run, layout, letters);
  const extendable = new Set(layout.extendable);
  for (const letter of letters) {
    if (style.kind === 'kashida') {
      if (extendable.has(letter)) run.kashida[String(letter)] = style.em;
      continue;
    }
    const { body, all } = partsOfLetter(layout, letter);
    for (const { key, width } of body) {
      run.parts[key] = {
        ...neutral(run.parts[key]),
        dx: anchoredShift(style.scaleX, width),
        angle: style.angle,
        scaleX: style.scaleX,
        scaleY: style.scaleY,
      };
    }
    if (style.rise !== 0) {
      const dy = Math.round(style.rise * run.fontSize * 1000) / 1000;
      for (const key of all) {
        const current = run.parts[key] ?? neutral(undefined);
        run.parts[key] = { ...current, dy };
      }
    }
  }
}

/** Apply one of the font's alternate forms to the given letters. */
export function applyAlternateStyle(
  run: StyleTarget,
  layout: Pick<TextLayout, 'glyphs'>,
  letters: readonly number[],
  form: Pick<AlternateForm, 'tag' | 'value'>,
): void {
  clearLetterStyle(run, layout, letters);
  for (const letter of letters) {
    run.features.push({ tag: form.tag, value: form.value, start: letter, end: letter + 1 });
  }
}
