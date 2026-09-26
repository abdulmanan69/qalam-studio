/**
 * Original ornaments, frames and background patterns, generated as SVG from
 * geometry (no third-party artwork). Everything here is part of Qalam Studio
 * and shares its MIT license.
 */

export type OrnamentCategory = 'ornament' | 'frame' | 'pattern';

export type OrnamentNameKey =
  | 'rosette'
  | 'star'
  | 'medallion'
  | 'divider'
  | 'corner'
  | 'frameClassic'
  | 'frameArch'
  | 'patternStars'
  | 'patternHex'
  | 'patternLattice'
  | 'patternDots'
  | 'patternWaves';

export interface OrnamentDef {
  id: string;
  category: OrnamentCategory;
  /** i18n key under `ornaments.items`. */
  nameKey: OrnamentNameKey;
  /** SVG for a target size (frames and patterns fill the artboard). */
  build: (width: number, height: number, color: string) => string;
}

const f = (n: number) => String(Math.round(n * 100) / 100);

function svg(width: number, height: number, body: string, viewBox = `0 0 ${f(width)} ${f(height)}`): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width)}" height="${f(height)}" viewBox="${viewBox}">${body}</svg>`;
}

/** Points of a star polygon with `points` tips. */
export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
  rotation = -90,
): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotation + (i * 180) / points) * Math.PI) / 180;
    out.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return out.join(' ');
}

/** Two overlapping squares: the eight-pointed star of Islamic geometry. */
function eightStar(cx: number, cy: number, r: number): string {
  const square = (rot: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const a = ((rot + 45 + i * 90) * Math.PI) / 180;
      pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
    }
    return pts.join(' ');
  };
  return `<polygon points="${square(0)}"/><polygon points="${square(45)}"/>`;
}

function rosette(size: number, color: string): string {
  const c = size / 2;
  const petals: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const x = c + Math.cos(a) * c * 0.55;
    const y = c + Math.sin(a) * c * 0.55;
    petals.push(
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(c * 0.34)}" ry="${f(c * 0.12)}" transform="rotate(${String(i * 30)} ${f(x)} ${f(y)})"/>`,
    );
  }
  return svg(
    size,
    size,
    `<g fill="none" stroke="${color}" stroke-width="${f(size * 0.012)}">${petals.join('')}<circle cx="${f(c)}" cy="${f(c)}" r="${f(c * 0.96)}"/><circle cx="${f(c)}" cy="${f(c)}" r="${f(c * 0.2)}"/></g><polygon fill="${color}" points="${starPoints(c, c, c * 0.18, c * 0.08, 12)}"/>`,
  );
}

function starOrnament(size: number, color: string): string {
  const c = size / 2;
  return svg(
    size,
    size,
    `<g fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="${f(size * 0.015)}" stroke-linejoin="round">${eightStar(c, c, c * 0.95)}${eightStar(c, c, c * 0.62)}</g><circle cx="${f(c)}" cy="${f(c)}" r="${f(c * 0.16)}" fill="${color}"/>`,
  );
}

function medallion(size: number, color: string): string {
  const c = size / 2;
  const scallops: string[] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    scallops.push(
      `<circle cx="${f(c + Math.cos(a) * c * 0.86)}" cy="${f(c + Math.sin(a) * c * 0.86)}" r="${f(c * 0.12)}"/>`,
    );
  }
  return svg(
    size,
    size,
    `<g fill="${color}" fill-opacity="0.18">${scallops.join('')}</g><circle cx="${f(c)}" cy="${f(c)}" r="${f(c * 0.84)}" fill="#ffffff" fill-opacity="0.9" stroke="${color}" stroke-width="${f(size * 0.012)}"/><circle cx="${f(c)}" cy="${f(c)}" r="${f(c * 0.76)}" fill="none" stroke="${color}" stroke-width="${f(size * 0.006)}"/>`,
  );
}

function divider(width: number, color: string): string {
  const h = width / 8;
  const cy = h / 2;
  const cx = width / 2;
  return svg(
    width,
    h,
    `<g stroke="${color}" stroke-width="${f(h * 0.05)}" stroke-linecap="round" fill="none"><path d="M${f(width * 0.04)} ${f(cy)}H${f(cx - h * 0.9)}M${f(cx + h * 0.9)} ${f(cy)}H${f(width * 0.96)}"/><path d="M${f(cx - h * 0.9)} ${f(cy)}q${f(h * 0.3)} ${f(-h * 0.35)} ${f(h * 0.55)} 0t${f(h * 0.55)} 0"/><path d="M${f(cx + h * 0.9)} ${f(cy)}q${f(-h * 0.3)} ${f(h * 0.35)} ${f(-h * 0.55)} 0t${f(-h * 0.55)} 0"/></g><polygon fill="${color}" points="${starPoints(cx, cy, h * 0.3, h * 0.12, 8)}"/><circle cx="${f(width * 0.04)}" cy="${f(cy)}" r="${f(h * 0.07)}" fill="${color}"/><circle cx="${f(width * 0.96)}" cy="${f(cy)}" r="${f(h * 0.07)}" fill="${color}"/>`,
  );
}

function cornerFlourish(size: number, color: string): string {
  const s = size;
  return svg(
    s,
    s,
    `<g fill="none" stroke="${color}" stroke-width="${f(s * 0.02)}" stroke-linecap="round"><path d="M${f(s * 0.06)} ${f(s * 0.94)}V${f(s * 0.3)}Q${f(s * 0.06)} ${f(s * 0.06)} ${f(s * 0.3)} ${f(s * 0.06)}H${f(s * 0.94)}"/><path d="M${f(s * 0.16)} ${f(s * 0.8)}C${f(s * 0.16)} ${f(s * 0.4)} ${f(s * 0.4)} ${f(s * 0.16)} ${f(s * 0.8)} ${f(s * 0.16)}"/><path d="M${f(s * 0.3)} ${f(s * 0.3)}c${f(s * 0.1)} ${f(-s * 0.12)} ${f(s * 0.25)} ${f(-s * 0.05)} ${f(s * 0.2)} ${f(s * 0.08)}c${f(-s * 0.04)} ${f(s * 0.1)} ${f(-s * 0.16)} ${f(s * 0.08)} ${f(-s * 0.14)} ${f(-s * 0.02)}"/></g><polygon fill="${color}" points="${starPoints(s * 0.3, s * 0.3, s * 0.07, s * 0.03, 8)}"/>`,
  );
}

function frameClassic(width: number, height: number, color: string): string {
  const m = Math.min(width, height);
  const o = m * 0.04;
  const i = m * 0.065;
  const star = (x: number, y: number) =>
    `<polygon fill="${color}" points="${starPoints(x, y, m * 0.03, m * 0.013, 8)}"/>`;
  return svg(
    width,
    height,
    `<g fill="none" stroke="${color}"><rect x="${f(o)}" y="${f(o)}" width="${f(width - 2 * o)}" height="${f(height - 2 * o)}" stroke-width="${f(m * 0.008)}"/><rect x="${f(i)}" y="${f(i)}" width="${f(width - 2 * i)}" height="${f(height - 2 * i)}" stroke-width="${f(m * 0.003)}"/></g>${star(o, o)}${star(width - o, o)}${star(o, height - o)}${star(width - o, height - o)}`,
  );
}

function frameArch(width: number, height: number, color: string): string {
  const m = Math.min(width, height);
  const pad = m * 0.06;
  const w = width - 2 * pad;
  const top = pad + w * 0.35;
  const d = `M${f(pad)} ${f(height - pad)}V${f(top)}Q${f(pad)} ${f(pad)} ${f(width / 2)} ${f(pad)}Q${f(width - pad)} ${f(pad)} ${f(width - pad)} ${f(top)}V${f(height - pad)}Z`;
  const inset = m * 0.025;
  const d2 = `M${f(pad + inset)} ${f(height - pad - inset)}V${f(top)}Q${f(pad + inset)} ${f(pad + inset)} ${f(width / 2)} ${f(pad + inset)}Q${f(width - pad - inset)} ${f(pad + inset)} ${f(width - pad - inset)} ${f(top)}V${f(height - pad - inset)}Z`;
  return svg(
    width,
    height,
    `<g fill="none" stroke="${color}"><path d="${d}" stroke-width="${f(m * 0.008)}"/><path d="${d2}" stroke-width="${f(m * 0.003)}"/></g><polygon fill="${color}" points="${starPoints(width / 2, pad, m * 0.035, m * 0.015, 8)}"/>`,
  );
}

function patternSvg(width: number, height: number, tile: number, content: string, id: string): string {
  return svg(
    width,
    height,
    `<defs><pattern id="${id}" width="${f(tile)}" height="${f(tile)}" patternUnits="userSpaceOnUse">${content}</pattern></defs><rect width="${f(width)}" height="${f(height)}" fill="url(#${id})"/>`,
  );
}

function patternStars(width: number, height: number, color: string): string {
  const t = Math.max(40, Math.min(width, height) / 10);
  const c = t / 2;
  return patternSvg(
    width,
    height,
    t,
    `<g fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="${f(t * 0.02)}">${eightStar(c, c, c * 0.7)}${eightStar(0, 0, c * 0.3)}${eightStar(t, 0, c * 0.3)}${eightStar(0, t, c * 0.3)}${eightStar(t, t, c * 0.3)}</g>`,
    'qp-stars',
  );
}

function patternHex(width: number, height: number, color: string): string {
  const t = Math.max(36, Math.min(width, height) / 12);
  const r = t / 2;
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((60 * i + 30) * Math.PI) / 180;
      return `${f(cx + r * 0.9 * Math.cos(a))},${f(cy + r * 0.9 * Math.sin(a))}`;
    }).join(' ');
  return patternSvg(
    width,
    height,
    t,
    `<g fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="${f(t * 0.025)}"><polygon points="${hex(r, r)}"/><polygon points="${hex(0, 0)}"/><polygon points="${hex(t, 0)}"/><polygon points="${hex(0, t)}"/><polygon points="${hex(t, t)}"/></g>`,
    'qp-hex',
  );
}

function patternLattice(width: number, height: number, color: string): string {
  const t = Math.max(30, Math.min(width, height) / 14);
  return patternSvg(
    width,
    height,
    t,
    `<g stroke="${color}" stroke-opacity="0.25" stroke-width="${f(t * 0.03)}" fill="none"><path d="M0 0L${f(t)} ${f(t)}M${f(t)} 0L0 ${f(t)}"/></g><circle cx="${f(t / 2)}" cy="${f(t / 2)}" r="${f(t * 0.07)}" fill="${color}" fill-opacity="0.35"/>`,
    'qp-lattice',
  );
}

function patternDots(width: number, height: number, color: string): string {
  const t = Math.max(16, Math.min(width, height) / 30);
  return patternSvg(
    width,
    height,
    t,
    `<circle cx="${f(t / 2)}" cy="${f(t / 2)}" r="${f(t * 0.09)}" fill="${color}" fill-opacity="0.35"/>`,
    'qp-dots',
  );
}

function patternWaves(width: number, height: number, color: string): string {
  const t = Math.max(40, Math.min(width, height) / 10);
  return patternSvg(
    width,
    height,
    t,
    `<path d="M0 ${f(t * 0.5)}C${f(t * 0.25)} ${f(t * 0.2)} ${f(t * 0.25)} ${f(t * 0.8)} ${f(t * 0.5)} ${f(t * 0.5)}S${f(t * 0.75)} ${f(t * 0.2)} ${f(t)} ${f(t * 0.5)}" fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="${f(t * 0.025)}"/>`,
    'qp-waves',
  );
}

const square = (build: (size: number, color: string) => string) => (w: number, h: number, color: string) =>
  build(Math.round(Math.min(w, h) * 0.4), color);

export const ORNAMENTS: readonly OrnamentDef[] = [
  { id: 'rosette', category: 'ornament', nameKey: 'rosette', build: square(rosette) },
  { id: 'star', category: 'ornament', nameKey: 'star', build: square(starOrnament) },
  { id: 'medallion', category: 'ornament', nameKey: 'medallion', build: square(medallion) },
  {
    id: 'divider',
    category: 'ornament',
    nameKey: 'divider',
    build: (w, _h, color) => divider(Math.round(w * 0.7), color),
  },
  {
    id: 'corner',
    category: 'ornament',
    nameKey: 'corner',
    build: (w, h, color) => cornerFlourish(Math.round(Math.min(w, h) * 0.25), color),
  },
  { id: 'frame-classic', category: 'frame', nameKey: 'frameClassic', build: frameClassic },
  { id: 'frame-arch', category: 'frame', nameKey: 'frameArch', build: frameArch },
  { id: 'pattern-stars', category: 'pattern', nameKey: 'patternStars', build: patternStars },
  { id: 'pattern-hex', category: 'pattern', nameKey: 'patternHex', build: patternHex },
  { id: 'pattern-lattice', category: 'pattern', nameKey: 'patternLattice', build: patternLattice },
  { id: 'pattern-dots', category: 'pattern', nameKey: 'patternDots', build: patternDots },
  { id: 'pattern-waves', category: 'pattern', nameKey: 'patternWaves', build: patternWaves },
];

export const DEFAULT_ORNAMENT_COLOR = '#8a6d3b';

export function getOrnament(id: string): OrnamentDef | undefined {
  return ORNAMENTS.find((o) => o.id === id);
}
