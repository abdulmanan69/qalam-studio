# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Phases 3–7 — letter-level editing, design tools, templates, languages, offline, quality.

### Added

- Glyph splitting into body, dots and marks with automatic classification; drill-down editing
  (word → letter → part), "keep dots with their letter", manual re-classification, hide, merge and
  split parts. Text edits keep the adjustments of unchanged letters.
- Kashida: tatweel re-shaping (Naskh) and smooth stroke stretching (Nastaliq, Ruqaa), with a
  canvas drag tool (`K`) and a slider. Registry field `kashida` per font.
- Alternate glyph picker for `salt`, `swsh`, `ssNN` and `cvNN` features, with previews.
- Guides (baseline tool `B`, rulers), baseline snapping, grid, snap to guides and grid, smart
  guides, symmetry axes, mirror copy.
- Layers panel with drag-and-drop ordering, lock, hide, rename and groups; artboards panel.
- Styles: solid or gradient fill, outline, opacity, shadow.
- Unlimited undo/redo (zundo), instant autosave, version history with named versions (Dexie v3).
- Export: SVG (text as outlines), PNG at 1×/2×/4× or custom DPI (pHYs chunk), vector PDF with one
  page per artboard (jsPDF + svg2pdf.js, loaded on demand).
- Clipboard (copy, cut, paste, also across tabs), duplicate, select all, nudge, align, distribute,
  flip, place SVG, pinch zoom on touch screens.
- Original ornaments, frames and background patterns; template gallery with ten templates and
  live previews.
- Urdu, Arabic and Persian interface translations with right-to-left layout and a language
  switcher.
- Installable offline PWA (fonts and the HarfBuzz engine precached) with update prompts.
- Storybook, end-to-end tests for letter editing, kashida, layers and export, axe accessibility
  checks, locale consistency test.
- [User guide](docs/user-guide.md), linked from the Help menu.
- Letter styles: 20 calligraphic shape and kashida styles and the font's alternate forms for one
  letter across a text or within a selected word, with live previews; widening grows away from
  the letter's connection.
- Position adjuster: arrow pad with ¼/1/5/10 px steps, Alt + arrows for ¼ px, and "dots only",
  "marks only", "letters only" selection.
- Symbols panel: honorifics, Qur'anic marks, ayah numbers, surah and para names and punctuation,
  shown in the current font with unsupported symbols hidden (worker `coverage` request).
- Spacing tuner: letter spacing, word spacing and automatic optical spacing in the layout engine
  (optional `spacing` on text layers).
- Publishing: text frames with columns and stories threaded across pages, line breaking and
  kashida/space justification aligned on the ink, text wrap, paragraph styles, placed photos,
  page setup (newspaper sizes, margins, column grid, bleed), master pages with page-number tokens,
  print PDF with crop marks and bleed, and newspaper/magazine/book templates. Project schema v4.
- Page design: box, rule and ellipse tools (`R`, `L`, `E`) with fill, solid/dashed/dotted and
  double outlines and rounded corners; frame column rules, balanced columns, vertical text
  position and "ignore text wrap"; Urdu daily front page and opinion page templates. Project
  schema v5.

- Type directly on the canvas: double-click a text layer or a text frame to edit its text in
  place (Esc or Ctrl+Enter to finish). Letter editing is entered with Enter.

### Fixed

- Numbers and Latin words inside right-to-left text were drawn backwards (۱۲ as ۲۱).
- Stretched kashida in Nastaliq no longer deforms neighbouring letters or pulls a joined letter
  away from the next one; the overflow marker no longer covers text.

### Changed

- Project schema v3: one ordered `layers` list (artwork and text), styles, per-part adjustments,
  kashida, alternate forms, guides and groups. v1 and v2 projects and files are migrated.
- The Edit, Letters, Layers and Export menus now run editor commands.

## [0.2.0] - 2026-09-27

Phase 2 — text shaping.

### Added

- Shaping engine (`src/features/shaping`): HarfBuzz (WebAssembly) shaping and opentype.js glyph
  outlines with multi-line layout (line height, alignment), framework-free and tested in Node
  against the bundled fonts.
- Shaping Web Worker with a cached, de-duplicating client, request timeout and crash recovery.
- Eight bundled OFL fonts: Noto Nastaliq Urdu, Gulzar, Amiri, Amiri Quran, Scheherazade New,
  Noto Naskh Arabic, Aref Ruqaa, Reem Kufi; validated font registry with per-language defaults
  and tests that each font covers the letters of the languages it declares.
- Fabric.js artboard canvas: text drawn as glyph paths, SVG artwork as images; select, move,
  scale, rotate and mirror on canvas, synced with the document.
- Text tool (`T`) and Add text dialog with language and font pickers (live font previews).
- On-screen keyboards for Urdu, Arabic and Persian, with extra letters for Kurdish, Pashto and
  Sindhi, diacritics, digits and punctuation.
- Text properties: content (live), language, font, size, line height, alignment, color,
  position, scale and rotation; rotation for SVG artwork.
- Shortcuts: `T` add text, `Delete` remove layer, `Esc` deselect.

### Changed

- Project schema v2 (`texts`, artwork `angle`). Stored projects and `.qalam` files from v1 are
  migrated automatically; files from newer versions are rejected with a clear message.
- Zoom is capped per artboard so the canvas stays within browser size limits.
- Fabric.js 7 is used instead of 6: every 6.x release is affected by an SVG-export XSS advisory
  (GHSA-hfvx-25r5-qc3w) that is fixed only in 7.x.

## [0.1.0] - 2026-09-27

Phase 1 — foundation.

### Added

- Application shell: top bar with command search (`/`), dark slate-teal navigation with File,
  Edit, Text, Letters, Layers, Templates, Export, Settings and Help menus, recent-projects menu.
- Design tokens with light and dark themes (system preference supported), Inter and Noto Sans
  Arabic bundled locally, WCAG 2.1 AA contrast.
- Dashboard: quick-action tiles, sortable recent-projects table (open, rename, duplicate,
  download, delete with undo), reminders and tips, workspace storage usage and persistent-storage
  request.
- Local project storage in IndexedDB (Dexie) with a zod-validated document model and autosave.
- New-design dialog with artboard presets (A4, A3, square post, story, banner, HD, custom).
- `.qalam` project files: download and open, versioned and validated.
- SVG import with sanitization; imported artwork is placed on a fitted artboard.
- Editor shell: zoom (buttons, Ctrl/⌘ + wheel, pinch, shortcuts, fit), pan (hand tool, Space,
  middle mouse), layers panel with visibility toggles, properties panel for artboard size,
  background and artwork position/size.
- Keyboard shortcut registry and help dialog (`?`).
- Templates gallery preview.
- i18n infrastructure (react-i18next) with RTL-aware document direction.
- Tooling: Vite, TypeScript strict, ESLint (type-aware + jsx-a11y), Prettier, Husky, lint-staged,
  commitlint, Vitest + Testing Library, Playwright.
- GitHub Actions CI and GitHub Pages deployment, Dependabot, issue and PR templates.

[Unreleased]: ../../compare/v0.2.0...HEAD
[0.2.0]: ../../compare/v0.1.0...v0.2.0
[0.1.0]: ../../releases/tag/v0.1.0
