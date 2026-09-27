# `.qalam` project file format

A `.qalam` file is a UTF-8 JSON document. MIME type: `application/vnd.qalam+json`.

## Envelope

```json
{
  "format": "qalam",
  "formatVersion": 1,
  "exportedAt": "2026-09-27T10:00:00.000Z",
  "app": "Qalam Studio 0.2.0",
  "project": {}
}
```

| Field           | Type    | Notes                                                                |
| --------------- | ------- | -------------------------------------------------------------------- |
| `format`        | string  | Always `"qalam"`.                                                    |
| `formatVersion` | integer | Envelope version. Readers must reject versions newer than they know. |
| `exportedAt`    | string  | ISO-8601 UTC timestamp. Informational.                               |
| `app`           | string  | Producer name and version. Informational.                            |
| `project`       | object  | The project document (below).                                        |

## Project (schema version 5)

```json
{
  "id": "0d3c6f0e-6a3f-4f7e-9b1e-2c9a7e5d4b10",
  "schemaVersion": 4,
  "name": "Bismillah study",
  "createdAt": 1790503200000,
  "updatedAt": 1790506800000,
  "artboards": [
    {
      "id": "7a1d2c3b-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      "name": "Artboard 1",
      "presetId": "square-post",
      "width": 1080,
      "height": 1080,
      "background": "#ffffff",
      "guides": [{ "id": "g1", "axis": "y", "position": 620 }]
    }
  ],
  "layers": [
    {
      "id": "b5e4c3d2-1a2b-4c3d-9e8f-7a6b5c4d3e2f",
      "kind": "svg",
      "name": "Ornamental frame",
      "artboardId": "7a1d2c3b-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      "hidden": false,
      "locked": true,
      "groupId": null,
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1080\" height=\"1080\" viewBox=\"0 0 1080 1080\"></svg>",
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1080,
      "angle": 0,
      "opacity": 1
    },
    {
      "id": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      "kind": "text",
      "name": "",
      "artboardId": "7a1d2c3b-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      "hidden": false,
      "locked": false,
      "groupId": null,
      "text": "خوش آمدید",
      "fontId": "noto-nastaliq-urdu",
      "language": "ur",
      "fontSize": 108,
      "lineHeight": 1,
      "align": "start",
      "style": {
        "fill": {
          "type": "linear",
          "angle": 90,
          "stops": [
            { "offset": 0, "color": "#b8862b" },
            { "offset": 1, "color": "#7a5418" }
          ]
        },
        "stroke": null,
        "opacity": 1,
        "shadow": { "color": "#000000", "opacity": 0.3, "blur": 6, "offsetX": 2, "offsetY": 3 }
      },
      "x": 293,
      "y": 270,
      "scaleX": 1,
      "scaleY": 1,
      "angle": 0,
      "parts": {
        "2:13:0:1": { "dx": 12, "dy": -30, "angle": 0, "scaleX": 1, "scaleY": 1 }
      },
      "kashida": { "5": 0.8 },
      "features": [{ "tag": "cv01", "value": 1, "start": 0, "end": 1 }]
    }
  ],
  "groups": []
}
```

### Project and artboards

| Field                     | Rules                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                      | 1–64 characters. Replaced with a new id on import.                                                        |
| `schemaVersion`           | `4`. Versions 1–3 are migrated automatically (see below).                                                 |
| `name`                    | 1–120 characters after trimming; any script.                                                              |
| `createdAt` / `updatedAt` | Unix epoch **milliseconds** (integers).                                                                   |
| `artboards`               | 1–50 items. `width`/`height` are integers from 16 to 10 000 (CSS px at 96 DPI).                           |
| `artboards[].presetId`    | `a4-portrait`, `a4-landscape`, `a3-portrait`, `square-post`, `story`, `banner`, `hd-landscape`, `custom`. |
| `artboards[].background`  | `#rrggbb`.                                                                                                |
| `artboards[].guides`      | Up to 200 guides. `axis` `"y"` = horizontal line (baseline) at `position`; `"x"` = vertical line.         |
| `layers`                  | Up to 1500 layers in **paint order, bottom first**. Ids are unique.                                       |
| `groups`                  | `{ id, name }`. Layers reference a group with `groupId`.                                                  |

### Common layer fields

| Field        | Rules                                                              |
| ------------ | ------------------------------------------------------------------ |
| `kind`       | `"svg"` or `"text"`.                                               |
| `artboardId` | Must reference an artboard in the same project.                    |
| `name`       | Up to 200 characters; empty = derived (text content or file name). |
| `hidden`     | Hidden layers are not drawn and not exported.                      |
| `locked`     | Locked layers cannot be changed on the canvas.                     |
| `groupId`    | `null` or the id of a group in `groups`.                           |

### SVG layers

| Field              | Rules                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `svg`              | Sanitized SVG markup, at most 5 MB.                                         |
| `x/y/width/height` | Artboard pixels; `width` and `height` > 0. The artwork is stretched to fit. |
| `angle`            | Rotation in degrees, clockwise, around the top-left corner (`x`, `y`).      |
| `opacity`          | 0–1.                                                                        |

### Text layers

| Field           | Rules                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`          | 1–5000 characters, NFC, `\n` line breaks. Glyphs are always re-shaped from this text.                                                                |
| `fontId`        | A font registry id. Unknown ids fall back to the default font when opened.                                                                           |
| `language`      | `ur`, `ar`, `fa`, `ku`, `ps` or `sd` (selects language-specific letter forms).                                                                       |
| `fontSize`      | Pixels per em, 4–2000.                                                                                                                               |
| `lineHeight`    | Multiplier of the font's natural line height, 0.3–4 (values below 1 stack lines).                                                                    |
| `align`         | `start` (right for Arabic script), `center` or `end`.                                                                                                |
| `style.fill`    | `{ "type": "solid", "color" }` or `{ "type": "linear", "angle", "stops": [{ offset 0–1, color }] }` (2–8 stops; angle in degrees, 0 = left → right). |
| `style.stroke`  | `null` or `{ color, width }` (outline, drawn behind the fill).                                                                                       |
| `style.opacity` | 0–1.                                                                                                                                                 |
| `style.shadow`  | `null` or `{ color, opacity 0–1, blur, offsetX, offsetY }`.                                                                                          |
| `x/y`           | Top-left corner of the layout box on the artboard, in pixels.                                                                                        |
| `scaleX/scaleY` | Non-zero; negative values mirror the text.                                                                                                           |
| `angle`         | Rotation in degrees, clockwise, around `x`, `y`.                                                                                                     |
| `parts`         | Per-part adjustments keyed by `cluster:glyphId:occurrence:index` (see below).                                                                        |
| `kashida`       | Extra length in em (0–20) per letter, keyed by the letter's UTF-16 index in `text`.                                                                  |
| `features`      | Alternate forms: OpenType feature `tag` and `value` applied to the characters `[start, end)`.                                                        |
| `spacing`       | Optional `{ letter, word, optical }`: extra em between unconnected letters (−1–3) and between words (−1–5), and automatic even spacing.              |

**Part keys.** The shaping engine splits every glyph into parts (body, dots, marks). A part is
identified by the UTF-16 index of its character (`cluster`), the glyph id, the glyph's occurrence
within that cluster and the part's index within the glyph. The key stays the same as long as the
letter keeps the same glyph.

**Part adjustments** are applied around the part's own center:
`dx`, `dy` (layout pixels), `angle` (degrees), `scaleX`, `scaleY` (non-zero). Optional fields:
`kind` (`body`, `dot` or `mark`) overrides the automatic classification, `hidden: true` hides the
part, and parts sharing the same `link` string move together.

The authoritative definition is the zod schema in
[`src/features/projects/schema.ts`](../src/features/projects/schema.ts).

### Publishing (schema version 4)

| Field                   | Rules                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artboards[].margins`   | Optional `{ top, bottom, left, right }` in pixels.                                                                                                                                                                                                                               |
| `artboards[].columns`   | Optional `{ count 1–12, gutter }`: the page's column grid.                                                                                                                                                                                                                       |
| `artboards[].bleed`     | Optional bleed in pixels (0–200).                                                                                                                                                                                                                                                |
| `artboards[].master`    | `true` for a master page (not printed; its layers appear on pages that use it).                                                                                                                                                                                                  |
| `artboards[].masterId`  | The master page drawn behind this page, or `null`.                                                                                                                                                                                                                               |
| `layers[].wrap`         | Optional `{ offset }`: text frames keep this many pixels away from the layer's bounding box.                                                                                                                                                                                     |
| `layers[]` kind `frame` | Text frame: `storyId`, `order` (position in the story's thread), `x/y/width/height`, `columns`, `inset`, `background`, `border`; since v5 optional `columnRule` `{ color, width }`, `verticalAlign` (`top`/`center`/`bottom`), `balanceColumns`, `ignoreWrap`.                   |
| `layers[]` kind `shape` | Since v5. `shape` (`rect`, `ellipse`, `line`), box `x/y/width/height`, `angle`, `opacity`, `fill` (color or `null`), `stroke` `{ color, width, dash (solid/dashed/dotted) }` or `null`, `radius` (box corners), `double` (two strokes). A line runs along its box's longer side. |
| `layers[]` kind `image` | Photo: `src` (base64 PNG/JPEG/WebP/GIF data URL, ≤ 20 MB), `naturalWidth/Height`, box, `angle`, `opacity`, `fit` (`cover`, `contain`, `stretch`), `focusX/Y` (0–1).                                                                                                              |
| `stories`               | `{ id, name, paragraphs: [{ text, styleId }] }`: text that flows through the frames with that `storyId`, in `order`.                                                                                                                                                             |
| `paragraphStyles`       | `{ id, name, fontId, language, fontSize, lineHeight, align (justify/right/center/left), justify (kashida/space), firstIndent (em), spaceBefore, spaceAfter, color }`.                                                                                                            |
| `firstPageNumber`       | Number of the first page. Text containing `{page}` / `{pages}` shows the page number / page count.                                                                                                                                                                               |

## Compatibility rules

- Unknown envelope fields are ignored. Unknown project fields are stripped on import.
- Files with a newer `formatVersion` or `schemaVersion` are rejected with a clear message rather
  than partially loaded.
- Older documents are upgraded step by step by
  [`migrations.ts`](../src/features/projects/migrations.ts):
  - v1 → v2 adds `texts: []` and `angle: 0` on every asset.
  - v2 → v3 merges `assets` and `texts` into one ordered `layers` list (artwork below text),
    turns the text `fill` color into `style`, and adds `locked`, `groupId`, `name`, `parts`,
    `kashida`, `features`, artwork `opacity`, artboard `guides` and `groups`.
  - v3 → v4 adds `stories: []`, the default `paragraphStyles` and `firstPageNumber: 1`.
- Projects stored in the browser are migrated the same way when the app updates.
