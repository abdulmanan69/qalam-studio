import Dexie, { type EntityTable } from 'dexie';

import { migrateProject } from './migrations';
import type { Project } from './schema';

export const DB_NAME = 'qalam-studio';

/**
 * Local IndexedDB storage. Everything stays in the user's browser; there is
 * no server. Add new tables or indexes with a new `this.version(n)` block
 * (never edit an existing one) so installed copies upgrade cleanly.
 */
export class QalamDatabase extends Dexie {
  declare projects: EntityTable<Project, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      projects: 'id, updatedAt, createdAt, name',
    });
    // Document schema v2 (text runs). Same indexes; existing projects are migrated in place.
    this.version(2)
      .stores({
        projects: 'id, updatedAt, createdAt, name',
      })
      .upgrade((tx) =>
        tx
          .table('projects')
          .toCollection()
          .modify((project: Record<string, unknown>) => {
            Object.assign(project, migrateProject(project));
          }),
      );
  }
}

export const db = new QalamDatabase();
