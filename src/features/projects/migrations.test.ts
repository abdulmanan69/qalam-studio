import { describe, expect, it } from 'vitest';

import { isFromNewerApp, migrateProject, schemaVersionOf } from './migrations';
import { PROJECT_SCHEMA_VERSION, projectSchema } from './schema';

const v1Project = {
  id: 'p1',
  schemaVersion: 1,
  name: 'Old project',
  createdAt: 1000,
  updatedAt: 2000,
  artboards: [
    { id: 'a1', name: 'Artboard 1', presetId: 'custom', width: 500, height: 500, background: '#ffffff' },
  ],
  assets: [
    {
      id: 's1',
      kind: 'svg',
      name: 'Frame',
      artboardId: 'a1',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      hidden: false,
    },
  ],
};

describe('project migrations', () => {
  it('upgrades a v1 document to the current schema', () => {
    const migrated = migrateProject(v1Project);
    expect(schemaVersionOf(migrated)).toBe(PROJECT_SCHEMA_VERSION);
    const parsed = projectSchema.parse(migrated);
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.layers[0]).toMatchObject({
      kind: 'svg',
      angle: 0,
      opacity: 1,
      locked: false,
      groupId: null,
    });
    expect(parsed.artboards[0]?.guides).toEqual([]);
    expect(parsed.groups).toEqual([]);
    expect(parsed.name).toBe('Old project');
  });

  it('turns v2 text runs into styled layers above the artwork', () => {
    const v2 = {
      ...structuredClone(v1Project),
      schemaVersion: 2,
      assets: v1Project.assets.map((a) => ({ ...a, angle: 0 })),
      texts: [
        {
          id: 't1',
          kind: 'text',
          artboardId: 'a1',
          text: 'سلام',
          fontId: 'amiri',
          language: 'ar',
          fontSize: 48,
          lineHeight: 1,
          align: 'start',
          fill: '#aa0000',
          x: 1,
          y: 2,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          hidden: false,
        },
      ],
    };
    const parsed = projectSchema.parse(migrateProject(v2));
    expect(parsed.layers.map((l) => l.kind)).toEqual(['svg', 'text']);
    const text = parsed.layers[1];
    expect(text?.kind === 'text' && text.style.fill).toEqual({ type: 'solid', color: '#aa0000' });
    expect(text?.kind === 'text' && text.parts).toEqual({});
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(v1Project);
    migrateProject(copy);
    expect(copy).toEqual(v1Project);
  });

  it('leaves current documents and unknown shapes untouched', () => {
    const current = migrateProject(v1Project);
    expect(migrateProject(current)).toEqual(current);
    expect(migrateProject('not an object')).toBe('not an object');
    expect(migrateProject(null)).toBeNull();
  });

  it('detects documents written by a newer app', () => {
    expect(isFromNewerApp({ schemaVersion: PROJECT_SCHEMA_VERSION + 1 })).toBe(true);
    expect(isFromNewerApp({ schemaVersion: PROJECT_SCHEMA_VERSION })).toBe(false);
    expect(isFromNewerApp({})).toBe(false);
  });
});
