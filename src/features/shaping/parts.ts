/**
 * Glyph outline → movable parts.
 *
 * A glyph outline is a list of closed contours. Contours are grouped into
 * shapes (an outer contour plus the holes inside it, e.g. the counter of و),
 * and each shape is classified as the letter **body**, a **dot** (nuqta) or
 * a **mark** (harakat and other signs). Pure geometry, no dependencies.
 */

export type PartKind = 'body' | 'dot' | 'mark';

/** Path commands in the opentype.js format (absolute coordinates). */
export interface OutlineCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Shape {
  /** Commands of the outer contour followed by its holes. */
  commands: OutlineCommand[];
  /** Filled area (outer minus holes), always positive. */
  area: number;
  box: Box;
}

interface Point {
  x: number;
  y: number;
}

interface Contour {
  commands: OutlineCommand[];
  polygon: Point[];
  signedArea: number;
  box: Box;
}

/** Split commands into contours (each starts with M). */
export function splitContours(commands: readonly OutlineCommand[]): OutlineCommand[][] {
  const contours: OutlineCommand[][] = [];
  let current: OutlineCommand[] = [];
  for (const command of commands) {
    if (command.type === 'M' && current.length > 0) {
      contours.push(current);
      current = [];
    }
    current.push(command);
  }
  if (current.length > 0) contours.push(current);
  return contours.filter((contour) => contour.some((c) => c.type !== 'M' && c.type !== 'Z'));
}

/** Flatten curves into a polygon (a few samples per curve is plenty for area and containment). */
export function flatten(commands: readonly OutlineCommand[], steps = 6): Point[] {
  const points: Point[] = [];
  let pen: Point = { x: 0, y: 0 };
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') {
      pen = { x: c.x ?? 0, y: c.y ?? 0 };
      points.push(pen);
    } else if (c.type === 'Q') {
      const x1 = c.x1 ?? 0;
      const y1 = c.y1 ?? 0;
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        points.push({
          x: u * u * pen.x + 2 * u * t * x1 + t * t * x,
          y: u * u * pen.y + 2 * u * t * y1 + t * t * y,
        });
      }
      pen = { x, y };
    } else if (c.type === 'C') {
      const x1 = c.x1 ?? 0;
      const y1 = c.y1 ?? 0;
      const x2 = c.x2 ?? 0;
      const y2 = c.y2 ?? 0;
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        points.push({
          x: u * u * u * pen.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          y: u * u * u * pen.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
        });
      }
      pen = { x, y };
    }
  }
  return points;
}

export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a && b) sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function boundsOf(points: readonly Point[]): Box {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function boxContains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x - 0.01 &&
    inner.y >= outer.y - 0.01 &&
    inner.x + inner.width <= outer.x + outer.width + 0.01 &&
    inner.y + inner.height <= outer.y + outer.height + 0.01
  );
}

/**
 * Group contours into filled shapes: a contour nested inside another one with
 * the opposite winding is a hole of the smallest such container.
 */
export function groupShapes(commands: readonly OutlineCommand[]): Shape[] {
  const contours: Contour[] = splitContours(commands).map((contour) => {
    const polygon = flatten(contour);
    return { commands: contour, polygon, signedArea: polygonArea(polygon), box: boundsOf(polygon) };
  });

  const parentOf = new Map<number, number>();
  contours.forEach((inner, i) => {
    let best = -1;
    let bestArea = Infinity;
    contours.forEach((outer, j) => {
      if (i === j) return;
      if (Math.sign(outer.signedArea) === Math.sign(inner.signedArea)) return;
      if (Math.abs(outer.signedArea) <= Math.abs(inner.signedArea)) return;
      if (!boxContains(outer.box, inner.box)) return;
      const probe = inner.polygon[0];
      if (!probe || !pointInPolygon(probe, outer.polygon)) return;
      if (Math.abs(outer.signedArea) < bestArea) {
        best = j;
        bestArea = Math.abs(outer.signedArea);
      }
    });
    if (best >= 0) parentOf.set(i, best);
  });

  const outers = contours.map((_, i) => i).filter((i) => !parentOf.has(i));

  // Fonts often build one letter body from several overlapping contours;
  // dots and marks never touch the body. Merge overlapping outer contours
  // (union-find) so each visually separate piece becomes exactly one part.
  const root = new Map<number, number>(outers.map((i) => [i, i]));
  const find = (i: number): number => {
    let r = i;
    while (root.get(r) !== r) r = root.get(r) ?? r;
    root.set(i, r);
    return r;
  };
  for (let a = 0; a < outers.length; a++) {
    for (let b = a + 1; b < outers.length; b++) {
      const ca = contours[outers[a] ?? -1];
      const cb = contours[outers[b] ?? -1];
      if (ca && cb && polygonsOverlap(ca, cb)) root.set(find(outers[a] ?? 0), find(outers[b] ?? 0));
    }
  }

  const groups = new Map<number, number[]>();
  for (const i of outers) {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), i]);
  }

  const shapes: Shape[] = [];
  for (const members of groups.values()) {
    const all = members.flatMap((i) => [
      i,
      ...contours.map((_, j) => j).filter((j) => parentOf.get(j) === i),
    ]);
    const outerArea = members.reduce((sum, i) => sum + Math.abs(contours[i]?.signedArea ?? 0), 0);
    const holeArea = all
      .filter((i) => parentOf.has(i))
      .reduce((sum, i) => sum + Math.abs(contours[i]?.signedArea ?? 0), 0);
    const points = members.flatMap((i) => contours[i]?.polygon ?? []);
    shapes.push({
      commands: all.flatMap((i) => contours[i]?.commands ?? []),
      // Overlapping outers double-count their intersection; the largest single
      // contour is a safe lower bound for classification purposes.
      area: Math.max(
        0,
        Math.max(outerArea - holeArea, ...members.map((i) => Math.abs(contours[i]?.signedArea ?? 0))),
      ),
      box: boundsOf(points),
    });
  }
  return shapes;
}

/** True if two contours share area: a vertex of one lies inside the other. */
function polygonsOverlap(a: Contour, b: Contour): boolean {
  const boxesTouch =
    a.box.x <= b.box.x + b.box.width &&
    b.box.x <= a.box.x + a.box.width &&
    a.box.y <= b.box.y + b.box.height &&
    b.box.y <= a.box.y + a.box.height;
  if (!boxesTouch) return false;
  return (
    a.polygon.some((p) => pointInPolygon(p, b.polygon)) || b.polygon.some((p) => pointInPolygon(p, a.polygon))
  );
}

/** Combining marks: harakat, Quranic annotation signs, superscript alef. */
export function isCombiningMark(codePoint: number): boolean {
  return (
    (codePoint >= 0x0610 && codePoint <= 0x061a) ||
    (codePoint >= 0x064b && codePoint <= 0x065f) ||
    codePoint === 0x0670 ||
    (codePoint >= 0x06d6 && codePoint <= 0x06dc) ||
    (codePoint >= 0x06df && codePoint <= 0x06e4) ||
    (codePoint >= 0x06e7 && codePoint <= 0x06e8) ||
    (codePoint >= 0x06ea && codePoint <= 0x06ed) ||
    (codePoint >= 0x08d3 && codePoint <= 0x08ff)
  );
}

const DOT_NAME = /(dot|nokta|nuqta|noqta)/i;
const MARK_NAME =
  /(fatha|kasra|damma|shadda|sukun|tanwin|hamza|madda|superscript|toe|smalltah|tahabove|gafbar|kehehbar|vowel)/i;

export interface ClassifyContext {
  /** GDEF class of the glyph ("mark" for glyphs positioned by mark attachment). */
  glyphKind: 'base' | 'ligature' | 'mark' | 'component' | 'unclassified';
  /** Code point of the character the glyph was shaped from. */
  codePoint: number;
  glyphName: string | null;
  /** Size of one em in the shapes' coordinate units (the font's unitsPerEm). */
  em: number;
}

function isCompact(box: Box): boolean {
  if (box.width <= 0 || box.height <= 0) return false;
  const ratio = box.width / box.height;
  return ratio > 0.35 && ratio < 2.8;
}

/** Classify the shapes of one glyph. Returns one kind per shape. */
export function classifyShapes(shapes: readonly Shape[], context: ClassifyContext): PartKind[] {
  if (shapes.length === 0) return [];
  // Harakat and other combining marks.
  if (isCombiningMark(context.codePoint)) return shapes.map(() => 'mark');

  const name = context.glyphName ?? '';
  if (context.glyphKind === 'mark') {
    // Mark-positioned glyphs that come from a letter are its dots (Nastaliq fonts
    // often draw nuqtas as separate glyphs) — unless the name says otherwise.
    if (MARK_NAME.test(name) && !DOT_NAME.test(name)) return shapes.map(() => 'mark');
    return shapes.map((shape) => (isCompact(shape.box) || DOT_NAME.test(name) ? 'dot' : 'mark'));
  }

  const largest = Math.max(...shapes.map((s) => s.area));
  return shapes.map((shape) => {
    if (shape.area >= largest * 0.999) return 'body';
    const size = Math.max(shape.box.width, shape.box.height);
    // Nuqtas are small and roughly square/round. Thin letter bodies can have
    // little area, so absolute size matters as much as relative area.
    if (isCompact(shape.box) && (size < context.em * 0.22 || shape.area < largest * 0.3)) return 'dot';
    if (size < context.em * 0.35 || shape.area < largest * 0.3) return 'mark';
    return 'body';
  });
}

/** Serialize commands to SVG path data. */
export function toPathData(commands: readonly OutlineCommand[], decimals = 2): string {
  const f = (n: number | undefined) => {
    const v = Number((n ?? 0).toFixed(decimals));
    return Object.is(v, -0) ? '0' : String(v);
  };
  let out = '';
  for (const c of commands) {
    switch (c.type) {
      case 'M':
      case 'L':
        out += `${c.type}${f(c.x)} ${f(c.y)}`;
        break;
      case 'Q':
        out += `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
        break;
      case 'C':
        out += `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
        break;
      case 'Z':
        out += 'Z';
        break;
    }
  }
  return out;
}

/** Apply `x' = x·sx + tx, y' = y·sy + ty` to every coordinate. */
export function transformCommands(
  commands: readonly OutlineCommand[],
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): OutlineCommand[] {
  return commands.map((c) => ({
    type: c.type,
    ...(c.x !== undefined ? { x: c.x * sx + tx } : {}),
    ...(c.y !== undefined ? { y: c.y * sy + ty } : {}),
    ...(c.x1 !== undefined ? { x1: c.x1 * sx + tx } : {}),
    ...(c.y1 !== undefined ? { y1: c.y1 * sy + ty } : {}),
    ...(c.x2 !== undefined ? { x2: c.x2 * sx + tx } : {}),
    ...(c.y2 !== undefined ? { y2: c.y2 * sy + ty } : {}),
  }));
}

/**
 * Kashida path-stretch: every point right of `splitX` moves right by `extra`,
 * so the stroke crossing `splitX` lengthens smoothly while both ends keep
 * their shape.
 */
export function stretchCommands(
  commands: readonly OutlineCommand[],
  splitX: number,
  extra: number,
): OutlineCommand[] {
  const move = (x: number | undefined) => (x !== undefined && x > splitX ? x + extra : x);
  return commands.map((c) => ({
    ...c,
    ...(c.x !== undefined ? { x: move(c.x) } : {}),
    ...(c.x1 !== undefined ? { x1: move(c.x1) } : {}),
    ...(c.x2 !== undefined ? { x2: move(c.x2) } : {}),
  }));
}

export function boxOfCommands(commands: readonly OutlineCommand[]): Box {
  return boundsOf(flatten(commands));
}
