# Roadmap

| Phase | Scope                                                                                                                                                                                                       | Status  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1     | Scaffold, design system, app shell, dashboard, local projects, `.qalam` files, SVG import, editor shell, CI and GitHub Pages                                                                                | ✅ Done |
| 2     | Shaping engine: HarfBuzz (WebAssembly) + opentype.js in a Web Worker; bundled OFL fonts and font registry; typed Urdu/Arabic text rendered on a Fabric.js canvas; text tool and on-screen keyboard          | ✅ Done |
| 3     | Contour splitting and classification: every letter body, dot and diacritic independently selectable and movable; drill-down selection (word → letter → part); letters move with their dots/marks (lockable) | Next    |
| 4     | Kashida stretching (tatweel re-shaping + smooth path stretch), alternate-glyph picker (`salt`, `swsh`, `ssNN`, `cvNN`), baseline guide and Nastaliq stacking tools                                          | Planned |
| 5     | Layers panel, full properties (fill, gradient, stroke, opacity, shadow), unlimited undo/redo, version history, export to SVG / PNG (1×, 2×, 4×, custom DPI) / PDF                                           | Planned |
| 6     | Templates gallery, ornaments and borders, Urdu/Arabic/Persian UI with RTL layout, installable offline PWA                                                                                                   | Planned |
| 7     | Test coverage, Storybook, performance and accessibility audit (Lighthouse > 90)                                                                                                                             | Planned |

## Phase 2 — delivered

- `src/features/shaping`: framework-free engine (HarfBuzz shaping, opentype.js outlines, pure
  multi-line layout) running in a Web Worker behind a cached, promise-based client.
- `src/features/fonts`: validated registry of 8 OFL fonts with per-language defaults, previews in
  the font picker.
- Editor: Fabric.js stage (text as glyph paths, SVG artwork as images), select / move / scale /
  rotate / flip on canvas, text tool with on-screen Urdu, Arabic and Persian keyboards, text
  properties panel.
- Document schema v2 (`texts`, artwork rotation) with migrations for IndexedDB and `.qalam` files.

## Phase 3 — plan

- Engine: split each glyph outline into closed contours; classify by area, position relative to
  the baseline and the GDEF glyph class into `body`, `dot` and `mark`; keep the classification
  overridable per part.
- Document: per-part transform deltas keyed by (cluster, glyph, contour), schema v3.
- Editor: groups word → letter → part with double-click drill-down, and a "move dots with letter"
  lock.
- Re-edit text: diff old and new shaped runs by cluster and keep deltas where glyphs still match.

## Known limitations

- Mixed-direction lines (Latin words inside Arabic-script text) are shaped as one right-to-left
  run; full bidi itemization comes later.
- Very large artboards cap the maximum zoom so the canvas stays within browser size limits.
