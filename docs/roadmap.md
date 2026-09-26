# Roadmap

| Phase | Scope                                                                                                                                                                                                       | Status  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1     | Scaffold, design system, app shell, dashboard, local projects, `.qalam` files, SVG import, editor shell, CI and GitHub Pages                                                                                | ✅ Done |
| 2     | Shaping engine: HarfBuzz (WebAssembly) + opentype.js in a Web Worker; bundled OFL fonts and font registry; typed Urdu/Arabic text rendered on a Fabric.js canvas; text tool and on-screen keyboard          | ✅ Done |
| 3     | Contour splitting and classification: every letter body, dot and diacritic independently selectable and movable; drill-down selection (word → letter → part); letters move with their dots/marks (lockable) | ✅ Done |
| 4     | Kashida stretching (tatweel re-shaping + smooth path stretch), alternate-glyph picker (`salt`, `swsh`, `ssNN`, `cvNN`), baseline guide and Nastaliq stacking tools                                          | ✅ Done |
| 5     | Layers panel, full properties (fill, gradient, stroke, opacity, shadow), unlimited undo/redo, version history, export to SVG / PNG (1×, 2×, 4×, custom DPI) / PDF                                           | ✅ Done |
| 6     | Templates gallery, ornaments and borders, Urdu/Arabic/Persian UI with RTL layout, installable offline PWA                                                                                                   | ✅ Done |
| 7     | Test coverage, Storybook, performance and accessibility audit                                                                                                                                               | ✅ Done |

## How the letter editing works

- **Engine** (`src/features/shaping/parts.ts`): each glyph outline is split into closed contours;
  holes are attached to their outer contour and overlapping outlines are merged. Shapes are
  classified as `body`, `dot` or `mark` from the GDEF glyph class, the character, the glyph name
  and their size relative to the em and to the largest shape. Every part gets a stable key
  `cluster:glyph:occurrence:index`.
- **Document** (schema v3): per-part adjustments `{dx, dy, angle, scaleX, scaleY}` around the
  part's center, plus optional manual `kind`, `hidden` and `link` (merged parts). Text edits map
  old character indices to new ones, so adjustments of unchanged letters survive.
- **Canvas** (`src/features/editor/canvas/artboard-stage.ts`): at the word, letter or part level
  each unit is a separate Fabric object. After a drag the change is computed with plain matrices
  (`src/lib/matrix.ts`) and applied to every part of the unit.
- **Kashida**: tatweel characters are inserted and re-shaped where the font supports them; the
  remainder (and whole extensions in Nastaliq/Ruqaa fonts) stretches the body outline at its
  joining side while dots and marks move rigidly.

## Ideas for later

- Mixed-direction lines (Latin words inside Arabic-script text) are shaped as one right-to-left
  run; full bidi itemization.
- Freehand pen tool for custom strokes and connections.
- More fonts (Thuluth, Diwani) as open-licensed ones become available.
- Collaborative editing through an optional sync server.

## Known limitations

- Very large artboards cap the maximum zoom so the canvas stays within browser size limits.
- PDF export does not include shadows (a limitation of the vector PDF renderer).
- SVG artwork can be moved, scaled and rotated but not mirrored.
