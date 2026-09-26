# Architecture

Qalam Studio is a static single-page application (Vite + React 18 + TypeScript). It has no
backend: documents live in IndexedDB, and the site can be hosted on any static host.

## Layers

```
┌────────────────────────────────────────────────────────────────┐
│ UI (React)        app shell · dashboard · editor panels        │
│                   shadcn/ui on Radix · Tailwind · i18next      │
├────────────────────────────────────────────────────────────────┤
│ View state        Zustand stores (UI dialogs, editor tool/zoom) │
│ Document state    projects repository (Immer recipes → Dexie)  │
├────────────────────────────────────────────────────────────────┤
│ Domain (pure TS)  zod document schema · .qalam format ·        │
│                   SVG sanitizer · zoom math · (Phase 2) shaping │
├────────────────────────────────────────────────────────────────┤
│ Platform          IndexedDB (Dexie) · Web Workers (Phase 2) ·  │
│                   WebAssembly HarfBuzz (Phase 2)               │
└────────────────────────────────────────────────────────────────┘
```

## Folder structure

| Path                     | Contents                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `src/app`                | Router (`HashRouter`, lazy routes), providers, global UI stores |
| `src/components/ui`      | shadcn/ui components (owned source, Radix primitives)           |
| `src/components/layout`  | Shell: top bar, navigation, global search, shortcuts, dialogs   |
| `src/features/dashboard` | Home page                                                       |
| `src/features/editor`    | Editor page, viewport, tools/layers/properties panels           |
| `src/features/projects`  | Schema, Dexie DB, repository, `.qalam` I/O, SVG import, dialogs |
| `src/features/shaping`   | Phase 2: text shaping engine (framework-free)                   |
| `src/features/fonts`     | Phase 2: font registry and loading                              |
| `src/features/templates` | Templates gallery                                               |
| `src/i18n`               | i18next setup, typed locale resources                           |
| `src/lib`                | Framework-agnostic helpers (hotkeys, time, search, files)       |
| `src/styles`             | Design tokens and Tailwind entry                                |
| `e2e`                    | Playwright tests                                                |

## Key decisions

### Document model: zod as the source of truth

`src/features/projects/schema.ts` defines the project document with zod. TypeScript types are
inferred from it, and the same schema validates `.qalam` files and every repository write. A
document that fails validation is never stored. Schema changes bump `PROJECT_SCHEMA_VERSION` and
add a migration.

### Persistence: repository over Dexie

UI code never talks to IndexedDB directly. `repository.ts` exposes intent-level functions
(`createProject`, `updateProject(id, recipe)`, `duplicateProject` …). `updateProject` runs an Immer
recipe inside a Dexie transaction, validates, bumps `updatedAt` and writes. Components read through
`useLiveQuery` hooks, so every view updates when data changes (including from other tabs).

### Routing: HashRouter

GitHub Pages cannot rewrite unknown paths to `index.html`, so routes live in the hash
(`#/editor/<id>`). Each route is a lazily-loaded chunk.

### Text pipeline

```
TextRun (document)          main thread                         shaping worker
────────────────────        ──────────────────────────          ─────────────────────────────
text, fontId, language  →   useTextLayouts ─ ShapingClient  →   ShapingEngine
fontSize, lineHeight,       (LRU cache, dedupe, timeout)         ├─ HarfBuzz (WASM): shape
align                                                            ├─ opentype.js: glyph outlines
                        ←   TextLayout (glyph paths, box)   ←    └─ layoutText: lines, alignment
                            ArtboardStage (Fabric.js)
                            one Path per glyph, grouped per run
```

- **Engine** (`src/features/shaping`, pure TypeScript, no React or DOM):
  `HarfBuzzFont` shapes one line (contextual forms, ligatures, kerning, mark positioning and the
  Nastaliq cascade all come from the font's OpenType tables). `OutlineFont` returns each glyph's
  outline by glyph id, so outlines always match the shaped result. `layoutText` splits lines,
  applies line height and alignment and places every glyph in a top-left-origin box. The engine
  test suite runs in Node against the bundled fonts.
- **Worker**: `shaping.worker.ts` fetches fonts on first use and keeps them parsed. The engine is
  imported dynamically so the message listener is registered before HarfBuzz finishes its
  top-level WebAssembly initialization.
- **Client**: `ShapingClient` gives promise-based access with an LRU cache (so moving or recoloring
  text never re-shapes it), request de-duplication, a timeout, and worker-crash recovery.
- **Stage**: `ArtboardStage` wraps Fabric.js without React. It reconciles the scene with the
  document on every change, keeps a run's previous drawing while it is being re-shaped (no
  flicker, selection preserved), and reports user transforms back as document changes.
- **Document**: text runs store the text itself plus transform (x, y, scale, angle). Glyphs are
  always re-derived from the text, so a project never contains stale outlines.

Phase 3 builds on this: glyph outlines will be split into contours and classified as
**body**, **dot** (nuqta) or **mark** (harakat), each becoming its own movable part, with user
adjustments stored as deltas keyed by cluster and glyph so re-editing text keeps them.

### Editor rendering

The viewport owns zoom (fit, Ctrl/⌘ + wheel at the cursor, pinch), panning and the maximum zoom
for the artboard (kept within browser canvas-size limits). The Fabric canvas inside draws
artwork and text at `artboard size × zoom` while objects stay in artboard units.

### Styling and theming

Colors, radii and shadows are CSS variables in `src/styles/tokens.css`, mapped into Tailwind
with `@theme inline`. Dark mode swaps the variables under `.dark`. Components use logical
properties (`ms-`, `pe-`, `start-`) so RTL UI languages need no layout forks.

### Accessibility

Interactive widgets come from Radix (focus management, ARIA). The global search implements the
ARIA combobox pattern. Shortcuts match on physical keys (`event.code`), so they work on Urdu,
Arabic and Persian keyboard layouts. ESLint enforces `jsx-a11y` rules; tests query by role and label.

## Testing strategy

| Level      | Tool                          | Covers                                                                      |
| ---------- | ----------------------------- | --------------------------------------------------------------------------- |
| Unit       | Vitest                        | Schema, repository (fake IndexedDB), file formats, sanitizer, hotkeys, zoom |
| Component  | Testing Library               | Dashboard flows, search combobox, dialogs                                   |
| End-to-end | Playwright (production build) | Create, rename, import SVG, keyboard, theme persistence                     |
