import type { PartKindName, PartOverride, SvgAsset, TextRun } from '@/features/projects/schema';
import type { Box, TextLayout } from '@/features/shaping/types';
import {
  applyToPoint,
  compose,
  NO_PART_TRANSFORM,
  partMatrix,
  pathDataBounds,
  transformPathData,
  type Matrix,
  type Point,
} from '@/lib/matrix';

import type { EditLevel } from './editor-store';

/**
 * Geometry of text layers for the canvas and the exporters: every glyph part
 * with its adjustment applied, grouped into selectable "units" for the
 * current drill-down level. Pure functions; no Fabric.
 */

export interface ResolvedPart {
  key: string;
  /** Automatic or manual classification. */
  kind: PartKindName;
  autoKind: PartKindName;
  letter: number;
  word: number;
  line: number;
  hidden: boolean;
  /** Parts sharing a link move together at the part level. */
  link: string | null;
  /** Original outline and its box (layout coordinates). */
  basePath: string;
  box: Box;
  center: Point;
  override: PartOverride | undefined;
  /** Outline with the adjustment applied (layout coordinates). */
  path: string;
  matrix: Matrix;
}

export type UnitLevel = Exclude<EditLevel, 'object'>;

export interface EditUnit {
  /** Stable id: "w:<word>", "l:<letter>", "p:<part key>" or "g:<link>". */
  id: string;
  level: UnitLevel;
  parts: ResolvedPart[];
  letter: number | null;
}

/** Layer transform of a text run: layout coordinates → artboard coordinates. */
export function textMatrix(run: Pick<TextRun, 'x' | 'y' | 'angle' | 'scaleX' | 'scaleY'>): Matrix {
  return compose(run);
}

/** Transform of an SVG layer: its own box [0, width] × [0, height] → artboard coordinates. */
export function assetMatrix(asset: Pick<SvgAsset, 'x' | 'y' | 'angle'>): Matrix {
  return compose({ x: asset.x, y: asset.y, angle: asset.angle, scaleX: 1, scaleY: 1 });
}

function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** All parts of a layout with the run's per-part adjustments applied. */
export function resolveParts(run: Pick<TextRun, 'parts'>, layout: TextLayout): ResolvedPart[] {
  const parts: ResolvedPart[] = [];
  for (const glyph of layout.glyphs) {
    for (const part of glyph.parts) {
      if (!part.path) continue;
      const override = run.parts[part.key];
      const center = centerOf(part.box);
      const matrix = partMatrix(center, override ?? NO_PART_TRANSFORM);
      parts.push({
        key: part.key,
        kind: override?.kind ?? part.kind,
        autoKind: part.kind,
        letter: glyph.letter,
        word: glyph.word,
        line: glyph.line,
        hidden: override?.hidden ?? false,
        link: override?.link ?? null,
        basePath: part.path,
        box: part.box,
        center,
        override,
        path: transformPathData(part.path, matrix),
        matrix,
      });
    }
  }
  return parts;
}

export function joinPaths(parts: readonly ResolvedPart[]): string {
  return parts.map((p) => p.path).join('');
}

/** Visible outline of a whole text layer (layout coordinates). */
export function visiblePath(parts: readonly ResolvedPart[]): string {
  return joinPaths(parts.filter((p) => !p.hidden));
}

/**
 * Group parts into units for a drill-down level. With `lockMarks`, dots and
 * marks move with their letter at the word and letter levels; without it they
 * stay put (and only become selectable at the part level).
 */
export function buildUnits(
  parts: readonly ResolvedPart[],
  level: UnitLevel,
  lockMarks: boolean,
): { units: EditUnit[]; rest: ResolvedPart[] } {
  const units = new Map<string, EditUnit>();
  const rest: ResolvedPart[] = [];
  const add = (id: string, part: ResolvedPart, letter: number | null) => {
    let unit = units.get(id);
    if (!unit) {
      unit = { id, level, parts: [], letter };
      units.set(id, unit);
    }
    unit.parts.push(part);
  };
  for (const part of parts) {
    if (level === 'part') {
      if (part.link) add(`g:${part.link}`, part, part.letter);
      else add(`p:${part.key}`, part, part.letter);
      continue;
    }
    if (!lockMarks && part.kind !== 'body') {
      rest.push(part);
      continue;
    }
    if (level === 'word') add(`w:${String(part.word)}`, part, null);
    else add(`l:${String(part.letter)}`, part, part.letter);
  }
  return { units: [...units.values()], rest };
}

/** Axis-aligned box of path data after a matrix (control points; slightly generous). */
export function transformedBounds(path: string, m: Matrix): Box | null {
  if (!path) return null;
  const b = pathDataBounds(path);
  const corners = [
    applyToPoint(m, { x: b.x, y: b.y }),
    applyToPoint(m, { x: b.x + b.width, y: b.y }),
    applyToPoint(m, { x: b.x, y: b.y + b.height }),
    applyToPoint(m, { x: b.x + b.width, y: b.y + b.height }),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Artboard-space bounds of a layer (null for a text layer that is not shaped yet or is blank). */
export function layerBounds(layer: TextRun | SvgAsset, layout: TextLayout | undefined): Box | null {
  if (layer.kind === 'svg') {
    return transformedBounds(`M0 0L${String(layer.width)} ${String(layer.height)}`, assetMatrix(layer));
  }
  if (!layout) return null;
  return transformedBounds(visiblePath(resolveParts(layer, layout)), textMatrix(layer));
}

export function unionBoxes(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

/** Linear gradient end points in object-bounding-box fractions for an angle in degrees. */
export function gradientVector(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const r = (angle * Math.PI) / 180;
  const dx = Math.cos(r) / 2;
  const dy = Math.sin(r) / 2;
  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${String((n >> 16) & 255)},${String((n >> 8) & 255)},${String(n & 255)},${String(alpha)})`;
}
