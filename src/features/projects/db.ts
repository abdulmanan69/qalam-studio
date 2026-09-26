import Dexie, { type EntityTable } from 'dexie';

import { migrateProject } from './migrations';
import type { Project } from './schema';

export const DB_NAME = 'qalam-studio';

/** A saved snapshot of a project (version history). */
export interface ProjectVersion {
  id: string;
  projectId: string;
  /** Unix epoch milliseconds. */
  createdAt: number;
  kind: 'auto' | 'manual';
  label: string | null;
  /** Snapshot; may be an older schema version (migrated when restored). */
  project: Project;
}

/**
 * Local IndexedDB storage. Everything stays in the user's browser; there is
 * no server. Add new tables or indexes with a new `this.version(n)` block
 * (never edit an existing one) so installed copies upgrade cleanly.
 */
export class QalamDatabase extends Dexie {
  declare projects: EntityTable<Project, 'id'>;
  declare versions: EntityTable<ProjectVersion, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    const migrateAll = (tx: { table: (name: string) => Dexie.Table }) =>
      tx
        .table('projects')
        .toCollection()
        .modify((project: Record<string, unknown>) => {
          const migrated = migrateProject(project);
          for (const key of Object.keys(project)) Reflect.deleteProperty(project, key);
          Object.assign(project, migrated);
        });

    this.version(1).stores({
      projects: 'id, updatedAt, createdAt, name',
    });
    // Document schema v2 (text runs). Same indexes; existing projects are migrated in place.
    this.version(2)
      .stores({
        projects: 'id, updatedAt, createdAt, name',
      })
      .upgrade(migrateAll);
    // Document schema v3 (layers, parts, styles) and version history.
    this.version(3)
      .stores({
        projects: 'id, updatedAt, createdAt, name',
        versions: 'id, projectId, createdAt',
      })
      .upgrade(migrateAll);
  }
}

export const db = new QalamDatabase();
