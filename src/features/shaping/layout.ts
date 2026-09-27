import {
  endOfLetter,
  extendableLetters,
  joinsNext,
  joinsPrevious,
  letterIndices,
  wordIndices,
} from './joining';
import {
  boxOfCommands,
  classifyShapes,
  flatten,
  splitContours,
  stretchCommands,
  toPathData,
  transformCommands,
  type OutlineCommand,
  type PartKind,
  type Shape,
} from './parts';
import type {
  AlternateForm,
  FontMetrics,
  GlyphKind,
  GlyphPart,
  LayoutOptions,
  LineLayout,
  PositionedGlyph,
  RangeFeature,
  ShapedGlyph,
  ShapeOptions,
  TextLayout,
} from './types';

/** What the layout needs from a loaded font. Implemented by the engine; faked in tests. */
export interface LayoutFont {
  metrics(): FontMetrics;
  shape(text: string, options: ShapeOptions): ShapedGlyph[];
  /** Outline shapes in font units, origin on the baseline, y axis down. */
  glyphShapes(glyphId: number): Shape[];
  glyphName(glyphId: number): string | null;
  hasCodePoint(codePoint: number): boolean;
}

interface LineSlice {
  text: string;
  start: number;
}

const TATWEEL = 'ـ';

/** Split on CR, LF or CRLF, keeping each line's UTF-16 offset in the full text. */
export function splitLines(text: string): LineSlice[] {
  const lines: LineSlice[] = [];
  const pattern = /\r\n|\n|\r/g;
  let start = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    lines.push({ text: text.slice(start, match.index), start });
    start = match.index + match[0].length;
  }
  lines.push({ text: text.slice(start), start });
  return lines;
}

function alignOffset(options: LayoutOptions, boxWidth: number, lineWidth: number): number {
  const free = boxWidth - lineWidth;
  const align = options.align ?? 'start';
  if (align === 'center') return free / 2;
  const rtl = (options.direction ?? 'rtl') === 'rtl';
  // "start" hugs the right edge for right-to-left scripts.
  return (align === 'start') === rtl ? free : 0;
}

interface DraftPart {
  index: number;
  kind: PartKind;
  commands: OutlineCommand[];
}

interface DraftGlyph {
  glyphId: number;
  cluster: number;
  letter: number;
  word: number;
  occurrence: number;
  isKashida: boolean;
  kind: GlyphKind;
  x: number;
  y: number;
  advance: number;
  parts: DraftPart[];
}

interface DraftLine {
  slice: LineSlice;
  width: number;
  baseline: number;
  glyphs: DraftGlyph[];
}

/** Map features given in full-text indices onto a shaping string (via its index map). */
function mapRangeFeatures(
  features: readonly RangeFeature[] | undefined,
  map: readonly number[],
): RangeFeature[] {
  if (!features?.length) return [];
  const mapped: RangeFeature[] = [];
  for (const feature of features) {
    let start = -1;
    let end = -1;
    map.forEach((original, i) => {
      if (original >= feature.start && original < feature.end) {
        if (start < 0) start = i;
        end = i + 1;
      }
    });
    if (start >= 0) mapped.push({ ...feature, start, end });
  }
  return mapped;
}

interface LayoutContext {
  font: LayoutFont;
  text: string;
  options: LayoutOptions;
  scale: number;
  unitsPerEm: number;
  letters: number[];
  words: number[];
  extendable: ReadonlySet<number>;
  tatweelUnits: number;
  occurrences: Map<string, number>;
}

function buildLine(ctx: LayoutContext, slice: LineSlice, baseline: number): DraftLine {
  const { font, text, options, scale } = ctx;
  const lineEnd = slice.start + slice.text.length;

  // 1. Shaping string: the line plus tatweels inserted for kashida.
  let shaped = '';
  const map: number[] = [];
  const inserted: boolean[] = [];
  const stretches: { letter: number; extraPx: number }[] = [];
  for (let g = slice.start; g < lineEnd; g++) {
    shaped += text.charAt(g);
    map.push(g);
    inserted.push(false);
    const letter = ctx.letters[g] ?? g;
    const isLastOfLetter = g + 1 >= lineEnd || ctx.letters[g + 1] !== letter;
    if (!isLastOfLetter) continue;
    const extraEm = options.kashida?.[String(letter)] ?? 0;
    if (extraEm <= 0) continue;
    let remainingEm = extraEm;
    if (options.kashidaMode !== 'stretch' && ctx.tatweelUnits > 0 && ctx.extendable.has(letter)) {
      const count = Math.floor((extraEm * ctx.unitsPerEm) / ctx.tatweelUnits);
      for (let n = 0; n < count; n++) {
        shaped += TATWEEL;
        map.push(letter);
        inserted.push(true);
      }
      remainingEm = extraEm - (count * ctx.tatweelUnits) / ctx.unitsPerEm;
    }
    if (remainingEm > 1e-6) stretches.push({ letter, extraPx: remainingEm * options.fontSize });
  }

  // 2. Shape.
  const shapedGlyphs = font.shape(shaped, {
    ...options,
    rangeFeatures: mapRangeFeatures(options.rangeFeatures, map),
  });

  // 3. Place glyphs and split them into parts (line-local, left edge at 0).
  let pen = 0;
  const glyphs: DraftGlyph[] = shapedGlyphs.map((sg) => {
    const original = map[sg.cluster] ?? slice.start;
    const isKashida = inserted[sg.cluster] ?? false;
    const x = pen + sg.xOffset * scale;
    const y = baseline - sg.yOffset * scale;
    pen += sg.xAdvance * scale;
    const occurrenceKey = `${original}:${sg.glyphId}`;
    const occurrence = ctx.occurrences.get(occurrenceKey) ?? 0;
    ctx.occurrences.set(occurrenceKey, occurrence + 1);
    const glyphShapes = font.glyphShapes(sg.glyphId);
    // Simple mode (running text): one part per glyph, no classification.
    const shapes = options.simple
      ? glyphShapes.length > 0
        ? [
            {
              ...glyphShapes[0],
              commands: glyphShapes.flatMap((s) => s.commands),
            } as (typeof glyphShapes)[number],
          ]
        : []
      : glyphShapes;
    const kinds: PartKind[] = options.simple
      ? shapes.map(() => 'body')
      : classifyShapes(shapes, {
          glyphKind: sg.kind,
          codePoint: isKashida ? 0x0640 : text.charCodeAt(original),
          glyphName: font.glyphName(sg.glyphId),
          em: ctx.unitsPerEm,
        });
    return {
      glyphId: sg.glyphId,
      cluster: original,
      letter: ctx.letters[original] ?? original,
      word: ctx.words[original] ?? 0,
      occurrence,
      isKashida,
      kind: sg.kind,
      x,
      y,
      advance: sg.xAdvance * scale,
      parts: shapes.map((shape, index) => ({
        index,
        kind: kinds[index] ?? 'body',
        commands: transformCommands(shape.commands, scale, scale, x, y),
      })),
    };
  });
  let width = pen;

  // 4. Stretch fallback: lengthen the joining stroke of each letter's body.
  const rtl = (options.direction ?? 'rtl') === 'rtl';
  const splits = stretches
    .map(({ letter, extraPx }) => {
      const own = glyphs.filter((g) => g.letter === letter && !g.isKashida && g.kind !== 'mark');
      const bodies = own.flatMap((g) => g.parts.filter((p) => p.kind === 'body'));
      if (bodies.length === 0) return null;
      const splitX = joinSplit(
        bodies.map((p) => p.commands),
        rtl,
      );
      return { letter, splitX, extraPx };
    })
    .filter((s): s is { letter: number; splitX: number; extraPx: number } => s !== null);
  if (splits.length > 0) {
    for (const glyph of glyphs) {
      const own = !glyph.isKashida && glyph.kind !== 'mark';
      const glyphBox = boxOfCommands(glyph.parts.flatMap((p) => p.commands));
      const glyphCenter = glyphBox.x + glyphBox.width / 2;
      for (const s of splits) {
        if (own && glyph.letter === s.letter) {
          // The stretched letter: lengthen its joining stroke; other parts move rigidly.
          for (const part of glyph.parts) {
            if (part.kind === 'body') {
              part.commands = stretchCommands(part.commands, s.splitX, s.extraPx);
            } else {
              const box = boxOfCommands(part.commands);
              if (box.x + box.width / 2 > s.splitX) {
                part.commands = transformCommands(part.commands, 1, 1, s.extraPx, 0);
              }
            }
          }
        } else if (
          glyph.letter === s.letter
            ? glyphCenter > s.splitX
            : rtl
              ? glyph.letter < s.letter
              : glyph.letter > s.letter
        ) {
          // Every other glyph moves as a whole, never deformed. Letters are chosen by
          // logical order, not position: Nastaliq letters overlap, so the letter joined
          // to the stretched one can sit over its tail.
          glyph.x += s.extraPx;
          for (const part of glyph.parts)
            part.commands = transformCommands(part.commands, 1, 1, s.extraPx, 0);
        }
      }
    }
    width += splits.reduce((sum, s) => sum + s.extraPx, 0);
  }

  // 5. Spacing between unconnected letters and between words.
  width += applySpacing(ctx, glyphs);

  return { slice, width, baseline, glyphs };
}

/** Optical spacing targets and limits, in em. */
const OPTICAL = {
  letterGap: 0.08,
  wordGap: 0.28,
  letterMin: -0.2,
  letterMax: 0.12,
  wordMin: -0.3,
  wordMax: 0.2,
};

function inkRange(glyphs: readonly DraftGlyph[]): { left: number; right: number } | null {
  let left = Infinity;
  let right = -Infinity;
  for (const glyph of glyphs) {
    for (const part of glyph.parts) {
      if (part.kind !== 'body' || part.commands.length === 0) continue;
      const box = boxOfCommands(part.commands);
      left = Math.min(left, box.x);
      right = Math.max(right, box.x + box.width);
    }
  }
  return Number.isFinite(left) ? { left, right } : null;
}

/**
 * Add letter spacing (between letters that do not connect, within a word),
 * word spacing and — optionally — optical spacing, which evens out the ink
 * gaps between unconnected letter groups and between words. Connected
 * letters are never pulled apart. Returns the added line width.
 */
function applySpacing(ctx: LayoutContext, glyphs: DraftGlyph[]): number {
  const { options, text } = ctx;
  const em = options.fontSize;
  const letterSpacing = (options.letterSpacing ?? 0) * em;
  const wordSpacing = (options.wordSpacing ?? 0) * em;
  const optical = options.opticalSpacing ?? false;
  if (letterSpacing === 0 && wordSpacing === 0 && !optical) return 0;
  const rtl = (options.direction ?? 'rtl') === 'rtl';

  // Base glyphs in visual (left-to-right) order; marks follow their letter.
  const bases = glyphs.filter((g) => g.kind !== 'mark');
  const isSpace = (g: DraftGlyph) => !g.isKashida && /\s/u.test(text.charAt(g.cluster));

  type Boundary = 'joined' | 'letter' | 'word';
  const boundaries: Boundary[] = [];
  for (let i = 0; i + 1 < bases.length; i++) {
    const a = bases[i] as DraftGlyph;
    const b = bases[i + 1] as DraftGlyph;
    if (isSpace(a) || isSpace(b)) {
      boundaries.push('word');
      continue;
    }
    if (a.word !== b.word) {
      boundaries.push('word');
      continue;
    }
    const [first, second] = rtl ? [b, a] : [a, b];
    const joined =
      a.letter === b.letter ||
      a.isKashida ||
      b.isKashida ||
      (joinsNext(text.charCodeAt(first.letter)) && joinsPrevious(text.charCodeAt(second.letter)));
    boundaries.push(joined ? 'joined' : 'letter');
  }

  // Connected groups of non-space glyphs, to measure ink gaps between them.
  const groupOf: number[] = [];
  let group = 0;
  bases.forEach((g, i) => {
    if (i > 0 && boundaries[i - 1] !== 'joined') group++;
    groupOf.push(isSpace(g) ? -1 : group);
  });
  const groupInk = new Map<number, { left: number; right: number } | null>();
  const inkOf = (id: number) => {
    if (!groupInk.has(id)) groupInk.set(id, inkRange(bases.filter((_, i) => groupOf[i] === id)));
    return groupInk.get(id) ?? null;
  };

  // Extra space at each boundary between bases i and i + 1.
  const deltas = boundaries.map((kind, i) => {
    if (kind === 'joined') return 0;
    const b = bases[i + 1] as DraftGlyph;
    if (kind === 'word') {
      // Count each word gap once: at the boundary on the far side of the space(s).
      if (isSpace(b)) return 0;
      let delta = wordSpacing;
      if (optical) {
        let j = i;
        while (j >= 0 && isSpace(bases[j] as DraftGlyph)) j--;
        const left = j >= 0 ? inkOf(groupOf[j] ?? -1) : null;
        const right = inkOf(groupOf[i + 1] ?? -1);
        if (left && right) {
          const gap = right.left - left.right;
          delta += clamp(OPTICAL.wordGap * em - gap, OPTICAL.wordMin * em, OPTICAL.wordMax * em);
        }
      }
      return delta;
    }
    let delta = letterSpacing;
    if (optical) {
      const left = inkOf(groupOf[i] ?? -1);
      const right = inkOf(groupOf[i + 1] ?? -1);
      if (left && right) {
        const gap = right.left - left.right;
        delta += clamp(OPTICAL.letterGap * em - gap, OPTICAL.letterMin * em, OPTICAL.letterMax * em);
      }
    }
    return delta;
  });

  // Cumulative shift per base glyph; marks move with their letter's base.
  const shiftOfBase = new Map<DraftGlyph, number>();
  let running = 0;
  bases.forEach((g, i) => {
    if (i > 0) running += deltas[i - 1] ?? 0;
    shiftOfBase.set(g, running);
  });
  const shiftOfLetter = new Map<number, number>();
  for (const [g, shift] of shiftOfBase) if (!shiftOfLetter.has(g.letter)) shiftOfLetter.set(g.letter, shift);

  for (const glyph of glyphs) {
    const shift = shiftOfBase.get(glyph) ?? shiftOfLetter.get(glyph.letter) ?? 0;
    if (shift === 0) continue;
    glyph.x += shift;
    for (const part of glyph.parts) part.commands = transformCommands(part.commands, 1, 1, shift, 0);
  }
  return running;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Shape and place multi-line text. Pure function: same input, same output.
 *
 * The layout box starts at (0, 0) top-left. The first baseline sits one
 * ascent below the top; each further line is `lineAdvance` lower, where
 * lineAdvance = (ascent + descent) × lineHeight. Every glyph is split into
 * parts (body, dots, marks) with stable keys for per-part editing.
 */
export function layoutText(font: LayoutFont, text: string, options: LayoutOptions): TextLayout {
  const metrics = font.metrics();
  const scale = options.fontSize / metrics.unitsPerEm;
  const ascent = metrics.ascender * scale;
  const descent = -metrics.descender * scale;
  const lineAdvance = (ascent + descent) * (options.lineHeight ?? 1);

  const extendable = extendableLetters(text);
  let tatweelUnits = 0;
  if (font.hasCodePoint(0x0640)) {
    tatweelUnits = font.shape(TATWEEL, { ...options, rangeFeatures: [] })[0]?.xAdvance ?? 0;
  }
  const ctx: LayoutContext = {
    font,
    text,
    options,
    scale,
    unitsPerEm: metrics.unitsPerEm,
    letters: letterIndices(text),
    words: wordIndices(text),
    extendable: new Set(extendable),
    tatweelUnits,
    occurrences: new Map(),
  };

  const drafts = splitLines(text).map((slice, i) => buildLine(ctx, slice, ascent + i * lineAdvance));
  const width = Math.max(0, ...drafts.map((l) => l.width));
  const height = ascent + descent + Math.max(0, drafts.length - 1) * lineAdvance;

  const lines: LineLayout[] = [];
  const glyphs: PositionedGlyph[] = [];
  drafts.forEach((draft, lineIndex) => {
    const x0 = alignOffset(options, width, draft.width);
    for (const g of draft.glyphs) {
      const parts: GlyphPart[] = g.parts.map((part) => {
        const commands = x0 === 0 ? part.commands : transformCommands(part.commands, 1, 1, x0, 0);
        return {
          key: `${g.cluster}:${g.glyphId}:${g.occurrence}:${part.index}`,
          index: part.index,
          kind: part.kind,
          path: toPathData(commands),
          box: boxOfCommands(commands),
        };
      });
      glyphs.push({
        glyphId: g.glyphId,
        cluster: g.cluster,
        letter: g.letter,
        word: g.word,
        occurrence: g.occurrence,
        isKashida: g.isKashida,
        line: lineIndex,
        kind: g.kind,
        x: g.x + x0,
        y: g.y,
        advance: g.advance,
        path: parts.map((p) => p.path).join(''),
        parts,
      });
    }
    lines.push({
      start: draft.slice.start,
      end: draft.slice.start + draft.slice.text.length,
      x: x0,
      width: draft.width,
      baseline: draft.baseline,
    });
  });

  return {
    width,
    height,
    fontSize: options.fontSize,
    ascent,
    descent,
    lineAdvance,
    lines,
    glyphs,
    extendable,
  };
}

/**
 * Alternate forms the font offers for one letter (stylistic alternates,
 * swashes, stylistic sets, character variants), each with a preview outline.
 */
export function findAlternates(
  font: LayoutFont,
  text: string,
  letterIndex: number,
  options: ShapeOptions,
  featureTags: readonly string[],
  previewSize = 64,
): AlternateForm[] {
  const slice = splitLines(text).find(
    (line) => letterIndex >= line.start && letterIndex < line.start + line.text.length,
  );
  if (!slice) return [];
  const local = letterIndex - slice.start;
  const localEnd = endOfLetter(text, letterIndex) - slice.start;
  const identity = Array.from({ length: slice.text.length }, (_, i) => slice.start + i);
  // Keep other letters' alternates; drop any already applied to this letter.
  const others = mapRangeFeatures(
    (options.rangeFeatures ?? []).filter((f) => f.end <= letterIndex || f.start >= letterIndex + 1),
    identity,
  );

  const letterGlyphs = (rangeFeatures: RangeFeature[]) =>
    font
      .shape(slice.text, { ...options, rangeFeatures })
      .filter((g) => g.cluster >= local && g.cluster < localEnd && g.kind !== 'mark');

  const seen = new Set([
    letterGlyphs(others)
      .map((g) => g.glyphId)
      .join(','),
  ]);
  const forms: AlternateForm[] = [];
  for (const tag of featureTags) {
    const values = /^ss\d\d$/.test(tag) ? [1] : [1, 2, 3, 4, 5, 6, 7, 8];
    for (const value of values) {
      const glyphs = letterGlyphs([...others, { tag, value, start: local, end: local + 1 }]);
      const signature = glyphs.map((g) => g.glyphId).join(',');
      if (seen.has(signature)) {
        if (value > 1) break;
        continue;
      }
      seen.add(signature);
      forms.push({
        tag,
        value,
        glyphIds: glyphs.map((g) => g.glyphId),
        ...previewPath(font, glyphs, previewSize),
      });
    }
  }
  return forms;
}

function previewPath(font: LayoutFont, glyphs: ShapedGlyph[], size: number): { path: string; size: number } {
  let pen = 0;
  const commands: OutlineCommand[] = [];
  for (const g of glyphs) {
    for (const shape of font.glyphShapes(g.glyphId)) {
      commands.push(...transformCommands(shape.commands, 1, 1, pen + g.xOffset, -g.yOffset));
    }
    pen += g.xAdvance;
  }
  const box = boxOfCommands(commands);
  if (box.width <= 0 || box.height <= 0) return { path: '', size };
  const fit = (size * 0.85) / Math.max(box.width, box.height);
  const tx = (size - box.width * fit) / 2 - box.x * fit;
  const ty = (size - box.height * fit) / 2 - box.y * fit;
  return { path: toPathData(transformCommands(commands, fit, fit, tx, ty), 1), size };
}

/**
 * Where to stretch a letter for kashida: a vertical line through its joining
 * stroke. The outline is scanned on the joining side (left for right-to-left
 * letters); positions where the line crosses exactly one stroke are
 * candidates, and the lowest one (nearest the baseline, where letters join)
 * wins. Letters like Nastaliq ک have a tall keshan above the joint — a fixed
 * split would cut through both strokes and fill the space between them.
 */
export function joinSplit(bodies: readonly (readonly OutlineCommand[])[], rtl: boolean): number {
  const polygons = bodies.flatMap((commands) => splitContours(commands).map((c) => flatten(c)));
  const points = polygons.flat();
  if (points.length === 0) return 0;
  const left = Math.min(...points.map((p) => p.x));
  const right = Math.max(...points.map((p) => p.x));
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));
  const width = right - left;
  const fallback = rtl ? left + width * 0.3 : left + width * 0.7;
  if (width <= 0) return fallback;
  const candidates: { x: number; mid: number }[] = [];
  const samples = 48;
  for (let i = 1; i < samples; i++) {
    // Scan the joining side: the left 70 % for RTL, the right 70 % for LTR.
    const t = (i / samples) * 0.7;
    const x = rtl ? left + width * t : right - width * t;
    const ys: number[] = [];
    for (const polygon of polygons) {
      for (let k = 0; k < polygon.length; k++) {
        const a = polygon[k];
        const b = polygon[(k + 1) % polygon.length];
        if (!a || !b || (a.x - x) * (b.x - x) >= 0 || a.x === b.x) continue;
        ys.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
      }
    }
    if (ys.length === 2) candidates.push({ x, mid: ((ys[0] ?? 0) + (ys[1] ?? 0)) / 2 });
  }
  if (candidates.length === 0) return fallback;
  const lowest = Math.max(...candidates.map((c) => c.mid));
  const tolerance = (bottom - top) * 0.08;
  const near = candidates.filter((c) => c.mid >= lowest - tolerance);
  // Nearest the joining edge among the lowest single-stroke positions.
  return rtl ? Math.min(...near.map((c) => c.x)) : Math.max(...near.map((c) => c.x));
}
