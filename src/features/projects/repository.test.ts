import { beforeEach, describe, expect, it } from 'vitest';

import { db } from './db';
import {
  buildProjectFromSvg,
  clearAllProjects,
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  importProject,
  listProjects,
  ProjectNotFoundError,
  renameProject,
  saveNewProject,
  updateProject,
} from './repository';

const input = { name: 'Test design', presetId: 'a4-portrait' as const, width: 794, height: 1123 };

beforeEach(async () => {
  await db.projects.clear();
});

describe('projects repository', () => {
  it('creates and reads back a project', async () => {
    const created = await createProject(input, 1000);
    const loaded = await getProject(created.id);
    expect(loaded).toEqual(created);
    expect(loaded?.artboards[0]).toMatchObject({ width: 794, height: 1123, background: '#ffffff' });
  });

  it('returns null for unknown ids', async () => {
    expect(await getProject('nope')).toBeNull();
  });

  it('normalizes names and clamps artboard sizes', async () => {
    const project = await createProject({ ...input, name: '   Many    spaces  ', width: 3, height: 99_999 });
    expect(project.name).toBe('Many spaces');
    expect(project.artboards[0]?.width).toBe(16);
    expect(project.artboards[0]?.height).toBe(10_000);
  });

  it('lists projects newest first', async () => {
    const a = await createProject({ ...input, name: 'A' }, 1000);
    const b = await createProject({ ...input, name: 'B' }, 3000);
    const c = await createProject({ ...input, name: 'C' }, 2000);
    expect((await listProjects()).map((p) => p.id)).toEqual([b.id, c.id, a.id]);
  });

  it('updates with a recipe, validates and bumps updatedAt', async () => {
    const project = await createProject(input, 1000);
    const updated = await updateProject(
      project.id,
      (draft) => {
        const artboard = draft.artboards[0];
        if (artboard) artboard.background = '#fafafa';
      },
      5000,
    );
    expect(updated.updatedAt).toBe(5000);
    expect((await getProject(project.id))?.artboards[0]?.background).toBe('#fafafa');
  });

  it('refuses updates that would produce an invalid document', async () => {
    const project = await createProject(input);
    await expect(
      updateProject(project.id, (draft) => {
        draft.artboards = [];
      }),
    ).rejects.toThrow();
    expect((await getProject(project.id))?.artboards).toHaveLength(1);
  });

  it('throws ProjectNotFoundError for missing projects', async () => {
    await expect(updateProject('missing', () => undefined)).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('renames, keeping the old name when the new one is blank', async () => {
    const project = await createProject(input);
    expect((await renameProject(project.id, 'خوشخط')).name).toBe('خوشخط');
    expect((await renameProject(project.id, '   ')).name).toBe('خوشخط');
  });

  it('duplicates into an independent copy', async () => {
    const project = await createProject(input, 1000);
    const copy = await duplicateProject(project.id, 'Copy', 2000);
    expect(copy.id).not.toBe(project.id);
    expect(copy.name).toBe('Copy');
    expect(copy.createdAt).toBe(2000);
    expect(copy.artboards).toEqual(project.artboards);
    expect(await listProjects()).toHaveLength(2);
  });

  it('imports with a fresh id so the same file can be opened twice', async () => {
    const project = await createProject(input, 1000);
    const first = await importProject(project, 2000);
    const second = await importProject(project, 3000);
    expect(new Set([project.id, first.id, second.id]).size).toBe(3);
    expect(second.createdAt).toBe(1000);
    expect(second.updatedAt).toBe(3000);
  });

  it('deletes one project and can restore it (undo)', async () => {
    const project = await createProject(input);
    await deleteProject(project.id);
    expect(await getProject(project.id)).toBeNull();
    await saveNewProject(project);
    expect(await getProject(project.id)).toEqual(project);
  });

  it('clears everything', async () => {
    await createProject(input);
    await createProject(input);
    await clearAllProjects();
    expect(await listProjects()).toEqual([]);
  });

  it('builds a project around an imported SVG', () => {
    const project = buildProjectFromSvg(
      { svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', width: 1080, height: 1080 },
      'Border',
    );
    expect(project.artboards[0]).toMatchObject({ presetId: 'square-post', width: 1080, height: 1080 });
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0]).toMatchObject({
      kind: 'svg',
      x: 0,
      y: 0,
      width: 1080,
      height: 1080,
      hidden: false,
    });
    expect(project.layers[0]?.artboardId).toBe(project.artboards[0]?.id);
  });
});
