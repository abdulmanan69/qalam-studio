import type {
  Artboard,
  ImageLayer,
  Layer,
  LayerStyle,
  SvgAsset,
  TextFrame,
} from '@/features/projects/schema';
import type { FlowFrameResult } from '@/features/shaping/flow';
import type { TextLayout } from '@/features/shaping/types';
import { toSvgMatrix } from '@/lib/matrix';

import { assetMatrix, gradientVector, imagePlacement, resolveParts, textMatrix, visiblePath } from '../units';

/**
 * Standalone SVG of one artboard. Text is exported as outlines (no fonts
 * needed to view or print it); imported artwork is inlined as nested <svg>.
 * The same markup feeds the PNG and PDF exporters.
 */

export interface SvgRenderOptions {
  /** Omit the artboard background (transparent PNG). */
  transparent?: boolean;
  /** Lines of text frames (from the story flow). */
  flows?: ReadonlyMap<string, FlowFrameResult>;
  /** Master page layers, drawn below the page's own layers. */
  masterLayers?: readonly Layer[];
  /** Print: extend the background into the bleed and add crop marks. */
  printMarks?: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function num(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

class Defs {
  private readonly items: string[] = [];
  private next = 1;

  constructor(private readonly prefix: string) {}

  add(build: (id: string) => string): string {
    const id = `${this.prefix}${String(this.next++)}`;
    this.items.push(build(id));
    return id;
  }

  toString(): string {
    return this.items.length > 0 ? `<defs>${this.items.join('')}</defs>` : '';
  }
}

function styleAttributes(style: LayerStyle, defs: Defs): string {
  const attrs: string[] = [];
  if (style.fill.type === 'solid') {
    attrs.push(`fill="${style.fill.color}"`);
  } else {
    const v = gradientVector(style.fill.angle);
    const stops = style.fill.stops
      .map((s) => `<stop offset="${num(s.offset)}" stop-color="${s.color}"/>`)
      .join('');
    const id = defs.add(
      (gid) =>
        `<linearGradient id="${gid}" x1="${num(v.x1)}" y1="${num(v.y1)}" x2="${num(v.x2)}" y2="${num(v.y2)}">${stops}</linearGradient>`,
    );
    attrs.push(`fill="url(#${id})"`);
  }
  if (style.stroke && style.stroke.width > 0) {
    attrs.push(
      `stroke="${style.stroke.color}"`,
      `stroke-width="${num(style.stroke.width)}"`,
      'stroke-linejoin="round"',
      'paint-order="stroke"',
    );
  }
  if (style.opacity < 1) attrs.push(`opacity="${num(style.opacity)}"`);
  if (style.shadow) {
    const s = style.shadow;
    const id = defs.add(
      (fid) =>
        `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${num(s.offsetX)}" dy="${num(s.offsetY)}" stdDeviation="${num(s.blur / 2)}" flood-color="${s.color}" flood-opacity="${num(s.opacity)}"/></filter>`,
    );
    attrs.push(`filter="url(#${id})"`);
  }
  return attrs.join(' ');
}

/** Prefix ids inside embedded artwork so several pieces can share one document. */
export function prefixIds(markup: string, prefix: string): string {
  return markup
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${prefix}$2"`);
}

function assetMarkup(asset: SvgAsset, index: number): string {
  const doc = new DOMParser().parseFromString(prefixIds(asset.svg, `a${String(index)}-`), 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg') return '';
  const viewBox = root.getAttribute('viewBox') ?? `0 0 ${num(asset.width)} ${num(asset.height)}`;
  const serializer = new XMLSerializer();
  const inner = Array.from(root.childNodes)
    .map((node) => serializer.serializeToString(node))
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
  const opacity = asset.opacity < 1 ? ` opacity="${num(asset.opacity)}"` : '';
  return `<g transform="${toSvgMatrix(assetMatrix(asset))}"${opacity}><svg x="0" y="0" width="${num(asset.width)}" height="${num(asset.height)}" viewBox="${escapeText(viewBox)}" preserveAspectRatio="none" overflow="visible">${inner}</svg></g>`;
}

function imageMarkup(layer: ImageLayer): string {
  const place = imagePlacement(layer);
  const opacity = layer.opacity < 1 ? ` opacity="${num(layer.opacity)}"` : '';
  // A nested <svg> viewport crops the bitmap to the visible region.
  return `<g transform="${toSvgMatrix(place.matrix)}"${opacity}><svg x="0" y="0" width="${num(place.width)}" height="${num(place.height)}" viewBox="${num(place.cropX)} ${num(place.cropY)} ${num(place.width)} ${num(place.height)}" preserveAspectRatio="none"><image width="${num(layer.naturalWidth)}" height="${num(layer.naturalHeight)}" href="${layer.src}"/></svg></g>`;
}

function frameMarkup(frame: TextFrame, flow: FlowFrameResult | undefined): string {
  const parts: string[] = [];
  if (frame.background) {
    parts.push(
      `<rect width="${num(frame.width)}" height="${num(frame.height)}" fill="${frame.background}"/>`,
    );
  }
  const byColor = new Map<string, string[]>();
  for (const line of flow?.lines ?? []) {
    const list = byColor.get(line.color) ?? [];
    list.push(line.d);
    byColor.set(line.color, list);
  }
  for (const [color, paths] of byColor) parts.push(`<path d="${paths.join('')}" fill="${color}"/>`);
  if (frame.border && frame.border.width > 0) {
    const w = frame.border.width;
    parts.push(
      `<rect x="${num(w / 2)}" y="${num(w / 2)}" width="${num(frame.width - w)}" height="${num(frame.height - w)}" fill="none" stroke="${frame.border.color}" stroke-width="${num(w)}"/>`,
    );
  }
  return `<g transform="translate(${num(frame.x)} ${num(frame.y)})">${parts.join('')}</g>`;
}

function layerMarkup(
  layer: Layer,
  index: number,
  layouts: ReadonlyMap<string, TextLayout>,
  flows: ReadonlyMap<string, FlowFrameResult> | undefined,
  defs: Defs,
): string {
  if (layer.kind === 'svg') return assetMarkup(layer, index);
  if (layer.kind === 'image') return imageMarkup(layer);
  if (layer.kind === 'frame') return frameMarkup(layer, flows?.get(layer.id));
  const layout = layouts.get(layer.id);
  if (!layout) return '';
  const d = visiblePath(resolveParts(layer, layout));
  if (!d) return '';
  return `<path d="${d}" transform="${toSvgMatrix(textMatrix(layer))}" ${styleAttributes(layer.style, defs)}/>`;
}

/** Crop marks at the trim corners, outside the bleed. */
function cropMarks(width: number, height: number, bleed: number): string {
  const gap = bleed + 3;
  const len = 18;
  const d: string[] = [];
  for (const x of [0, width]) {
    for (const y of [0, height]) {
      const sx = x === 0 ? -1 : 1;
      const sy = y === 0 ? -1 : 1;
      d.push(`M${num(x)} ${num(y + sy * gap)}V${num(y + sy * (gap + len))}`);
      d.push(`M${num(x + sx * gap)} ${num(y)}H${num(x + sx * (gap + len))}`);
    }
  }
  return `<path d="${d.join('')}" stroke="#000000" stroke-width="0.5" fill="none"/>`;
}

/** Extra space around the page for bleed and crop marks. */
export function printMargin(artboard: Artboard): number {
  return (artboard.bleed ?? 0) + 24;
}

export function renderArtboardSvg(
  artboard: Artboard,
  layers: readonly Layer[],
  layouts: ReadonlyMap<string, TextLayout>,
  options: SvgRenderOptions = {},
): string {
  const defs = new Defs('q');
  const body: string[] = [];
  const bleed = options.printMarks ? (artboard.bleed ?? 0) : 0;
  if (!options.transparent) {
    body.push(
      `<rect x="${num(-bleed)}" y="${num(-bleed)}" width="${num(artboard.width + bleed * 2)}" height="${num(artboard.height + bleed * 2)}" fill="${artboard.background}"/>`,
    );
  }
  (options.masterLayers ?? []).forEach((layer, index) => {
    if (!layer.hidden) body.push(layerMarkup(layer, index + 100_000, layouts, options.flows, defs));
  });
  layers.forEach((layer, index) => {
    if (layer.hidden || layer.artboardId !== artboard.id) return;
    body.push(layerMarkup(layer, index, layouts, options.flows, defs));
  });
  let x = 0;
  let y = 0;
  let width = artboard.width;
  let height = artboard.height;
  if (options.printMarks) {
    const margin = printMargin(artboard);
    x = -margin;
    y = -margin;
    width += margin * 2;
    height += margin * 2;
    body.push(cropMarks(artboard.width, artboard.height, artboard.bleed ?? 0));
  }
  return [
    `<svg xmlns="${SVG_NS}" width="${num(width)}" height="${num(height)}" viewBox="${num(x)} ${num(y)} ${num(width)} ${num(height)}">`,
    `<title>${escapeText(artboard.name)}</title>`,
    defs.toString(),
    ...body,
    '</svg>',
  ].join('');
}
