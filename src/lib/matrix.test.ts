import { describe, expect, it } from 'vitest';

import {
  applyToPoint,
  compose,
  decompose,
  invert,
  multiply,
  partMatrix,
  partTransformFromMatrix,
  pathDataBounds,
  transformPathData,
  translate,
} from './matrix';

const close = (a: number, b: number) => {
  expect(a).toBeCloseTo(b, 6);
};

describe('matrix', () => {
  it('composes and decomposes translate · rotate · scale', () => {
    const t = { x: 10, y: -4, angle: 30, scaleX: 2, scaleY: 0.5 };
    const back = decompose(compose(t));
    close(back.x, 10);
    close(back.y, -4);
    close(back.angle, 30);
    close(back.scaleX, 2);
    close(back.scaleY, 0.5);
  });

  it('represents mirroring as a negative scale', () => {
    const m = multiply([-1, 0, 0, 1, 0, 0], compose({ x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 }));
    const p = applyToPoint(compose(decompose(m)), { x: 3, y: 5 });
    close(p.x, -3);
    close(p.y, 5);
  });

  it('inverts', () => {
    const m = compose({ x: 5, y: 7, angle: 45, scaleX: 3, scaleY: 3 });
    const p = applyToPoint(multiply(invert(m), m), { x: 2, y: -9 });
    close(p.x, 2);
    close(p.y, -9);
  });

  it('round-trips part adjustments around the part center', () => {
    const center = { x: 100, y: 50 };
    const t = { dx: 12, dy: -3, angle: 90, scaleX: 1.5, scaleY: 1.5 };
    const m = partMatrix(center, t);
    // The center moves by (dx, dy).
    const c = applyToPoint(m, center);
    close(c.x, 112);
    close(c.y, 47);
    const back = partTransformFromMatrix(center, multiply(translate(0, 0), m));
    close(back.dx, 12);
    close(back.dy, -3);
    close(back.angle, 90);
    close(back.scaleX, 1.5);
  });

  it('transforms and measures path data', () => {
    const d = transformPathData('M0 0L10 0Q10 10 0 10Z', translate(5, 5));
    expect(d).toBe('M5 5L15 5Q15 15 5 15Z');
    expect(pathDataBounds(d)).toEqual({ x: 5, y: 5, width: 10, height: 10 });
  });
});
