# Qalam Studio

**Open-source calligraphy editor for Arabic-script languages — in the browser, fully offline.**

Type Urdu, Arabic, Persian, Kurdish, Pashto or Sindhi text, render it in a calligraphic script
(Nastaliq, Naskh, Thuluth, Ruqaa, Kufi), then move, scale and rotate every letter body, dot
(nuqta), diacritic and kashida independently — while connected letters still look joined.
Inspired by desktop tools such as Kelk, built on the open web.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![Deploy](../../actions/workflows/deploy.yml/badge.svg)](../../actions/workflows/deploy.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

![Qalam Studio dashboard](docs/screenshots/dashboard.png)

| Urdu Nastaliq, shaped in the browser               | SVG artwork                            | Dark mode                                         | Mobile                                 |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| ![Nastaliq text](docs/screenshots/editor-text.png) | ![Editor](docs/screenshots/editor.png) | ![Dark mode](docs/screenshots/dashboard-dark.png) | ![Mobile](docs/screenshots/mobile.png) |

## Live demo

Every push to `main` that passes CI is deployed to GitHub Pages at
**[abdulmanan69.github.io/qalam-studio](https://abdulmanan69.github.io/qalam-studio/)**. Your projects stay in your browser — nothing is uploaded.

## Status

Qalam Studio is built in phases ([roadmap](docs/roadmap.md)). Phases 1 and 2 are complete.

**Phase 2 — text shaping**

- ✅ HarfBuzz (WebAssembly) shaping in a Web Worker: contextual forms, ligatures, mark positioning
  and the Nastaliq cascading baseline — independent of the browser's own text rendering
- ✅ Glyph outlines from opentype.js drawn as vector paths on a Fabric.js canvas
- ✅ 8 bundled OFL fonts (Nastaliq, Naskh, Ruqaa, Kufi, display) with a validated font registry
- ✅ Text tool (`T`) with an on-screen Urdu / Arabic / Persian keyboard (letters, harakat, digits)
- ✅ Text properties: content, language, font (with live previews), size, line height, alignment,
  color, position, scale, rotation; move, scale, rotate and flip directly on the canvas
- ✅ Six content languages: Urdu, Arabic, Persian, Kurdish (Sorani), Pashto, Sindhi
- ✅ Document schema v2 with automatic migration of existing projects and `.qalam` files

**Phase 1 — foundation**

- ✅ Enterprise app shell: top bar with command search, slate navigation menus, light/dark themes
- ✅ Dashboard: quick actions, sortable recent-projects table, reminders, storage health
- ✅ Projects stored locally in IndexedDB with autosave; rename, duplicate, delete with undo
- ✅ Artboard presets (A4, A3, square post, story, banner, HD, custom), `.qalam` files, SVG import
- ✅ Zoom (Ctrl + wheel, pinch, shortcuts), pan (hand tool / Space), layers and properties panels
- ✅ Keyboard shortcuts (`?`), full keyboard navigation, WCAG 2.1 AA colors
- ✅ CI (lint, type-check, unit + e2e tests, build) and automatic GitHub Pages deployment

Next up — **Phase 3**: split every glyph into its letter body, dots and diacritics as independent,
movable parts.

## Quick start

Requirements: **Node.js 22** (see `.nvmrc`) and npm.

```bash
git clone https://github.com/abdulmanan69/qalam-studio.git
cd qalam-studio
npm install
npm run dev          # http://localhost:5173
```

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Start the dev server with hot reload            |
| `npm run build`         | Type-check and build the static site to `dist/` |
| `npm run preview`       | Serve the production build locally              |
| `npm test`              | Unit and component tests (Vitest)               |
| `npm run test:coverage` | Tests with a coverage report                    |
| `npm run test:e2e`      | End-to-end tests (Playwright, Chromium)         |
| `npm run lint`          | ESLint (type-aware, accessibility rules)        |
| `npm run typecheck`     | TypeScript strict mode check                    |
| `npm run format`        | Prettier                                        |

First e2e run: `npx playwright install chromium`.

## Deploying your own copy

1. Fork or push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The `CI` workflow runs; when it passes, `Deploy to GitHub Pages` publishes the site.

The deploy workflow sets Vite's `base` to `/<repository>/` automatically (or `/` for
`<owner>.github.io` repositories). Routing uses hash URLs (`#/editor/…`), so deep links work on
GitHub Pages without server rewrites. Details: [docs/deployment.md](docs/deployment.md).

## How to add a font

A font is added with **one folder and one JSON entry** — no code changes:

1. Create `public/fonts/<font-id>/` containing the font file (`.ttf`/`.otf`/`.woff2`) **and its
   license** (`OFL.txt`). Only open-licensed fonts (SIL OFL 1.1 or compatible) are accepted.
2. Add an entry to `src/features/fonts/registry.json` (id, display name, script style, file,
   license, supported languages).
3. Run `npm test`. The registry tests check that the file and license exist, and that the font
   really contains every letter of each language it claims to support.

Bundled fonts and their sources: [public/fonts/README.md](public/fonts/README.md). Full guide:
[docs/adding-fonts.md](docs/adding-fonts.md).

Full guide: [docs/adding-fonts.md](docs/adding-fonts.md).

## Architecture in brief

```
src/
  app/                routing (HashRouter), providers, global stores
  components/ui/      shadcn/ui components (Radix primitives + Tailwind)
  components/layout/  app shell: top bar, navigation, search, dialogs
  features/
    dashboard/        home page
    editor/           editor shell, viewport, panels
    projects/         data model (zod), IndexedDB (Dexie), .qalam files, SVG import
    shaping/          HarfBuzz + opentype.js engine (framework-free) and its Web Worker
    fonts/            font registry, font picker, preview loading
    templates/        templates gallery
  i18n/               react-i18next setup and locale files
  lib/                framework-agnostic helpers
  styles/             design tokens (CSS variables) and Tailwind entry
```

- **100 % static**: no backend, no accounts, no analytics. Data lives in IndexedDB on your device.
- **Typed document model**: zod schemas are the single source of truth for TypeScript types and
  `.qalam` validation.
- **Design tokens**: every color is a CSS variable, so light/dark (and future themes) are a CSS swap.

More in [docs/architecture.md](docs/architecture.md).

## Contributing

Contributions are welcome — code, fonts, templates, translations and bug reports.
Read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).
Security issues: see [SECURITY.md](SECURITY.md).

## License

Code: [MIT](LICENSE). Fonts keep their own licenses (SIL Open Font License), shipped next to each font.

## Author

Created and maintained by **Abdul Manan** — [@abdulmanan69](https://github.com/abdulmanan69).
