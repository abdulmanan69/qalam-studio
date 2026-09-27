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
 * v3 → v4: publishing — stories flowing through linked text frames, paragraph
 *          styles, placed photos, text wrap, page margins/columns/bleed and
 *          master pages.
 * v4 → v5: shapes (boxes, rules, ellipses) for page design; frames gain
 *          column rules and vertical alignment.
 */
export const PROJECT_SCHEMA_VERSION = 5;

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
export const MAX_ARTBOARDS = 500;
export const MAX_LAYERS = 20_000;
/** Upper bound for one embedded photo (data URL characters, ~15 MB of image data). */
export const MAX_IMAGE_CHARS = 20 * 1024 * 1024;
export const MAX_PARAGRAPH_LENGTH = 20_000;
export const MAX_COLUMNS = 12;

/** Content languages (BCP 47). They select language-specific letter forms when shaping. */
export const TEXT_LANGUAGES = ['ur', 'ar', 'fa', 'ku', 'ps', 'sd'] as const;
export type TextLanguage = (typeof TEXT_LANGUAGES)[number];

export const TEXT_ALIGNS = ['start', 'center', 'end'] as const;
export const SHAPE_KINDS = ['rect', 'ellipse', 'line'] as const;
export const STROKE_DASHES = ['solid', 'dashed', 'dotted'] as const;
export const VERTICAL_ALIGNS = ['top', 'center', 'bottom'] as const;
export const PART_KINDS = ['body', 'dot', 'mark'] as const;

export const ARTBOARD_PRESET_IDS = [
  'a4-portrait',
  'a4-landscape',
  'a3-portrait',
  'square-post',
  'story',
  'banner',
  'hd-landscape',
  'a5-portrait',
  'letter',
  'tabloid',
  'berliner',
  'broadsheet',
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

const lengthSchema = z.number().min(0).max(MAX_ARTBOARD_SIZE);

export const marginsSchema = z.object({
  top: lengthSchema,
  bottom: lengthSchema,
  /** Physical left and right (not start/end), in pixels. */
  left: lengthSchema,
  right: lengthSchema,
});

export const columnsSchema = z.object({
  count: z.number().int().min(1).max(MAX_COLUMNS),
  gutter: z.number().min(0).max(500),
});

export const artboardSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  presetId: z.enum(ARTBOARD_PRESET_IDS),
  width: dimensionSchema,
  height: dimensionSchema,
  background: hexColorSchema,
  guides: z.array(guideSchema).max(200),
  /** Page margins (shown as guides; text frames snap to them). */
  margins: marginsSchema.optional(),
  /** Column grid inside the margins. */
  columns: columnsSchema.optional(),
  /** Bleed around the page for print, in pixels. */
  bleed: z.number().min(0).max(200).optional(),
  /** A master page: its layers appear on every page that uses it. */
  master: z.boolean().optional(),
  /** Master page drawn behind this page. */
  masterId: idSchema.nullable().optional(),
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

/** Text frames flow around layers with a wrap, keeping `offset` pixels away. */
export const wrapSchema = z.object({ offset: z.number().min(0).max(500) });

const layerBase = {
  id: idSchema,
  artboardId: idSchema,
  /** User-given layer name; empty = derived (text content or file name). */
  name: z.string().max(200),
  hidden: z.boolean(),
  locked: z.boolean(),
  groupId: idSchema.nullable(),
  wrap: wrapSchema.optional(),
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

/** A placed photo (PNG, JPEG, WebP or GIF), shown in a box with a fit mode. */
export const imageLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('image'),
  src: z
    .string()
    .max(MAX_IMAGE_CHARS)
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, 'Expected an embedded image'),
  naturalWidth: z.number().positive(),
  naturalHeight: z.number().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  angle: z.number(),
  opacity: unit,
  /** cover = fill the box and crop; contain = fit inside; stretch = distort. */
  fit: z.enum(['cover', 'contain', 'stretch']),
  /** Focal point for cropping, 0–1 (0.5 = centered). */
  focusX: unit,
  focusY: unit,
});

/**
 * A text frame: a box (optionally with columns) that a story flows through.
 * Frames of one story are threaded in `order`; text that does not fit in one
 * frame continues in the next, on any page.
 */
export const textFrameSchema = z.object({
  ...layerBase,
  kind: z.literal('frame'),
  storyId: idSchema,
  order: z.number().int().min(0),
  x: z.number(),
  y: z.number(),
  width: z.number().min(8),
  height: z.number().min(8),
  columns: columnsSchema,
  /** Padding inside the frame. */
  inset: z.number().min(0).max(500),
  background: hexColorSchema.nullable(),
  border: z.object({ color: hexColorSchema, width: z.number().min(0).max(50) }).nullable(),
  /** A thin line down the middle of each gutter (absent = none). */
  columnRule: z
    .object({ color: hexColorSchema, width: z.number().min(0).max(20) })
    .nullable()
    .optional(),
  /** Where the text sits when it does not fill the frame (absent = top). */
  verticalAlign: z.enum(VERTICAL_ALIGNS).optional(),
  /** Even out the columns of a story's last frame, so short text does not leave empty columns. */
  balanceColumns: z.boolean().optional(),
  /** Keep the text in place even over layers with text wrap (text inside a wrapped box). */
  ignoreWrap: z.boolean().optional(),
});

/**
 * A drawn shape: box (optionally rounded), ellipse or rule line. Lines run
 * along the longer side of their box; the box height of a horizontal rule is
 * only its hit area.
 */
export const shapeLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('shape'),
  shape: z.enum(SHAPE_KINDS),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  angle: z.number(),
  opacity: unit,
  fill: hexColorSchema.nullable(),
  stroke: z
    .object({
      color: hexColorSchema,
      width: z.number().min(0).max(200),
      dash: z.enum(STROKE_DASHES),
    })
    .nullable(),
  /** Corner radius of boxes, in pixels. */
  radius: z.number().min(0).max(MAX_ARTBOARD_SIZE),
  /** Two parallel strokes (a newspaper double rule or double border). */
  double: z.boolean(),
});

export const layerSchema = z.discriminatedUnion('kind', [
  svgAssetSchema,
  textRunSchema,
  imageLayerSchema,
  textFrameSchema,
  shapeLayerSchema,
]);

export const PARAGRAPH_ALIGNS = ['justify', 'right', 'center', 'left'] as const;

/** Named paragraph formatting (body text, headline, caption…). */
export const paragraphStyleSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  fontId: z.string().min(1).max(64),
  language: z.enum(TEXT_LANGUAGES),
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  /** Multiplier of the font's natural line height. */
  lineHeight: z.number().min(MIN_LINE_HEIGHT).max(MAX_LINE_HEIGHT),
  align: z.enum(PARAGRAPH_ALIGNS),
  /** How justified lines are filled: kashida (traditional) or wider word spaces. */
  justify: z.enum(['kashida', 'space']),
  /** First-line indent in em. */
  firstIndent: z.number().min(0).max(10),
  spaceBefore: z.number().min(0).max(1000),
  spaceAfter: z.number().min(0).max(1000),
  color: hexColorSchema,
});

export const storySchema = z.object({
  id: idSchema,
  name: z.string().max(MAX_NAME_LENGTH),
  paragraphs: z
    .array(z.object({ text: z.string().max(MAX_PARAGRAPH_LENGTH), styleId: idSchema }))
    .min(1)
    .max(10_000),
});

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
    /** Long text that flows through text frames. */
    stories: z.array(storySchema).max(2000),
    paragraphStyles: z.array(paragraphStyleSchema).min(1).max(200),
    /** Number of the first page (e.g. 1). */
    firstPageNumber: z.number().int().min(-9999).max(99_999),
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
      if (layer.kind === 'frame' && !project.stories.some((s) => s.id === layer.storyId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['layers', index, 'storyId'],
          message: 'Frame references a story that does not exist',
        });
      }
      if (layerIds.has(layer.id)) {
        ctx.addIssue({ code: 'custom', path: ['layers', index, 'id'], message: 'Duplicate layer id' });
      }
      layerIds.add(layer.id);
    });
    const styleIds = new Set(project.paragraphStyles.map((s) => s.id));
    project.stories.forEach((story, s) => {
      story.paragraphs.forEach((paragraph, p) => {
        if (!styleIds.has(paragraph.styleId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['stories', s, 'paragraphs', p, 'styleId'],
            message: 'Paragraph uses a style that does not exist',
          });
        }
      });
    });
    const masters = new Set(project.artboards.filter((a) => a.master).map((a) => a.id));
    project.artboards.forEach((artboard, index) => {
      if (artboard.masterId && !masters.has(artboard.masterId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['artboards', index, 'masterId'],
          message: 'Page uses a master page that does not exist',
        });
      }
    });
  });

export type Guide = z.infer<typeof guideSchema>;
export type Margins = z.infer<typeof marginsSchema>;
export type Columns = z.infer<typeof columnsSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type TextFrame = z.infer<typeof textFrameSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
export type ShapeKind = (typeof SHAPE_KINDS)[number];
export type StrokeDash = (typeof STROKE_DASHES)[number];
export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];
export type ParagraphStyle = z.infer<typeof paragraphStyleSchema>;
export type ParagraphAlign = (typeof PARAGRAPH_ALIGNS)[number];
export type Story = z.infer<typeof storySchema>;
export type StoryParagraph = Story['paragraphs'][number];
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

const style = (
  id: string,
  name: string,
  fontSize: number,
  align: ParagraphStyle['align'],
  extra: Partial<ParagraphStyle> = {},
): ParagraphStyle => ({
  id,
  name,
  fontId: 'noto-nastaliq-urdu',
  language: 'ur',
  fontSize,
  // Nastaliq fonts have very tall natural lines (≈ 2.5 em); 0.7 gives newspaper leading.
  lineHeight: 0.7,
  align,
  justify: 'kashida',
  firstIndent: 0,
  spaceBefore: 0,
  spaceAfter: 0,
  color: '#1a1a1a',
  ...extra,
});

/** Paragraph styles every new document starts with (Urdu newspaper defaults). */
export const DEFAULT_PARAGRAPH_STYLES: readonly ParagraphStyle[] = [
  // Nastaliq body text is traditionally justified with word spaces; Naskh with kashida.
  style('body', 'Body', 16, 'justify', { spaceAfter: 6, justify: 'space' }),
  style('headline', 'Headline', 48, 'center', { spaceAfter: 8 }),
  style('subhead', 'Subheading', 24, 'right', { spaceBefore: 6, spaceAfter: 4 }),
  style('byline', 'Byline', 13, 'right', { color: '#555555', spaceAfter: 6 }),
  style('caption', 'Caption', 12, 'right', { color: '#333333' }),
  style('body-naskh', 'Body (Naskh)', 16, 'justify', {
    fontId: 'amiri',
    language: 'ar',
    lineHeight: 1.1,
    spaceAfter: 6,
  }),
];
