import { z } from 'zod';

/**
 * Project document model (schema version 3).
 *
 * The zod schemas are the single source of truth: TypeScript types are
 * inferred from them, and the same schemas validate `.qalam` files on import.
 * Each schema change bumps PROJECT_SCHEMA_VERSION and adds a step to
 * `migrations.ts`, so older documents keep loading.
 *
 * v1 → v2: calligraphy text runs and rotation for SVG artwork.
 * v2 → v3: one ordered `layers` list (z-order, lock, name, groups), per-part
 *          adjustments of letters, kashida, alternate forms, styles, guides.
 */
export const PROJECT_SCHEMA_VERSION = 3;

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
export const MAX_KASHIDA_EM = 20;
export const MAX_ARTBOARDS = 50;
export const MAX_LAYERS = 1500;

/** Content languages (BCP 47). They select language-specific letter forms when shaping. */
export const TEXT_LANGUAGES = ['ur', 'ar', 'fa', 'ku', 'ps', 'sd'] as const;
export type TextLanguage = (typeof TEXT_LANGUAGES)[number];

export const TEXT_ALIGNS = ['start', 'center', 'end'] as const;
export const PART_KINDS = ['body', 'dot', 'mark'] as const;

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
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #rrggbb color');
const dimensionSchema = z.number().int().min(MIN_ARTBOARD_SIZE).max(MAX_ARTBOARD_SIZE);
const timestampSchema = z.number().int().nonnegative();
const nonZero = z.number().refine((v) => v !== 0 && Number.isFinite(v), 'Must be a non-zero number');
const unit = z.number().min(0).max(1);

export const guideSchema = z.object({
  id: idSchema,
  /** "y": a horizontal line (e.g. a baseline) at `position`; "x": a vertical line. */
  axis: z.enum(['x', 'y']),
  position: z.number(),
});

export const artboardSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  presetId: z.enum(ARTBOARD_PRESET_IDS),
  width: dimensionSchema,
  height: dimensionSchema,
  background: hexColorSchema,
  guides: z.array(guideSchema).max(200),
});

export const gradientStopSchema = z.object({ offset: unit, color: hexColorSchema });

export const paintSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color: hexColorSchema }),
  z.object({
    type: z.literal('linear'),
    /** Degrees; 0 = left → right, 90 = top → bottom. */
    angle: z.number(),
    stops: z.array(gradientStopSchema).min(2).max(8),
  }),
]);

export const layerStyleSchema = z.object({
  fill: paintSchema,
  stroke: z.object({ color: hexColorSchema, width: z.number().min(0).max(200) }).nullable(),
  opacity: unit,
  shadow: z
    .object({
      color: hexColorSchema,
      /** 0–1 */
      opacity: unit,
      blur: z.number().min(0).max(500),
      offsetX: z.number(),
      offsetY: z.number(),
    })
    .nullable(),
});

/** Adjustment of one glyph part (body, dot or mark), relative to its center. */
export const partOverrideSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  angle: z.number(),
  scaleX: nonZero,
  scaleY: nonZero,
  /** Manual re-classification; absent = automatic. */
  kind: z.enum(PART_KINDS).optional(),
  hidden: z.boolean().optional(),
  /** Parts with the same link are merged: they move together at the part level. */
  link: z.string().min(1).max(64).optional(),
});

/** An OpenType feature applied to a character range (alternate letter forms). */
export const rangeFeatureSchema = z
  .object({
    tag: z.string().regex(/^[\x20-\x7e]{4}$/),
    value: z.number().int().min(0).max(99),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
  })
  .refine((f) => f.end > f.start, 'end must be after start');

const layerBase = {
  id: idSchema,
  artboardId: idSchema,
  /** User-given layer name; empty = derived (text content or file name). */
  name: z.string().max(200),
  hidden: z.boolean(),
  locked: z.boolean(),
  groupId: idSchema.nullable(),
};

export const svgAssetSchema = z.object({
  ...layerBase,
  kind: z.literal('svg'),
  svg: z.string().min(1).max(MAX_SVG_CHARS),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Degrees, clockwise, around the artwork's center. */
  angle: z.number(),
  opacity: unit,
});

/**
 * A block of calligraphy text. The text itself is the source of truth; its
 * glyphs are re-shaped from it. The transform (x, y, angle, scale) places the
 * layout box — whose origin is its top-left corner — on the artboard.
 */
export const textRunSchema = z.object({
  ...layerBase,
  kind: z.literal('text'),
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  fontId: z.string().min(1).max(64),
  language: z.enum(TEXT_LANGUAGES),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  lineHeight: z.number().min(MIN_LINE_HEIGHT).max(MAX_LINE_HEIGHT),
  align: z.enum(TEXT_ALIGNS),
  style: layerStyleSchema,
  x: z.number(),
  y: z.number(),
  scaleX: nonZero,
  scaleY: nonZero,
  angle: z.number(),
  /** Per-part adjustments, keyed by the part key from the shaping engine. */
  parts: z.record(z.string().max(64), partOverrideSchema),
  /** Extra length in em per letter, keyed by the letter's UTF-16 index. */
  kashida: z.record(z.string().regex(/^\d+$/), z.number().min(0).max(MAX_KASHIDA_EM)),
  /** Alternate forms chosen per letter. */
  features: z.array(rangeFeatureSchema).max(500),
  /** Spacing tuner (optional; absent = the font's natural spacing). */
  spacing: z
    .object({
      /** Extra em between letters that do not connect. */
      letter: z.number().min(-1).max(3),
      /** Extra em between words. */
      word: z.number().min(-1).max(5),
      /** Automatic, even gaps (optical kerning). */
      optical: z.boolean(),
    })
    .optional(),
});

export const layerSchema = z.discriminatedUnion('kind', [svgAssetSchema, textRunSchema]);

export const groupSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
});

export const projectSchema = z
  .object({
    id: idSchema,
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    artboards: z.array(artboardSchema).min(1).max(MAX_ARTBOARDS),
    /** Bottom-to-top paint order. */
    layers: z.array(layerSchema).max(MAX_LAYERS),
    groups: z.array(groupSchema).max(500),
  })
  .superRefine((project, ctx) => {
    const artboardIds = new Set(project.artboards.map((a) => a.id));
    const groupIds = new Set(project.groups.map((g) => g.id));
    const layerIds = new Set<string>();
    project.layers.forEach((layer, index) => {
      if (!artboardIds.has(layer.artboardId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['layers', index, 'artboardId'],
          message: 'Layer references an artboard that does not exist',
        });
      }
      if (layer.groupId !== null && !groupIds.has(layer.groupId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['layers', index, 'groupId'],
          message: 'Layer references a group that does not exist',
        });
      }
      if (layerIds.has(layer.id)) {
        ctx.addIssue({ code: 'custom', path: ['layers', index, 'id'], message: 'Duplicate layer id' });
      }
      layerIds.add(layer.id);
    });
  });

export type Guide = z.infer<typeof guideSchema>;
export type Artboard = z.infer<typeof artboardSchema>;
export type Paint = z.infer<typeof paintSchema>;
export type GradientStop = z.infer<typeof gradientStopSchema>;
export type LayerStyle = z.infer<typeof layerStyleSchema>;
export type PartOverride = z.infer<typeof partOverrideSchema>;
export type PartKindName = (typeof PART_KINDS)[number];
export type RangeFeatureSpec = z.infer<typeof rangeFeatureSchema>;
export type SvgAsset = z.infer<typeof svgAssetSchema>;
export type TextRun = z.infer<typeof textRunSchema>;
export type TextAlign = TextRun['align'];
export type Layer = z.infer<typeof layerSchema>;
export type LayerGroup = z.infer<typeof groupSchema>;
export type Project = z.infer<typeof projectSchema>;

export const DEFAULT_TEXT_STYLE: LayerStyle = {
  fill: { type: 'solid', color: '#1a1a1a' },
  stroke: null,
  opacity: 1,
  shadow: null,
};
