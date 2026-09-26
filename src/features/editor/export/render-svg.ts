import type { Artboard, Layer, LayerStyle, SvgAsset } from '@/features/projects/schema';
import type { TextLayout } from '@/features/shaping/types';
import { toSvgMatrix } from '@/lib/matrix';

import { assetMatrix, gradientVector, resolveParts, textMatrix, visiblePath } from '../units';

/**
 * Standalone SVG of one artboard. Text is exported as outlines (no fonts
 * needed to view or print it); imported artwork is inlined as nested <svg>.
 * The same markup feeds the PNG and PDF exporters.
 */

export interface SvgRenderOptions {
  /** Omit the artboard background (transparent PNG). */
  transparent?: boolean;
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

export function renderArtboardSvg(
  artboard: Artboard,
  layers: readonly Layer[],
  layouts: ReadonlyMap<string, TextLayout>,
  options: SvgRenderOptions = {},
): string {
  const defs = new Defs('q');
  const body: string[] = [];
  if (!options.transparent) {
    body.push(
      `<rect width="${num(artboard.width)}" height="${num(artboard.height)}" fill="${artboard.background}"/>`,
    );
  }
  layers.forEach((layer, index) => {
    if (layer.hidden || layer.artboardId !== artboard.id) return;
    if (layer.kind === 'svg') {
      body.push(assetMarkup(layer, index));
      return;
    }
    const layout = layouts.get(layer.id);
    if (!layout) return;
    const d = visiblePath(resolveParts(layer, layout));
    if (!d) return;
    body.push(
      `<path d="${d}" transform="${toSvgMatrix(textMatrix(layer))}" ${styleAttributes(layer.style, defs)}/>`,
    );
  });
  return [
    `<svg xmlns="${SVG_NS}" width="${num(artboard.width)}" height="${num(artboard.height)}" viewBox="0 0 ${num(artboard.width)} ${num(artboard.height)}">`,
    `<title>${escapeText(artboard.name)}</title>`,
    defs.toString(),
    ...body,
    '</svg>',
  ].join('');
}
