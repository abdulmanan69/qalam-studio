# Design system

The interface follows a dense, professional "enterprise dashboard" style: light gray page, white
cards with thin borders, a dark slate-teal navigation bar, and muted accent tiles.

All values live in [`src/styles/tokens.css`](../src/styles/tokens.css) as CSS variables and are
exposed to Tailwind through `@theme inline` in [`globals.css`](../src/styles/globals.css). Use the
Tailwind names (`bg-card`, `text-muted-foreground`, `border-border`) — never raw hex values.

## Color tokens

| Token              | Light     | Dark      | Use                           |
| ------------------ | --------- | --------- | ----------------------------- |
| `background`       | `#F2F4F5` | `#14191E` | Page background               |
| `card`             | `#FFFFFF` | `#1C2329` | Panels, cards                 |
| `border`           | `#DDE1E4` | `#303A44` | Hairlines, card borders       |
| `foreground`       | `#1F2A33` | `#E3E8EC` | Body text                     |
| `muted-foreground` | `#5B6670` | `#A3ADB6` | Secondary text                |
| `primary`          | `#3F5465` | `#8FB3CC` | Primary buttons, selection    |
| `nav`              | `#3F5465` | `#243240` | Main navigation bar           |
| `link`             | `#1F5E8C` | `#8CC4EC` | Links                         |
| `ring`             | `#2F6FA3` | `#7FB4E0` | Focus outlines                |
| `destructive`      | `#B42318` | `#F07167` | Destructive actions           |
| `tile-mustard`     | `#B8A020` | same      | "New Design" tile (dark text) |
| `tile-green`       | `#4A7D5A` | same      | "Open Project" tile           |
| `tile-terracotta`  | `#A6643F` | same      | "Templates" tile              |
| `tile-slate`       | `#6E7580` | `#5F6670` | "Import SVG" tile             |

### Contrast (WCAG 2.1 AA)

Body text needs 4.5:1. Checked pairs: foreground on background ≈ 13.9:1, muted text on card
≈ 5.9:1, nav text on nav ≈ 7.9:1. Two tile colors from the original brief were adjusted:

- Mustard `#B8A020` with white text is only 2.6:1, so the tile uses **dark text** (6.7:1).
- Terracotta `#B36E4A` with white text is 4.0:1, so it was darkened to **`#A6643F`** (≈ 4.6:1).

## Typography

- UI font: **Inter** (Latin) with **Noto Sans Arabic** (Arabic script), both bundled via
  Fontsource. When the UI language is Arabic, Urdu or Persian, Noto Sans Arabic leads the stack.
- Base size 13 px (`0.8125rem`), with 11–12 px for captions and 15–16 px for page titles.
- Calligraphy fonts are separate from UI fonts and are loaded by the font registry (Phase 2).

## Shape and elevation

- Radius: 5 px (`rounded-md`), 3 px (`rounded-sm`), 7 px (`rounded-lg`, dialogs).
- Shadows: `shadow-card` (subtle, for cards and inputs) and `shadow-popover` (menus, dialogs).

## Layout rules

- Use logical utilities for anything directional: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
  `text-start`, `border-s`/`border-e`. Icons that imply direction get `rtl:rotate-180`.
- Dense spacing: 12–16 px gaps between cards, 16 px card padding.

## Focus and interaction

- Every interactive element shows a 2 px `ring` outline on keyboard focus (`:focus-visible`).
  On the dark navigation bar the outline is white.
- Motion is minimal and disabled under `prefers-reduced-motion`.
