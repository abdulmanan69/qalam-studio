import { Canvas, FabricImage, Group, Path, Rect, type FabricObject } from 'fabric';

import type { SvgAsset, TextRun } from '@/features/projects/schema';
import type { TextLayout } from '@/features/shaping/types';

/**
 * Fabric.js scene for one artboard. Framework-free: the React wrapper feeds
 * it document state (`sync`) and receives user edits through callbacks.
 *
 * Document coordinates are artboard pixels; every object uses a top-left
 * origin so `left/top` map directly to the document's `x/y`.
 */

export interface LayerTransform {
  x: number;
  y: number;
  /** Negative values mean mirrored. */
  scaleX: number;
  scaleY: number;
  angle: number;
}

export type StageChange =
  | ({ kind: 'text'; id: string } & LayerTransform)
  | { kind: 'asset'; id: string; x: number; y: number; width: number; height: number; angle: number };

export interface StageCallbacks {
  onSelect: (id: string | null) => void;
  onChange: (change: StageChange) => void;
}

export interface StageTextLayer {
  run: TextRun;
  /** Undefined while the run is being shaped; an existing drawing is kept meanwhile. */
  layout: TextLayout | undefined;
}

interface TextEntry {
  kind: 'text';
  object: Group;
  layout: TextLayout;
  fill: string;
}

interface AssetEntry {
  kind: 'asset';
  object: FabricImage | null;
  svg: string;
  token: number;
  latest: SvgAsset;
}

type Entry = TextEntry | AssetEntry;

const SELECTION_STYLE = {
  borderColor: '#2f6fa3',
  cornerColor: '#ffffff',
  cornerStrokeColor: '#2f6fa3',
  cornerStyle: 'circle' as const,
  transparentCorners: false,
  cornerSize: 10,
  borderScaleFactor: 1.5,
  padding: 4,
};

const EPSILON = 1e-6;

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Build the Fabric group for a laid-out text run: one path per visible glyph. */
export function buildTextGroup(layout: TextLayout, fill: string): Group {
  // An invisible box keeps the group's bounds equal to the layout box, so the
  // selection frame is stable while typing and includes the full line height.
  const box = new Rect({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    width: Math.max(1, layout.width),
    height: Math.max(1, layout.height),
    fill: 'rgba(0,0,0,0)',
    strokeWidth: 0,
    selectable: false,
    evented: false,
  });
  const glyphs = layout.glyphs
    .filter((glyph) => glyph.path.length > 0)
    .map(
      (glyph) =>
        new Path(glyph.path, {
          fill,
          stroke: null,
          strokeWidth: 0,
          objectCaching: false,
          selectable: false,
          evented: false,
        }),
    );
  return new Group([box, ...glyphs], {
    originX: 'left',
    originY: 'top',
    subTargetCheck: false,
    interactive: false,
    ...SELECTION_STYLE,
  });
}

function toFabricTransform(t: LayerTransform) {
  return {
    left: t.x,
    top: t.y,
    scaleX: Math.abs(t.scaleX),
    scaleY: Math.abs(t.scaleY),
    flipX: t.scaleX < 0,
    flipY: t.scaleY < 0,
    angle: t.angle,
  };
}

function readTransform(object: FabricObject): LayerTransform {
  return {
    x: object.left,
    y: object.top,
    scaleX: object.flipX ? -object.scaleX : object.scaleX,
    scaleY: object.flipY ? -object.scaleY : object.scaleY,
    angle: object.angle,
  };
}

function applyTransform(object: FabricObject, t: LayerTransform): void {
  const next = toFabricTransform(t);
  const changed =
    Math.abs(object.left - next.left) > EPSILON ||
    Math.abs(object.top - next.top) > EPSILON ||
    Math.abs(object.scaleX - next.scaleX) > EPSILON ||
    Math.abs(object.scaleY - next.scaleY) > EPSILON ||
    Math.abs(object.angle - next.angle) > EPSILON ||
    object.flipX !== next.flipX ||
    object.flipY !== next.flipY;
  if (changed) {
    object.set(next);
    object.setCoords();
  }
}

function assetTransform(asset: SvgAsset, image: FabricImage): LayerTransform {
  return {
    x: asset.x,
    y: asset.y,
    scaleX: asset.width / Math.max(1, image.width),
    scaleY: asset.height / Math.max(1, image.height),
    angle: asset.angle,
  };
}

export class ArtboardStage {
  private readonly canvas: Canvas;
  private readonly entries = new Map<string, Entry>();
  private readonly idOf = new WeakMap<FabricObject, string>();
  private order: string[] = [];
  private muteSelection = false;
  private disposed = false;
  private nextToken = 1;

  constructor(
    element: HTMLCanvasElement,
    private readonly callbacks: StageCallbacks,
  ) {
    this.canvas = new Canvas(element, {
      selection: false,
      preserveObjectStacking: true,
      uniformScaling: true,
      controlsAboveOverlay: true,
      stopContextMenu: true,
    });
    this.canvas.on('object:modified', ({ target }) => {
      this.handleModified(target);
    });
    this.canvas.on('selection:created', () => {
      this.emitSelection();
    });
    this.canvas.on('selection:updated', () => {
      this.emitSelection();
    });
    this.canvas.on('selection:cleared', () => {
      if (!this.muteSelection) this.callbacks.onSelect(null);
    });
  }

  /** Canvas size in screen pixels = artboard size × zoom; drawing stays in artboard units. */
  setViewport(width: number, height: number, zoom: number): void {
    this.canvas.setDimensions({ width: Math.round(width * zoom), height: Math.round(height * zoom) });
    this.canvas.setZoom(zoom);
    this.canvas.requestRenderAll();
  }

  setBackground(color: string): void {
    this.canvas.backgroundColor = color;
    this.canvas.requestRenderAll();
  }

  /** Disable hit-testing (e.g. while the hand tool pans the view). */
  setInteractive(interactive: boolean): void {
    this.canvas.skipTargetFind = !interactive;
    if (!interactive) this.withMutedSelection(() => this.canvas.discardActiveObject());
    this.canvas.requestRenderAll();
  }

  /** Reconcile the scene with the document. Paint order: artwork, then text. */
  sync(assets: readonly SvgAsset[], texts: readonly StageTextLayer[]): void {
    const wanted = new Set<string>([...assets.map((a) => a.id), ...texts.map((t) => t.run.id)]);
    for (const [id, entry] of this.entries) {
      if (!wanted.has(id)) {
        if (entry.object) this.canvas.remove(entry.object);
        this.entries.delete(id);
      }
    }
    for (const asset of assets) this.syncAsset(asset);
    for (const text of texts) this.syncText(text);
    this.order = [...assets.map((a) => a.id), ...texts.map((t) => t.run.id)];
    this.applyOrder();
    this.canvas.requestRenderAll();
  }

  select(id: string | null): void {
    const object = id ? this.entries.get(id)?.object : null;
    this.withMutedSelection(() => {
      if (object?.visible) {
        if (this.canvas.getActiveObject() !== object) this.canvas.setActiveObject(object);
      } else if (this.canvas.getActiveObject()) {
        this.canvas.discardActiveObject();
      }
    });
    this.canvas.requestRenderAll();
  }

  dispose(): void {
    this.disposed = true;
    this.entries.clear();
    void this.canvas.dispose();
  }

  private syncText({ run, layout }: StageTextLayer): void {
    const existing = this.entries.get(run.id);
    const current = existing?.kind === 'text' ? existing : undefined;
    // Keep the current drawing while a new layout is pending (or unchanged).
    if (current && (!layout || (current.layout === layout && current.fill === run.fill))) {
      applyTransform(current.object, run);
      current.object.visible = !run.hidden;
      return;
    }
    if (!layout) return;
    const group = buildTextGroup(layout, run.fill);
    applyTransform(group, run);
    group.visible = !run.hidden;
    this.replaceObject(run.id, existing?.object ?? null, group);
    this.entries.set(run.id, { kind: 'text', object: group, layout, fill: run.fill });
  }

  private syncAsset(asset: SvgAsset): void {
    const existing = this.entries.get(asset.id);
    if (existing?.kind === 'asset' && existing.svg === asset.svg) {
      existing.latest = asset;
      if (existing.object) {
        applyTransform(existing.object, assetTransform(asset, existing.object));
        existing.object.visible = !asset.hidden;
      }
      return;
    }
    if (existing?.object) this.canvas.remove(existing.object);
    const token = this.nextToken++;
    const entry: AssetEntry = { kind: 'asset', object: null, svg: asset.svg, token, latest: asset };
    this.entries.set(asset.id, entry);
    FabricImage.fromURL(svgDataUrl(asset.svg))
      .then((image) => {
        const current = this.entries.get(asset.id);
        if (this.disposed || current?.kind !== 'asset' || current.token !== token) return;
        image.set({ originX: 'left', originY: 'top', lockScalingFlip: true, ...SELECTION_STYLE });
        applyTransform(image, assetTransform(current.latest, image));
        image.visible = !current.latest.hidden;
        this.idOf.set(image, asset.id);
        current.object = image;
        this.canvas.add(image);
        this.applyOrder();
        this.canvas.requestRenderAll();
      })
      .catch((error: unknown) => {
        console.error('Could not load SVG artwork', error);
      });
  }

  private replaceObject(id: string, previous: FabricObject | null, next: FabricObject): void {
    const wasActive = previous !== null && this.canvas.getActiveObject() === previous;
    this.idOf.set(next, id);
    // Removing the active object makes Fabric fire "selection:cleared"; this is
    // a re-render of the same layer, so keep the selection silently.
    this.withMutedSelection(() => {
      if (previous) this.canvas.remove(previous);
      this.canvas.add(next);
      if (wasActive) this.canvas.setActiveObject(next);
    });
  }

  private applyOrder(): void {
    let index = 0;
    for (const id of this.order) {
      const object = this.entries.get(id)?.object;
      if (object) {
        this.canvas.moveObjectTo(object, index);
        index += 1;
      }
    }
  }

  private handleModified(target: FabricObject | undefined): void {
    if (!target) return;
    const id = this.idOf.get(target);
    const entry = id ? this.entries.get(id) : undefined;
    if (!id || !entry) return;
    if (entry.kind === 'text') {
      this.callbacks.onChange({ kind: 'text', id, ...readTransform(target) });
    } else {
      this.callbacks.onChange({
        kind: 'asset',
        id,
        x: target.left,
        y: target.top,
        width: target.width * target.scaleX,
        height: target.height * target.scaleY,
        angle: target.angle,
      });
    }
  }

  private emitSelection(): void {
    if (this.muteSelection) return;
    const active = this.canvas.getActiveObject();
    this.callbacks.onSelect(active ? (this.idOf.get(active) ?? null) : null);
  }

  private withMutedSelection(action: () => void): void {
    this.muteSelection = true;
    try {
      action();
    } finally {
      this.muteSelection = false;
    }
  }
}
