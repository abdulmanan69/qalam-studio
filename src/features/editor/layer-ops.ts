import type { Draft } from 'immer';

import type { Layer, Project } from '@/features/projects/schema';
import type { Box } from '@/features/shaping/types';
import { createId } from '@/lib/utils';
import { decompose, multiply, scale, translate, type Transform } from '@/lib/matrix';

import type { LayerChange } from './canvas/artboard-stage';
import { assetMatrix, textMatrix, unionBoxes } from './units';

/**
 * Document operations on layers, written as Immer recipes (they mutate a
 * draft). Layer order in `project.layers` is the paint order, bottom first;
 * only the relative order within an artboard matters.
 */

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type ReorderMode = 'forward' | 'backward' | 'front' | 'back';

export function findLayer(project: Pick<Project, 'layers'>, id: string): Layer | undefined {
  return project.layers.find((l) => l.id === id);
}

export function artboardLayers(project: Pick<Project, 'layers'>, artboardId: string): Layer[] {
  return project.layers.filter((l) => l.artboardId === artboardId);
}

/** Remove groups that no longer have members. */
export function pruneGroups(draft: Draft<Project>): void {
  const used = new Set(draft.layers.map((l) => l.groupId).filter((id): id is string => id !== null));
  draft.groups = draft.groups.filter((g) => used.has(g.id));
}

export function deleteLayers(draft: Draft<Project>, ids: readonly string[]): void {
  const remove = new Set(ids);
  draft.layers = draft.layers.filter((l) => !remove.has(l.id));
  pruneGroups(draft);
}

export function translateLayers(draft: Draft<Project>, ids: readonly string[], dx: number, dy: number): void {
  const move = new Set(ids);
  for (const layer of draft.layers) {
    if (!move.has(layer.id) || layer.locked) continue;
    layer.x += dx;
    layer.y += dy;
  }
}

export function applyLayerChanges(draft: Draft<Project>, changes: readonly LayerChange[]): void {
  for (const change of changes) {
    const layer = draft.layers.find((l) => l.id === change.id);
    if (!layer) continue;
    if (change.kind === 'text' && layer.kind === 'text') {
      Object.assign(layer, roundTransform(change.transform));
    } else if (change.kind === 'svg' && layer.kind === 'svg') {
      layer.x = round(change.x);
      layer.y = round(change.y);
      layer.angle = round(change.angle);
      layer.width = round(change.width);
      layer.height = round(change.height);
    }
  }
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function roundTransform(t: Transform): Transform {
  return {
    x: round(t.x),
    y: round(t.y),
    angle: round(t.angle),
    scaleX: round(t.scaleX) || 1,
    scaleY: round(t.scaleY) || 1,
  };
}

/** Move the given layers one step (or all the way) up or down within their artboard. */
export function reorderLayers(draft: Draft<Project>, ids: readonly string[], mode: ReorderMode): void {
  const selected = new Set(ids);
  const layers = [...draft.layers];
  const artboards = new Set(layers.filter((l) => selected.has(l.id)).map((l) => l.artboardId));
  for (const artboardId of artboards) {
    const slots = layers.map((l, i) => (l.artboardId === artboardId ? i : -1)).filter((i) => i >= 0);
    let order = slots.map((i) => layers[i] as Layer);
    if (mode === 'front' || mode === 'back') {
      const moving = order.filter((l) => selected.has(l.id));
      const staying = order.filter((l) => !selected.has(l.id));
      order = mode === 'front' ? [...staying, ...moving] : [...moving, ...staying];
    } else if (mode === 'forward') {
      for (let i = order.length - 2; i >= 0; i--) {
        const a = order[i];
        const b = order[i + 1];
        if (a && b && selected.has(a.id) && !selected.has(b.id)) {
          order[i] = b;
          order[i + 1] = a;
        }
      }
    } else {
      for (let i = 1; i < order.length; i++) {
        const a = order[i - 1];
        const b = order[i];
        if (a && b && selected.has(b.id) && !selected.has(a.id)) {
          order[i - 1] = b;
          order[i] = a;
        }
      }
    }
    slots.forEach((slot, n) => {
      const layer = order[n];
      if (layer) layers[slot] = layer;
    });
  }
  draft.layers = layers;
}

/**
 * Move one layer next to another (drag and drop in the layers panel). With
 * `above`, it ends up painted directly above the target.
 */
export function moveLayerNextTo(draft: Draft<Project>, id: string, targetId: string, above: boolean): void {
  if (id === targetId) return;
  const moving = draft.layers.find((l) => l.id === id);
  const target = draft.layers.find((l) => l.id === targetId);
  if (!moving || !target) return;
  const rest = draft.layers.filter((l) => l.id !== id);
  const index = rest.findIndex((l) => l.id === targetId);
  moving.artboardId = target.artboardId;
  moving.groupId = target.groupId;
  rest.splice(above ? index + 1 : index, 0, moving);
  draft.layers = rest;
  pruneGroups(draft);
}

/** Group layers under a new group; members become contiguous at the top-most member's position. */
export function groupLayers(draft: Draft<Project>, ids: readonly string[], name: string): string | null {
  const members = new Set(ids);
  const layers = draft.layers.filter((l) => members.has(l.id));
  const first = layers[0];
  if (!first || layers.some((l) => l.artboardId !== first.artboardId)) return null;
  const groupId = createId();
  draft.groups.push({ id: groupId, name });
  const topIndex = Math.max(...draft.layers.map((l, i) => (members.has(l.id) ? i : -1)));
  for (const layer of layers) layer.groupId = groupId;
  const ordered: Draft<Layer>[] = [];
  draft.layers.forEach((layer, index) => {
    if (index === topIndex) ordered.push(...layers);
    else if (!members.has(layer.id)) ordered.push(layer);
  });
  draft.layers = ordered;
  pruneGroups(draft);
  return groupId;
}

export function ungroup(draft: Draft<Project>, groupId: string): void {
  for (const layer of draft.layers) if (layer.groupId === groupId) layer.groupId = null;
  pruneGroups(draft);
}

/** Copies of layers with fresh ids, shifted by (dx, dy), placed on `artboardId`. Groups are dropped. */
export function cloneLayers(layers: readonly Layer[], artboardId: string, dx: number, dy: number): Layer[] {
  return layers.map((layer) => ({
    ...structuredClone(layer),
    id: createId(),
    artboardId,
    groupId: null,
    locked: false,
    x: layer.x + dx,
    y: layer.y + dy,
  }));
}

/** Insert copies above the top-most layer of their artboard. Returns the new ids. */
export function insertLayers(draft: Draft<Project>, layers: readonly Layer[]): string[] {
  draft.layers.push(...(layers as Draft<Layer>[]));
  return layers.map((l) => l.id);
}

/**
 * Align layers. With one layer, it aligns to the artboard; with several, to
 * their combined bounds.
 */
export function alignLayers(
  draft: Draft<Project>,
  bounds: ReadonlyMap<string, Box>,
  mode: AlignMode,
  artboard: { width: number; height: number },
): void {
  const boxes = [...bounds.values()];
  const reference =
    boxes.length === 1 ? { x: 0, y: 0, width: artboard.width, height: artboard.height } : unionBoxes(boxes);
  if (!reference) return;
  for (const [id, box] of bounds) {
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = reference.x - box.x;
    if (mode === 'centerX') dx = reference.x + reference.width / 2 - (box.x + box.width / 2);
    if (mode === 'right') dx = reference.x + reference.width - (box.x + box.width);
    if (mode === 'top') dy = reference.y - box.y;
    if (mode === 'centerY') dy = reference.y + reference.height / 2 - (box.y + box.height / 2);
    if (mode === 'bottom') dy = reference.y + reference.height - (box.y + box.height);
    translateLayers(draft, [id], round(dx), round(dy));
  }
}

/** Equal gaps between three or more layers along an axis. */
export function distributeLayers(
  draft: Draft<Project>,
  bounds: ReadonlyMap<string, Box>,
  axis: 'x' | 'y',
): void {
  if (bounds.size < 3) return;
  const pos = (b: Box) => (axis === 'x' ? b.x : b.y);
  const size = (b: Box) => (axis === 'x' ? b.width : b.height);
  const items = [...bounds.entries()].sort((a, b) => pos(a[1]) - pos(b[1]));
  const first = items[0]?.[1];
  const last = items.at(-1)?.[1];
  if (!first || !last) return;
  const span = pos(last) + size(last) - pos(first);
  const total = items.reduce((sum, [, b]) => sum + size(b), 0);
  const gap = (span - total) / (items.length - 1);
  let cursor = pos(first);
  for (const [id, box] of items) {
    const delta = cursor - pos(box);
    if (axis === 'x') translateLayers(draft, [id], round(delta), 0);
    else translateLayers(draft, [id], 0, round(delta));
    cursor += size(box) + gap;
  }
}

/**
 * Mirror layers across a vertical (axis "x": x = at) or horizontal (axis "y":
 * y = at) line. Text is truly mirrored; SVG artwork keeps its orientation and
 * only moves to the mirrored position.
 */
export function mirrorLayers(
  draft: Draft<Project>,
  ids: readonly string[],
  axis: 'x' | 'y',
  at: number,
): void {
  const mirror =
    axis === 'x'
      ? multiply(translate(2 * at, 0), scale(-1, 1))
      : multiply(translate(0, 2 * at), scale(1, -1));
  const targets = new Set(ids);
  for (const layer of draft.layers) {
    if (!targets.has(layer.id) || layer.locked) continue;
    if (layer.kind === 'text') {
      Object.assign(layer, roundTransform(decompose(multiply(mirror, textMatrix(layer)))));
    } else {
      const m = assetMatrix(layer);
      const cx = m[0] * (layer.width / 2) + m[2] * (layer.height / 2) + m[4];
      const cy = m[1] * (layer.width / 2) + m[3] * (layer.height / 2) + m[5];
      const dx = axis === 'x' ? 2 * (at - cx) : 0;
      const dy = axis === 'y' ? 2 * (at - cy) : 0;
      layer.x = round(layer.x + dx);
      layer.y = round(layer.y + dy);
    }
  }
}
