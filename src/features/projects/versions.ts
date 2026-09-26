import { createId } from '@/lib/utils';

import { db, type ProjectVersion } from './db';
import { migrateProject } from './migrations';
import { projectSchema, type Project } from './schema';

/** Automatic snapshots are taken at most this often while editing. */
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000;
/** Automatic snapshots kept per project (named ones are never pruned). */
export const MAX_AUTO_VERSIONS = 30;

/** Versions of a project, newest first. */
export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  const versions = await db.versions.where('projectId').equals(projectId).toArray();
  return versions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveVersion(
  project: Project,
  kind: ProjectVersion['kind'],
  label: string | null = null,
  now: number = Date.now(),
): Promise<ProjectVersion> {
  const version: ProjectVersion = {
    id: createId(),
    projectId: project.id,
    createdAt: now,
    kind,
    label,
    project: structuredClone(project),
  };
  await db.versions.add(version);
  if (kind === 'auto') await pruneAutoVersions(project.id);
  return version;
}

async function pruneAutoVersions(projectId: string): Promise<void> {
  const autos = (await listVersions(projectId)).filter((v) => v.kind === 'auto');
  const excess = autos.slice(MAX_AUTO_VERSIONS);
  if (excess.length > 0) await db.versions.bulkDelete(excess.map((v) => v.id));
}

/** Take an automatic snapshot if the latest one is older than the interval. */
export async function maybeAutoVersion(project: Project, now: number = Date.now()): Promise<boolean> {
  const latest = (await listVersions(project.id)).find((v) => v.kind === 'auto');
  if (latest && now - latest.createdAt < AUTO_VERSION_INTERVAL_MS) return false;
  await saveVersion(project, 'auto', null, now);
  return true;
}

export async function deleteVersion(id: string): Promise<void> {
  await db.versions.delete(id);
}

export async function deleteVersionsOf(projectId: string): Promise<void> {
  await db.versions.where('projectId').equals(projectId).delete();
}

/** A stored version as a valid current-schema project (older snapshots are migrated). */
export function versionProject(version: ProjectVersion): Project | null {
  const result = projectSchema.safeParse(migrateProject(version.project));
  return result.success ? result.data : null;
}
