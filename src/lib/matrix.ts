/**
 * 2-D affine transforms in the canvas/SVG convention:
 *   [a, b, c, d, e, f]  ⇒  x' = a·x + c·y + e,  y' = b·x + d·y + f
 * Framework-free; shared by the canvas stage and the SVG/PDF exporters.
 */

export type Matrix = readonly [number, number, number, number, number, number];

export interface Point {
  x: number;
  y: number;
}

/** Translation, rotation (degrees, clockwise on screen) and scale (negative = mirrored). */
export interface Transform {
  x: number;
  y: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 · m2 — apply m2 first, then m1. */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function multiplyAll(...matrices: Matrix[]): Matrix {
  return matrices.reduce((acc, m) => multiply(acc, m), IDENTITY);
}

export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return IDENTITY;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

export function translate(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y];
}

export function rotate(degrees: number): Matrix {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos, sin, -sin, cos, 0, 0];
}

export function scale(sx: number, sy: number = sx): Matrix {
  return [sx, 0, 0, sy, 0, 0];
}

/** T(x, y) · R(angle) · S(scaleX, scaleY). */
export function compose(t: Transform): Matrix {
  return multiplyAll(translate(t.x, t.y), rotate(t.angle), scale(t.scaleX, t.scaleY));
}

/** Degrees in [0, 360), with floating-point noise snapped to 0. */
export function normalizeAngle(angle: number): number {
  const a = ((angle % 360) + 360) % 360;
  return a < 1e-9 || 360 - a < 1e-9 ? 0 : a;
}

/** Inverse of `compose` for skew-free matrices. Mirroring is folded into a negative scaleY. */
export function decompose(m: Matrix): Transform {
  const [a, b, c, d, e, f] = m;
  const scaleX = Math.hypot(a, b);
  const angle = (Math.atan2(b, a) * 180) / Math.PI;
  const det = a * d - b * c;
  const scaleY = scaleX === 0 ? Math.hypot(c, d) : det / scaleX;
  return { x: e, y: f, angle: normalizeAngle(angle), scaleX, scaleY };
}

export function applyToPoint(m: Matrix, p: Point): Point {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

export function isIdentity(m: Matrix, epsilon = 1e-9): boolean {
  return m.every((v, i) => Math.abs(v - (IDENTITY[i] ?? 0)) < epsilon);
}

/**
 * Per-part adjustment relative to the part's own center `c`:
 *   P = T(c + d) · R(angle) · S(scale) · T(−c)
 */
export interface PartTransform {
  dx: number;
  dy: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

export const NO_PART_TRANSFORM: PartTransform = { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1 };

export function partMatrix(center: Point, t: PartTransform): Matrix {
  return multiplyAll(
    translate(center.x + t.dx, center.y + t.dy),
    rotate(t.angle),
    scale(t.scaleX, t.scaleY),
    translate(-center.x, -center.y),
  );
}

export function partTransformFromMatrix(center: Point, m: Matrix): PartTransform {
  const t = decompose(multiply(m, translate(center.x, center.y)));
  return { dx: t.x - center.x, dy: t.y - center.y, angle: t.angle, scaleX: t.scaleX, scaleY: t.scaleY };
}

export function isNeutralPart(t: PartTransform, epsilon = 1e-6): boolean {
  const angle = normalizeAngle(t.angle);
  return (
    Math.abs(t.dx) < epsilon &&
    Math.abs(t.dy) < epsilon &&
    (angle < epsilon || 360 - angle < epsilon) &&
    Math.abs(t.scaleX - 1) < epsilon &&
    Math.abs(t.scaleY - 1) < epsilon
  );
}

const COMMAND = /([MLQCZ])([^MLQCZ]*)/gi;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function format(n: number, decimals = 2): string {
  const factor = 10 ** decimals;
  const v = Math.round(n * factor) / factor;
  return Object.is(v, -0) ? '0' : String(v);
}

/** Transform absolute M/L/Q/C/Z path data (as produced by the shaping engine). */
export function transformPathData(d: string, m: Matrix): string {
  if (isIdentity(m)) return d;
  let out = '';
  for (const [, command = '', args = ''] of d.matchAll(COMMAND)) {
    const upper = command.toUpperCase();
    if (upper === 'Z') {
      out += 'Z';
      continue;
    }
    const numbers = (args.match(NUMBER) ?? []).map(Number);
    const coords: string[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      const p = applyToPoint(m, { x: numbers[i] ?? 0, y: numbers[i + 1] ?? 0 });
      coords.push(`${format(p.x)} ${format(p.y)}`);
    }
    out += upper + coords.join(' ');
  }
  return out;
}

/** Bounding box of the control polygon of absolute path data (quick and slightly generous). */
export function pathDataBounds(d: string): { x: number; y: number; width: number; height: number } {
  const numbers = (d.match(NUMBER) ?? []).map(Number);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i] ?? 0;
    const y = numbers[i + 1] ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** SVG `matrix(…)` transform attribute value. */
export function toSvgMatrix(m: Matrix): string {
  return `matrix(${m.map((v) => format(v, 6)).join(' ')})`;
}
