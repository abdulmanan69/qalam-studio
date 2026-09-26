import type { Artboard } from '@/features/projects/schema';
import type { Box } from '@/features/shaping/types';

import type { ViewOptions } from '../editor-store';

/**
 * Snapping for moved objects: artboard edges and center, guides, the grid
 * and (smart guides) the edges and centers of other objects. Text also snaps
 * its baselines to horizontal guides. Pure functions.
 */

export interface SnapTargets {
  xs: number[];
  ys: number[];
  grid: number | null;
  width: number;
  height: number;
}

/** A line to draw while snapped: `axis` "x" = vertical line at x = position. */
export interface SnapLine {
  axis: 'x' | 'y';
  position: number;
  from: number;
  to: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  lines: SnapLine[];
}

export function collectSnapTargets(
  artboard: Pick<Artboard, 'width' | 'height' | 'guides'>,
  others: readonly Box[],
  view: Pick<ViewOptions, 'snap' | 'smartGuides' | 'grid' | 'gridSize'>,
): SnapTargets {
  const xs: number[] = [];
  const ys: number[] = [];
  if (view.snap) {
    xs.push(0, artboard.width / 2, artboard.width);
    ys.push(0, artboard.height / 2, artboard.height);
    for (const guide of artboard.guides) (guide.axis === 'x' ? xs : ys).push(guide.position);
  }
  if (view.smartGuides) {
    for (const b of others) {
      xs.push(b.x, b.x + b.width / 2, b.x + b.width);
      ys.push(b.y, b.y + b.height / 2, b.y + b.height);
    }
  }
  return {
    xs,
    ys,
    grid: view.snap && view.grid && view.gridSize > 0 ? view.gridSize : null,
    width: artboard.width,
    height: artboard.height,
  };
}

function bestOffset(
  own: readonly number[],
  targets: readonly number[],
  grid: number | null,
  tolerance: number,
): { offset: number; at: number } | null {
  const candidates: { offset: number; at: number }[] = [];
  for (const value of own) {
    for (const target of targets) candidates.push({ offset: target - value, at: target });
    if (grid) {
      const target = Math.round(value / grid) * grid;
      candidates.push({ offset: target - value, at: target });
    }
  }
  let best: { offset: number; at: number } | null = null;
  for (const candidate of candidates) {
    if (Math.abs(candidate.offset) > tolerance) continue;
    if (!best || Math.abs(candidate.offset) < Math.abs(best.offset)) best = candidate;
  }
  return best;
}

/**
 * Offset that snaps `box` (and optional extra horizontal lines such as text
 * baselines) to the nearest target within `tolerance`, per axis.
 */
export function snapBox(
  box: Box,
  extraYs: readonly number[],
  targets: SnapTargets,
  tolerance: number,
): SnapResult {
  const ownX = [box.x, box.x + box.width / 2, box.x + box.width];
  const ownY = [box.y, box.y + box.height / 2, box.y + box.height, ...extraYs];
  const x = bestOffset(ownX, targets.xs, targets.grid, tolerance);
  const y = bestOffset(ownY, targets.ys, targets.grid, tolerance);
  const lines: SnapLine[] = [];
  // Grid snaps are not worth a line; everything else is.
  if (x && !(targets.grid && x.at % targets.grid === 0 && !targets.xs.includes(x.at))) {
    lines.push({ axis: 'x', position: x.at, from: 0, to: targets.height });
  }
  if (y && !(targets.grid && y.at % targets.grid === 0 && !targets.ys.includes(y.at))) {
    lines.push({ axis: 'y', position: y.at, from: 0, to: targets.width });
  }
  return { dx: x?.offset ?? 0, dy: y?.offset ?? 0, lines };
}
