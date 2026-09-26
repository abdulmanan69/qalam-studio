# `.qalam` project file format

A `.qalam` file is a UTF-8 JSON document. MIME type: `application/vnd.qalam+json`.

## Envelope

```json
{
  "format": "qalam",
  "formatVersion": 1,
  "exportedAt": "2026-09-27T10:00:00.000Z",
  "app": "Qalam Studio 0.1.0",
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

## Project (schema version 2)

```json
{
  "id": "0d3c6f0e-6a3f-4f7e-9b1e-2c9a7e5d4b10",
  "schemaVersion": 2,
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
      "background": "#ffffff"
    }
  ],
  "assets": [
    {
      "id": "b5e4c3d2-1a2b-4c3d-9e8f-7a6b5c4d3e2f",
      "kind": "svg",
      "name": "Ornamental frame",
      "artboardId": "7a1d2c3b-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1080\" height=\"1080\" viewBox=\"0 0 1080 1080\"></svg>",
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1080,
      "angle": 0,
      "hidden": false
    }
  ],
  "texts": [
    {
      "id": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      "kind": "text",
      "artboardId": "7a1d2c3b-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      "text": "خوش آمدید\nہمارا پاکستان",
      "fontId": "noto-nastaliq-urdu",
      "language": "ur",
      "fontSize": 108,
      "lineHeight": 1,
      "align": "start",
      "fill": "#1a1a1a",
      "x": 293,
      "y": 270,
      "scaleX": 1,
      "scaleY": 1,
      "angle": 0,
      "hidden": false
    }
  ]
}
```

| Field                       | Rules                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                        | 1–64 characters. Replaced with a new id on import.                                                        |
| `schemaVersion`             | `2`. Version 1 files are migrated automatically (see below).                                              |
| `name`                      | 1–120 characters after trimming; any script.                                                              |
| `createdAt` / `updatedAt`   | Unix epoch **milliseconds** (integers).                                                                   |
| `artboards`                 | 1–50 items. `width`/`height` are integers from 16 to 10 000 (CSS px at 96 DPI).                           |
| `artboards[].presetId`      | `a4-portrait`, `a4-landscape`, `a3-portrait`, `square-post`, `story`, `banner`, `hd-landscape`, `custom`. |
| `artboards[].background`    | `#rrggbb`.                                                                                                |
| `assets`                    | 0–500 SVG artwork layers. `artboardId` must reference an artboard in the same project.                    |
| `assets[].svg`              | Sanitized SVG markup, at most 5 MB.                                                                       |
| `assets[].x/y/width/height` | Artboard pixels; `width` and `height` > 0.                                                                |
| `assets[].angle`            | Rotation in degrees, clockwise.                                                                           |
| `texts`                     | 0–1000 calligraphy text layers, painted above artwork.                                                    |
| `texts[].text`              | 1–5000 characters, NFC, `\n` line breaks. The glyphs are always re-shaped from this text.                 |
| `texts[].fontId`            | A font registry id. Unknown ids fall back to the default font when opened.                                |
| `texts[].language`          | `ur`, `ar`, `fa`, `ku`, `ps` or `sd` (selects language-specific letter forms).                            |
| `texts[].fontSize`          | Pixels per em, 4–2000.                                                                                    |
| `texts[].lineHeight`        | Multiplier of the font's natural line height, 0.3–4 (values below 1 stack lines).                         |
| `texts[].align`             | `start` (right for Arabic script), `center` or `end`.                                                     |
| `texts[].x/y`               | Top-left corner of the text box on the artboard, in pixels.                                               |
| `texts[].scaleX/scaleY`     | Non-zero; negative values mirror the text.                                                                |
| `texts[].angle`             | Rotation in degrees, clockwise.                                                                           |
| Layer ids                   | Unique across `assets` and `texts`.                                                                       |

The authoritative definition is the zod schema in
[`src/features/projects/schema.ts`](../src/features/projects/schema.ts).

## Compatibility rules

- Unknown envelope fields are ignored. Unknown project fields are stripped on import.
- Files with a newer `formatVersion` or `schemaVersion` are rejected with a clear message rather
  than partially loaded.
- Older documents are upgraded step by step by
  [`migrations.ts`](../src/features/projects/migrations.ts). v1 → v2 adds `texts: []` and
  `angle: 0` on every asset. Projects stored in the browser are migrated the same way when the app
  updates.
