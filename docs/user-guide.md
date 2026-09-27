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
- [17. Letter styles](#17-letter-styles)
- [18. Position adjuster](#18-position-adjuster)
- [19. Symbols panel](#19-symbols-panel)
- [20. Spacing tuner](#20-spacing-tuner)
- [21. Newspapers, magazines and books](#21-newspapers-magazines-and-books)
- [22. Troubleshooting](#22-troubleshooting)

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

## 17. Letter styles

Give one letter a calligraphic shape — everywhere in the text at once, or only in one word. Select
a text layer and open the **Letter styles** card:

1. **Letter**: pick the letter to style (all letters of the text are listed; if you selected a
   letter on the canvas it is picked for you).
2. **Apply to**: _Whole text_ changes every occurrence; _Selected word_ changes only the word you
   selected on the canvas (double-click the text, then click the word or a letter in it).
3. **Style**: click one of the twenty styles — _Wide, Wider, Widest, Narrow, Tall, Taller, Short,
   Large, Small, Lean right, Lean left, Swash, Flat, Sweep, Raised, Lowered_ and four kashida
   lengths — or one of the font's own alternate forms, shown after them. Every button previews the
   result on your letter.

Widening grows the letter away from its connection, so joined letters stay joined and tails such
as ے sweep out to the left. Styling a letter again replaces its previous style; **Remove style**
restores the letters. Everything can be fine-tuned afterwards at the Parts level and undone with
`Ctrl+Z`.

## 18. Position adjuster

The **Position** card moves the current selection in exact steps — a whole text, a word, a letter,
or single dots and marks:

- Click the **arrows**, choosing a **step** of ¼, 1, 5 or 10 px. The keyboard works too: arrows
  move 1 px, **Shift + arrows** 10 px and **Alt + arrows** ¼ px.
- **Move dots and marks with their letter** decides whether a letter or word moves with its
  nuqta and aerab, or without them.
- **Dots only / Marks only / Letters only** narrow a selected word or letter to just its dots,
  its marks or its letter bodies, so you can move, for example, all dots of a word together.

## 19. Symbols panel

In the **Text** card (and in _Add text_), click **Show symbols** to insert symbols that are hard to
type:

- **Honorifics**: ﷺ, ﷻ, the small honorific signs placed over a name, and ready phrases such as
  صلی اللہ علیہ وسلم، علیہ السلام، رضی اللہ عنہ، رحمۃ اللہ علیہ.
- **Qur'anic marks**: end-of-ayah sign ۝ with an **ayah number** (type the number, click
  _Insert_), rub el hizb ۞, sajdah ۩, waqf (pause) signs, ruku sign and ornate brackets ﴾ ﴿.
- **Surah names** (all 114) and **Para names** (all 30), ready to use as headings.
- **Punctuation**: ۔ ، ؛ ؟ ٪ ؎ and more.

Symbols are shown in the font of your text, and symbols that font does not contain are hidden
(the panel tells you how many), so what you insert always renders. For Qur'anic work, fonts such
as Amiri, Amiri Quran and Scheherazade New contain the most marks. Symbols are inserted at the
text cursor, or at the end if you have not clicked into the text.

## 20. Spacing tuner

The **Spacing** card adjusts the space between letters and words of a text layer:

- **Automatic spacing (even gaps)** measures the gaps between letter groups that do not connect,
  and between words, and evens them out — the uneven spacing typical of Nastaliq becomes calm and
  regular. Connected letters are never pulled apart.
- **Letter spacing** adds (or, when negative, removes) space between letters that do not connect.
- **Word spacing** changes the space between words.
- Presets: **Tight**, **Balanced** and **Airy**. **Reset spacing** returns to the font's natural
  spacing.

Spacing works together with kashida, letter styles and moved dots.

## 21. Newspapers, magazines and books

Qalam Studio lays out complete multi-page publications — a daily newspaper, a magazine or a book —
with long text that flows by itself through columns and from page to page.

The fastest start is **Templates → Newspapers, magazines & books**: a newspaper front page (with
masthead, headline, photo, five columns and a story continued on page 2), a magazine article and
a book chapter. Replace the sample text and photos and you are done. To build your own:

### Page setup

**Pages → Page setup** (or _File → Page setup_):

- **Size**: A4, A3, A5 (book), US Letter, and the newspaper formats **Tabloid**, **Berliner** and
  **Broadsheet** — or any custom size in millimetres.
- **Margins** and a **column grid** (number of columns and the gutter between them). Margins and
  columns are shown as violet guides; everything snaps to them.
- **Bleed**: how far backgrounds and photos run past the trimmed page edge (usually 3 mm).
- Apply the setup to the current page or to **all pages**.

### Pages and master pages

The **Pages** tab lists every page with its number. **Add** any number of pages, move pages up or
down, duplicate or delete them.

A **master page** holds what repeats on every page: the running header, the footer, the logo and
the **page number**. Click **New master**, put those elements on it, and choose the master for a
page (or **Use on all pages**). Type **{page}** in any text to show the page number and
**{pages}** for the total — they are shown in the script's own digits (۱، ۲، ۳ …). Set the
**first page number** if the document starts at, say, page 17.

### Text frames and stories

1. Choose the **Text frame** tool (`F`) and drag a box on the page. Drawn across several columns
   of the grid, the frame snaps to them and takes the same number of columns.
2. In the **Story** card, paste or type the article — **one paragraph per line** — or **Import
   text file** (UTF-8 `.txt`, e.g. straight from the newsroom system).
3. The text flows down the first column, then the next (right to left), and is **justified** to
   the column width.
4. If the text does not fit, the frame shows a red **+** and the panel offers **Continue on next
   page** or **Continue in a new column**. Continued frames are **linked**: the story flows
   through all of them, and editing the text re-flows everything. _Frame 2 of 3 in this story_
   tells you where you are; **Unlink** takes a frame out of the chain.
5. Each frame has its own number of **columns**, **gutter**, **inset**, **background** and
   **border** (for boxed stories).

The word counter shows how many words are placed, so you always know whether an article fits.

### Paragraph styles

The **Styles** tab holds the document's paragraph styles: _Body_, _Headline_, _Subheading_,
_Byline_, _Caption_ and _Body (Naskh)_, plus any you add (**duplicate** a style to start a new
one). A style sets the font, language, size, **line spacing**, alignment, first-line indent,
space before and after, and colour. For justified text choose how lines are filled:

- **Kashida** — the traditional way: joined letters are lengthened (tatweel in Naskh, stretched
  strokes in Nastaliq) so every line reaches the column edge without gaps between words.
- **Word spaces** — wider spaces, like Latin newspapers.

Give a paragraph a style in the Story card (_Paragraph styles_ list). Changing a style updates
every paragraph that uses it, in every story — change the body size once and the whole paper
follows.

### Photos and text wrap

- **Place photo** (`Shift+P`, or the photo tool): JPG, PNG, WebP or GIF up to 15 MB. Photos are
  embedded in the project, so it stays complete offline.
- **Fit**: _Fill & crop_ (the photo fills its box; move the **crop position** sliders to choose
  the visible part), _Fit inside_ or _Stretch_. Resize the box by dragging its handles.
- **Text wrap**: select a photo (or any artwork, text or frame) and switch on **Text flows around
  this** in the _Text wrap_ card. Frames on the page keep the chosen **distance** around it —
  perfect for photos in the middle of a story, pull quotes and advertisements.

### Printing

**Export → PDF** creates one page per document page (all pages by default). For the printing
press switch on **Crop marks and bleed**: the pages get trim marks and the bleed you set in page
setup. Text is converted to outlines, so the printer needs none of your fonts. For single pages or
the web, export PNG at 300 DPI or SVG.

### Tips for newspaper work

- Build one master page per section (front page, inside pages, sports) with the header and page
  number, and assign it to the pages of that section.
- Keep all body text in one _Body_ style; adjust leading there (0.6–0.8 for Nastaliq) until the
  columns look right.
- Draw frames on the column grid; use **Continue on next page** for jumps (“باقی صفحہ ۵ پر”).
- Save a **named version** before closing each edition; download the `.qalam` file as the archive
  copy.

## 22. Troubleshooting

| Problem                              | Solution                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Text does not appear                 | Your browser must support Web Workers and WebAssembly (all current browsers do).       |
| A letter shows as an empty box       | The font does not contain it; choose a font that supports the language.                |
| I can't select a layer on the canvas | It may be locked or hidden — check the Layers tab.                                     |
| My projects disappeared              | Browser data was cleared, or you use another browser/profile. Keep `.qalam` backups.   |
| Kashida does nothing                 | The letter does not join the next letter (e.g. ا، د، ر، و), so it cannot be extended.  |
| A dot moves with the wrong letter    | Use the Parts level and set its _Part type_, or merge it with the right letter's body. |

Found a bug or have an idea? [Open an issue](https://github.com/abdulmanan69/qalam-studio/issues).
