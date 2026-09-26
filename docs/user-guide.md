# Qalam Studio user guide

A practical guide to making calligraphy with Qalam Studio: from your first word to a print-ready
file. Everything happens in your browser; your work is saved on your own device.

- [1. Start a design](#1-start-a-design)
- [2. Write text](#2-write-text)
- [3. Move, scale and rotate](#3-move-scale-and-rotate)
- [4. Edit letters, dots and marks](#4-edit-letters-dots-and-marks)
- [5. Kashida (letter extension)](#5-kashida-letter-extension)
- [6. Alternate letter forms](#6-alternate-letter-forms)
- [7. Guides, baselines, grid and snapping](#7-guides-baselines-grid-and-snapping)
- [8. Layers and groups](#8-layers-and-groups)
- [9. Color, gradient, outline and shadow](#9-color-gradient-outline-and-shadow)
- [10. Ornaments, frames and patterns](#10-ornaments-frames-and-patterns)
- [11. Artboards (pages)](#11-artboards-pages)
- [12. Undo, autosave and version history](#12-undo-autosave-and-version-history)
- [13. Export](#13-export)
- [14. Work offline and in your language](#14-work-offline-and-in-your-language)
- [15. Keyboard shortcuts](#15-keyboard-shortcuts)
- [16. Tips for good calligraphy](#16-tips-for-good-calligraphy)
- [17. Troubleshooting](#17-troubleshooting)

---

## 1. Start a design

On the **Home** page:

- **New Design** (`Alt+N`): pick a size — A4, A3, square post (1080 × 1080), story (1080 × 1920),
  banner, HD or a custom size in pixels.
- **Templates**: start from a ready-made composition (Bismillah, names, logos, poetry couplets,
  frames). Every letter, dot and ornament in a template stays fully editable.
- **Import SVG** (`Alt+I`): start from existing vector artwork.
- **Open project** (`Ctrl+O`): open a `.qalam` file you downloaded earlier.

Your recent projects are listed on the Home page. Rename, duplicate, download or delete them from
the row menu.

## 2. Write text

1. Press **T** (or the **Text** tool) to open _Add text_.
2. Choose the **language** (Urdu, Arabic, Persian, Kurdish, Pashto, Sindhi). This selects the
   correct letter forms, for example Urdu `ہ` and `ی`.
3. Choose a **font**: Nastaliq (Noto Nastaliq Urdu, Gulzar), Naskh (Amiri, Scheherazade New, Noto
   Naskh Arabic), Ruqaa (Aref Ruqaa), Kufi (Reem Kufi) or display (Amiri Quran).
4. Type, or use the **on-screen keyboard** (letters, harakat such as zabar/zer/pesh, digits).
5. Press **Add to artboard**. The text is sized to fit and centered.

Change the text later in the **Text** panel on the right. Adjustments you made to letters that you
did not change (moved dots, kashida, alternate forms) are kept.

## 3. Move, scale and rotate

- **Drag** a layer to move it. Drag the corner handles to scale (proportionally), the top handle
  to rotate.
- **Arrow keys** move the selection by 1 px, **Shift + arrows** by 10 px.
- Exact values: **X, Y, width scale, height scale, rotation** in the properties panel.
- **Arrange** card: align left/center/right/top/middle/bottom (to the artboard for one layer, to
  the selection for several), distribute evenly (three or more layers), flip horizontally or
  vertically, and **Mirror copy** — a mirrored duplicate across the artboard's center, useful for
  symmetric compositions.

## 4. Edit letters, dots and marks

Qalam Studio splits every letter into its parts: the **body**, its **dots** (nuqta) and **marks**
(harakat, hamza, small signs). You can drill down into a text layer:

| Level       | What you select                  | How to get there                              |
| ----------- | -------------------------------- | --------------------------------------------- |
| **Whole**   | The complete text layer          | Click the text                                |
| **Words**   | One word                         | _Letters & dots_ panel → Words                |
| **Letters** | One letter (with its dots)       | **Double-click** the text, or press **Enter** |
| **Parts**   | One body, dot or mark on its own | Double-click again, or choose _Parts_         |

Press **Esc** to go back up one level. At every level you can **drag, scale and rotate** what you
selected; **Shift-click** or drag a selection rectangle to select several.

**Keep dots with their letter** (on by default): when you move a letter or word, its dots and
marks move with it. Turn it off to move only the letter bodies and leave the dots in place.

At the **Parts** level you can also:

- **Part type** — if a dot was recognized as a mark (or the other way round), set it to _Body_,
  _Dot_ or _Mark_. _Auto_ returns to the automatic classification.
- **Hide** / **Show** a part (hidden parts are shown faintly while you edit, and are never
  exported).
- **Merge parts** — select several parts (Shift-click) and merge them so they move together.
  **Split parts** undoes that.
- **Reset position** puts the selected parts back; **Reset all letter adjustments** resets the
  whole text layer.

## 5. Kashida (letter extension)

Kashida lengthens the connection between two joined letters — the classic way to balance a line.

- **Kashida tool** (`K`): drag a joining letter **sideways**. The letter stretches while you drag
  and the result is applied when you let go. You can press anywhere on a word; the nearest letter
  that can be extended is used.
- **Slider**: select a letter (Letters level) and use _Kashida_ in the _Letters & dots_ panel.

Naskh fonts insert real tatweel (ـ) characters so the stroke keeps the font's own design.
Nastaliq and Ruqaa fonts, where tatweel is not used, stretch the joining stroke smoothly instead.
Only letters that actually connect to the next letter can be extended.

## 6. Alternate letter forms

Many fonts contain alternative shapes for some letters (swashes, stylistic alternates). Select a
letter (Letters level) and pick one under **Alternate forms**; _Default_ restores the normal form.
If the list is empty, the font has no alternatives for that letter — try another font (for
example Reem Kufi, Scheherazade New or Amiri).

## 7. Guides, baselines, grid and snapping

- **Baseline tool** (`B`): click the artboard to add a horizontal guide — the line your text sits
  on. Text **baselines snap** to guides while you drag, which makes it easy to align several lines
  or stack words the way Nastaliq compositions often do.
- **Rulers**: click the top ruler for a vertical guide, the left ruler for a horizontal one.
- **Move a guide** by dragging it; **remove** it by dragging it off the artboard, or in the
  _Guides_ card (shown when nothing is selected), where you can also type exact positions.
- **View options** (sliders icon in the toolbar): rulers, grid (10–100 px), snap to guides and
  grid, **smart guides** (snap to the edges and centers of other objects) and **symmetry axes**
  (vertical, horizontal or both).

## 8. Layers and groups

The **Layers** tab lists everything on the current artboard, top-most first.

- Click to select; **Ctrl-click** or **Shift-click** to select several.
- **Drag** a row to change the stacking order, or use the arrows (`Ctrl+]`, `Ctrl+[`;
  `Ctrl+Shift+]` / `Ctrl+Shift+[` bring to front / send to back).
- **Lock** (padlock) protects a layer from changes on the canvas; **hide** (eye) removes it from
  view and from exports.
- **Double-click** a name (or press F2) to rename it.
- **Group** (`Ctrl+G`) keeps layers together; clicking the group selects all its members.
  **Ungroup** with `Ctrl+Shift+G`.

## 9. Color, gradient, outline and shadow

With a text layer selected, the **Style** card offers:

- **Fill**: a solid color or a **gradient** (two colors and an angle; 90° runs top to bottom).
- **Outline**: color and width — drawn behind the fill so letters keep their shape.
- **Opacity**.
- **Shadow**: color, blur, offset and strength.

SVG artwork has its own opacity setting.

## 10. Ornaments, frames and patterns

The **Assets** tab contains original ornaments (rosette, eight-pointed star, medallion, divider,
corner flourish), **frames** (classic, arch) and **background patterns** (star tiling, hexagons,
lattice, dots, waves). Choose a color first, then click an item. Frames fill the artboard;
patterns are placed behind everything. You can also place your own SVG with the **Place SVG**
tool (`Ctrl+Shift+I`). All assets are free to use in any work.

## 11. Artboards (pages)

A project can contain up to 50 artboards — for example a set of cards or the pages of a booklet.
Use the **Artboards** tab to add, duplicate (with everything on it) or delete artboards, and to
switch between them. Rename an artboard and change its size and background in the properties
panel when nothing is selected. PDF export can include every artboard as a separate page.

## 12. Undo, autosave and version history

- **Undo** `Ctrl+Z`, **Redo** `Ctrl+Shift+Z` (or `Ctrl+Y`), without limit while the project is
  open.
- Every change is **saved automatically** in this browser; the toolbar shows _Saved_.
- **Version history** (clock icon): snapshots are taken automatically every few minutes. Save a
  **named version** before a big change and **restore** any version later — restoring can itself
  be undone.
- **Download** (`Ctrl+S`) saves a `.qalam` file: a complete, portable copy of the project. Keep
  one as a backup or to move work to another computer — browser storage can be cleared.

## 13. Export

**Export** (`Ctrl+E`):

| Format  | Best for                                   | Options                                                       |
| ------- | ------------------------------------------ | ------------------------------------------------------------- |
| **PNG** | Sharing, social media, printing            | 1×, 2×, 4× or a custom DPI (e.g. 300); transparent background |
| **SVG** | Design tools, laser/vinyl cutters, the web | Transparent background                                        |
| **PDF** | Print shops                                | Vector, one page per artboard (all artboards optional)        |

Text is exported as **outlines**, so files look identical everywhere without installing fonts. PNG
files carry their DPI, so print software sizes them correctly. Shadows are not included in PDF.

## 14. Work offline and in your language

- After the first visit Qalam Studio **works offline**, including all fonts. Install it as an app
  from your browser's menu (_Install Qalam Studio_). When an update is available you will be asked
  to reload — nothing is lost.
- **Interface language**: _Settings → Language_ — English, اردو, العربية or فارسی. Urdu, Arabic
  and Persian use a right-to-left layout.
- **Theme**: _Settings → Appearance_ — light, dark or match your system.

## 15. Keyboard shortcuts

Press **?** anywhere for the full list. The most useful ones:

| Action                                  | Keys                                       |
| --------------------------------------- | ------------------------------------------ |
| Add text                                | `T`                                        |
| Select / Hand / Kashida / Baseline tool | `V` / `H` (or hold Space) / `K` / `B`      |
| Edit letters (one level deeper)         | `Enter` (back: `Esc`)                      |
| Undo / Redo                             | `Ctrl+Z` / `Ctrl+Shift+Z`                  |
| Copy / Cut / Paste / Duplicate          | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` / `Ctrl+D`  |
| Select all                              | `Ctrl+A`                                   |
| Delete                                  | `Delete`                                   |
| Group / Ungroup                         | `Ctrl+G` / `Ctrl+Shift+G`                  |
| Nudge                                   | Arrows (Shift: 10 px)                      |
| Zoom in / out / fit / 100 %             | `Ctrl+=` / `Ctrl+-` / `Shift+1` / `Ctrl+0` |
| Grid / Rulers                           | `Ctrl+'` / `Shift+R`                       |
| Export / Download project               | `Ctrl+E` / `Ctrl+S`                        |

On macOS use ⌘ instead of Ctrl.

## 16. Tips for good calligraphy

- **Start from the baseline.** Add a baseline guide first and let lines snap to it.
- **Balance with kashida, not spacing.** Extend one or two letters per line rather than widening
  gaps between words.
- **Move dots last.** Finish letter positions at the Letters level with _Keep dots with their
  letter_ on, then switch to Parts to fine-tune dots so they do not collide.
- **Stack words** in Nastaliq by moving whole words (Words level) up along the diagonal, then
  align each word's baseline with a guide.
- **Use layers**: put ornaments and patterns on their own locked layers so they don't move while
  you work on the text.
- **Save named versions** before experimenting.

## 17. Troubleshooting

| Problem                              | Solution                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Text does not appear                 | Your browser must support Web Workers and WebAssembly (all current browsers do).       |
| A letter shows as an empty box       | The font does not contain it; choose a font that supports the language.                |
| I can't select a layer on the canvas | It may be locked or hidden — check the Layers tab.                                     |
| My projects disappeared              | Browser data was cleared, or you use another browser/profile. Keep `.qalam` backups.   |
| Kashida does nothing                 | The letter does not join the next letter (e.g. ا، د، ر، و), so it cannot be extended.  |
| A dot moves with the wrong letter    | Use the Parts level and set its _Part type_, or merge it with the right letter's body. |

Found a bug or have an idea? [Open an issue](https://github.com/abdulmanan69/qalam-studio/issues).
