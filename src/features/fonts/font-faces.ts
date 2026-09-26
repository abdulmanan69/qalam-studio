import { fontFileUrl, type FontEntry } from './registry';

/**
 * Registers calligraphy fonts with the browser (FontFace API) so the UI can
 * preview them — font picker items and the text field. Fonts load lazily,
 * only when a preview is actually shown. Canvas rendering does not depend on
 * this: glyphs are drawn from outlines produced by the shaping engine.
 */

const registered = new Map<string, FontFace>();

export function previewFontFamily(font: FontEntry): string {
  return `qalam-preview-${font.id}`;
}

/** CSS font-family value: the preview font with UI fallbacks. */
export function previewFontStack(font: FontEntry): string {
  return `'${previewFontFamily(font)}', var(--font-ui)`;
}

export function ensurePreviewFonts(fonts: readonly FontEntry[]): void {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }
  for (const font of fonts) {
    if (registered.has(font.id)) continue;
    const face = new FontFace(previewFontFamily(font), `url(${fontFileUrl(font)})`, { display: 'swap' });
    registered.set(font.id, face);
    document.fonts.add(face);
    face.load().catch((error: unknown) => {
      console.warn(`Font preview failed for ${font.id}`, error);
    });
  }
}
