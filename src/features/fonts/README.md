# Fonts

- `registry.json` — the bundled calligraphy fonts, the default font, and a default font per
  content language. Files live in `public/fonts/<font-id>/` with their licenses.
- `registry.ts` — validates the registry at startup (zod) and resolves fonts and URLs.
- `font-faces.ts` — registers fonts with the browser's FontFace API for UI previews only; the
  canvas draws glyph outlines from the shaping engine.
- `FontSelect.tsx` — font picker grouped by style, with previews.

`registry.test.ts` checks that every font file and license exists and that each font contains the
letters of every language it declares.

How to contribute a font: [docs/adding-fonts.md](../../../docs/adding-fonts.md).
