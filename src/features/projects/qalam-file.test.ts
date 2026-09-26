import { describe, expect, it } from 'vitest';

import { parseQalamFile, qalamFileName, QALAM_FORMAT_VERSION, serializeProject } from './qalam-file';
import { buildProject } from './repository';

const NOW = Date.UTC(2026, 8, 27, 10, 0, 0);

function sampleProject() {
  return buildProject({ name: 'نستعلیق study', presetId: 'a4-portrait', width: 794, height: 1123 }, NOW);
}

describe('.qalam file format', () => {
  it('round-trips a project losslessly', () => {
    const project = sampleProject();
    const text = serializeProject(project, new Date(NOW));
    const result = parseQalamFile(text);
    expect(result).toEqual({ ok: true, project });
  });

  it('writes a versioned envelope with an ISO-8601 export date', () => {
    const envelope = JSON.parse(serializeProject(sampleProject(), new Date(NOW))) as Record<string, unknown>;
    expect(envelope.format).toBe('qalam');
    expect(envelope.formatVersion).toBe(QALAM_FORMAT_VERSION);
    expect(envelope.exportedAt).toBe('2026-09-27T10:00:00.000Z');
  });

  it('rejects invalid JSON', () => {
    expect(parseQalamFile('{not json')).toMatchObject({ ok: false, error: 'invalidJson' });
  });

  it('rejects JSON that is not a Qalam file', () => {
    expect(parseQalamFile(JSON.stringify({ hello: 'world' }))).toMatchObject({
      ok: false,
      error: 'notQalam',
    });
  });

  it('rejects files from a newer format version', () => {
    const text = JSON.stringify({ format: 'qalam', formatVersion: QALAM_FORMAT_VERSION + 1, project: {} });
    expect(parseQalamFile(text)).toMatchObject({ ok: false, error: 'unsupportedVersion' });
  });

  it('rejects damaged project data', () => {
    const project = { ...sampleProject(), artboards: [] };
    const text = JSON.stringify({ format: 'qalam', formatVersion: 1, project });
    expect(parseQalamFile(text)).toMatchObject({ ok: false, error: 'invalidProject' });
  });

  it('rejects assets pointing at a missing artboard', () => {
    const project = sampleProject();
    const broken = {
      ...project,
      layers: [
        {
          id: 'a1',
          kind: 'svg',
          name: 'x',
          artboardId: 'missing',
          svg: '<svg/>',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          angle: 0,
          opacity: 1,
          hidden: false,
          locked: false,
          groupId: null,
        },
      ],
    };
    const text = JSON.stringify({ format: 'qalam', formatVersion: 1, project: broken });
    expect(parseQalamFile(text)).toMatchObject({ ok: false, error: 'invalidProject' });
  });

  it('migrates project files from schema v1', () => {
    const { layers: _layers, groups: _groups, ...rest } = sampleProject();
    const v1 = {
      ...rest,
      schemaVersion: 1,
      artboards: rest.artboards.map(({ guides: _guides, ...a }) => a),
      assets: [],
    };
    const result = parseQalamFile(JSON.stringify({ format: 'qalam', formatVersion: 1, project: v1 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.project.layers).toEqual([]);
  });

  it('rejects projects from a newer schema version', () => {
    const project = { ...sampleProject(), schemaVersion: 99 };
    const text = JSON.stringify({ format: 'qalam', formatVersion: 1, project });
    expect(parseQalamFile(text)).toMatchObject({ ok: false, error: 'unsupportedVersion' });
  });

  it('builds safe file names', () => {
    expect(qalamFileName({ name: 'My: design?' })).toBe('My design.qalam');
  });
});
