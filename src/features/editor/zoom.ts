import { clamp } from '@/lib/utils';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;
/** Padding (screen px) kept around the artboard inside the viewport. */
export const VIEWPORT_PADDING = 48;

/**
 * Browsers cap canvas size (per side and total area; Safari is strictest).
 * The artboard canvas is kept below these limits by capping the zoom.
 */
export const MAX_CANVAS_SIDE = 16_000;
export const MAX_CANVAS_AREA = 64_000_000;

/** Discrete steps used by zoom in/out buttons and shortcuts. */
export const ZOOM_STEPS = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8] as const;

export function clampZoom(zoom: number, maxZoom: number = MAX_ZOOM): number {
  return clamp(zoom, MIN_ZOOM, Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, maxZoom)));
}

/** Highest zoom whose backing canvas (at this pixel ratio) stays within browser limits. */
export function maxZoomForArtboard(
  artboard: { width: number; height: number },
  pixelRatio: number = 1,
): number {
  const ratio = Math.max(1, pixelRatio);
  const bySide = MAX_CANVAS_SIDE / (Math.max(artboard.width, artboard.height) * ratio);
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (artboard.width * artboard.height * ratio * ratio));
  return clamp(Math.min(bySide, byArea), MIN_ZOOM, MAX_ZOOM);
}

/** Next zoom step strictly above (dir = 1) or below (dir = -1) the current zoom. */
export function nextZoomStep(zoom: number, dir: 1 | -1): number {
  const epsilon = 1e-3;
  if (dir === 1) {
    return ZOOM_STEPS.find((step) => step > zoom + epsilon) ?? MAX_ZOOM;
  }
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - epsilon) ?? MIN_ZOOM;
}

/** Largest zoom at which the artboard fits inside the viewport (never above 100%). */
export function computeFitZoom(
  artboard: { width: number; height: number },
  viewport: { width: number; height: number },
  padding: number = VIEWPORT_PADDING,
): number {
  const availableW = Math.max(1, viewport.width - padding * 2);
  const availableH = Math.max(1, viewport.height - padding * 2);
  return clampZoom(Math.min(availableW / artboard.width, availableH / artboard.height, 1));
}

/** Ruler thickness in CSS pixels. */
export const RULER_SIZE = 20;

/** Tick spacing (artboard px) giving at least `minPx` screen pixels between labels. */
export function rulerStep(zoom: number, minPx = 50): number {
  for (let power = -1; power < 6; power++) {
    for (const base of [1, 2, 5]) {
      const step = base * 10 ** power;
      if (step * zoom >= minPx) return step;
    }
  }
  return 1_000_000;
}
