import type { Draft } from 'immer';

import type {
  Artboard,
  Columns,
  Layer,
  Margins,
  ParagraphStyle,
  Project,
  StoryParagraph,
  TextFrame,
} from '@/features/projects/schema';
import { createId } from '@/lib/utils';

/**
 * Publishing operations as Immer recipes: stories and their frame chains,
 * paragraph styles, page setup, pages and master pages.
 */

/** Placeholder for a new story, so a new frame shows where its text will go. */
export const PLACEHOLDER_TEXT =
  'یہاں اپنی خبر یا مضمون لکھیں۔ متن کالموں میں خود بخود بہتا ہے، اور جو متن فریم میں نہ سمائے وہ اگلے جڑے ہوئے فریم میں چلا جاتا ہے۔';

export const DEFAULT_FRAME = {
  columns: { count: 1, gutter: 12 },
  inset: 4,
  background: null,
  border: null,
} as const;

export function newStory(draft: Draft<Project>, paragraphs?: StoryParagraph[], name = ''): string {
  const id = createId();
  const body = draft.paragraphStyles.find((s) => s.id === 'body') ?? draft.paragraphStyles[0];
  draft.stories.push({
    id,
    name,
    paragraphs: paragraphs ?? [{ text: PLACEHOLDER_TEXT, styleId: body?.id ?? 'body' }],
  });
  return id;
}

export function makeFrame(
  artboardId: string,
  storyId: string,
  order: number,
  rect: { x: number; y: number; width: number; height: number },
  extra: Partial<TextFrame> = {},
): TextFrame {
  return {
    id: createId(),
    kind: 'frame',
    artboardId,
    name: '',
    hidden: false,
    locked: false,
    groupId: null,
    storyId,
    order,
    ...rect,
    width: Math.max(8, rect.width),
    height: Math.max(8, rect.height),
    columns: { ...DEFAULT_FRAME.columns },
    inset: DEFAULT_FRAME.inset,
    background: null,
    border: null,
    ...extra,
  };
}

/** A new text frame with a new story. Returns the frame id. */
export function createFrame(
  draft: Draft<Project>,
  artboardId: string,
  rect: { x: number; y: number; width: number; height: number },
  columns?: Columns,
): string {
  const storyId = newStory(draft);
  const frame = makeFrame(artboardId, storyId, 0, rect, columns ? { columns: { ...columns } } : {});
  draft.layers.push(frame);
  return frame.id;
}

function chain(draft: Draft<Project>, storyId: string): Draft<TextFrame>[] {
  return draft.layers
    .filter((l): l is Draft<TextFrame> => l.kind === 'frame' && l.storyId === storyId)
    .sort((a, b) => a.order - b.order);
}

function renumber(draft: Draft<Project>, storyId: string): void {
  chain(draft, storyId).forEach((frame, index) => {
    frame.order = index;
  });
}

/**
 * Continue a frame's story in a new frame (on `artboardId`, at `rect`),
 * threaded directly after it. Returns the new frame id.
 */
export function addLinkedFrame(
  draft: Draft<Project>,
  frameId: string,
  artboardId: string,
  rect: { x: number; y: number; width: number; height: number },
): string | null {
  const source = draft.layers.find((l): l is Draft<TextFrame> => l.id === frameId && l.kind === 'frame');
  if (!source) return null;
  for (const frame of chain(draft, source.storyId)) if (frame.order > source.order) frame.order += 1;
  const frame = makeFrame(artboardId, source.storyId, source.order + 1, rect, {
    columns: { ...source.columns },
    inset: source.inset,
  });
  draft.layers.push(frame);
  renumber(draft, source.storyId);
  return frame.id;
}

/**
 * Take a frame out of its thread. The story keeps flowing through the other
 * frames; the frame gets a new, empty story of its own.
 */
export function unlinkFrame(draft: Draft<Project>, frameId: string): void {
  const frame = draft.layers.find((l): l is Draft<TextFrame> => l.id === frameId && l.kind === 'frame');
  if (!frame) return;
  const oldStory = frame.storyId;
  if (chain(draft, oldStory).length < 2) return;
  const body = draft.paragraphStyles.find((s) => s.id === 'body') ?? draft.paragraphStyles[0];
  frame.storyId = newStory(draft, [{ text: '', styleId: body?.id ?? 'body' }]);
  frame.order = 0;
  renumber(draft, oldStory);
}

/** Remove stories that no longer have any frame, and renumber chains. */
export function pruneStories(draft: Draft<Project>): void {
  const used = new Set(draft.layers.filter((l) => l.kind === 'frame').map((l) => (l as TextFrame).storyId));
  draft.stories = draft.stories.filter((s) => used.has(s.id));
  for (const id of used) renumber(draft, id);
}

/**
 * Prepare copied layers for insertion: every copied frame gets its own copy
 * of its story (or a placeholder story when pasted into another project).
 */
export function adoptFrames(draft: Draft<Project>, layers: Layer[], sourceStories: Project['stories']): void {
  const copies = new Map<string, string>();
  for (const layer of layers) {
    if (layer.kind !== 'frame') continue;
    let storyId = copies.get(layer.storyId);
    if (!storyId) {
      const source = sourceStories.find((s) => s.id === layer.storyId);
      const styleIds = new Set(draft.paragraphStyles.map((s) => s.id));
      const fallback = draft.paragraphStyles[0]?.id ?? 'body';
      storyId = newStory(
        draft,
        source?.paragraphs.map((p) => ({
          text: p.text,
          styleId: styleIds.has(p.styleId) ? p.styleId : fallback,
        })),
        source?.name ?? '',
      );
      copies.set(layer.storyId, storyId);
    }
    layer.storyId = storyId;
  }
}

// ————————————————————————————————————————— paragraph styles

export function addParagraphStyle(draft: Draft<Project>, base: ParagraphStyle, name: string): string {
  const id = createId();
  draft.paragraphStyles.push({ ...structuredClone(base), id, name });
  return id;
}

export function updateParagraphStyle(
  draft: Draft<Project>,
  id: string,
  patch: Partial<Omit<ParagraphStyle, 'id'>>,
): void {
  const style = draft.paragraphStyles.find((s) => s.id === id);
  if (style) Object.assign(style, patch);
}

/** Delete a style; paragraphs using it switch to `replacementId`. */
export function deleteParagraphStyle(draft: Draft<Project>, id: string, replacementId: string): void {
  if (draft.paragraphStyles.length <= 1 || id === replacementId) return;
  draft.paragraphStyles = draft.paragraphStyles.filter((s) => s.id !== id);
  for (const story of draft.stories) {
    for (const paragraph of story.paragraphs) if (paragraph.styleId === id) paragraph.styleId = replacementId;
  }
}

// ————————————————————————————————————————— pages

export interface PageSetup {
  presetId?: Artboard['presetId'];
  width?: number;
  height?: number;
  margins?: Margins | null;
  columns?: Columns | null;
  bleed?: number;
}

export function applyPageSetup(
  draft: Draft<Project>,
  artboardIds: readonly string[],
  setup: PageSetup,
): void {
  const ids = new Set(artboardIds);
  for (const artboard of draft.artboards) {
    if (!ids.has(artboard.id)) continue;
    if (setup.presetId) artboard.presetId = setup.presetId;
    if (setup.width) artboard.width = Math.round(setup.width);
    if (setup.height) artboard.height = Math.round(setup.height);
    if (setup.margins !== undefined) {
      if (setup.margins) artboard.margins = { ...setup.margins };
      else delete artboard.margins;
    }
    if (setup.columns !== undefined) {
      if (setup.columns) artboard.columns = { ...setup.columns };
      else delete artboard.columns;
    }
    if (setup.bleed !== undefined) {
      if (setup.bleed > 0) artboard.bleed = setup.bleed;
      else delete artboard.bleed;
    }
  }
}

/** Insert `count` pages after `afterId`, like it (size, margins, columns, master). Returns their ids. */
export function addPages(
  draft: Draft<Project>,
  afterId: string,
  count: number,
  namePrefix: string,
): string[] {
  const index = draft.artboards.findIndex((a) => a.id === afterId);
  const template = draft.artboards[index];
  if (!template) return [];
  const pagesBefore = draft.artboards.filter((a) => !a.master).length;
  const created: Artboard[] = Array.from({ length: count }, (_, i) => ({
    id: createId(),
    name: `${namePrefix} ${String(pagesBefore + i + 1)}`,
    presetId: template.presetId,
    width: template.width,
    height: template.height,
    background: template.background,
    guides: [],
    ...(template.margins ? { margins: { ...template.margins } } : {}),
    ...(template.columns ? { columns: { ...template.columns } } : {}),
    ...(template.bleed ? { bleed: template.bleed } : {}),
    ...(template.master ? {} : { masterId: template.masterId ?? null }),
  }));
  // Pages are inserted after the template; masters stay at the end of the list.
  const at = template.master ? draft.artboards.filter((a) => !a.master).length : index + 1;
  draft.artboards.splice(at, 0, ...created);
  return created.map((a) => a.id);
}

/** A new, empty master page shaped like `fromId`. Returns its id. */
export function createMaster(draft: Draft<Project>, fromId: string, name: string): string | null {
  const source = draft.artboards.find((a) => a.id === fromId);
  if (!source) return null;
  const id = createId();
  draft.artboards.push({
    id,
    name,
    presetId: source.presetId,
    width: source.width,
    height: source.height,
    background: source.background,
    guides: [],
    master: true,
    ...(source.margins ? { margins: { ...source.margins } } : {}),
    ...(source.columns ? { columns: { ...source.columns } } : {}),
    ...(source.bleed ? { bleed: source.bleed } : {}),
  });
  return id;
}

export function assignMaster(
  draft: Draft<Project>,
  pageIds: readonly string[],
  masterId: string | null,
): void {
  const ids = new Set(pageIds);
  for (const artboard of draft.artboards) {
    if (ids.has(artboard.id) && !artboard.master) artboard.masterId = masterId;
  }
}

/** Move a page one position earlier (-1) or later (+1) among the pages. */
export function movePage(draft: Draft<Project>, id: string, direction: -1 | 1): void {
  const index = draft.artboards.findIndex((a) => a.id === id);
  const page = draft.artboards[index];
  if (!page || page.master) return;
  let target = index + direction;
  while (draft.artboards[target]?.master) target += direction;
  const other = draft.artboards[target];
  if (!other) return;
  draft.artboards[target] = page;
  draft.artboards[index] = other;
}

/** Delete a master page; pages using it no longer have a master. */
export function deleteMaster(draft: Draft<Project>, id: string): void {
  draft.artboards = draft.artboards.filter((a) => a.id !== id);
  for (const artboard of draft.artboards) if (artboard.masterId === id) artboard.masterId = null;
  draft.layers = draft.layers.filter((l) => l.artboardId !== id);
}
