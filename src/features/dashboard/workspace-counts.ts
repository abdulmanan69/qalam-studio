import type { Project } from '@/features/projects/schema';
import { isWithinDays } from '@/lib/time';

export interface WorkspaceCounts {
  projects: number;
  editedThisWeek: number;
  artboards: number;
  importedArtwork: number;
}

export function countWorkspace(projects: readonly Project[], now: number = Date.now()): WorkspaceCounts {
  return {
    projects: projects.length,
    editedThisWeek: projects.filter((p) => isWithinDays(p.updatedAt, 7, now)).length,
    artboards: projects.reduce((sum, p) => sum + p.artboards.length, 0),
    importedArtwork: projects.reduce((sum, p) => sum + p.layers.filter((l) => l.kind === 'svg').length, 0),
  };
}
