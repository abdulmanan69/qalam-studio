/**
 * PNG export: rasterize SVG markup in the browser and record the intended
 * print resolution in the PNG `pHYs` chunk, so print software sizes the image
 * correctly (e.g. 300 DPI).
 */

/** Largest canvas side and area most browsers can allocate. */
export const MAX_CANVAS_SIDE = 16_384;
export const MAX_CANVAS_AREA = 268_435_456;

/** CSS pixels are defined at 96 per inch. */
export const CSS_DPI = 96;

/** Scale factor for a target DPI. */
export function scaleForDpi(dpi: number): number {
  return dpi / CSS_DPI;
}

/** Clamp an output size to what a canvas can hold, keeping the aspect ratio. */
export function fitCanvasSize(
  width: number,
  height: number,
  scale: number,
): { width: number; height: number; scale: number } {
  let s = scale;
  s = Math.min(s, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
  s = Math.min(s, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)), scale: s };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Insert (or replace) a pHYs chunk right after IHDR. Returns a new buffer;
 * input that is not a PNG is returned unchanged.
 */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 33 || signature.some((b, i) => png[i] !== b)) return png;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const ihdrEnd = 8 + 12 + view.getUint32(8);

  // Drop any existing pHYs chunk.
  const chunks: Uint8Array[] = [];
  let offset = ihdrEnd;
  while (offset + 12 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const end = offset + 12 + length;
    if (type !== 'pHYs') chunks.push(png.subarray(offset, end));
    offset = end;
  }

  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(21);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  pv.setUint32(8, ppm);
  pv.setUint32(12, ppm);
  phys[16] = 1; // unit: meter
  pv.setUint32(17, crc32(phys.subarray(4, 17)));

  const total = ihdrEnd + phys.length + chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  out.set(png.subarray(0, ihdrEnd), 0);
  out.set(phys, ihdrEnd);
  let cursor = ihdrEnd + phys.length;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('Could not render the design'));
    };
    image.src = url;
  });
}

export interface PngOptions {
  width: number;
  height: number;
  /** Output pixels per artboard pixel. */
  scale: number;
  /** Resolution written into the file. */
  dpi: number;
}

export async function renderPng(svg: string, options: PngOptions): Promise<Blob> {
  const size = fitCanvasSize(options.width, options.height, options.scale);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!blob) throw new Error('Could not encode PNG');
    const bytes = setPngDpi(new Uint8Array(await blob.arrayBuffer()), options.dpi);
    return new Blob([bytes.slice().buffer], { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
