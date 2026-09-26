import { produce } from 'immer';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildProject } from '@/features/projects/repository';
import type { Project, SvgAsset, TextRun } from '@/features/projects/schema';
import { createTextRun } from '@/features/projects/text-runs';
import type { TextLayout } from '@/features/shaping/types';

import { collectSnapTargets, snapBox } from './canvas/snapping';
import { parseLayers, serializeLayers } from './clipboard';
import { redo, undo, useDocumentStore } from './document-store';
import {
  alignLayers,
  deleteLayers,
  distributeLayers,
  groupLayers,
  mirrorLayers,
  reorderLayers,
  ungroup,
} from './layer-ops';
import { buildUnits, resolveParts } from './units';

function box(x: number, y: number, w: number, h: number) {
  return `M${String(x)} ${String(y)}L${String(x + w)} ${String(y)}L${String(x + w)} ${String(y + h)}L${String(x)} ${String(y + h)}Z`;
}

/** Two letters: letter 0 has a body and a dot; letter 1 a body. */
const LAYOUT: TextLayout = {
  width: 40,
  height: 20,
  fontSize: 20,
  ascent: 16,
  descent: 4,
  lineAdvance: 20,
  lines: [{ start: 0, end: 2, x: 0, width: 40, baseline: 16 }],
  extendable: [0],
  glyphs: [
    {
      glyphId: 5,
      cluster: 0,
      letter: 0,
      word: 0,
      occurrence: 0,
      isKashida: false,
      line: 0,
      kind: 'base',
      x: 20,
      y: 16,
      advance: 20,
      path: '',
      parts: [
        {
          key: '0:5:0:0',
          index: 0,
          kind: 'body',
          path: box(20, 6, 20, 10),
          box: { x: 20, y: 6, width: 20, height: 10 },
        },
        {
          key: '0:5:0:1',
          index: 1,
          kind: 'dot',
          path: box(28, 0, 4, 4),
          box: { x: 28, y: 0, width: 4, height: 4 },
        },
      ],
    },
    {
      glyphId: 6,
      cluster: 1,
      letter: 1,
      word: 0,
      occurrence: 0,
      isKashida: false,
      line: 0,
      kind: 'base',
      x: 0,
      y: 16,
      advance: 20,
      path: '',
      parts: [
        {
          key: '1:6:0:0',
          index: 0,
          kind: 'body',
          path: box(0, 6, 20, 10),
          box: { x: 0, y: 6, width: 20, height: 10 },
        },
      ],
    },
  ],
};

function project(): Project {
  const p = buildProject({ name: 'Test', presetId: 'custom', width: 400, height: 300 }, 1000);
  const artboardId = p.artboards[0]?.id ?? '';
  const make = (x: number) =>
    createTextRun({ artboardId, text: 'بب', fontId: 'amiri', language: 'ar', fontSize: 20, x, y: 10 });
  return { ...p, layers: [make(0), make(100), make(300)] };
}

describe('units', () => {
  const run: Pick<TextRun, 'parts'> = {
    parts: { '0:5:0:1': { dx: 5, dy: -2, angle: 0, scaleX: 1, scaleY: 1 } },
  };

  it('applies part adjustments', () => {
    const parts = resolveParts(run, LAYOUT);
    const dot = parts.find((p) => p.key === '0:5:0:1');
    expect(dot?.path).toBe(box(33, -2, 4, 4));
  });

  it('groups parts by level, keeping dots with letters when locked', () => {
    const parts = resolveParts(run, LAYOUT);
    expect(buildUnits(parts, 'letter', true).units.map((u) => u.id)).toEqual(['l:0', 'l:1']);
    const unlocked = buildUnits(parts, 'letter', false);
    expect(unlocked.rest.map((p) => p.key)).toEqual(['0:5:0:1']);
    expect(buildUnits(parts, 'word', true).units).toHaveLength(1);
    expect(buildUnits(parts, 'part', true).units).toHaveLength(3);
  });

  it('merges linked parts into one unit', () => {
    const linked = resolveParts(
      {
        parts: {
          '0:5:0:0': { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1, link: 'g1' },
          '0:5:0:1': { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1, link: 'g1' },
        },
      },
      LAYOUT,
    );
    expect(buildUnits(linked, 'part', true).units.map((u) => u.id)).toEqual(['g:g1', 'p:1:6:0:0']);
  });
});

describe('snapping', () => {
  it('snaps to artboard center and guides within tolerance', () => {
    const targets = collectSnapTargets(
      { width: 400, height: 300, guides: [{ id: 'g', axis: 'y', position: 200 }] },
      [],
      { snap: true, smartGuides: true, grid: false, gridSize: 20 },
    );
    const result = snapBox({ x: 147, y: 10, width: 100, height: 20 }, [197], targets, 5);
    expect(result.dx).toBe(3); // center 197 → 200
    expect(result.dy).toBe(3); // baseline 197 → guide 200
    expect(result.lines).toHaveLength(2);
  });

  it('does nothing when far from targets', () => {
    const targets = collectSnapTargets({ width: 400, height: 300, guides: [] }, [], {
      snap: true,
      smartGuides: false,
      grid: false,
      gridSize: 20,
    });
    expect(snapBox({ x: 50, y: 50, width: 10, height: 10 }, [], targets, 2)).toMatchObject({ dx: 0, dy: 0 });
  });
});

describe('layer operations', () => {
  it('reorders within the artboard', () => {
    const p = project();
    const [a, b, c] = p.layers.map((l) => l.id);
    const next = produce(p, (d) => {
      reorderLayers(d, [a ?? ''], 'forward');
    });
    expect(next.layers.map((l) => l.id)).toEqual([b, a, c]);
    const front = produce(p, (d) => {
      reorderLayers(d, [a ?? ''], 'front');
    });
    expect(front.layers.map((l) => l.id)).toEqual([b, c, a]);
  });

  it('groups, ungroups and prunes empty groups', () => {
    const p = project();
    const ids = [p.layers[0]?.id ?? '', p.layers[2]?.id ?? ''];
    const grouped = produce(p, (d) => {
      groupLayers(d, ids, 'G');
    });
    expect(grouped.groups).toHaveLength(1);
    expect(grouped.layers.map((l) => l.groupId !== null)).toEqual([false, true, true]);
    const ungrouped = produce(grouped, (d) => {
      ungroup(d, grouped.groups[0]?.id ?? '');
    });
    expect(ungrouped.groups).toEqual([]);
    const deleted = produce(grouped, (d) => {
      deleteLayers(d, ids);
    });
    expect(deleted.groups).toEqual([]);
  });

  it('aligns and distributes by bounds', () => {
    const p = project();
    const bounds = new Map(
      p.layers.map((l, i) => [l.id, { x: [0, 150, 300][i] ?? 0, y: 10, width: 50, height: 20 }]),
    );
    const aligned = produce(p, (d) => {
      alignLayers(d, bounds, 'left', { width: 400, height: 300 });
    });
    expect(aligned.layers.map((l) => l.x)).toEqual(
      [0, -150, -300].map((dx, i) => (p.layers[i]?.x ?? 0) + dx),
    );
    const uneven = new Map(
      p.layers.map((l, i) => [l.id, { x: [0, 60, 300][i] ?? 0, y: 0, width: 50, height: 20 }]),
    );
    const spread = produce(p, (d) => {
      distributeLayers(d, uneven, 'x');
    });
    expect(spread.layers[1]?.x).toBe((p.layers[1]?.x ?? 0) + 90);
  });

  it('mirrors text across an axis', () => {
    const p = project();
    const id = p.layers[0]?.id ?? '';
    const mirrored = produce(p, (d) => {
      mirrorLayers(d, [id], 'x', 200);
    });
    const layer = mirrored.layers[0] as TextRun;
    // Origin (0, 10) maps to (400, 10); the layer is now mirrored.
    expect(layer.x).toBeCloseTo(400);
    expect(layer.y).toBeCloseTo(10);
    expect(layer.scaleX * layer.scaleY).toBeLessThan(0);
  });
});

describe('clipboard', () => {
  it('round-trips layers and rejects foreign text', () => {
    const layers = project().layers;
    expect(parseLayers(serializeLayers(layers))).toEqual(layers);
    expect(parseLayers('hello')).toBeNull();
    expect(parseLayers('{"format":"other","layers":[]}')).toBeNull();
  });
});

describe('document store', () => {
  beforeEach(() => {
    useDocumentStore.getState().load(project());
  });

  it('applies valid changes with undo and redo', () => {
    const before = useDocumentStore.getState().project;
    expect(
      useDocumentStore.getState().apply((d) => {
        d.name = 'Renamed';
      }),
    ).toBe(true);
    expect(useDocumentStore.getState().project?.name).toBe('Renamed');
    undo();
    expect(useDocumentStore.getState().project).toBe(before);
    redo();
    expect(useDocumentStore.getState().project?.name).toBe('Renamed');
  });

  it('rejects changes that break the schema', () => {
    const ok = useDocumentStore.getState().apply((d) => {
      d.artboards = [];
    });
    expect(ok).toBe(false);
    expect(useDocumentStore.getState().project?.artboards).toHaveLength(1);
  });

  it('keeps the asset type intact', () => {
    const asset: SvgAsset | undefined = useDocumentStore
      .getState()
      .project?.layers.find((l) => l.kind === 'svg');
    expect(asset).toBeUndefined();
  });
});
