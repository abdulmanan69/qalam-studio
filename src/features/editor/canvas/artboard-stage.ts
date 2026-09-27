import {
  ActiveSelection,
  Canvas,
  FabricImage,
  Gradient,
  Group,
  Path,
  Point,
  Rect,
  Shadow,
  type FabricObject,
  type TPointerEvent,
} from 'fabric';

import type {
  Artboard,
  Guide,
  ImageLayer,
  Layer,
  LayerStyle,
  PartOverride,
  ShapeLayer,
  SvgAsset,
  TextFrame,
  TextRun,
} from '@/features/projects/schema';
import { columnRuleLines, layoutGuides, marginBox, pageColumns } from '@/features/publishing/pages';
import { shapeStrokes } from '@/features/publishing/shapes';
import type { FlowFrameResult } from '@/features/shaping/flow';
import type { Box, TextLayout } from '@/features/shaping/types';
import {
  applyToPoint,
  decompose,
  invert,
  multiply,
  partTransformFromMatrix,
  translate,
  type Matrix,
  type Point as XY,
  type Transform,
} from '@/lib/matrix';

import {
  SHAPE_TOOLS,
  type EditLevel,
  type EditorTool,
  type ShapeTool,
  type ViewOptions,
} from '../editor-store';
import {
  assetMatrix,
  buildUnits,
  gradientVector,
  hexToRgba,
  imagePlacement,
  joinPaths,
  resolveParts,
  textMatrix,
  visiblePath,
  type EditUnit,
  type ResolvedPart,
  type UnitLevel,
} from '../units';
import { collectSnapTargets, snapBox, type SnapLine, type SnapTargets } from './snapping';

/**
 * Fabric.js scene for one artboard. Framework-free: the React wrapper feeds
 * it document state (`sync`) and receives user edits through callbacks.
 *
 * Geometry comes from `units.ts` (plain matrices). Each Fabric object's world
 * matrix is  W = M · T(anchor),  where M maps the layer's own coordinates to
 * the artboard and `anchor` is the point of those coordinates at the object's
 * center. After the user drags, rotates or scales an object, the new layer
 * matrix is  M' = W' · T(−anchor);  for letter parts the change in layout
 * coordinates is  D = M⁻¹ · W' · T(−anchor),  applied to each part.
 */

export interface StageLayer {
  layer: Layer;
  /** Text only; undefined while shaping (the previous drawing is kept). */
  layout?: TextLayout;
  /** Text frames: the lines flowed into this frame. */
  flow?: FlowFrameResult;
  /** Text frames: the story does not fit (shown as a red marker on the last frame). */
  overflow?: boolean;
  /** Layers from the master page: drawn, never selectable. */
  readonly?: boolean;
}

export interface StageEdit {
  layerId: string;
  level: UnitLevel;
  lockMarks: boolean;
  selectedUnits: readonly string[];
}

export interface StageScene {
  artboard: Artboard;
  /** Layers of this artboard, bottom to top. */
  layers: readonly StageLayer[];
  selectedIds: readonly string[];
  edit: StageEdit | null;
  tool: EditorTool;
  view: ViewOptions;
}

export type LayerChange =
  | { id: string; kind: 'text'; transform: Transform }
  /** SVG artwork, photos and text frames: a box (frames ignore the angle). */
  | { id: string; kind: 'box'; x: number; y: number; angle: number; width: number; height: number };

export interface StageCallbacks {
  selectLayers: (ids: string[]) => void;
  selectUnits: (ids: string[]) => void;
  /** Double-click: open a text layer for editing, or go one level deeper. */
  drillDown: (layerId: string, unitId: string | null) => void;
  /** Double-click on text: type into it on the canvas. */
  editText: (layerId: string) => void;
  exitEdit: () => void;
  changeLayers: (changes: LayerChange[]) => void;
  changeParts: (layerId: string, overrides: Record<string, PartOverride>) => void;
  addGuide: (axis: Guide['axis'], position: number) => void;
  moveGuide: (id: string, position: number | null) => void;
  previewKashida: (layerId: string, letter: number, value: number) => void;
  commitKashida: (layerId: string, letter: number, value: number) => void;
  /** Frame tool: a rectangle was drawn (artboard coordinates). */
  createFrame: (rect: { x: number; y: number; width: number; height: number }) => void;
  createShape: (tool: ShapeTool, rect: { x: number; y: number; width: number; height: number }) => void;
}

interface ObjectInfo {
  layerId: string;
  /** Unit id when this object is a unit of the edited layer. */
  unitId: string | null;
  /** Layer-space point at the object's center (see file comment). */
  anchor: XY;
  /** Layer matrix M at build time. */
  matrix: Matrix;
  /** For SVG images: natural size of the bitmap (its scale is width / naturalWidth). */
  natural?: { width: number; height: number };
}

interface LayerEntry {
  /** Identity of what was drawn; unchanged signature = keep the objects. */
  signature: unknown[];
  objects: FabricObject[];
  /** Pending SVG load. */
  token?: number;
}

interface KashidaDrag {
  layerId: string;
  letter: number;
  startX: number;
  startValue: number;
  fontSize: number;
  matrix: Matrix;
  value: number;
}

interface GuideDrag {
  guide: Guide;
  position: number;
}

interface FrameDraw {
  start: XY;
  end: XY;
}

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

const UNIT_STYLE = {
  ...SELECTION_STYLE,
  borderColor: '#d9480f',
  cornerStrokeColor: '#d9480f',
  cornerSize: 8,
  padding: 2,
};

const GUIDE_COLOR = '#00a3c4';
/** Page margins and columns. */
const LAYOUT_GUIDE_COLOR = 'rgba(168,85,247,0.55)';
/** Edge of a text frame without a border (editor only). */
const FRAME_EDGE_COLOR = '#8fa3b5';
const SNAP_COLOR = '#e8408a';
const SNAP_DISTANCE_PX = 6;
const GUIDE_HIT_PX = 5;

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Place a Fabric object so that its world matrix equals `m` (skew-free). */
export function setObjectMatrix(object: FabricObject, m: Matrix): void {
  const t = decompose(m);
  object.set({
    angle: t.angle,
    scaleX: Math.abs(t.scaleX),
    scaleY: Math.abs(t.scaleY),
    flipX: t.scaleX < 0,
    flipY: t.scaleY < 0,
    skewX: 0,
    skewY: 0,
  });
  object.setPositionByOrigin(new Point(t.x, t.y), 'center', 'center');
  object.setCoords();
}

function worldMatrix(object: FabricObject): Matrix {
  const m = object.calcTransformMatrix();
  return [m[0], m[1], m[2], m[3], m[4], m[5]];
}

function applyStyle(object: FabricObject, style: LayerStyle): void {
  const fill =
    style.fill.type === 'solid'
      ? style.fill.color
      : new Gradient({
          type: 'linear',
          gradientUnits: 'percentage',
          coords: gradientVector(style.fill.angle),
          colorStops: style.fill.stops.map((s) => ({ offset: s.offset, color: s.color })),
        });
  object.set({
    fill,
    stroke: style.stroke && style.stroke.width > 0 ? style.stroke.color : null,
    strokeWidth: style.stroke?.width ?? 0,
    strokeLineJoin: 'round',
    paintFirst: 'stroke',
    opacity: style.opacity,
    shadow: style.shadow
      ? new Shadow({
          color: hexToRgba(style.shadow.color, style.shadow.opacity),
          blur: style.shadow.blur,
          offsetX: style.shadow.offsetX,
          offsetY: style.shadow.offsetY,
        })
      : null,
  });
}

export class ArtboardStage {
  private readonly canvas: Canvas;
  private readonly entries = new Map<string, LayerEntry>();
  private readonly info = new WeakMap<FabricObject, ObjectInfo>();
  private scene: StageScene | null = null;
  private muted = 0;
  private disposed = false;
  private nextToken = 1;
  private snapTargets: SnapTargets | null = null;
  private snapLines: SnapLine[] = [];
  private kashidaDrag: KashidaDrag | null = null;
  private guideDrag: GuideDrag | null = null;
  private frameDraw: FrameDraw | null = null;

  constructor(
    element: HTMLCanvasElement,
    private readonly callbacks: StageCallbacks,
  ) {
    this.canvas = new Canvas(element, {
      selection: true,
      preserveObjectStacking: true,
      uniformScaling: true,
      controlsAboveOverlay: true,
      stopContextMenu: true,
      targetFindTolerance: 4,
      selectionColor: 'rgba(47,111,163,0.08)',
      selectionBorderColor: '#2f6fa3',
      enableRetinaScaling: true,
    });
    this.canvas.on('selection:created', () => {
      this.emitSelection();
    });
    this.canvas.on('selection:updated', () => {
      this.emitSelection();
    });
    this.canvas.on('selection:cleared', () => {
      this.emitSelection();
    });
    this.canvas.on('object:moving', ({ target }) => {
      this.snapMoving(target);
    });
    this.canvas.on('object:modified', ({ target }) => {
      this.snapTargets = null;
      this.snapLines = [];
      this.handleModified(target);
    });
    this.canvas.on('mouse:dblclick', ({ target }) => {
      this.handleDoubleClick(target);
    });
    this.canvas.on('mouse:down', (event) => {
      this.handleMouseDown(event.e, event.target);
    });
    this.canvas.on('mouse:move', (event) => {
      this.handleMouseMove(event.e);
    });
    this.canvas.on('mouse:up', () => {
      this.handleMouseUp();
    });
    this.canvas.on('after:render', ({ ctx }) => {
      this.drawOverlay(ctx);
    });
  }

  /** Canvas size in screen pixels = artboard size × zoom; drawing stays in artboard units. */
  setViewport(width: number, height: number, zoom: number): void {
    this.canvas.setDimensions({ width: Math.round(width * zoom), height: Math.round(height * zoom) });
    this.canvas.setZoom(zoom);
    this.canvas.requestRenderAll();
  }

  /** Reconcile the scene with the document and editor state. */
  sync(scene: StageScene): void {
    const previous = this.scene;
    this.scene = scene;
    this.canvas.backgroundColor = scene.artboard.background;
    const interactive = scene.tool === 'select';
    this.canvas.skipTargetFind = scene.tool === 'hand';
    this.canvas.selection = interactive;
    this.canvas.defaultCursor =
      scene.tool === 'kashida'
        ? 'ew-resize'
        : scene.tool === 'baseline'
          ? 'row-resize'
          : scene.tool === 'frame' || isShapeTool(scene.tool)
            ? 'crosshair'
            : 'default';

    const wanted = new Set(scene.layers.map((l) => l.layer.id));
    this.withMuted(() => {
      if (
        previous &&
        (previous.edit?.layerId !== scene.edit?.layerId || previous.edit?.level !== scene.edit?.level)
      ) {
        this.canvas.discardActiveObject();
      }
      for (const [id, entry] of this.entries) {
        if (!wanted.has(id)) {
          for (const object of entry.objects) this.canvas.remove(object);
          this.entries.delete(id);
        }
      }
      for (const item of scene.layers) this.syncLayer(item, scene);
      this.applyOrder(scene);
      this.applySelection(scene);
    });
    this.canvas.requestRenderAll();
  }

  dispose(): void {
    this.disposed = true;
    this.entries.clear();
    void this.canvas.dispose();
  }

  // ————————————————————————————————————————— building

  private syncLayer(item: StageLayer, scene: StageScene): void {
    const { layer } = item;
    const edit = scene.edit?.layerId === layer.id ? scene.edit : null;
    const editingOther = scene.edit !== null && !edit;
    const selectable = scene.tool === 'select' && !layer.locked && !editingOther && !item.readonly;
    const existing = this.entries.get(layer.id);

    if (layer.kind === 'svg') {
      this.syncAsset(layer, existing, selectable, editingOther);
      return;
    }
    if (layer.kind === 'image') {
      this.syncImage(layer, existing, selectable, editingOther);
      return;
    }
    if (layer.kind === 'frame') {
      this.syncFrame(item, layer, existing, selectable, editingOther);
      return;
    }
    if (layer.kind === 'shape') {
      this.syncShape(layer, existing, selectable, editingOther);
      return;
    }
    if (!item.layout) {
      // Shaping in progress: keep the previous drawing, but follow the transform.
      if (existing) this.updateInteractivity(existing, selectable, editingOther, layer.hidden);
      return;
    }
    const signature: unknown[] = [layer, item.layout, edit?.level, edit?.lockMarks];
    if (existing && sameSignature(existing.signature, signature)) {
      this.updateInteractivity(existing, selectable && !edit, editingOther, layer.hidden, edit !== null);
      return;
    }
    const objects = edit
      ? this.buildEditObjects(layer, item.layout, edit)
      : this.buildTextObject(layer, item.layout);
    if (existing) for (const object of existing.objects) this.canvas.remove(object);
    for (const object of objects) this.canvas.add(object);
    const entry: LayerEntry = { signature, objects };
    this.entries.set(layer.id, entry);
    this.updateInteractivity(entry, selectable && !edit, editingOther, layer.hidden, edit !== null);
  }

  private updateInteractivity(
    entry: LayerEntry,
    selectable: boolean,
    dimmed: boolean,
    hidden: boolean,
    editing = false,
  ): void {
    for (const object of entry.objects) {
      const isUnit = this.info.get(object)?.unitId != null;
      const canSelect = editing ? isUnit && this.scene?.tool === 'select' : selectable;
      object.set({ selectable: canSelect, evented: canSelect, visible: !hidden });
      if (!editing) object.set({ opacity: this.baseOpacity(object) * (dimmed ? 0.35 : 1) });
    }
  }

  private baseOpacity(object: FabricObject): number {
    const info = this.info.get(object);
    const layer = info ? this.findLayer(info.layerId) : undefined;
    if (!layer) return 1;
    if (layer.kind === 'text') return layer.style.opacity;
    if (layer.kind === 'frame') return 1;
    return layer.opacity;
  }

  private findLayer(id: string): Layer | undefined {
    return this.scene?.layers.find((l) => l.layer.id === id)?.layer;
  }

  private buildTextObject(run: TextRun, layout: TextLayout): FabricObject[] {
    const d = visiblePath(resolveParts(run, layout));
    if (!d) return [];
    const path = new Path(d, { objectCaching: false, ...SELECTION_STYLE });
    applyStyle(path, run.style);
    const m = textMatrix(run);
    this.place(path, {
      layerId: run.id,
      unitId: null,
      matrix: m,
      anchor: { x: path.pathOffset.x, y: path.pathOffset.y },
    });
    return [path];
  }

  private buildEditObjects(run: TextRun, layout: TextLayout, edit: StageEdit): FabricObject[] {
    const m = textMatrix(run);
    const parts = resolveParts(run, layout);
    const showHidden = edit.level === 'part';
    const { units, rest } = buildUnits(
      showHidden ? parts : parts.filter((p) => !p.hidden),
      edit.level,
      edit.lockMarks,
    );
    const objects: FabricObject[] = [];
    const restPath = joinPaths(rest);
    if (restPath) {
      const path = new Path(restPath, { objectCaching: false, selectable: false, evented: false });
      applyStyle(path, run.style);
      path.set({ opacity: run.style.opacity * 0.55 });
      this.place(path, {
        layerId: run.id,
        unitId: null,
        matrix: m,
        anchor: { x: path.pathOffset.x, y: path.pathOffset.y },
      });
      objects.push(path);
    }
    for (const unit of units) {
      const d = joinPaths(unit.parts);
      if (!d) continue;
      const path = new Path(d, { objectCaching: false, perPixelTargetFind: true, ...UNIT_STYLE });
      applyStyle(path, run.style);
      if (unit.parts.every((p) => p.hidden)) path.set({ opacity: 0.25 });
      this.place(path, {
        layerId: run.id,
        unitId: unit.id,
        matrix: m,
        anchor: { x: path.pathOffset.x, y: path.pathOffset.y },
      });
      objects.push(path);
    }
    return objects;
  }

  private place(object: FabricObject, info: ObjectInfo): void {
    this.info.set(object, info);
    setObjectMatrix(object, multiply(info.matrix, translate(info.anchor.x, info.anchor.y)));
  }

  private syncAsset(
    asset: SvgAsset,
    existing: LayerEntry | undefined,
    selectable: boolean,
    dimmed: boolean,
  ): void {
    const signature: unknown[] = [asset.svg];
    const image = existing?.objects[0];
    if (existing && sameSignature(existing.signature, signature)) {
      if (image) this.placeAsset(image as FabricImage, asset);
      this.updateInteractivity(existing, selectable, dimmed, asset.hidden);
      return;
    }
    if (existing) for (const object of existing.objects) this.canvas.remove(object);
    const token = this.nextToken++;
    const entry: LayerEntry = { signature, objects: [], token };
    this.entries.set(asset.id, entry);
    FabricImage.fromURL(svgDataUrl(asset.svg))
      .then((loaded) => {
        const current = this.entries.get(asset.id);
        const latest = this.findLayer(asset.id);
        if (this.disposed || current?.token !== token || latest?.kind !== 'svg') return;
        loaded.set({ lockScalingFlip: true, ...SELECTION_STYLE });
        this.placeAsset(loaded, latest);
        current.objects = [loaded];
        this.withMuted(() => {
          this.canvas.add(loaded);
          if (this.scene) {
            const scene = this.scene;
            const editingOther = scene.edit !== null;
            this.updateInteractivity(
              current,
              scene.tool === 'select' && !latest.locked && !editingOther,
              editingOther,
              latest.hidden,
            );
            this.applyOrder(scene);
            this.applySelection(scene);
          }
        });
        this.canvas.requestRenderAll();
      })
      .catch((error: unknown) => {
        console.error('Could not load SVG artwork', error);
      });
  }

  private placeAsset(image: FabricImage, asset: SvgAsset): void {
    const natural = { width: Math.max(1, image.width), height: Math.max(1, image.height) };
    const m = multiply(assetMatrix(asset), [
      asset.width / natural.width,
      0,
      0,
      asset.height / natural.height,
      0,
      0,
    ]);
    this.info.set(image, {
      layerId: asset.id,
      unitId: null,
      matrix: m,
      anchor: { x: natural.width / 2, y: natural.height / 2 },
      natural,
    });
    setObjectMatrix(image, multiply(m, translate(natural.width / 2, natural.height / 2)));
  }

  private syncImage(
    layer: ImageLayer,
    existing: LayerEntry | undefined,
    selectable: boolean,
    dimmed: boolean,
  ): void {
    const signature: unknown[] = [layer.src];
    const image = existing?.objects[0];
    if (existing && sameSignature(existing.signature, signature)) {
      if (image) this.placeImage(image as FabricImage, layer);
      this.updateInteractivity(existing, selectable, dimmed, layer.hidden);
      return;
    }
    if (existing) for (const object of existing.objects) this.canvas.remove(object);
    const token = this.nextToken++;
    const entry: LayerEntry = { signature, objects: [], token };
    this.entries.set(layer.id, entry);
    FabricImage.fromURL(layer.src)
      .then((loaded) => {
        const current = this.entries.get(layer.id);
        const latest = this.findLayer(layer.id);
        if (this.disposed || current?.token !== token || latest?.kind !== 'image') return;
        loaded.set({ ...SELECTION_STYLE, objectCaching: false });
        this.placeImage(loaded, latest);
        current.objects = [loaded];
        this.withMuted(() => {
          this.canvas.add(loaded);
          if (this.scene) {
            const scene = this.scene;
            const readonly = scene.layers.find((l) => l.layer.id === layer.id)?.readonly ?? false;
            this.updateInteractivity(
              current,
              scene.tool === 'select' && !latest.locked && scene.edit === null && !readonly,
              scene.edit !== null,
              latest.hidden,
            );
            this.applyOrder(scene);
            this.applySelection(scene);
          }
        });
        this.canvas.requestRenderAll();
      })
      .catch((error: unknown) => {
        console.error('Could not load image', error);
      });
  }

  /** Crop and scale a photo into its box according to the fit mode. */
  private placeImage(image: FabricImage, layer: ImageLayer): void {
    const place = imagePlacement(layer);
    image.set({ cropX: place.cropX, cropY: place.cropY, width: place.width, height: place.height });
    this.info.set(image, {
      layerId: layer.id,
      unitId: null,
      matrix: place.matrix,
      anchor: { x: place.width / 2, y: place.height / 2 },
      natural: { width: place.width, height: place.height },
    });
    setObjectMatrix(image, multiply(place.matrix, translate(place.width / 2, place.height / 2)));
  }

  private syncFrame(
    item: StageLayer,
    layer: TextFrame,
    existing: LayerEntry | undefined,
    selectable: boolean,
    dimmed: boolean,
  ): void {
    const signature: unknown[] = [layer, item.flow, item.overflow];
    if (existing && sameSignature(existing.signature, signature)) {
      this.updateInteractivity(existing, selectable, dimmed, layer.hidden);
      return;
    }
    const children: FabricObject[] = [];
    const box = {
      left: 0,
      top: 0,
      width: layer.width,
      height: layer.height,
      originX: 'left',
      originY: 'top',
    } as const;
    children.push(
      new Rect({
        ...box,
        fill: layer.background ?? 'rgba(0,0,0,0)',
        stroke: layer.border && layer.border.width > 0 ? layer.border.color : FRAME_EDGE_COLOR,
        strokeWidth: layer.border && layer.border.width > 0 ? layer.border.width : 1,
        strokeDashArray: layer.border && layer.border.width > 0 ? null : [5, 4],
        strokeUniform: true,
      }),
    );
    const byColor = new Map<string, string[]>();
    for (const line of item.flow?.lines ?? []) {
      const list = byColor.get(line.color) ?? [];
      list.push(line.d);
      byColor.set(line.color, list);
    }
    for (const [color, paths] of byColor) {
      const d = paths.join('');
      if (d) children.push(new Path(d, { fill: color, objectCaching: false }));
    }
    if (layer.columnRule && layer.columnRule.width > 0) {
      const d = columnRuleLines(layer)
        .map((l) => `M${String(l.x)} ${String(l.y0)}V${String(l.y1)}`)
        .join('');
      if (d) {
        children.push(
          new Path(d, {
            fill: null,
            stroke: layer.columnRule.color,
            strokeWidth: layer.columnRule.width,
            objectCaching: false,
          }),
        );
      }
    }
    if (item.overflow) {
      // Red "+" box just below the frame's end: the story continues but has
      // nowhere to go. Drawn outside the frame so it never covers text.
      const s = 12;
      const left = layer.width - s;
      const top = layer.height + 4;
      children.push(
        new Rect({
          left,
          top,
          width: s,
          height: s,
          originX: 'left',
          originY: 'top',
          fill: '#ffffff',
          stroke: '#d92d20',
          strokeWidth: 1.5,
        }),
        new Path(
          `M${String(left + s / 2)} ${String(top + 2.5)}V${String(top + s - 2.5)}M${String(left + 2.5)} ${String(top + s / 2)}H${String(left + s - 2.5)}`,
          { stroke: '#d92d20', strokeWidth: 1.5, fill: null },
        ),
      );
    }
    const group = new Group(children, {
      ...SELECTION_STYLE,
      subTargetCheck: false,
      interactive: false,
      objectCaching: false,
      lockRotation: true,
    });
    group.setControlVisible('mtr', false);
    const center = group.getCenterPoint();
    if (existing) for (const object of existing.objects) this.canvas.remove(object);
    this.info.set(group, {
      layerId: layer.id,
      unitId: null,
      matrix: translate(layer.x, layer.y),
      anchor: { x: center.x, y: center.y },
      natural: { width: layer.width, height: layer.height },
    });
    setObjectMatrix(group, translate(layer.x + center.x, layer.y + center.y));
    this.canvas.add(group);
    const entry: LayerEntry = { signature, objects: [group] };
    this.entries.set(layer.id, entry);
    this.updateInteractivity(entry, selectable, dimmed, layer.hidden);
  }

  private syncShape(
    layer: ShapeLayer,
    existing: LayerEntry | undefined,
    selectable: boolean,
    dimmed: boolean,
  ): void {
    const signature: unknown[] = [layer];
    if (existing && sameSignature(existing.signature, signature)) {
      this.updateInteractivity(existing, selectable, dimmed, layer.hidden);
      return;
    }
    // An invisible box first, so the group spans the whole shape box (and thin
    // rules are easy to pick).
    const children: FabricObject[] = [
      new Rect({
        left: 0,
        top: 0,
        width: layer.width,
        height: layer.height,
        originX: 'left',
        originY: 'top',
        fill: 'rgba(0,0,0,0)',
        strokeWidth: 0,
      }),
    ];
    for (const s of shapeStrokes(layer)) {
      children.push(
        new Path(s.d, {
          fill: s.fill,
          stroke: s.stroke,
          strokeWidth: s.strokeWidth,
          strokeDashArray: s.dash.length > 0 ? s.dash : null,
          strokeLineCap: s.round ? 'round' : 'butt',
          objectCaching: false,
        }),
      );
    }
    const group = new Group(children, {
      ...SELECTION_STYLE,
      subTargetCheck: false,
      interactive: false,
      objectCaching: false,
    });
    const center = group.getCenterPoint();
    if (existing) for (const object of existing.objects) this.canvas.remove(object);
    const m = assetMatrix(layer);
    this.info.set(group, {
      layerId: layer.id,
      unitId: null,
      matrix: m,
      anchor: { x: center.x, y: center.y },
      natural: { width: layer.width, height: layer.height },
    });
    setObjectMatrix(group, multiply(m, translate(center.x, center.y)));
    this.canvas.add(group);
    const entry: LayerEntry = { signature, objects: [group] };
    this.entries.set(layer.id, entry);
    this.updateInteractivity(entry, selectable, dimmed, layer.hidden);
  }

  private applyOrder(scene: StageScene): void {
    let index = 0;
    for (const { layer } of scene.layers) {
      for (const object of this.entries.get(layer.id)?.objects ?? []) {
        this.canvas.moveObjectTo(object, index);
        index += 1;
      }
    }
  }

  private objectsFor(scene: StageScene): FabricObject[] {
    if (scene.edit) {
      const wanted = new Set(scene.edit.selectedUnits);
      return (this.entries.get(scene.edit.layerId)?.objects ?? []).filter((o) => {
        const unit = this.info.get(o)?.unitId;
        return unit != null && wanted.has(unit);
      });
    }
    return scene.selectedIds.flatMap((id) => {
      const layer = this.findLayer(id);
      if (!layer || layer.hidden || layer.locked) return [];
      return this.entries.get(id)?.objects ?? [];
    });
  }

  private applySelection(scene: StageScene): void {
    const wanted = scene.tool === 'select' ? this.objectsFor(scene).filter((o) => o.visible) : [];
    const active = this.canvas.getActiveObject();
    const current = active instanceof ActiveSelection ? active.getObjects() : active ? [active] : [];
    if (current.length === wanted.length && current.every((o, i) => o === wanted[i])) return;
    this.canvas.discardActiveObject();
    if (wanted.length === 1 && wanted[0]) {
      this.canvas.setActiveObject(wanted[0]);
    } else if (wanted.length > 1) {
      const selection = new ActiveSelection(wanted, { canvas: this.canvas, ...SELECTION_STYLE });
      this.canvas.setActiveObject(selection);
    }
  }

  // ————————————————————————————————————————— events

  private emitSelection(): void {
    if (this.muted > 0 || !this.scene) return;
    const active = this.canvas.getActiveObject();
    const objects = active instanceof ActiveSelection ? active.getObjects() : active ? [active] : [];
    if (active instanceof ActiveSelection) active.set(this.scene.edit ? UNIT_STYLE : SELECTION_STYLE);
    if (this.scene.edit) {
      const units = objects.map((o) => this.info.get(o)?.unitId).filter((id): id is string => id != null);
      this.callbacks.selectUnits(units);
    } else {
      const ids = [
        ...new Set(objects.map((o) => this.info.get(o)?.layerId).filter((id): id is string => !!id)),
      ];
      this.callbacks.selectLayers(ids);
    }
  }

  private handleDoubleClick(target: FabricObject | undefined): void {
    const scene = this.scene;
    if (!scene || scene.tool !== 'select') return;
    const info = target ? this.info.get(target) : undefined;
    if (!info) {
      if (scene.edit) this.callbacks.exitEdit();
      return;
    }
    const layer = this.findLayer(info.layerId);
    if (!layer || layer.locked) return;
    if (layer.kind === 'frame') {
      this.callbacks.editText(layer.id);
      return;
    }
    if (layer.kind !== 'text') return;
    // Letter editing (entered with Enter) goes one level deeper; otherwise type.
    if (scene.edit?.layerId === layer.id) this.callbacks.drillDown(info.layerId, info.unitId);
    else this.callbacks.editText(layer.id);
  }

  private handleModified(target: FabricObject | undefined): void {
    if (!target || !this.scene) return;
    const objects = target instanceof ActiveSelection ? target.getObjects() : [target];
    if (this.scene.edit) {
      const layerId = this.scene.edit.layerId;
      const item = this.scene.layers.find((l) => l.layer.id === layerId);
      if (item?.layer.kind !== 'text' || !item.layout) return;
      const parts = resolveParts(item.layer, item.layout);
      const { units } = buildUnits(parts, this.scene.edit.level, this.scene.edit.lockMarks);
      const byId = new Map(units.map((u) => [u.id, u]));
      const overrides: Record<string, PartOverride> = {};
      for (const object of objects) {
        const info = this.info.get(object);
        const unit = info?.unitId ? byId.get(info.unitId) : undefined;
        if (!info || !unit) continue;
        Object.assign(overrides, unitOverrides(unit, info, worldMatrix(object)));
      }
      if (Object.keys(overrides).length > 0) this.callbacks.changeParts(layerId, overrides);
      return;
    }
    const changes: LayerChange[] = [];
    for (const object of objects) {
      const info = this.info.get(object);
      const layer = info ? this.findLayer(info.layerId) : undefined;
      if (!info || !layer) continue;
      const m = multiply(worldMatrix(object), translate(-info.anchor.x, -info.anchor.y));
      if (layer.kind === 'text') {
        changes.push({ id: layer.id, kind: 'text', transform: decompose(m) });
      } else {
        const t = decompose(m);
        const natural = info.natural ?? { width: layer.width, height: layer.height };
        changes.push({
          id: layer.id,
          kind: 'box',
          x: t.x,
          y: t.y,
          angle: t.angle,
          width: Math.max(1e-3, Math.abs(t.scaleX) * natural.width),
          height: Math.max(1e-3, Math.abs(t.scaleY) * natural.height),
        });
      }
    }
    if (changes.length > 0) this.callbacks.changeLayers(changes);
  }

  private handleMouseDown(event: TPointerEvent, target: FabricObject | undefined): void {
    const scene = this.scene;
    if (!scene) return;
    const p = this.canvas.getScenePoint(event);
    if (scene.tool === 'baseline') {
      this.callbacks.addGuide('y', Math.round(p.y));
      return;
    }
    if (scene.tool === 'kashida') {
      this.kashidaDrag = this.findKashidaTarget(p);
      return;
    }
    if (scene.tool === 'frame' || isShapeTool(scene.tool)) {
      this.frameDraw = { start: { x: p.x, y: p.y }, end: { x: p.x, y: p.y } };
      return;
    }
    if (scene.tool === 'select' && !target) {
      const guide = this.guideAt(p);
      if (guide) {
        this.guideDrag = { guide, position: guide.position };
        this.canvas.selection = false;
      }
    }
  }

  private handleMouseMove(event: TPointerEvent): void {
    const p = this.canvas.getScenePoint(event);
    const drag = this.kashidaDrag;
    if (drag) {
      const local = applyToPoint(invert(drag.matrix), p);
      const raw = drag.startValue + (drag.startX - local.x) / drag.fontSize;
      const value = Math.round(Math.min(20, Math.max(0, raw)) * 100) / 100;
      if (value !== drag.value) {
        drag.value = value;
        this.callbacks.previewKashida(drag.layerId, drag.letter, value);
      }
      return;
    }
    if (this.frameDraw) {
      this.frameDraw.end = { x: p.x, y: p.y };
      this.canvas.requestRenderAll();
      return;
    }
    const guideDrag = this.guideDrag;
    if (guideDrag) {
      guideDrag.position = Math.round(guideDrag.guide.axis === 'y' ? p.y : p.x);
      this.canvas.requestRenderAll();
      return;
    }
    if (this.scene?.tool === 'select') {
      this.canvas.setCursor(
        this.guideAt(p) ? (this.guideAt(p)?.axis === 'y' ? 'row-resize' : 'col-resize') : '',
      );
    }
  }

  private handleMouseUp(): void {
    const draw = this.frameDraw;
    if (draw) {
      this.frameDraw = null;
      const x = Math.min(draw.start.x, draw.end.x);
      const y = Math.min(draw.start.y, draw.end.y);
      const width = Math.abs(draw.end.x - draw.start.x);
      const height = Math.abs(draw.end.y - draw.start.y);
      const tool = this.scene?.tool;
      if (tool && isShapeTool(tool)) {
        this.callbacks.createShape(tool, shapeRect(tool, draw.start, { x, y, width, height }));
        this.canvas.requestRenderAll();
        return;
      }
      // A click (no drag) makes a frame of a sensible default size.
      const rect =
        width < 12 || height < 12
          ? { x: Math.round(draw.start.x), y: Math.round(draw.start.y), width: 320, height: 240 }
          : { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
      this.callbacks.createFrame(rect);
      this.canvas.requestRenderAll();
      return;
    }
    const drag = this.kashidaDrag;
    if (drag) {
      this.kashidaDrag = null;
      this.callbacks.commitKashida(drag.layerId, drag.letter, drag.value);
    }
    const guideDrag = this.guideDrag;
    if (guideDrag && this.scene) {
      this.guideDrag = null;
      this.canvas.selection = this.scene.tool === 'select';
      const { width, height } = this.scene.artboard;
      const limit = guideDrag.guide.axis === 'y' ? height : width;
      const outside = guideDrag.position < -8 || guideDrag.position > limit + 8;
      if (outside) this.callbacks.moveGuide(guideDrag.guide.id, null);
      else if (guideDrag.position !== guideDrag.guide.position)
        this.callbacks.moveGuide(guideDrag.guide.id, guideDrag.position);
      this.canvas.requestRenderAll();
    }
    if (this.snapLines.length > 0) {
      this.snapLines = [];
      this.snapTargets = null;
      this.canvas.requestRenderAll();
    }
  }

  private guideAt(p: XY): Guide | null {
    const scene = this.scene;
    if (!scene) return null;
    const tolerance = GUIDE_HIT_PX / this.canvas.getZoom();
    return (
      scene.artboard.guides.find((g) => Math.abs((g.axis === 'y' ? p.y : p.x) - g.position) <= tolerance) ??
      null
    );
  }

  /**
   * The letter to stretch when pressing on a text layer (top-most first): the
   * extendable letter under the pointer, or else the horizontally nearest one
   * on that line — joining forms can be tiny (e.g. an initial ب in Nastaliq).
   */
  private findKashidaTarget(p: XY): KashidaDrag | null {
    const scene = this.scene;
    if (!scene) return null;
    for (const item of [...scene.layers].reverse()) {
      const { layer, layout } = item;
      if (layer.kind !== 'text' || layer.hidden || layer.locked || !layout) continue;
      const m = textMatrix(layer);
      const local = applyToPoint(invert(m), p);
      const pad = layout.fontSize * 0.1;
      const line = layout.lines.findIndex(
        (l) => local.y >= l.baseline - layout.ascent - pad && local.y <= l.baseline + layout.descent + pad,
      );
      const onText = line >= 0 && local.x >= -pad && local.x <= layout.width + pad;
      if (!onText) continue;
      const extendable = new Set(layout.extendable);
      const distance = (part: ResolvedPart) =>
        Math.max(0, part.box.x - local.x, local.x - (part.box.x + part.box.width));
      const hit = resolveParts(layer, layout)
        .filter((part) => part.kind === 'body' && part.line === line && extendable.has(part.letter))
        .sort((a, b) => distance(a) - distance(b))[0];
      if (hit) {
        const startValue = layer.kashida[String(hit.letter)] ?? 0;
        return {
          layerId: layer.id,
          letter: hit.letter,
          startX: local.x,
          startValue,
          fontSize: layer.fontSize,
          matrix: m,
          value: startValue,
        };
      }
    }
    return null;
  }

  // ————————————————————————————————————————— snapping and overlay

  private snapMoving(target: FabricObject | undefined): void {
    const scene = this.scene;
    if (!target || !scene || (!scene.view.snap && !scene.view.smartGuides)) {
      this.snapLines = [];
      return;
    }
    if (!this.snapTargets) {
      const moving = new Set(target instanceof ActiveSelection ? target.getObjects() : [target]);
      const others: Box[] = [];
      if (scene.view.smartGuides) {
        for (const object of this.canvas.getObjects()) {
          if (moving.has(object) || !object.visible || !object.evented) continue;
          const r = object.getBoundingRect();
          others.push({ x: r.left, y: r.top, width: r.width, height: r.height });
        }
      }
      this.snapTargets = collectSnapTargets(scene.artboard, others, scene.view);
      if (scene.view.snap) {
        // Page margins and columns are snap targets too.
        const layout = layoutGuides(scene.artboard);
        this.snapTargets.xs.push(...layout.xs);
        this.snapTargets.ys.push(...layout.ys);
      }
    }
    const r = target.getBoundingRect();
    const box = { x: r.left, y: r.top, width: r.width, height: r.height };
    const result = snapBox(
      box,
      this.baselinesOf(target),
      this.snapTargets,
      SNAP_DISTANCE_PX / this.canvas.getZoom(),
    );
    if (result.dx !== 0 || result.dy !== 0) {
      target.set({ left: target.left + result.dx, top: target.top + result.dy });
      target.setCoords();
    }
    this.snapLines = result.lines;
  }

  /** World y of the baselines of an unrotated text object (for snapping to baseline guides). */
  private baselinesOf(target: FabricObject): number[] {
    if (target instanceof ActiveSelection || this.scene?.edit) return [];
    const info = this.info.get(target);
    const item = info ? this.scene?.layers.find((l) => l.layer.id === info.layerId) : undefined;
    if (!info || item?.layer.kind !== 'text' || !item.layout || Math.abs(target.angle % 360) > 0.01)
      return [];
    const m = multiply(worldMatrix(target), translate(-info.anchor.x, -info.anchor.y));
    return item.layout.lines.map((line) => applyToPoint(m, { x: 0, y: line.baseline }).y);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D): void {
    const scene = this.scene;
    if (!scene) return;
    const zoom = this.canvas.getZoom();
    const { width, height, guides } = scene.artboard;
    const vpt = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    ctx.lineWidth = 1 / zoom;

    if (scene.view.grid && scene.view.gridSize > 0) {
      const step = scene.view.gridSize;
      if (step * zoom >= 4) {
        ctx.strokeStyle = 'rgba(47,111,163,0.14)';
        ctx.beginPath();
        for (let x = step; x < width; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = step; y < height; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }
    }

    if (scene.view.symmetry !== 'off') {
      ctx.strokeStyle = 'rgba(217,72,15,0.6)';
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      if (scene.view.symmetry === 'vertical' || scene.view.symmetry === 'both') {
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
      }
      if (scene.view.symmetry === 'horizontal' || scene.view.symmetry === 'both') {
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Page margins and column grid.
    if (scene.artboard.margins || scene.artboard.columns) {
      const box = marginBox(scene.artboard);
      ctx.strokeStyle = LAYOUT_GUIDE_COLOR;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.beginPath();
      for (const col of pageColumns(scene.artboard)) {
        ctx.moveTo(col.x, box.y);
        ctx.lineTo(col.x, box.y + box.height);
        ctx.moveTo(col.x + col.width, box.y);
        ctx.lineTo(col.x + col.width, box.y + box.height);
      }
      ctx.stroke();
    }
    // Bleed: the area outside the page that is trimmed off after printing.
    if (scene.artboard.bleed) {
      ctx.strokeStyle = 'rgba(217,45,32,0.5)';
      ctx.setLineDash([3 / zoom, 3 / zoom]);
      ctx.strokeRect(0, 0, width, height);
      ctx.setLineDash([]);
    }
    if (this.frameDraw) {
      const f = this.frameDraw;
      ctx.strokeStyle = '#2f6fa3';
      ctx.setLineDash([5 / zoom, 4 / zoom]);
      ctx.strokeRect(
        Math.min(f.start.x, f.end.x),
        Math.min(f.start.y, f.end.y),
        Math.abs(f.end.x - f.start.x),
        Math.abs(f.end.y - f.start.y),
      );
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = GUIDE_COLOR;
    ctx.beginPath();
    for (const guide of guides) {
      const position = this.guideDrag?.guide.id === guide.id ? this.guideDrag.position : guide.position;
      if (guide.axis === 'y') {
        ctx.moveTo(0, position);
        ctx.lineTo(width, position);
      } else {
        ctx.moveTo(position, 0);
        ctx.lineTo(position, height);
      }
    }
    ctx.stroke();

    if (this.snapLines.length > 0) {
      ctx.strokeStyle = SNAP_COLOR;
      ctx.beginPath();
      for (const line of this.snapLines) {
        if (line.axis === 'x') {
          ctx.moveTo(line.position, line.from);
          ctx.lineTo(line.position, line.to);
        } else {
          ctx.moveTo(line.from, line.position);
          ctx.lineTo(line.to, line.position);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private withMuted(action: () => void): void {
    this.muted += 1;
    try {
      action();
    } finally {
      this.muted -= 1;
    }
  }

  /** Debug helper for tests: a readable summary of the scene objects. */
  describe(): { layerId: string; unitId: string | null; kind: string }[] {
    return this.canvas.getObjects().flatMap((object) => {
      const info = this.info.get(object);
      const layer = info ? this.findLayer(info.layerId) : undefined;
      return info && layer ? [{ layerId: info.layerId, unitId: info.unitId, kind: layer.kind }] : [];
    });
  }
}

function sameSignature(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * New part adjustments after a unit object was transformed to world matrix W'.
 * Exported for tests.
 */
export function unitOverrides(
  unit: EditUnit,
  info: Pick<ObjectInfo, 'matrix' | 'anchor'>,
  world: Matrix,
): Record<string, PartOverride> {
  const d = multiply(multiply(invert(info.matrix), world), translate(-info.anchor.x, -info.anchor.y));
  const result: Record<string, PartOverride> = {};
  for (const part of unit.parts) {
    result[part.key] = nextOverride(part, multiply(d, part.matrix));
  }
  return result;
}

function nextOverride(part: ResolvedPart, m: Matrix): PartOverride {
  const t = partTransformFromMatrix(part.center, m);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const next: PartOverride = {
    dx: round(t.dx),
    dy: round(t.dy),
    angle: round(t.angle),
    scaleX: round(t.scaleX) || 1,
    scaleY: round(t.scaleY) || 1,
  };
  if (part.override?.kind) next.kind = part.override.kind;
  if (part.override?.hidden) next.hidden = true;
  if (part.override?.link) next.link = part.override.link;
  return next;
}

export type { EditLevel };

function isShapeTool(tool: EditorTool): tool is ShapeTool {
  return (SHAPE_TOOLS as readonly string[]).includes(tool);
}

/**
 * The box of a drawn shape. A rule follows the drag's longer direction and
 * gets a thin box (its hit area); a click without dragging makes a default size.
 */
function shapeRect(tool: ShapeTool, start: XY, drawn: Box): Box {
  const round = (b: Box): Box => ({
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(1, Math.round(b.width)),
    height: Math.max(1, Math.round(b.height)),
  });
  const clicked = drawn.width < 6 && drawn.height < 6;
  if (tool === 'rule') {
    const hitArea = 8;
    if (clicked) return round({ x: start.x, y: start.y - hitArea / 2, width: 300, height: hitArea });
    return drawn.width >= drawn.height
      ? round({ x: drawn.x, y: start.y - hitArea / 2, width: drawn.width, height: hitArea })
      : round({ x: start.x - hitArea / 2, y: drawn.y, width: hitArea, height: drawn.height });
  }
  if (clicked) return round({ x: start.x, y: start.y, width: 240, height: tool === 'ellipse' ? 240 : 160 });
  return round(drawn);
}
