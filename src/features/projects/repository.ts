import { produce, type Draft } from 'immer';

import { clamp, createId } from '@/lib/utils';

import { matchPreset } from './artboard-presets';
import { db } from './db';
import {
  MAX_ARTBOARD_SIZE,
  MAX_NAME_LENGTH,
  MIN_ARTBOARD_SIZE,
  PROJECT_SCHEMA_VERSION,
  projectSchema,
  type ArtboardPresetId,
  type Project,
} from './schema';
import type { ParsedSvg } from './svg-import';

export interface NewProjectInput {
  name: string;
  presetId: ArtboardPresetId;
  width: number;
  height: number;
  background?: string;
  /** Localized default name for the first artboard. */
  artboardName?: string;
}

export class ProjectNotFoundError extends Error {
  constructor(public readonly projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

export function normalizeName(name: string, fallback: string): string {
  const cleaned = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeDimension(value: number): number {
  return clamp(Math.round(value), MIN_ARTBOARD_SIZE, MAX_ARTBOARD_SIZE);
}

/** Pure factory for a new, valid project document. */
export function buildProject(input: NewProjectInput, now: number = Date.now()): Project {
  const project: Project = {
    id: createId(),
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: normalizeName(input.name, 'Untitled design'),
    createdAt: now,
    updatedAt: now,
    artboards: [
      {
        id: createId(),
        name: input.artboardName ?? 'Artboard 1',
        presetId: input.presetId,
        width: normalizeDimension(input.width),
        height: normalizeDimension(input.height),
        background: input.background ?? '#ffffff',
      },
    ],
    assets: [],
    texts: [],
  };
  return projectSchema.parse(project);
}

/** Pure factory: a project whose single artboard fits an imported SVG. */
export function buildProjectFromSvg(
  parsed: ParsedSvg,
  name: string,
  now: number = Date.now(),
  artboardName?: string,
): Project {
  const width = normalizeDimension(parsed.width);
  const height = normalizeDimension(parsed.height);
  const base = buildProject(
    {
      name,
      presetId: matchPreset(width, height),
      width,
      height,
      ...(artboardName ? { artboardName } : {}),
    },
    now,
  );
  const artboard = base.artboards[0];
  if (!artboard) throw new Error('Project has no artboard');
  return projectSchema.parse({
    ...base,
    assets: [
      {
        id: createId(),
        kind: 'svg',
        name: base.name,
        artboardId: artboard.id,
        svg: parsed.svg,
        x: 0,
        y: 0,
        width,
        height,
        angle: 0,
        hidden: false,
      },
    ],
  });
}

export async function createProject(input: NewProjectInput, now: number = Date.now()): Promise<Project> {
  const project = buildProject(input, now);
  await db.projects.add(project);
  return project;
}

export async function saveNewProject(project: Project): Promise<Project> {
  const valid = projectSchema.parse(project);
  await db.projects.add(valid);
  return valid;
}

export async function getProject(id: string): Promise<Project | null> {
  return (await db.projects.get(id)) ?? null;
}

/** All projects, most recently modified first. */
export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

/**
 * Apply an Immer recipe to a stored project inside a transaction, validate
 * the result, bump `updatedAt`, and persist it.
 */
export async function updateProject(
  id: string,
  recipe: (draft: Draft<Project>) => void,
  now: number = Date.now(),
): Promise<Project> {
  return db.transaction('rw', db.projects, async () => {
    const current = await db.projects.get(id);
    if (!current) throw new ProjectNotFoundError(id);
    const next = produce(current, (draft) => {
      recipe(draft);
      draft.updatedAt = Math.max(now, current.updatedAt);
    });
    const valid = projectSchema.parse(next);
    await db.projects.put(valid);
    return valid;
  });
}

export async function renameProject(id: string, name: string): Promise<Project> {
  return updateProject(id, (draft) => {
    draft.name = normalizeName(name, draft.name);
  });
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export async function duplicateProject(id: string, name: string, now: number = Date.now()): Promise<Project> {
  const source = await getProject(id);
  if (!source) throw new ProjectNotFoundError(id);
  const copy: Project = {
    ...structuredClone(source),
    id: createId(),
    name: normalizeName(name, source.name),
    createdAt: now,
    updatedAt: now,
  };
  return saveNewProject(copy);
}

/**
 * Store a project coming from a `.qalam` file. It always receives a fresh id
 * so importing the same file twice never overwrites existing work.
 */
export async function importProject(project: Project, now: number = Date.now()): Promise<Project> {
  const imported: Project = {
    ...structuredClone(project),
    id: createId(),
    updatedAt: now,
  };
  return saveNewProject(imported);
}

export async function clearAllProjects(): Promise<void> {
  await db.projects.clear();
}
