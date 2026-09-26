import { endOfLetter, extendableLetters, letterIndices, wordIndices } from './joining';
import {
  boxOfCommands,
  classifyShapes,
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
    const shapes = font.glyphShapes(sg.glyphId);
    const kinds = classifyShapes(shapes, {
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
  const splits = stretches
    .map(({ letter, extraPx }) => {
      const bodies = glyphs
        .filter((g) => g.letter === letter && !g.isKashida)
        .flatMap((g) => g.parts.filter((p) => p.kind === 'body'));
      if (bodies.length === 0) return null;
      const boxes = bodies.map((p) => boxOfCommands(p.commands));
      const left = Math.min(...boxes.map((b) => b.x));
      const right = Math.max(...boxes.map((b) => b.x + b.width));
      // The joining stroke of right-to-left letters is on their left side.
      const rtl = (options.direction ?? 'rtl') === 'rtl';
      const splitX = rtl ? left + (right - left) * 0.3 : left + (right - left) * 0.7;
      return { splitX, extraPx };
    })
    .filter((s): s is { splitX: number; extraPx: number } => s !== null)
    .sort((a, b) => b.splitX - a.splitX);
  if (splits.length > 0) {
    for (const glyph of glyphs) {
      glyph.x += splits.filter((s) => s.splitX < glyph.x).reduce((sum, s) => sum + s.extraPx, 0);
      for (const part of glyph.parts) {
        if (part.kind === 'body') {
          for (const s of splits) part.commands = stretchCommands(part.commands, s.splitX, s.extraPx);
        } else {
          const box = boxOfCommands(part.commands);
          const center = box.x + box.width / 2;
          const dx = splits.filter((s) => s.splitX < center).reduce((sum, s) => sum + s.extraPx, 0);
          if (dx !== 0) part.commands = transformCommands(part.commands, 1, 1, dx, 0);
        }
      }
    }
    width += splits.reduce((sum, s) => sum + s.extraPx, 0);
  }

  return { slice, width, baseline, glyphs };
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
