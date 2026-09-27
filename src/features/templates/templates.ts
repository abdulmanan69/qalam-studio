import { getFont } from '@/features/fonts/registry';
import { DEFAULT_ORNAMENT_COLOR, getOrnament } from '@/features/ornaments/ornaments';
import { buildProject, createSvgLayer } from '@/features/projects/repository';
import {
  projectSchema,
  type ArtboardPresetId,
  type Layer,
  type LayerStyle,
  type Project,
  type TextLanguage,
  type TextRun,
} from '@/features/projects/schema';
import { parseSvg } from '@/features/projects/svg-import';
import { createTextRun } from '@/features/projects/text-runs';
import type { TextLayout } from '@/features/shaping/types';
import { clamp } from '@/lib/utils';

import {
  bookChapter,
  dailyFrontPage,
  magazineArticle,
  newspaperFrontPage,
  opinionPage,
} from './publications';

/**
 * Starter compositions. Each is a recipe (text, fonts, ornaments, colors),
 * turned into a normal project — every letter, dot and ornament stays
 * editable. Texts are public-domain classics (Qur'anic phrases, Iqbal, Hafez).
 */

export type TemplateCategory = 'publications' | 'bismillah' | 'names' | 'logos' | 'poetry' | 'frames';

export type TemplateId =
  | 'bismillah-naskh'
  | 'bismillah-nastaliq'
  | 'name-nastaliq'
  | 'name-ruqaa'
  | 'logo-kufi'
  | 'logo-thuluth'
  | 'poetry-iqbal'
  | 'poetry-hafez'
  | 'frame-alhamdulillah'
  | 'frame-mashallah'
  | 'daily-front-page'
  | 'opinion-page'
  | 'newspaper-front'
  | 'magazine-article'
  | 'book-chapter';

interface TextSpec {
  text: string;
  fontId: string;
  language: TextLanguage;
  /** Target width as a fraction of the artboard width. */
  width: number;
  /** Vertical center as a fraction of the artboard height. */
  y: number;
  style?: Partial<LayerStyle>;
}

interface OrnamentSpec {
  id: string;
  color?: string;
  /** Box as fractions of the artboard; omitted = fill the artboard. */
  box?: { x: number; y: number; width: number; height: number };
}

export interface TemplateDef {
  id: TemplateId;
  category: TemplateCategory;
  presetId: ArtboardPresetId;
  width: number;
  height: number;
  background: string;
  /** Painted bottom to top: ornaments first, then texts. */
  ornaments: OrnamentSpec[];
  texts: TextSpec[];
  /** Publications build the whole multi-page document themselves. */
  document?: (name: string, artboardName: string | undefined, now: number) => Project;
}

const GOLD: LayerStyle['fill'] = {
  type: 'linear',
  angle: 90,
  stops: [
    { offset: 0, color: '#b8862b' },
    { offset: 1, color: '#7a5418' },
  ],
};

const INK = '#1f2a36';

export const TEMPLATES: readonly TemplateDef[] = [
  {
    id: 'bismillah-naskh',
    category: 'bismillah',
    presetId: 'banner',
    width: 1500,
    height: 500,
    background: '#fbf6ea',
    ornaments: [{ id: 'frame-classic', color: '#b8862b' }],
    texts: [
      {
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        fontId: 'amiri',
        language: 'ar',
        width: 0.72,
        y: 0.52,
        style: { fill: GOLD },
      },
    ],
  },
  {
    id: 'bismillah-nastaliq',
    category: 'bismillah',
    presetId: 'square-post',
    width: 1080,
    height: 1080,
    background: '#f4f1e8',
    ornaments: [{ id: 'frame-arch', color: '#2f5d50' }],
    texts: [
      {
        text: 'بسم اللہ الرحمٰن الرحیم',
        fontId: 'noto-nastaliq-urdu',
        language: 'ur',
        width: 0.66,
        y: 0.56,
        style: { fill: { type: 'solid', color: '#2f5d50' } },
      },
    ],
  },
  {
    id: 'name-nastaliq',
    category: 'names',
    presetId: 'square-post',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    ornaments: [{ id: 'rosette', color: '#b8862b', box: { x: 0.4, y: 0.12, width: 0.2, height: 0.2 } }],
    texts: [
      {
        text: 'محمد علی',
        fontId: 'gulzar',
        language: 'ur',
        width: 0.6,
        y: 0.58,
        style: { fill: { type: 'solid', color: INK } },
      },
    ],
  },
  {
    id: 'name-ruqaa',
    category: 'names',
    presetId: 'square-post',
    width: 1080,
    height: 1080,
    background: '#fdf8f0',
    ornaments: [{ id: 'medallion', color: '#9a3b3b', box: { x: 0.12, y: 0.12, width: 0.76, height: 0.76 } }],
    texts: [
      {
        text: 'فاطمة',
        fontId: 'aref-ruqaa',
        language: 'ar',
        width: 0.46,
        y: 0.5,
        style: { fill: { type: 'solid', color: '#9a3b3b' } },
      },
    ],
  },
  {
    id: 'logo-kufi',
    category: 'logos',
    presetId: 'square-post',
    width: 1080,
    height: 1080,
    background: '#1f2a36',
    ornaments: [{ id: 'star', color: '#d9b36c', box: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } }],
    texts: [
      {
        text: 'قلم',
        fontId: 'reem-kufi',
        language: 'ar',
        width: 0.3,
        y: 0.5,
        style: { fill: { type: 'solid', color: '#f5e6c4' } },
      },
    ],
  },
  {
    id: 'logo-thuluth',
    category: 'logos',
    presetId: 'banner',
    width: 1500,
    height: 500,
    background: '#ffffff',
    ornaments: [{ id: 'divider', color: '#2f6fa3', box: { x: 0.25, y: 0.72, width: 0.5, height: 0.0625 } }],
    texts: [
      {
        text: 'دار الخط',
        fontId: 'amiri-quran',
        language: 'ar',
        width: 0.4,
        y: 0.42,
        style: { fill: { type: 'solid', color: '#2f6fa3' } },
      },
    ],
  },
  {
    id: 'poetry-iqbal',
    category: 'poetry',
    presetId: 'story',
    width: 1080,
    height: 1920,
    background: '#f7f3ea',
    ornaments: [
      { id: 'pattern-dots', color: '#8a6d3b' },
      { id: 'divider', color: '#8a6d3b', box: { x: 0.2, y: 0.49, width: 0.6, height: 0.04 } },
    ],
    texts: [
      {
        text: 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے',
        fontId: 'noto-nastaliq-urdu',
        language: 'ur',
        width: 0.84,
        y: 0.4,
        style: { fill: { type: 'solid', color: INK } },
      },
      {
        text: 'خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے',
        fontId: 'noto-nastaliq-urdu',
        language: 'ur',
        width: 0.84,
        y: 0.6,
        style: { fill: { type: 'solid', color: INK } },
      },
    ],
  },
  {
    id: 'poetry-hafez',
    category: 'poetry',
    presetId: 'a4-landscape',
    width: 1123,
    height: 794,
    background: '#fffdf7',
    ornaments: [{ id: 'frame-classic', color: '#6b4e2e' }],
    texts: [
      {
        text: 'الا یا ایها الساقی ادر کأسا و ناولها',
        fontId: 'noto-nastaliq-urdu',
        language: 'fa',
        width: 0.72,
        y: 0.38,
        style: { fill: { type: 'solid', color: '#3a2a18' } },
      },
      {
        text: 'که عشق آسان نمود اول ولی افتاد مشکل‌ها',
        fontId: 'noto-nastaliq-urdu',
        language: 'fa',
        width: 0.72,
        y: 0.64,
        style: { fill: { type: 'solid', color: '#3a2a18' } },
      },
    ],
  },
  {
    id: 'frame-alhamdulillah',
    category: 'frames',
    presetId: 'a4-portrait',
    width: 794,
    height: 1123,
    background: '#fbfaf5',
    ornaments: [
      { id: 'pattern-stars', color: '#2f5d50' },
      { id: 'frame-classic', color: '#2f5d50' },
      {
        id: 'medallion',
        color: '#2f5d50',
        box: { x: 0.14, y: 0.3, width: 0.72, height: 0.72 * (794 / 1123) },
      },
    ],
    texts: [
      {
        text: 'الحمد لله',
        fontId: 'amiri',
        language: 'ar',
        width: 0.46,
        y: 0.555,
        style: { fill: { type: 'solid', color: '#2f5d50' } },
      },
    ],
  },
  {
    id: 'frame-mashallah',
    category: 'frames',
    presetId: 'square-post',
    width: 1080,
    height: 1080,
    background: '#fff9f0',
    ornaments: [
      { id: 'frame-arch', color: '#a35d2a' },
      { id: 'corner', color: '#a35d2a', box: { x: 0.08, y: 0.72, width: 0.2, height: 0.2 } },
    ],
    texts: [
      {
        text: 'ما شاء الله',
        fontId: 'aref-ruqaa',
        language: 'ar',
        width: 0.56,
        y: 0.58,
        style: { fill: { type: 'solid', color: '#a35d2a' } },
      },
    ],
  },
  {
    id: 'daily-front-page',
    category: 'publications',
    presetId: 'broadsheet',
    width: 1440,
    height: 2184,
    background: '#ffffff',
    ornaments: [],
    texts: [],
    document: dailyFrontPage,
  },
  {
    id: 'opinion-page',
    category: 'publications',
    presetId: 'tabloid',
    width: 1056,
    height: 1632,
    background: '#ffffff',
    ornaments: [],
    texts: [],
    document: opinionPage,
  },
  {
    id: 'newspaper-front',
    category: 'publications',
    presetId: 'tabloid',
    width: 1056,
    height: 1632,
    background: '#ffffff',
    ornaments: [],
    texts: [],
    document: newspaperFrontPage,
  },
  {
    id: 'magazine-article',
    category: 'publications',
    presetId: 'a4-portrait',
    width: 794,
    height: 1123,
    background: '#ffffff',
    ornaments: [],
    texts: [],
    document: magazineArticle,
  },
  {
    id: 'book-chapter',
    category: 'publications',
    presetId: 'a5-portrait',
    width: 559,
    height: 794,
    background: '#ffffff',
    ornaments: [],
    texts: [],
    document: bookChapter,
  },
];

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  'publications',
  'bismillah',
  'names',
  'logos',
  'poetry',
  'frames',
];

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Measures a text run (layout at its font size); null when shaping is unavailable. */
export type MeasureText = (run: TextRun) => Promise<TextLayout | null>;

/**
 * Build a project from a template. Texts are measured so they fit the
 * intended width and sit centered; without shaping they get a sensible size.
 */
export async function instantiateTemplate(
  template: TemplateDef,
  name: string,
  measure: MeasureText,
  artboardName?: string,
  now: number = Date.now(),
): Promise<Project> {
  if (template.document) return template.document(name, artboardName, now);
  const base = buildProject(
    {
      name,
      presetId: template.presetId,
      width: template.width,
      height: template.height,
      background: template.background,
      ...(artboardName ? { artboardName } : {}),
    },
    now,
  );
  const artboard = base.artboards[0];
  if (!artboard) throw new Error('Template has no artboard');
  const { width: W, height: H } = artboard;
  const layers: Layer[] = [];

  for (const spec of template.ornaments) {
    const ornament = getOrnament(spec.id);
    if (!ornament) continue;
    const b = spec.box ?? { x: 0, y: 0, width: 1, height: 1 };
    const w = b.width * W;
    const h = b.height * H;
    const parsed = parseSvg(
      ornament.build(
        spec.box ? Math.min(w, h) / 0.4 : W,
        spec.box ? Math.min(w, h) / 0.4 : H,
        spec.color ?? DEFAULT_ORNAMENT_COLOR,
      ),
    );
    if (!parsed.ok) continue;
    // Keep the ornament's own proportions inside its box, centered.
    const s = Math.min(w / parsed.value.width, h / parsed.value.height);
    const ow = spec.box ? parsed.value.width * s : W;
    const oh = spec.box ? parsed.value.height * s : H;
    layers.push(
      createSvgLayer(parsed.value, artboard.id, ornament.id, {
        x: b.x * W + (w - ow) / 2,
        y: b.y * H + (h - oh) / 2,
        width: ow,
        height: oh,
      }),
    );
  }

  for (const spec of template.texts) {
    const font = getFont(spec.fontId);
    const fontSize = Math.round(Math.min(W, H) / 8);
    const run = createTextRun({
      artboardId: artboard.id,
      text: spec.text,
      fontId: spec.fontId,
      language: spec.language,
      fontSize,
      lineHeight: font?.lineHeight ?? 1,
      align: 'center',
    });
    run.style = { ...run.style, ...spec.style };
    const layout = await measure(run);
    if (layout && layout.width > 0) {
      const scaled = clamp(Math.round((fontSize * spec.width * W) / layout.width), 8, 1000);
      const k = scaled / fontSize;
      run.fontSize = scaled;
      run.x = Math.round((W - layout.width * k) / 2);
      run.y = Math.round(spec.y * H - (layout.height * k) / 2);
    } else {
      run.x = Math.round((W * (1 - spec.width)) / 2);
      run.y = Math.round(spec.y * H - fontSize / 2);
    }
    layers.push(run);
  }

  return projectSchema.parse({ ...base, layers });
}
