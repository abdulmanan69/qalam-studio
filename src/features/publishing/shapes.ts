import type { ShapeKind, ShapeLayer, StrokeDash } from '@/features/projects/schema';
import { createId } from '@/lib/utils';

/**
 * Shapes for page design — boxes around stories, reverse (white on black)
 * headline bars, rules between stories, ad spaces — as plain path data in the
 * shape's own box (0,0 → width,height). The canvas and the exporters draw
 * the same geometry.
 */

export interface ShapeStroke {
  d: string;
  /** Fill color, or null. */
  fill: string | null;
  /** Stroke color, or null. */
  stroke: string | null;
  strokeWidth: number;
  /** Dash pattern (empty = solid). */
  dash: number[];
  /** Round line ends (dotted lines). */
  round: boolean;
}

function n(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function rectPath(x: number, y: number, w: number, h: number, radius: number): string {
  if (w <= 0 || h <= 0) return '';
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  );
}

function ellipsePath(x: number, y: number, w: number, h: number): string {
  if (w <= 0 || h <= 0) return '';
  const rx = w / 2;
  const ry = h / 2;
  const cy = y + ry;
  return `M${n(x)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(x + w)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(x)} ${n(cy)}Z`;
}

export function dashPattern(dash: StrokeDash, width: number): number[] {
  if (dash === 'dashed') return [width * 4, width * 2.5];
  if (dash === 'dotted') return [0, width * 2];
  return [];
}

/** Whether a line shape runs horizontally (along its box's longer side). */
export function isHorizontalLine(shape: Pick<ShapeLayer, 'width' | 'height'>): boolean {
  return shape.width >= shape.height;
}

/** The paths that draw a shape, bottom to top. */
export function shapeStrokes(shape: ShapeLayer): ShapeStroke[] {
  const { width: w, height: h } = shape;
  const stroke = shape.stroke && shape.stroke.width > 0 ? shape.stroke : null;
  const sw = stroke?.width ?? 0;
  const dash = stroke ? dashPattern(stroke.dash, sw) : [];
  const round = stroke?.dash === 'dotted';
  const line = (d: string): ShapeStroke => ({
    d,
    fill: null,
    stroke: stroke?.color ?? null,
    strokeWidth: sw,
    dash,
    round,
  });

  if (shape.shape === 'line') {
    if (!stroke) return [];
    const horizontal = isHorizontalLine(shape);
    const length = horizontal ? w : h;
    const middle = (horizontal ? h : w) / 2;
    // A double rule: two strokes, one stroke width apart.
    const offsets = shape.double ? [middle - sw, middle + sw] : [middle];
    return offsets.map((o) => line(horizontal ? `M0 ${n(o)}H${n(length)}` : `M${n(o)} 0V${n(length)}`));
  }

  const outline = (inset: number) =>
    shape.shape === 'ellipse'
      ? ellipsePath(inset, inset, w - inset * 2, h - inset * 2)
      : rectPath(inset, inset, w - inset * 2, h - inset * 2, Math.max(0, shape.radius - inset));
  const out: ShapeStroke[] = [];
  if (shape.fill) {
    out.push({ d: outline(0), fill: shape.fill, stroke: null, strokeWidth: 0, dash: [], round: false });
  }
  if (stroke) {
    // Strokes sit inside the box so the shape never grows past its edges.
    out.push(line(outline(sw / 2)));
    if (shape.double) out.push(line(outline(sw * 2.5)));
  }
  return out.filter((s) => s.d.length > 0);
}

export interface NewShapeOptions {
  fill?: string | null;
  stroke?: ShapeLayer['stroke'];
  radius?: number;
  double?: boolean;
  name?: string;
}

/** Default look of each kind: black rule, outlined box, outlined ellipse. */
export function createShape(
  artboardId: string,
  shape: ShapeKind,
  rect: { x: number; y: number; width: number; height: number },
  options: NewShapeOptions = {},
): ShapeLayer {
  return {
    id: createId(),
    artboardId,
    name: options.name ?? '',
    hidden: false,
    locked: false,
    groupId: null,
    kind: 'shape',
    shape,
    x: rect.x,
    y: rect.y,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
    angle: 0,
    opacity: 1,
    fill: options.fill === undefined ? null : options.fill,
    stroke:
      options.stroke === undefined
        ? { color: '#1a1a1a', width: shape === 'line' ? 1.5 : 1, dash: 'solid' }
        : options.stroke,
    radius: options.radius ?? 0,
    double: options.double ?? false,
  };
}
