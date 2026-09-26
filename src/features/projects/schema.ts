import { z } from 'zod';

/**
 * Project document model (schema version 2).
 *
 * The zod schemas are the single source of truth: TypeScript types are
 * inferred from them, and the same schemas validate `.qalam` files on import.
 * Each schema change bumps PROJECT_SCHEMA_VERSION and adds a step to
 * `migrations.ts`, so older documents keep loading.
 *
 * v1 → v2: calligraphy text runs (`texts`) and rotation for SVG artwork.
 */
export const PROJECT_SCHEMA_VERSION = 2;

export const MIN_ARTBOARD_SIZE = 16;
export const MAX_ARTBOARD_SIZE = 10_000;
export const MAX_NAME_LENGTH = 120;
/** Upper bound for a single embedded SVG (characters). */
export const MAX_SVG_CHARS = 5 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 5000;
export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 2000;
export const MIN_LINE_HEIGHT = 0.3;
export const MAX_LINE_HEIGHT = 4;

/** Content languages (BCP 47). They select language-specific letter forms when shaping. */
export const TEXT_LANGUAGES = ['ur', 'ar', 'fa', 'ku', 'ps', 'sd'] as const;
export type TextLanguage = (typeof TEXT_LANGUAGES)[number];

export const TEXT_ALIGNS = ['start', 'center', 'end'] as const;

export const ARTBOARD_PRESET_IDS = [
  'a4-portrait',
  'a4-landscape',
  'a3-portrait',
  'square-post',
  'story',
  'banner',
  'hd-landscape',
  'custom',
] as const;

export type ArtboardPresetId = (typeof ARTBOARD_PRESET_IDS)[number];

const idSchema = z.string().min(1).max(64);
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #rrggbb color');
const dimensionSchema = z.number().int().min(MIN_ARTBOARD_SIZE).max(MAX_ARTBOARD_SIZE);
const timestampSchema = z.number().int().nonnegative();

export const artboardSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  presetId: z.enum(ARTBOARD_PRESET_IDS),
  width: dimensionSchema,
  height: dimensionSchema,
  background: hexColorSchema,
});

export const svgAssetSchema = z.object({
  id: idSchema,
  kind: z.literal('svg'),
  name: z.string().max(200),
  artboardId: idSchema,
  svg: z.string().min(1).max(MAX_SVG_CHARS),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Degrees, clockwise, around the artwork's center. */
  angle: z.number(),
  hidden: z.boolean(),
});

const nonZero = z.number().refine((v) => v !== 0 && Number.isFinite(v), 'Must be a non-zero number');

/**
 * A block of calligraphy text. The text itself is the source of truth; its
 * glyphs are re-shaped from it. `x`/`y` place the layout box's top-left
 * corner on the artboard; scale (negative = mirrored) and angle are applied
 * around the box as in any vector editor.
 */
export const textRunSchema = z.object({
  id: idSchema,
  kind: z.literal('text'),
  artboardId: idSchema,
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  fontId: z.string().min(1).max(64),
  language: z.enum(TEXT_LANGUAGES),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  lineHeight: z.number().min(MIN_LINE_HEIGHT).max(MAX_LINE_HEIGHT),
  align: z.enum(TEXT_ALIGNS),
  fill: hexColorSchema,
  x: z.number(),
  y: z.number(),
  scaleX: nonZero,
  scaleY: nonZero,
  angle: z.number(),
  hidden: z.boolean(),
});

export const projectSchema = z
  .object({
    id: idSchema,
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    artboards: z.array(artboardSchema).min(1).max(50),
    assets: z.array(svgAssetSchema).max(500),
    texts: z.array(textRunSchema).max(1000),
  })
  .superRefine((project, ctx) => {
    const artboardIds = new Set(project.artboards.map((a) => a.id));
    const layerIds = new Set<string>();
    const check = (collection: 'assets' | 'texts', items: { id: string; artboardId: string }[]) => {
      items.forEach((item, index) => {
        if (!artboardIds.has(item.artboardId)) {
          ctx.addIssue({
            code: 'custom',
            path: [collection, index, 'artboardId'],
            message: 'Layer references an artboard that does not exist',
          });
        }
        if (layerIds.has(item.id)) {
          ctx.addIssue({ code: 'custom', path: [collection, index, 'id'], message: 'Duplicate layer id' });
        }
        layerIds.add(item.id);
      });
    };
    check('assets', project.assets);
    check('texts', project.texts);
  });

export type Artboard = z.infer<typeof artboardSchema>;
export type SvgAsset = z.infer<typeof svgAssetSchema>;
export type TextRun = z.infer<typeof textRunSchema>;
export type TextAlign = TextRun['align'];
export type Project = z.infer<typeof projectSchema>;
