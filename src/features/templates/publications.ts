import { current, produce, type Draft } from 'immer';

import { createSvgLayer, buildProject } from '@/features/projects/repository';
import {
  projectSchema,
  type Artboard,
  type ArtboardPresetId,
  type ParagraphStyle,
  type Project,
} from '@/features/projects/schema';
import { parseSvg } from '@/features/projects/svg-import';
import { createTextRun } from '@/features/projects/text-runs';
import { PAGE_TOKEN, pageColumns } from '@/features/publishing/pages';
import { assignMaster, createMaster, makeFrame, newStory } from '@/features/publishing/publishing-ops';

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

function rule(b: Builder, pageIndex: number, x: number, y: number, width: number): void {
  const parsed = parseSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="4" viewBox="0 0 ${String(width)} 4"><rect width="${String(width)}" height="1.5" fill="#1a1a1a"/><rect y="2.5" width="${String(width)}" height="0.75" fill="#1a1a1a"/></svg>`,
  );
  if (parsed.ok)
    b.draft.layers.push(
      createSvgLayer(parsed.value, b.page(pageIndex).id, 'Rule', { x, y, width, height: 4 }),
    );
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
