import { z } from 'zod';

import { APP_NAME, APP_VERSION } from '@/lib/config';
import { toSafeFileName } from '@/lib/utils';

import { isFromNewerApp, migrateProject, schemaVersionOf } from './migrations';
import { projectSchema, type Project } from './schema';

/**
 * `.qalam` project file format.
 *
 * A UTF-8 JSON envelope around a project document:
 *   { "format": "qalam", "formatVersion": 1, "exportedAt": ISO-8601,
 *     "app": "Qalam Studio 0.1.0", "project": { ...Project } }
 *
 * `formatVersion` versions the envelope; the project itself carries
 * `schemaVersion`. Readers reject newer versions they do not understand
 * rather than guessing.
 */
export const QALAM_FORMAT = 'qalam';
export const QALAM_FORMAT_VERSION = 1;
export const QALAM_FILE_EXTENSION = '.qalam';
export const QALAM_MIME_TYPE = 'application/vnd.qalam+json';
/** Value for <input accept> when opening project files. */
export const QALAM_ACCEPT = `${QALAM_FILE_EXTENSION},${QALAM_MIME_TYPE},application/json`;

const envelopeSchema = z.object({
  format: z.literal(QALAM_FORMAT),
  formatVersion: z.number().int().positive(),
  exportedAt: z.string().optional(),
  app: z.string().optional(),
  project: z.unknown(),
});

export type QalamParseError = 'invalidJson' | 'notQalam' | 'unsupportedVersion' | 'invalidProject';

export type QalamParseResult =
  { ok: true; project: Project } | { ok: false; error: QalamParseError; details?: string };

export function serializeProject(project: Project, exportedAt: Date = new Date()): string {
  const envelope = {
    format: QALAM_FORMAT,
    formatVersion: QALAM_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    app: `${APP_NAME} ${APP_VERSION}`,
    project,
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function parseQalamFile(text: string): QalamParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: 'invalidJson',
      details: error instanceof Error ? error.message : String(error),
    };
  }

  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return { ok: false, error: 'notQalam' };
  }
  if (envelope.data.formatVersion > QALAM_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'unsupportedVersion',
      details: `File format v${envelope.data.formatVersion}, this app reads up to v${QALAM_FORMAT_VERSION}`,
    };
  }

  if (isFromNewerApp(envelope.data.project)) {
    return {
      ok: false,
      error: 'unsupportedVersion',
      details: `Project schema v${String(schemaVersionOf(envelope.data.project))} is newer than this app supports`,
    };
  }

  const project = projectSchema.safeParse(migrateProject(envelope.data.project));
  if (!project.success) {
    return { ok: false, error: 'invalidProject', details: z.prettifyError(project.error) };
  }
  return { ok: true, project: project.data };
}

export function qalamFileName(project: Pick<Project, 'name'>): string {
  return `${toSafeFileName(project.name, 'qalam-project')}${QALAM_FILE_EXTENSION}`;
}

export function createQalamBlob(project: Project): Blob {
  return new Blob([serializeProject(project)], { type: QALAM_MIME_TYPE });
}
