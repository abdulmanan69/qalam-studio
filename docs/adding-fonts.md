# Adding a font

A font is added with one folder and one registry entry — no code changes.

## Requirements

- **License**: SIL Open Font License 1.1 (or another license that allows redistribution and
  embedding in a web app). The license text must be included next to the font.
- **Format**: TrueType/OpenType (`.ttf`, `.otf`) or `.woff2`. HarfBuzz reads the OpenType tables
  directly; keep the font's `GSUB`/`GPOS` tables intact (do not subset away Arabic features).
  If the font declares a Reserved Font Name, add it unmodified.
- **Coverage**: every letter of each language you declare (see below — the tests check this).
- **Size**: fonts are fetched only when a design first uses them, not at startup, so size affects
  first use rather than app start. Prefer compact files where available.

## Steps

1. Create a folder named after the font id (lowercase, hyphens) with the font and its license:

   ```
   public/fonts/lateef/
     Lateef-Regular.ttf
     OFL.txt
   ```

2. Add an entry to `src/features/fonts/registry.json`:

   ```json
   {
     "id": "lateef",
     "name": "Lateef",
     "style": "naskh",
     "file": "lateef/Lateef-Regular.ttf",
     "license": "lateef/OFL.txt",
     "languages": ["ar", "sd", "ur"],
     "lineHeight": 1
   }
   ```

   | Field        | Meaning                                                                         |
   | ------------ | ------------------------------------------------------------------------------- |
   | `id`         | Unique id; also the folder name.                                                |
   | `name`       | Display name in the font picker.                                                |
   | `style`      | `nastaliq`, `naskh`, `thuluth`, `ruqaa`, `kufi`, `diwani` or `display`.         |
   | `file`       | Path relative to `public/fonts/` (inside the font's folder).                    |
   | `license`    | License file, relative to `public/fonts/`.                                      |
   | `languages`  | Content languages the font supports: `ur`, `ar`, `fa`, `ku`, `ps`, `sd`.        |
   | `lineHeight` | Optional. Default line-height multiplier for new text in this font (default 1). |
   | `features`   | Optional. Default OpenType features, e.g. `{ "ss01": true }`.                   |

   Optionally make it the default for a language in `languageDefaults`.

3. Add a row to [`public/fonts/README.md`](../public/fonts/README.md) with the copyright holder
   and source.

4. Run `npm test`. The registry tests check that:
   - the registry is valid (unique ids, files inside the font's folder, valid defaults);
   - the font file and license exist, and the license is the OFL;
   - **the font contains every letter of each declared language** (for example `ٹ ڈ ڑ ں ھ ہ ے`
     for Urdu, `ټ ډ ړ ښ ګ ڼ` for Pashto). Remove a language from `languages` if this fails.

5. Open a pull request with a screenshot of a sample word (for example `بسم اللہ` and `خوشخط`)
   rendered in the new font on the canvas.

## Bundled fonts

See [`public/fonts/README.md`](../public/fonts/README.md): Noto Nastaliq Urdu, Gulzar, Amiri,
Amiri Quran, Scheherazade New, Noto Naskh Arabic, Aref Ruqaa and Reem Kufi.

No open-licensed Thuluth or Diwani font with reliable HarfBuzz shaping is bundled yet —
contributions are very welcome.
