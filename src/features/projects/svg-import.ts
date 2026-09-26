/**
 * SVG import: parse, validate and sanitize user-supplied SVG markup.
 *
 * Imported SVGs are only ever rendered through <img src="blob:…">, which
 * never runs scripts. Sanitizing on import is defense in depth so stored
 * projects and exported `.qalam` files never carry active content.
 */

export const MAX_SVG_BYTES = 5 * 1024 * 1024;
export const DEFAULT_SVG_SIZE = 512;
export const SVG_ACCEPT = '.svg,image/svg+xml';

export type SvgParseError = 'tooLarge' | 'invalidSvg';

export interface ParsedSvg {
  /** Sanitized, serialized markup with explicit width/height/viewBox. */
  svg: string;
  width: number;
  height: number;
}

export type SvgParseResult = { ok: true; value: ParsedSvg } | { ok: false; error: SvgParseError };

const SVG_NS = 'http://www.w3.org/2000/svg';

const FORBIDDEN_ELEMENTS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'canvas',
  'handler',
  'listener',
];

const HREF_ATTRIBUTES = new Set(['href', 'xlink:href']);

function isSafeHref(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);/.test(v);
}

/** Parse "120", "120px", "120.5" → number. Relative units (%, em) → null. */
function parseLength(value: string | null): number | null {
  if (!value) return null;
  const match = /^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$/i.exec(value);
  if (!match?.[1]) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseViewBox(value: string | null): { width: number; height: number } | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((p) => Number.parseFloat(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return null;
  const [, , width, height] = parts as [number, number, number, number];
  return width > 0 && height > 0 ? { width, height } : null;
}

function sanitize(root: Element): void {
  for (const tag of FORBIDDEN_ELEMENTS) {
    for (const el of Array.from(root.getElementsByTagName(tag))) el.remove();
  }

  const all = [root, ...Array.from(root.getElementsByTagName('*'))];
  for (const el of all) {
    const local = el.localName.toLowerCase();

    // <animate>/<set> can rewrite href to a javascript: URL at runtime.
    if (
      (local === 'animate' || local === 'set') &&
      HREF_ATTRIBUTES.has(el.getAttribute('attributeName') ?? '')
    ) {
      el.remove();
      continue;
    }

    if (local === 'style' && el.textContent) {
      el.textContent = el.textContent.replace(/@import[^;]*;?/gi, '');
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (HREF_ATTRIBUTES.has(name) && !isSafeHref(attr.value)) {
        el.removeAttribute(attr.name);
      } else if (/javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

export function parseSvg(text: string): SvgParseResult {
  if (new Blob([text]).size > MAX_SVG_BYTES) {
    return { ok: false, error: 'tooLarge' };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  } catch {
    return { ok: false, error: 'invalidSvg' };
  }

  const root = doc.documentElement;
  if (
    doc.getElementsByTagName('parsererror').length > 0 ||
    root.localName !== 'svg' ||
    (root.namespaceURI !== null && root.namespaceURI !== SVG_NS)
  ) {
    return { ok: false, error: 'invalidSvg' };
  }

  sanitize(root);

  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  const width = parseLength(root.getAttribute('width')) ?? viewBox?.width ?? DEFAULT_SVG_SIZE;
  const height = parseLength(root.getAttribute('height')) ?? viewBox?.height ?? DEFAULT_SVG_SIZE;

  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', SVG_NS);
  if (!viewBox) root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));

  const svg = new XMLSerializer().serializeToString(root);
  return { ok: true, value: { svg, width, height } };
}

/** File name without extension, e.g. "ornament.svg" → "ornament". */
export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
