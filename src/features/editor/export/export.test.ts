import { describe, expect, it } from 'vitest';

import { buildProject } from '@/features/projects/repository';
import { createTextRun } from '@/features/projects/text-runs';
import type { TextLayout } from '@/features/shaping/types';

import { crc32, fitCanvasSize, scaleForDpi, setPngDpi } from './png';
import { prefixIds, renderArtboardSvg } from './render-svg';

/** Smallest valid PNG: 1×1 transparent pixel. */
const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

describe('png', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes the resolution into a pHYs chunk after IHDR', () => {
    const out = setPngDpi(PNG_1PX, 300);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(String.fromCharCode(...out.subarray(37, 41))).toBe('pHYs');
    expect(view.getUint32(41)).toBe(Math.round(300 / 0.0254));
    expect(out[49]).toBe(1);
    // Writing twice replaces the chunk instead of adding another.
    const again = setPngDpi(out, 72);
    expect(again.length).toBe(out.length);
  });

  it('scales and clamps output sizes', () => {
    expect(scaleForDpi(300)).toBeCloseTo(3.125);
    expect(fitCanvasSize(100, 50, 2)).toEqual({ width: 200, height: 100, scale: 2 });
    expect(fitCanvasSize(10_000, 10_000, 4).width).toBeLessThanOrEqual(16_384);
  });
});

describe('svg export', () => {
  const project = buildProject({ name: 'T', presetId: 'custom', width: 200, height: 100 }, 0);
  const artboard = project.artboards[0];
  if (!artboard) throw new Error('no artboard');
  const run = {
    ...createTextRun({
      artboardId: artboard.id,
      text: 'ب',
      fontId: 'amiri',
      language: 'ar',
      fontSize: 10,
      x: 5,
      y: 6,
    }),
    style: {
      fill: {
        type: 'linear' as const,
        angle: 0,
        stops: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#ff0000' },
        ],
      },
      stroke: { color: '#00ff00', width: 2 },
      opacity: 0.5,
      shadow: { color: '#000000', opacity: 0.4, blur: 4, offsetX: 1, offsetY: 1 },
    },
  };
  const layout: TextLayout = {
    width: 10,
    height: 10,
    fontSize: 10,
    ascent: 8,
    descent: 2,
    lineAdvance: 10,
    lines: [],
    extendable: [],
    glyphs: [
      {
        glyphId: 1,
        cluster: 0,
        letter: 0,
        word: 0,
        occurrence: 0,
        isKashida: false,
        line: 0,
        kind: 'base',
        x: 0,
        y: 8,
        advance: 10,
        path: 'M0 0L10 0L10 10Z',
        parts: [
          {
            key: '0:1:0:0',
            index: 0,
            kind: 'body',
            path: 'M0 0L10 0L10 10Z',
            box: { x: 0, y: 0, width: 10, height: 10 },
          },
        ],
      },
    ],
  };

  it('renders text as outlines with gradient, outline, opacity and shadow', () => {
    const svg = renderArtboardSvg(artboard, [run], new Map([[run.id, layout]]));
    expect(svg).toContain('width="200" height="100"');
    expect(svg).toContain('<rect x="0" y="0" width="200" height="100" fill="#ffffff"/>');
    expect(svg).toContain('d="M0 0L10 0L10 10Z"');
    expect(svg).toContain('transform="matrix(1 0 0 1 5 6)"');
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('stroke="#00ff00"');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('<feDropShadow');
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull();
  });

  it('omits the background when transparent and skips hidden layers', () => {
    const svg = renderArtboardSvg(artboard, [{ ...run, hidden: true }], new Map([[run.id, layout]]), {
      transparent: true,
    });
    expect(svg).not.toContain('<rect');
    expect(svg).not.toContain('<path');
  });

  it('prefixes ids inside embedded artwork', () => {
    expect(prefixIds('<g id="a" fill="url(#a)"><use href="#a"/></g>', 'x-')).toBe(
      '<g id="x-a" fill="url(#x-a)"><use href="#x-a"/></g>',
    );
  });
});
