import { describe, expect, it } from 'vitest';

import { clampZoom, computeFitZoom, MAX_ZOOM, maxZoomForArtboard, MIN_ZOOM, nextZoomStep } from './zoom';

describe('zoom helpers', () => {
  it('clamps to the supported range', () => {
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
  });

  it('steps through discrete levels', () => {
    expect(nextZoomStep(1, 1)).toBe(1.25);
    expect(nextZoomStep(1, -1)).toBe(0.75);
    expect(nextZoomStep(0.8, 1)).toBe(1);
    expect(nextZoomStep(0.8, -1)).toBe(0.75);
    expect(nextZoomStep(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoomStep(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });

  it('fits large artboards inside the viewport, respecting padding', () => {
    const zoom = computeFitZoom({ width: 2000, height: 1000 }, { width: 1096, height: 800 }, 48);
    expect(zoom).toBeCloseTo(0.5);
  });

  it('caps zoom so the canvas stays within browser size limits', () => {
    expect(maxZoomForArtboard({ width: 1000, height: 1000 })).toBe(MAX_ZOOM);
    // 10 000 px artboard: 16 000 px side limit → 1.6× at 1× pixel ratio, 0.8× at 2×.
    expect(maxZoomForArtboard({ width: 10_000, height: 500 })).toBeCloseTo(1.6);
    expect(maxZoomForArtboard({ width: 10_000, height: 500 }, 2)).toBeCloseTo(0.8);
    // Area limit dominates for large square artboards.
    expect(maxZoomForArtboard({ width: 5000, height: 5000 })).toBeCloseTo(1.6);
    expect(clampZoom(5, 2)).toBe(2);
  });

  it('never enlarges small artboards beyond 100%', () => {
    expect(computeFitZoom({ width: 100, height: 100 }, { width: 1200, height: 900 })).toBe(1);
  });
});
