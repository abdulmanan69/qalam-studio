import { describe, expect, it } from 'vitest';

import { buildProject, buildProjectFromSvg } from '@/features/projects/repository';

import { sortProjects } from './sort-projects';
import { countWorkspace } from './workspace-counts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27);

function project(name: string, createdAt: number, updatedAt: number) {
  return { ...buildProject({ name, presetId: 'custom', width: 100, height: 100 }, createdAt), updatedAt };
}

describe('sortProjects', () => {
  const list = [project('Design 10', 3, 30), project('design 2', 1, 10), project('Alif', 2, 20)];

  it('sorts names naturally and case-insensitively', () => {
    expect(sortProjects(list, 'name', 'asc').map((p) => p.name)).toEqual(['Alif', 'design 2', 'Design 10']);
  });

  it('sorts by dates in both directions without mutating the input', () => {
    expect(sortProjects(list, 'updatedAt', 'desc').map((p) => p.updatedAt)).toEqual([30, 20, 10]);
    expect(sortProjects(list, 'createdAt', 'asc').map((p) => p.createdAt)).toEqual([1, 2, 3]);
    expect(list.map((p) => p.name)).toEqual(['Design 10', 'design 2', 'Alif']);
  });
});

describe('countWorkspace', () => {
  it('counts projects, recent edits, artboards and imported artwork', () => {
    const recent = project('Recent', NOW - 2 * DAY, NOW - DAY);
    const old = project('Old', NOW - 30 * DAY, NOW - 20 * DAY);
    const withSvg = buildProjectFromSvg({ svg: '<svg/>', width: 50, height: 50 }, 'Svg', NOW - DAY);
    expect(countWorkspace([recent, old, withSvg], NOW)).toEqual({
      projects: 3,
      editedThisWeek: 2,
      artboards: 3,
      importedArtwork: 1,
    });
  });
});
