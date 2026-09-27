import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { deleteLayers } from '@/features/editor/layer-ops';
import { migrateProject } from '@/features/projects/migrations';
import { buildProject } from '@/features/projects/repository';
import { projectSchema, type Project, type TextFrame } from '@/features/projects/schema';
import { bookChapter, magazineArticle, newspaperFrontPage } from '@/features/templates/publications';

import {
  fitToPageGrid,
  frameExclusions,
  layoutGuides,
  masterLayersFor,
  pageNumber,
  pagesOf,
  storyFlowRequest,
  storyFrames,
  substitutePageTokens,
} from './pages';
import {
  addLinkedFrame,
  addPages,
  assignMaster,
  createFrame,
  createMaster,
  movePage,
  unlinkFrame,
} from './publishing-ops';

function document(): Project {
  const p = buildProject({ name: 'Paper', presetId: 'tabloid', width: 1056, height: 1632 }, 0);
  return produce(p, (draft) => {
    const page = draft.artboards[0];
    if (!page) return;
    page.margins = { top: 40, bottom: 40, left: 40, right: 40 };
    page.columns = { count: 4, gutter: 16 };
  });
}

describe('pages', () => {
  it('numbers pages and fills page tokens in the script’s digits', () => {
    const p = produce(document(), (d) => {
      addPages(d, d.artboards[0]?.id ?? '', 2, 'Page');
      d.firstPageNumber = 10;
    });
    const [, second] = pagesOf(p);
    expect(pageNumber(p, second?.id ?? '')).toBe(11);
    expect(substitutePageTokens('صفحہ {page} / {pages}', 11, 3, 'ur')).toBe('صفحہ ۱۱ / ۳');
    expect(substitutePageTokens('Page {page}', 2, 3, 'en')).toBe('Page 2');
    expect(substitutePageTokens('{page}', null, 3, 'ur')).toBe('#');
  });

  it('derives margin and column guides and snaps drawn frames to them', () => {
    const page = document().artboards[0];
    if (!page) throw new Error('no page');
    const guides = layoutGuides(page);
    expect(guides.ys).toEqual([40, 1592]);
    expect(guides.xs).toContain(40);
    expect(guides.xs).toContain(1016);
    const fit = fitToPageGrid(page, { x: 45, y: 36, width: 965, height: 500 });
    expect(fit.rect.x).toBe(40);
    expect(fit.rect.x + fit.rect.width).toBe(1016);
    expect(fit.columns).toEqual({ count: 4, gutter: 16 });
  });

  it('turns layers with text wrap into exclusions in frame coordinates', () => {
    let frameId = '';
    const p = produce(document(), (d) => {
      const page = d.artboards[0];
      if (!page) return;
      frameId = createFrame(d, page.id, { x: 100, y: 100, width: 600, height: 800 });
      d.layers.push({
        id: 'box',
        kind: 'svg',
        artboardId: page.id,
        name: 'Photo',
        hidden: false,
        locked: false,
        groupId: null,
        wrap: { offset: 10 },
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        x: 300,
        y: 300,
        width: 200,
        height: 100,
        angle: 0,
        opacity: 1,
      });
    });
    const frame = p.layers.find((l): l is TextFrame => l.id === frameId);
    if (!frame) throw new Error('no frame');
    expect(frameExclusions(p, frame, new Map())).toEqual([{ x: 190, y: 190, width: 220, height: 120 }]);
    const request = storyFlowRequest(p, p.stories[0] ?? { id: '', name: '', paragraphs: [] }, new Map());
    expect(request?.input.frames[0]?.exclusions).toHaveLength(1);
    expect(request?.input.direction).toBe('rtl');
  });
});

describe('story threads', () => {
  it('links, orders and unlinks frames; stories without frames are removed', () => {
    const p1 = produce(document(), (d) => {
      const page = d.artboards[0]?.id ?? '';
      const first = createFrame(d, page, { x: 0, y: 0, width: 100, height: 100 });
      const third = addLinkedFrame(d, first, page, { x: 0, y: 200, width: 100, height: 100 });
      addLinkedFrame(d, first, page, { x: 0, y: 100, width: 100, height: 100 });
      const thirdFrame = d.layers.find((l) => l.id === third);
      if (thirdFrame) thirdFrame.name = 'third';
    });
    const storyId = p1.stories[0]?.id ?? '';
    const chain = storyFrames(p1, storyId);
    expect(chain.map((f) => f.order)).toEqual([0, 1, 2]);
    expect(chain[2]?.name).toBe('third');

    const p2 = produce(p1, (d) => {
      unlinkFrame(d, chain[1]?.id ?? '');
    });
    expect(storyFrames(p2, storyId).map((f) => f.order)).toEqual([0, 1]);
    expect(p2.stories).toHaveLength(2);

    const p3 = produce(p2, (d) => {
      deleteLayers(d, [chain[1]?.id ?? '']);
    });
    expect(p3.stories).toHaveLength(1);
    expect(projectSchema.safeParse(p3).success).toBe(true);
  });
});

describe('pages and masters', () => {
  it('adds pages after the current one, masters at the end, and reorders pages', () => {
    const p = produce(document(), (d) => {
      const first = d.artboards[0]?.id ?? '';
      const [second] = addPages(d, first, 2, 'Page');
      const master = createMaster(d, first, 'Master A');
      if (master) assignMaster(d, [first], master);
      if (second) movePage(d, second, -1);
    });
    expect(p.artboards.map((a) => Boolean(a.master))).toEqual([false, false, false, true]);
    expect(p.artboards[0]?.name).toBe('Page 2');
    expect(p.artboards[1]?.masterId).toBe(p.artboards[3]?.id);
    expect(projectSchema.safeParse(p).success).toBe(true);
  });

  it('shows master layers (never frames) on pages that use the master', () => {
    const p = produce(document(), (d) => {
      const first = d.artboards[0]?.id ?? '';
      const master = createMaster(d, first, 'Master A') ?? '';
      assignMaster(d, [first], master);
      createFrame(d, master, { x: 0, y: 0, width: 100, height: 100 });
      d.layers.push({ ...(d.layers[0] as TextFrame), id: 'x' });
    });
    const page = p.artboards[0];
    if (!page) throw new Error('no page');
    expect(masterLayersFor(p, page)).toEqual([]);
  });
});

describe('publication templates and migration', () => {
  it.each([
    ['newspaper', newspaperFrontPage],
    ['magazine', magazineArticle],
    ['book', bookChapter],
  ])('builds a valid %s document', (_name, build) => {
    const p = build('Sample', undefined, 0);
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(pagesOf(p).length).toBeGreaterThan(1);
    expect(p.artboards.some((a) => a.master)).toBe(true);
    // At least one story continues across pages.
    expect(p.stories.some((s) => new Set(storyFrames(p, s.id).map((f) => f.artboardId)).size > 1)).toBe(true);
  });

  it('migrates v3 documents to v4 with default paragraph styles', () => {
    const v3 = { ...structuredClone(document()), schemaVersion: 3 } as Record<string, unknown>;
    delete v3.stories;
    delete v3.paragraphStyles;
    delete v3.firstPageNumber;
    const migrated = projectSchema.parse(migrateProject(v3));
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.stories).toEqual([]);
    expect(migrated.paragraphStyles.map((s) => s.id)).toContain('body');
    expect(migrated.firstPageNumber).toBe(1);
  });
});
