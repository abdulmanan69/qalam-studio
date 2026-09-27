import { current, produce, type Draft } from 'immer';

import { createSvgLayer, buildProject } from '@/features/projects/repository';
import {
  projectSchema,
  type Artboard,
  type ArtboardPresetId,
  type ParagraphStyle,
  type Project,
  type ShapeKind,
  type TextFrame,
} from '@/features/projects/schema';
import { parseSvg } from '@/features/projects/svg-import';
import { createTextRun } from '@/features/projects/text-runs';
import { PAGE_TOKEN, pageColumns } from '@/features/publishing/pages';
import { assignMaster, createMaster, makeFrame, newStory } from '@/features/publishing/publishing-ops';
import { createShape, type NewShapeOptions } from '@/features/publishing/shapes';

/**
 * Ready-to-edit publications: a newspaper front page, a magazine article and
 * a book chapter. Everything is built from the normal publishing parts
 * (pages with a column grid, master pages, text frames threaded across pages,
 * paragraph styles, text wrap), so every element stays editable. The sample
 * text is original placeholder copy.
 */

const NEWS = [
  'شہر میں نئے تعلیمی سال کا آغاز ہو گیا ہے اور سکولوں میں طلبہ کی بڑی تعداد نے داخلہ لیا ہے۔ اساتذہ کا کہنا ہے کہ اس سال نصاب میں کئی نئی سرگرمیاں شامل کی گئی ہیں تاکہ بچے کھیل کھیل میں سیکھ سکیں۔',
  'مقامی انتظامیہ نے بتایا کہ شہر کی سڑکوں کی مرمت کا کام اگلے ماہ مکمل ہو جائے گا۔ شہریوں نے امید ظاہر کی ہے کہ اس سے ٹریفک کے مسائل میں نمایاں کمی آئے گی اور سفر آسان ہو جائے گا۔',
  'کھیلوں کے میدان میں بھی رونق لوٹ آئی ہے۔ نوجوان کھلاڑیوں کے لیے نئے تربیتی مراکز کھولے جا رہے ہیں جہاں انہیں جدید سہولیات اور تجربہ کار تربیت کار فراہم کیے جائیں گے۔',
  'ماہرین موسمیات کے مطابق آئندہ ہفتے ملک کے بیشتر حصوں میں موسم خوشگوار رہے گا جبکہ بالائی علاقوں میں ہلکی بارش اور پہاڑوں پر برف باری کا امکان ہے۔',
  'کتاب میلے میں اس برس ریکارڈ تعداد میں لوگوں نے شرکت کی۔ ناشرین کا کہنا ہے کہ اردو ادب کی نئی کتابوں، بچوں کی کہانیوں اور شاعری کے مجموعوں کو خاص طور پر پسند کیا گیا۔',
];

const ESSAY = [
  'خطاطی صدیوں سے فن اور ہنر کا حسین امتزاج رہی ہے۔ ایک خوش نویس جب قلم اٹھاتا ہے تو ہر حرف میں توازن، ہر دائرے میں روانی اور ہر کشش میں ٹھہراؤ پیدا کرنے کی کوشش کرتا ہے۔',
  'نستعلیق کی خوبصورتی اس کی ترچھی سطروں اور گولائی میں ہے۔ الفاظ ایک دوسرے پر یوں ٹکے ہوتے ہیں جیسے سیڑھی کے زینے، اور نقطے اپنی جگہ پر ستاروں کی طرح جگمگاتے ہیں۔',
  'آج کے دور میں کمپیوٹر نے لکھنے کو آسان بنا دیا ہے، مگر خطاطی کی روح کو زندہ رکھنا ہماری ذمہ داری ہے۔ اچھی کتابت پڑھنے والے کی آنکھ کو سکون اور دل کو خوشی دیتی ہے۔',
  'اخبار ہو یا کتاب، صفحے کی ترتیب قاری کی رہنمائی کرتی ہے۔ سرخی توجہ کھینچتی ہے، کالم آنکھ کو آرام سے آگے لے جاتے ہیں اور تصویریں کہانی میں جان ڈال دیتی ہیں۔',
];

function repeat<T>(items: readonly T[], times: number): T[] {
  return Array.from({ length: times }, () => items).flat();
}

function extraStyles(): ParagraphStyle[] {
  const base: Omit<ParagraphStyle, 'id' | 'name' | 'fontSize' | 'align'> = {
    fontId: 'noto-nastaliq-urdu',
    language: 'ur',
    lineHeight: 0.7,
    justify: 'kashida',
    firstIndent: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    color: '#1a1a1a',
  };
  return [
    {
      ...base,
      id: 'masthead',
      name: 'Masthead',
      fontId: 'gulzar',
      fontSize: 72,
      lineHeight: 0.55,
      align: 'center',
      color: '#7a1f1f',
    },
    { ...base, id: 'dateline', name: 'Dateline', fontSize: 13, align: 'center', color: '#444444' },
    { ...base, id: 'kicker', name: 'Kicker', fontSize: 16, align: 'right', color: '#a33a2a' },
    { ...base, id: 'title', name: 'Title', fontSize: 40, align: 'right', spaceAfter: 6 },
    { ...base, id: 'chapter', name: 'Chapter title', fontSize: 32, align: 'center', spaceAfter: 12 },
    // Newspaper page design.
    {
      ...base,
      id: 'banner',
      name: 'Banner headline',
      fontId: 'gulzar',
      fontSize: 54,
      lineHeight: 0.62,
      align: 'center',
    },
    {
      ...base,
      id: 'banner-red',
      name: 'Banner headline (red)',
      fontId: 'gulzar',
      fontSize: 54,
      lineHeight: 0.62,
      align: 'center',
      color: '#b3121f',
    },
    { ...base, id: 'deck', name: 'Deck', fontSize: 20, align: 'center', color: '#b3121f' },
    { ...base, id: 'reverse', name: 'Reverse headline', fontSize: 26, align: 'center', color: '#ffffff' },
    { ...base, id: 'reverse-small', name: 'Reverse label', fontSize: 16, align: 'center', color: '#ffffff' },
    { ...base, id: 'story-head', name: 'Story headline', fontSize: 30, align: 'right', spaceAfter: 2 },
    { ...base, id: 'story-head-center', name: 'Story headline (centered)', fontSize: 32, align: 'center' },
    { ...base, id: 'jump', name: 'Jump line', fontSize: 12, align: 'left', color: '#b3121f' },
    { ...base, id: 'ear', name: 'Ear box', fontSize: 14, align: 'center', spaceAfter: 2 },
    { ...base, id: 'index', name: 'Index', fontSize: 14, align: 'right', spaceAfter: 2 },
    {
      ...base,
      id: 'ad-title',
      name: 'Advert title',
      fontId: 'gulzar',
      fontSize: 48,
      lineHeight: 0.62,
      align: 'center',
      color: '#1f6f43',
    },
    { ...base, id: 'ad-text', name: 'Advert text', fontSize: 18, align: 'center', spaceAfter: 4 },
    {
      ...base,
      id: 'column-name',
      name: 'Column name',
      fontId: 'gulzar',
      fontSize: 30,
      lineHeight: 0.62,
      align: 'center',
      color: '#ffffff',
    },
    { ...base, id: 'author', name: 'Author', fontSize: 15, align: 'center' },
  ];
}

function placeholderPhoto(width: number, height: number): string {
  const w = String(Math.round(width));
  const h = String(Math.round(height));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#d9dde3"/><path d="M${String(width * 0.3)} ${String(height * 0.7)}l${String(width * 0.15)} -${String(height * 0.22)} ${String(width * 0.1)} ${String(height * 0.12)} ${String(width * 0.08)} -${String(height * 0.08)} ${String(width * 0.07)} ${String(height * 0.18)}z" fill="#aab3bf"/><circle cx="${String(width * 0.62)}" cy="${String(height * 0.36)}" r="${String(Math.min(width, height) * 0.06)}" fill="#aab3bf"/></svg>`;
}

type Rect = { x: number; y: number; width: number; height: number };

interface Builder {
  draft: Draft<Project>;
  page: (index: number) => Draft<Artboard>;
}

function story(draft: Draft<Project>, paragraphs: [string, string][], name = ''): string {
  return newStory(
    draft,
    paragraphs.map(([styleId, text]) => ({ styleId, text })),
    name,
  );
}

function frame(
  b: Builder,
  pageIndex: number,
  storyId: string,
  order: number,
  rect: Rect,
  columns = 1,
  gutter = 14,
): void {
  b.draft.layers.push(
    makeFrame(b.page(pageIndex).id, storyId, order, rect, { columns: { count: columns, gutter }, inset: 2 }),
  );
}

function photo(b: Builder, pageIndex: number, rect: Rect, name: string): void {
  const parsed = parseSvg(placeholderPhoto(rect.width, rect.height));
  if (!parsed.ok) return;
  const layer = createSvgLayer(parsed.value, b.page(pageIndex).id, name, rect);
  b.draft.layers.push({ ...layer, wrap: { offset: 10 } });
}

/** A horizontal double rule (an editable shape; its box is the hit area). */
function rule(b: Builder, pageIndex: number, x: number, y: number, width: number, double = true): void {
  b.draft.layers.push(
    createShape(
      b.page(pageIndex).id,
      'line',
      { x, y: y - 3, width, height: 8 },
      { stroke: { color: '#1a1a1a', width: double ? 1 : 1.25, dash: 'solid' }, double, name: 'Rule' },
    ),
  );
}

function shape(
  b: Builder,
  pageIndex: number,
  kind: ShapeKind,
  rect: Rect,
  options: NewShapeOptions & { wrap?: number } = {},
): void {
  const layer = createShape(b.page(pageIndex).id, kind, rect, options);
  b.draft.layers.push(options.wrap === undefined ? layer : { ...layer, wrap: { offset: options.wrap } });
}

/** A vertical rule between two column blocks. */
function vrule(b: Builder, pageIndex: number, x: number, y: number, height: number): void {
  shape(
    b,
    pageIndex,
    'line',
    { x: x - 4, y, width: 8, height },
    { stroke: { color: '#1a1a1a', width: 0.75, dash: 'solid' }, name: 'Rule' },
  );
}

type BlockOptions = Partial<
  Pick<
    TextFrame,
    'background' | 'border' | 'columnRule' | 'verticalAlign' | 'inset' | 'balanceColumns' | 'ignoreWrap'
  >
> & {
  columns?: number;
  gutter?: number;
  name?: string;
};

/** A new story in one frame (headlines, boxes, short stories). Returns the story id. */
function block(
  b: Builder,
  pageIndex: number,
  paragraphs: [string, string][],
  rect: Rect,
  options: BlockOptions = {},
): string {
  const { columns = 1, gutter = 12, name = '', ...extra } = options;
  const storyId = story(b.draft, paragraphs, name);
  b.draft.layers.push(
    makeFrame(b.page(pageIndex).id, storyId, 0, rect, {
      columns: { count: columns, gutter },
      inset: 2,
      ...extra,
    }),
  );
  return storyId;
}

const RULE = { color: '#1a1a1a', width: 0.5 };

function portraitPhoto(width: number, height: number): string {
  const w = String(Math.round(width));
  const h = String(Math.round(height));
  const cx = String(width / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#d9dde3"/><circle cx="${cx}" cy="${String(height * 0.38)}" r="${String(width * 0.2)}" fill="#aab3bf"/><path d="M${String(width * 0.14)} ${h}C${String(width * 0.14)} ${String(height * 0.7)} ${String(width * 0.3)} ${String(height * 0.62)} ${cx} ${String(height * 0.62)}S${String(width * 0.86)} ${String(height * 0.7)} ${String(width * 0.86)} ${h}Z" fill="#aab3bf"/></svg>`;
}

/** A page-number line on a master page, centered near the bottom. */
function pageNumberText(draft: Draft<Project>, master: Artboard, label: string, y: number): void {
  const run = createTextRun({
    artboardId: master.id,
    text: `${label} ${PAGE_TOKEN}`,
    fontId: 'noto-nastaliq-urdu',
    language: 'ur',
    fontSize: 14,
    x: master.width / 2 - 36,
    y,
    name: 'Page number',
  });
  draft.layers.push(run);
}

function makeDocument(
  name: string,
  presetId: ArtboardPresetId,
  size: { width: number; height: number },
  pages: number,
  grid: {
    margin: { top: number; bottom: number; left: number; right: number };
    columns: number;
    gutter: number;
  },
  build: (b: Builder) => void,
  artboardName?: string,
  now: number = Date.now(),
): Project {
  const base = buildProject(
    { name, presetId, width: size.width, height: size.height, ...(artboardName ? { artboardName } : {}) },
    now,
  );
  const result = produce(base, (draft) => {
    draft.paragraphStyles.push(...extraStyles());
    const first = draft.artboards[0];
    if (!first) return;
    first.name = 'صفحہ 1';
    first.margins = { ...grid.margin };
    first.columns = { count: grid.columns, gutter: grid.gutter };
    for (let i = 1; i < pages; i++) {
      draft.artboards.push({
        ...structuredClone(current(first)),
        id: `${first.id}-${String(i)}`,
        name: `صفحہ ${String(i + 1)}`,
      });
    }
    const pageList = draft.artboards.filter((a) => !a.master);
    build({
      draft,
      page: (index) => {
        const page = pageList[index];
        if (!page) throw new Error(`Template page ${String(index)} missing`);
        return page;
      },
    });
  });
  return projectSchema.parse(result);
}

export function newspaperFrontPage(name: string, artboardName?: string, now?: number): Project {
  const size = { width: 1056, height: 1632 };
  const margin = { top: 40, bottom: 56, left: 40, right: 40 };
  return makeDocument(
    name,
    'tabloid',
    size,
    2,
    { margin, columns: 5, gutter: 14 },
    (b) => {
      const { draft } = b;
      const first = b.page(0);
      const cols = pageColumns(first);
      const colX = (from: number, count: number) => {
        // Columns are counted from the right (reading order).
        const right = cols[cols.length - 1 - from];
        const left = cols[cols.length - from - count];
        if (!right || !left) return { x: margin.left, width: 100 };
        return { x: left.x, width: right.x + right.width - left.x };
      };
      const full = { x: margin.left, width: size.width - margin.left - margin.right };

      const masterId = createMaster(draft, first.id, 'Master A');
      const master = draft.artboards.find((a) => a.id === masterId);
      if (master) {
        pageNumberText(draft, master, 'صفحہ', size.height - 44);
        assignMaster(
          draft,
          draft.artboards.filter((a) => !a.master).map((a) => a.id),
          master.id,
        );
      }

      frame(b, 0, story(draft, [['masthead', 'روزنامہ قلم']], 'Masthead'), 0, {
        ...full,
        y: 36,
        height: 118,
      });
      frame(
        b,
        0,
        story(draft, [['dateline', 'جلد ۱ · شمارہ ۱ · قیمت ۵۰ روپے · ہر خبر، ہر لمحہ']], 'Dateline'),
        0,
        { ...full, y: 150, height: 30 },
      );
      rule(b, 0, full.x, 184, full.width);
      frame(
        b,
        0,
        story(draft, [['headline', 'نئے تعلیمی سال کا آغاز، سکولوں میں رونق لوٹ آئی']], 'Headline'),
        0,
        { ...full, y: 196, height: 96 },
      );

      // Lead story: three columns on the right with a photo on top, continued on page 2.
      const lead = colX(0, 3);
      photo(b, 0, { x: lead.x, y: 304, width: lead.width, height: 300 }, 'Lead photo');
      const caption = story(
        draft,
        [['caption', 'تصویر: نئے تعلیمی سال کے پہلے دن طلبہ سکول پہنچ رہے ہیں۔']],
        'Caption',
      );
      const captionFrame = makeFrame(
        first.id,
        caption,
        0,
        { x: lead.x, y: 610, width: lead.width, height: 26 },
        { inset: 0 },
      );
      draft.layers.push({ ...captionFrame, wrap: { offset: 6 } });
      const leadStory = story(
        draft,
        [['byline', 'نامہ نگار خصوصی'], ...repeat(NEWS, 4).map((t): [string, string] => ['body', t])],
        'Lead story',
      );
      frame(b, 0, leadStory, 0, { x: lead.x, y: 304, width: lead.width, height: 900 }, 3);
      frame(b, 1, leadStory, 1, { x: full.x, y: 60, width: full.width, height: 700 }, 5);

      // Second story: two columns on the left.
      const second = colX(3, 2);
      frame(
        b,
        0,
        story(
          draft,
          [
            ['subhead', 'سڑکوں کی مرمت اگلے ماہ مکمل'],
            ...repeat(NEWS.slice(1), 3).map((t): [string, string] => ['body', t]),
          ],
          'Second story',
        ),
        0,
        { x: second.x, y: 304, width: second.width, height: 900 },
        2,
      );

      // Bottom strip across all columns.
      rule(b, 0, full.x, 1216, full.width);
      frame(
        b,
        0,
        story(
          draft,
          [
            ['subhead', 'کتاب میلے میں ریکارڈ شرکت'],
            ...repeat(NEWS.slice(3), 3).map((t): [string, string] => ['body', t]),
          ],
          'Bottom story',
        ),
        0,
        { x: full.x, y: 1228, width: full.width, height: 340 },
        5,
      );
    },
    artboardName,
    now,
  );
}

export function magazineArticle(name: string, artboardName?: string, now?: number): Project {
  const size = { width: 794, height: 1123 };
  const margin = { top: 64, bottom: 72, left: 56, right: 56 };
  return makeDocument(
    name,
    'a4-portrait',
    size,
    2,
    { margin, columns: 2, gutter: 22 },
    (b) => {
      const { draft } = b;
      const first = b.page(0);
      const full = { x: margin.left, width: size.width - margin.left - margin.right };
      const masterId = createMaster(draft, first.id, 'Master A');
      const master = draft.artboards.find((a) => a.id === masterId);
      if (master) {
        pageNumberText(draft, master, '', size.height - 52);
        rule({ draft, page: () => master }, 0, full.x, size.height - 62, full.width);
        assignMaster(
          draft,
          draft.artboards.filter((a) => !a.master).map((a) => a.id),
          master.id,
        );
      }
      frame(b, 0, story(draft, [['kicker', 'فن و ثقافت']], 'Kicker'), 0, { ...full, y: 60, height: 32 });
      frame(b, 0, story(draft, [['title', 'حرف کی خوبصورتی: خطاطی کا سفر']], 'Title'), 0, {
        ...full,
        y: 94,
        height: 84,
      });
      frame(b, 0, story(draft, [['byline', 'تحریر: ادارہ']], 'Byline'), 0, { ...full, y: 180, height: 30 });
      photo(b, 0, { x: full.x, y: 222, width: full.width, height: 300 }, 'Photo');
      const body = story(
        draft,
        repeat(ESSAY, 5).map((t): [string, string] => ['body', t]),
        'Article',
      );
      frame(b, 0, body, 0, { ...full, y: 222, height: size.height - 222 - margin.bottom }, 2, 22);
      frame(
        b,
        1,
        body,
        1,
        { ...full, y: margin.top, height: size.height - margin.top - margin.bottom },
        2,
        22,
      );
    },
    artboardName,
    now,
  );
}

export function bookChapter(name: string, artboardName?: string, now?: number): Project {
  const size = { width: 559, height: 794 };
  const margin = { top: 60, bottom: 68, left: 48, right: 48 };
  const pages = 4;
  return makeDocument(
    name,
    'a5-portrait',
    size,
    pages,
    { margin, columns: 1, gutter: 0 },
    (b) => {
      const { draft } = b;
      const first = b.page(0);
      const full = { x: margin.left, width: size.width - margin.left - margin.right };
      const masterId = createMaster(draft, first.id, 'Master A');
      const master = draft.artboards.find((a) => a.id === masterId);
      if (master) {
        draft.layers.push(
          createTextRun({
            artboardId: master.id,
            text: 'قلم کی کہانی',
            fontId: 'noto-nastaliq-urdu',
            language: 'ur',
            fontSize: 12,
            x: size.width / 2 - 34,
            y: 22,
            name: 'Running header',
          }),
        );
        pageNumberText(draft, master, '', size.height - 48);
        assignMaster(
          draft,
          draft.artboards.filter((a) => !a.master).map((a) => a.id),
          master.id,
        );
      }
      frame(b, 0, story(draft, [['chapter', 'باب اول: قلم اور کاغذ']], 'Chapter title'), 0, {
        ...full,
        y: 110,
        height: 70,
      });
      const body = story(
        draft,
        repeat(ESSAY, 7).map((t): [string, string] => ['body', t]),
        'Chapter',
      );
      frame(b, 0, body, 0, { ...full, y: 200, height: size.height - 200 - margin.bottom });
      for (let i = 1; i < pages; i++) {
        frame(b, i, body, i, { ...full, y: margin.top, height: size.height - margin.top - margin.bottom });
      }
    },
    artboardName,
    now,
  );
}

const CITY = [
  'شہر کے مختلف علاقوں میں صفائی مہم کا دوسرا مرحلہ شروع کر دیا گیا ہے جس میں ہزاروں رضاکار حصہ لے رہے ہیں۔ انتظامیہ کے مطابق مہم ایک ماہ تک جاری رہے گی۔',
  'شہریوں نے مہم کا خیر مقدم کرتے ہوئے کہا ہے کہ صفائی کا یہ سلسلہ مستقل بنیادوں پر جاری رہنا چاہیے تاکہ گلی محلے صاف ستھرے رہیں۔',
  'حکام نے بتایا کہ کوڑا اٹھانے کے لیے نئی گاڑیاں خریدی جا رہی ہیں اور ہر یونین کونسل میں شکایتی مرکز قائم کیا جائے گا۔',
];

const FARM = [
  'حکومت نے چھوٹے کاشتکاروں کے لیے نئی امدادی سکیم کا اعلان کر دیا ہے جس کے تحت بلاسود قرضے، سستی کھاد اور معیاری بیج فراہم کیے جائیں گے۔',
  'وزیر زراعت نے ایک پریس کانفرنس میں بتایا کہ سکیم سے ملک بھر کے لاکھوں کسان مستفید ہوں گے اور گندم کی پیداوار میں نمایاں اضافہ متوقع ہے۔',
  'انہوں نے کہا کہ درخواستیں آن لائن اور ڈاک خانوں کے ذریعے جمع کرائی جا سکیں گی جبکہ قرضوں کی ادائیگی فصل کی کٹائی کے بعد آسان اقساط میں ہوگی۔',
  'کسان تنظیموں نے اعلان کو خوش آئند قرار دیتے ہوئے مطالبہ کیا ہے کہ نہری پانی کی منصفانہ تقسیم اور منڈیوں تک رسائی کو بھی یقینی بنایا جائے۔',
];

const OPINION = [
  'قوموں کی ترقی کا راز علم میں پوشیدہ ہے۔ جن معاشروں نے کتاب سے رشتہ جوڑا وہ دنیا کی قیادت کرنے لگے اور جنہوں نے اسے بھلا دیا وہ پیچھے رہ گئے۔',
  'ہمارے ہاں آج بھی لاکھوں بچے سکول سے باہر ہیں۔ یہ محض ایک عدد نہیں بلکہ ہمارے مستقبل کا سوال ہے جس کا جواب ہم سب کو مل کر دینا ہوگا۔',
  'اساتذہ کی تربیت، نصاب کی بہتری اور سکولوں میں بنیادی سہولیات کی فراہمی وہ اقدامات ہیں جن کے بغیر تعلیمی انقلاب کا خواب پورا نہیں ہو سکتا۔',
  'والدین کا کردار بھی کم اہم نہیں۔ جو گھر مطالعے کا ماحول دیتا ہے وہاں سے ایسے ذہن نکلتے ہیں جو سوال کرتے ہیں اور نئے راستے تلاش کرتے ہیں۔',
  'آئیے عہد کریں کہ ہم اپنے حصے کا چراغ جلائیں گے، کسی ایک بچے کو پڑھائیں گے اور کتاب کو پھر سے اپنی زندگی کا حصہ بنائیں گے۔',
];

const body = (items: readonly string[], times = 1): [string, string][] =>
  repeat(items, times).map((t): [string, string] => ['body', t]);

/**
 * A broadsheet front page in the style of an Urdu daily: boxed masthead and
 * weather ear, banner headline with a red deck, a breaking-news strip, a lead
 * story with photo that jumps to page 2, reverse and boxed headlines, column
 * rules, an advertisement and an index.
 */
export function dailyFrontPage(name: string, artboardName?: string, now?: number): Project {
  const size = { width: 1440, height: 2184 };
  const margin = { top: 40, bottom: 48, left: 40, right: 40 };
  return makeDocument(
    name,
    'broadsheet',
    size,
    2,
    { margin, columns: 8, gutter: 14 },
    (b) => {
      const { draft } = b;
      const first = b.page(0);
      const cols = pageColumns(first);
      /** Columns counted from the right (reading order). */
      const span = (from: number, count: number) => {
        const right = cols[cols.length - 1 - from];
        const left = cols[cols.length - from - count];
        if (!right || !left) return { x: margin.left, width: 100 };
        return { x: left.x, width: right.x + right.width - left.x };
      };
      const full = { x: margin.left, width: size.width - margin.left - margin.right };
      const gutterMid = (from: number) => {
        // Middle of the gutter on the right of column `from` (counted from the right).
        const col = cols[cols.length - from];
        return col ? col.x - 7 : margin.left;
      };
      const ruled = { columnRule: RULE, balanceColumns: true };

      // Page 2 carries a running head and page number from its master.
      const masterId = createMaster(draft, first.id, 'Inside pages');
      const master = draft.artboards.find((a) => a.id === masterId);
      if (master) {
        const inside = draft.artboards.filter((a) => !a.master).slice(1);
        pageNumberText(draft, master, 'صفحہ', size.height - 40);
        rule({ draft, page: () => master }, 0, full.x, 74, full.width);
        assignMaster(
          draft,
          inside.map((a) => a.id),
          master.id,
        );
      }

      // ——— Masthead (right) and top story (left)
      const mast = span(0, 3);
      shape(
        b,
        0,
        'rect',
        { ...mast, y: 40, height: 200 },
        {
          stroke: { color: '#1a1a1a', width: 1, dash: 'solid' },
          double: true,
          name: 'Masthead box',
        },
      );
      block(
        b,
        0,
        [['masthead', 'روزنامہ قلم']],
        { x: mast.x + 8, y: 48, width: mast.width - 16, height: 136 },
        {
          verticalAlign: 'center',
          name: 'Masthead',
        },
      );
      block(
        b,
        0,
        [['dateline', 'کراچی · اتوار ۲۷ ستمبر ۲۰۲۶ · جلد ۲۶ · شمارہ ۱۲۰ · قیمت ۴۰ روپے']],
        { x: mast.x + 8, y: 186, width: mast.width - 16, height: 46 },
        { background: '#f3efe4', verticalAlign: 'center', name: 'Dateline' },
      );

      const ear = span(7, 1);
      shape(
        b,
        0,
        'rect',
        { ...ear, y: 40, height: 200 },
        {
          stroke: { color: '#b3121f', width: 1, dash: 'solid' },
          double: true,
          name: 'Ear box',
        },
      );
      block(
        b,
        0,
        [
          ['kicker', 'آج کا موسم'],
          ['ear', 'کراچی ۳۴° / ۲۶°'],
          ['ear', 'لاہور ۳۲° / ۲۴°'],
          ['ear', 'اسلام آباد ۲۸° / ۱۸°'],
        ],
        { x: ear.x + 6, y: 46, width: ear.width - 12, height: 188 },
        { verticalAlign: 'center', name: 'Weather' },
      );

      const top = span(3, 4);
      block(
        b,
        0,
        [['banner', 'صوبے میں ۱۲ نئے ہسپتال بنیں گے']],
        { ...top, y: 40, height: 140 },
        { verticalAlign: 'center', name: 'Top headline' },
      );
      block(
        b,
        0,
        [['deck', '۳۵ سکول، ۲۰۰ کلومیٹر سڑکیں اور پینے کے صاف پانی کے ۵۰ منصوبے بھی شامل']],
        { ...top, y: 184, height: 56 },
        { verticalAlign: 'center', name: 'Top deck' },
      );
      rule(b, 0, full.x, 252, full.width);

      // ——— Breaking-news strip
      block(
        b,
        0,
        [['reverse', 'تازہ ترین: شہر میں صفائی مہم کا دوسرا مرحلہ کل سے شروع ہوگا']],
        { ...full, y: 262, height: 50 },
        { background: '#b3121f', verticalAlign: 'center', name: 'Breaking news' },
      );

      // ——— Lead story (right five columns) with photo (left three columns)
      const lead = span(0, 5);
      block(
        b,
        0,
        [['reverse-small', 'خصوصی رپورٹ']],
        { x: lead.x + lead.width - 150, y: 324, width: 150, height: 36 },
        { background: '#1a1a1a', verticalAlign: 'center', name: 'Kicker' },
      );
      block(
        b,
        0,
        [['banner-red', 'کسانوں کے لیے نئی امدادی سکیم کا اعلان']],
        { ...lead, y: 362, height: 110 },
        { verticalAlign: 'center', name: 'Lead headline' },
      );
      block(
        b,
        0,
        [['deck', 'چھوٹے کاشتکاروں کو بلاسود قرضے، سستی کھاد اور معیاری بیج ملیں گے']],
        { ...lead, y: 472, height: 42 },
        { verticalAlign: 'center', name: 'Lead deck' },
      );
      const leadStory = story(
        draft,
        [['byline', 'اسلام آباد (نامہ نگار خصوصی)'], ...body(FARM, 5)],
        'Lead story',
      );
      draft.layers.push(
        makeFrame(
          first.id,
          leadStory,
          0,
          { ...lead, y: 520, height: 318 },
          {
            columns: { count: 5, gutter: 14 },
            inset: 2,
            ...ruled,
          },
        ),
      );
      block(b, 0, [['jump', '(بقیہ صفحہ ۲ پر)']], { ...lead, y: 838, height: 22 }, { name: 'Jump' });

      const side = span(5, 3);
      photo(b, 0, { ...side, y: 324, height: 290 }, 'Lead photo');
      block(
        b,
        0,
        [['caption', 'کاشتکار نئی سکیم کے اعلان کے بعد اپنے کھیتوں میں کام کر رہے ہیں۔']],
        { ...side, y: 618, height: 30 },
        { name: 'Caption' },
      );
      block(
        b,
        0,
        [['story-head', 'شہر میں صفائی مہم تیز']],
        { ...side, y: 650, height: 66 },
        { name: 'Side story headline' },
      );
      block(
        b,
        0,
        body(CITY.slice(0, 2)),
        { ...side, y: 716, height: 144 },
        { columns: 3, ...ruled, name: 'Side story' },
      );
      vrule(b, 0, gutterMid(5), 324, 536);
      rule(b, 0, full.x, 870, full.width, false);

      // ——— Two stories: reverse headline (right) and boxed headline (left)
      const a = span(0, 4);
      block(
        b,
        0,
        [['reverse', 'شہر میں پانی کی فراہمی بہتر بنانے کا منصوبہ منظور']],
        { ...a, y: 882, height: 56 },
        { background: '#1a1a1a', verticalAlign: 'center', name: 'Story A headline' },
      );
      const storyA = story(draft, [['byline', 'کراچی (سٹاف رپورٹر)'], ...body(CITY, 5)], 'Story A');
      draft.layers.push(
        makeFrame(
          first.id,
          storyA,
          0,
          { ...a, y: 946, height: 324 },
          {
            columns: { count: 4, gutter: 14 },
            inset: 2,
            ...ruled,
          },
        ),
      );
      block(b, 0, [['jump', '(بقیہ صفحہ ۲ پر)']], { ...a, y: 1270, height: 22 }, { name: 'Jump' });

      const bStory = span(4, 4);
      shape(
        b,
        0,
        'rect',
        { ...bStory, y: 882, height: 104 },
        {
          stroke: { color: '#1a1a1a', width: 1, dash: 'solid' },
          double: true,
          name: 'Headline box',
        },
      );
      block(
        b,
        0,
        [['story-head-center', 'جامعات میں داخلوں کی آخری تاریخ میں توسیع']],
        { x: bStory.x + 8, y: 888, width: bStory.width - 16, height: 92 },
        { verticalAlign: 'center', name: 'Story B headline' },
      );
      block(
        b,
        0,
        [['byline', 'لاہور (ایجوکیشن رپورٹر)'], ...body(NEWS)],
        { ...bStory, y: 994, height: 298 },
        { columns: 4, ...ruled, name: 'Story B' },
      );
      vrule(b, 0, gutterMid(4), 882, 410);
      rule(b, 0, full.x, 1304, full.width);

      // ——— Advertisement (left) and short stories (right)
      const ad = span(4, 4);
      shape(
        b,
        0,
        'rect',
        { ...ad, y: 1316, height: 610 },
        {
          fill: '#eef6f0',
          stroke: { color: '#1f6f43', width: 2, dash: 'solid' },
          radius: 6,
          name: 'Advert',
        },
      );
      block(
        b,
        0,
        [['ad-title', 'یہاں آپ کا اشتہار']],
        { x: ad.x + 20, y: 1330, width: ad.width - 40, height: 110 },
        {
          verticalAlign: 'center',
          name: 'Advert title',
        },
      );
      block(
        b,
        0,
        [
          ['ad-text', 'اپنے کاروبار کو لاکھوں قارئین تک پہنچائیں'],
          ['ad-text', 'رابطہ: شعبۂ اشتہارات، روزنامہ قلم'],
        ],
        { x: ad.x + 20, y: 1440, width: ad.width - 40, height: 100 },
        { verticalAlign: 'center', name: 'Advert text' },
      );
      photo(b, 0, { x: ad.x + 24, y: 1548, width: ad.width - 48, height: 290 }, 'Advert photo');
      block(
        b,
        0,
        [['reverse', 'فون: ۰۲۱-۱۲۳۴۵۶۷']],
        { x: ad.x + 2, y: 1854, width: ad.width - 4, height: 70 },
        { background: '#1f6f43', verticalAlign: 'center', name: 'Advert footer' },
      );

      const shorts = span(0, 4);
      const briefs: [string, readonly string[]][] = [
        ['کتاب میلہ آج سے شروع', NEWS.slice(4)],
        ['موسم خوشگوار رہنے کا امکان', NEWS.slice(3, 4)],
        ['کھیلوں کے نئے مراکز', NEWS.slice(2, 3)],
      ];
      briefs.forEach(([head, texts], i) => {
        const y = 1316 + i * 206;
        block(
          b,
          0,
          [['story-head', head]],
          { ...shorts, y, height: 66 },
          { name: `Brief ${String(i + 1)} headline` },
        );
        block(
          b,
          0,
          body(texts),
          { ...shorts, y: y + 66, height: 106 },
          {
            columns: 4,
            ...ruled,
            name: `Brief ${String(i + 1)}`,
          },
        );
        block(b, 0, [['jump', `(بقیہ صفحہ ۲ نمبر ${String(i + 1)})`]], { ...shorts, y: y + 172, height: 22 });
        if (i < briefs.length - 1) rule(b, 0, shorts.x, y + 200, shorts.width, false);
      });
      vrule(b, 0, gutterMid(4), 1316, 610);
      rule(b, 0, full.x, 1940, full.width);

      // ——— Bottom: photo story and index
      const index = span(6, 2);
      shape(
        b,
        0,
        'rect',
        { ...index, y: 1952, height: 184 },
        {
          fill: '#f3efe4',
          stroke: { color: '#1a1a1a', width: 1, dash: 'solid' },
          name: 'Index box',
        },
      );
      block(
        b,
        0,
        [
          ['kicker', 'آج کے اخبار میں'],
          ['index', '٭ اداریہ: صاف پانی سب کا حق — صفحہ ۶'],
          ['index', '٭ کھیل: قومی ٹیم کا اعلان — صفحہ ۱۱'],
          ['index', '٭ کاروبار: سٹاک مارکیٹ — صفحہ ۹'],
        ],
        { x: index.x + 8, y: 1958, width: index.width - 16, height: 172 },
        { name: 'Index' },
      );
      const bottom = span(0, 3);
      const bottomPhoto = span(3, 3);
      photo(b, 0, { ...bottomPhoto, y: 1952, height: 156 }, 'Bottom photo');
      block(
        b,
        0,
        [['caption', 'شہر کے نئے پارک کا ایک منظر۔']],
        { ...bottomPhoto, y: 2110, height: 26 },
        { name: 'Bottom caption' },
      );
      block(
        b,
        0,
        [['story-head', 'شہر کو نیا پارک مل گیا']],
        { ...bottom, y: 1948, height: 66 },
        { name: 'Bottom story headline' },
      );
      block(
        b,
        0,
        body(NEWS.slice(0, 1)),
        { ...bottom, y: 2014, height: 122 },
        { columns: 3, ...ruled, name: 'Bottom story' },
      );

      // ——— Page 2: continuations
      const inner = { ...full, y: 90 };
      block(b, 1, [['story-head', 'بقیہ: کسانوں کے لیے نئی امدادی سکیم']], { ...inner, height: 48 });
      draft.layers.push(
        makeFrame(
          b.page(1).id,
          leadStory,
          1,
          { ...inner, y: 140, height: 560 },
          {
            columns: { count: 8, gutter: 14 },
            inset: 2,
            ...ruled,
          },
        ),
      );
      rule(b, 1, full.x, 712, full.width, false);
      block(b, 1, [['story-head', 'بقیہ: پانی کی فراہمی کا منصوبہ']], { ...inner, y: 724, height: 48 });
      draft.layers.push(
        makeFrame(
          b.page(1).id,
          storyA,
          1,
          { ...inner, y: 774, height: 560 },
          {
            columns: { count: 8, gutter: 14 },
            inset: 2,
            ...ruled,
          },
        ),
      );
    },
    artboardName,
    now,
  );
}

/**
 * An opinion page: running head, a columnist's article with column-name bar
 * and author box (photo, name, e-mail) that the text wraps around, plus the
 * editorial and letters columns.
 */
export function opinionPage(name: string, artboardName?: string, now?: number): Project {
  const size = { width: 1056, height: 1632 };
  const margin = { top: 36, bottom: 44, left: 36, right: 36 };
  return makeDocument(
    name,
    'tabloid',
    size,
    1,
    { margin, columns: 6, gutter: 12 },
    (b) => {
      const first = b.page(0);
      const cols = pageColumns(first);
      const span = (from: number, count: number) => {
        const right = cols[cols.length - 1 - from];
        const left = cols[cols.length - from - count];
        if (!right || !left) return { x: margin.left, width: 100 };
        return { x: left.x, width: right.x + right.width - left.x };
      };
      const full = { x: margin.left, width: size.width - margin.left - margin.right };
      const ruled = { columnRule: RULE, balanceColumns: true };
      const centered = { verticalAlign: 'center' } as const;

      // ——— Running head
      block(
        b,
        0,
        [['banner-red', 'روزنامہ قلم']],
        { ...span(0, 2), y: 36, height: 100 },
        {
          ...centered,
          name: 'Masthead',
        },
      );
      block(
        b,
        0,
        [['title', 'ادارتی صفحہ']],
        { ...span(2, 2), y: 36, height: 100 },
        {
          ...centered,
          name: 'Page title',
        },
      );
      block(
        b,
        0,
        [['dateline', 'اتوار ۲۷ ستمبر ۲۰۲۶']],
        { ...span(4, 2), y: 36, height: 100 },
        {
          ...centered,
          name: 'Date',
        },
      );
      rule(b, 0, full.x, 142, full.width);

      // ——— Columnist (right four columns), with an author box the text wraps around
      const main = span(0, 4);
      block(
        b,
        0,
        [['banner', 'علم کی روشنی اور ہمارا مستقبل']],
        { ...main, y: 152, height: 96 },
        {
          ...centered,
          name: 'Column headline',
        },
      );
      const author = span(1, 2);
      const box = { x: author.x + 20, y: 258, width: author.width - 40, height: 340 };
      shape(b, 0, 'rect', box, {
        stroke: { color: '#1a1a1a', width: 1, dash: 'solid' },
        wrap: 12,
        name: 'Author box',
      });
      // Text inside the box ignores the box's own wrap.
      block(
        b,
        0,
        [['column-name', 'حرفِ روشن']],
        { x: box.x + 1, y: box.y + 1, width: box.width - 2, height: 58 },
        { background: '#1a1a1a', ignoreWrap: true, ...centered, name: 'Column name' },
      );
      const portrait = parseSvg(portraitPhoto(150, 170));
      if (portrait.ok) {
        b.draft.layers.push(
          createSvgLayer(portrait.value, first.id, 'Author photo', {
            x: box.x + (box.width - 150) / 2,
            y: box.y + 68,
            width: 150,
            height: 170,
          }),
        );
      }
      block(
        b,
        0,
        [
          ['author', 'تحریر: ادارہ'],
          ['caption', 'رابطہ برائے آراء: ادارتی صفحہ، روزنامہ قلم'],
        ],
        { x: box.x + 6, y: box.y + 244, width: box.width - 12, height: 90 },
        { ignoreWrap: true, ...centered, name: 'Author' },
      );
      block(
        b,
        0,
        body(OPINION, 4),
        { ...main, y: 258, height: size.height - 258 - margin.bottom },
        { columns: 4, ...ruled, name: 'Column' },
      );

      const mid = cols[cols.length - 5];
      vrule(b, 0, mid ? mid.x + mid.width + 6 : full.x, 152, size.height - 152 - margin.bottom);

      // ——— Editorial and letters (left two columns)
      const side = span(4, 2);
      block(
        b,
        0,
        [['reverse', 'اداریہ']],
        { ...side, y: 152, height: 54 },
        {
          background: '#1a1a1a',
          ...centered,
          name: 'Editorial label',
        },
      );
      block(
        b,
        0,
        [['story-head', 'صاف پانی سب کا حق']],
        { ...side, y: 210, height: 66 },
        {
          name: 'Editorial headline',
        },
      );
      block(
        b,
        0,
        body(CITY, 2),
        { ...side, y: 278, height: 600 },
        { columns: 2, ...ruled, name: 'Editorial' },
      );
      rule(b, 0, side.x, 892, side.width);
      block(
        b,
        0,
        [['reverse', 'مراسلات']],
        { ...side, y: 902, height: 54 },
        {
          background: '#b3121f',
          ...centered,
          name: 'Letters label',
        },
      );
      block(
        b,
        0,
        [
          ['subhead', 'گلی میں روشنی کا مسئلہ'],
          ['body', NEWS[1] ?? ''],
          ['byline', '— ایک قاری، کراچی'],
          ['subhead', 'لائبریری کے اوقات'],
          ['body', NEWS[4] ?? ''],
          ['byline', '— ایک طالب علم، لاہور'],
        ],
        { ...side, y: 964, height: size.height - 964 - margin.bottom },
        { columns: 2, ...ruled, name: 'Letters' },
      );
    },
    artboardName,
    now,
  );
}
