import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getOrnament } from '@/features/ornaments/ornaments';
import { getPreset } from '@/features/projects/artboard-presets';
import { createSvgLayer, normalizeName } from '@/features/projects/repository';
import {
  MAX_ARTBOARDS,
  MAX_KASHIDA_EM,
  type Artboard,
  type Guide,
  type Layer,
  type PartKindName,
  type PartOverride,
  type Project,
  type TextRun,
} from '@/features/projects/schema';
import { baseName, MAX_SVG_BYTES, parseSvg, SVG_ACCEPT } from '@/features/projects/svg-import';
import { endOfLetter } from '@/features/shaping/joining';
import type { AlternateForm, TextLayout } from '@/features/shaping/types';
import { pickFile } from '@/lib/files';
import { applyToPoint, invert } from '@/lib/matrix';
import { clamp, createId } from '@/lib/utils';

import type { LayerChange } from './canvas/artboard-stage';
import { copyLayers, readClipboardLayers } from './clipboard';
import { applyToDocument, redo, undo, useDocumentStore } from './document-store';
import { useEditorStore } from './editor-store';
import {
  alignLayers,
  applyLayerChanges,
  cloneLayers,
  deleteLayers,
  distributeLayers,
  groupLayers,
  insertLayers,
  mirrorLayers,
  moveLayerNextTo,
  reorderLayers,
  translateLayers,
  ungroup,
  type AlignMode,
  type ReorderMode,
} from './layer-ops';
import { buildUnits, layerBounds, resolveParts, textMatrix, type ResolvedPart } from './units';

const PASTE_OFFSET = 20;

export interface EditorActions {
  undo: () => void;
  redo: () => void;
  addText: (run: TextRun) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => Promise<void>;
  selectAll: () => void;
  nudge: (dx: number, dy: number) => void;
  reorder: (mode: ReorderMode) => void;
  moveLayerNextTo: (id: string, targetId: string, above: boolean) => void;
  group: () => void;
  ungroup: (groupId?: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  toggleHidden: (ids: readonly string[]) => void;
  toggleLocked: (ids: readonly string[]) => void;
  renameLayer: (id: string, name: string) => void;
  patchLayer: (id: string, recipe: (layer: Layer) => void) => void;
  align: (mode: AlignMode) => void;
  distribute: (axis: 'x' | 'y') => void;
  flip: (axis: 'x' | 'y') => void;
  mirrorCopy: (axis: 'x' | 'y') => void;
  changeLayers: (changes: LayerChange[]) => void;
  changeParts: (layerId: string, overrides: Record<string, PartOverride>) => void;
  addGuide: (axis: Guide['axis'], position: number) => void;
  moveGuide: (id: string, position: number | null) => void;
  clearGuides: () => void;
  setKashida: (layerId: string, letter: number, value: number) => void;
  setAlternate: (layerId: string, letter: number, form: AlternateForm | null) => void;
  /** Operations on the parts of the selected units. */
  reclassifyParts: (kind: PartKindName | null) => void;
  setPartsHidden: (hidden: boolean) => void;
  resetParts: (all?: boolean) => void;
  mergeParts: () => void;
  splitParts: () => void;
  addArtboard: () => void;
  duplicateArtboard: (id: string) => void;
  deleteArtboard: (id: string) => void;
  patchArtboard: (id: string, recipe: (artboard: Artboard) => void) => void;
  placeSvgFile: () => Promise<void>;
  placeSvgMarkup: (svg: string, name: string, options?: { cover?: boolean; bottom?: boolean }) => void;
  placeOrnament: (id: string, color: string, name: string) => void;
}

interface Context {
  artboard: Artboard;
  layouts: ReadonlyMap<string, TextLayout>;
}

function currentProject(): Project | null {
  return useDocumentStore.getState().project;
}

/** Parts of the selected units in the edited layer. */
function selectedParts(
  layouts: ReadonlyMap<string, TextLayout>,
): { run: TextRun; parts: ResolvedPart[] } | null {
  const editor = useEditorStore.getState();
  const project = currentProject();
  if (!project || !editor.editLayerId || editor.editLevel === 'object') return null;
  const run = project.layers.find((l) => l.id === editor.editLayerId);
  const layout = run ? layouts.get(run.id) : undefined;
  if (run?.kind !== 'text' || !layout) return null;
  const { units } = buildUnits(resolveParts(run, layout), editor.editLevel, editor.lockMarks);
  const wanted = new Set(editor.selectedUnits);
  return { run, parts: units.filter((u) => wanted.has(u.id)).flatMap((u) => u.parts) };
}

function updateParts(
  layerId: string,
  keys: readonly string[],
  update: (current: PartOverride) => PartOverride | null,
): void {
  applyToDocument((draft) => {
    const run = draft.layers.find((l) => l.id === layerId);
    if (run?.kind !== 'text') return;
    for (const key of keys) {
      const next = update(run.parts[key] ?? { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1 });
      if (next === null || isEmptyOverride(next)) {
        run.parts = Object.fromEntries(Object.entries(run.parts).filter(([k]) => k !== key));
      } else {
        run.parts[key] = next;
      }
    }
  });
}

function isEmptyOverride(o: PartOverride): boolean {
  return (
    o.dx === 0 &&
    o.dy === 0 &&
    (o.angle === 0 || o.angle === 360) &&
    o.scaleX === 1 &&
    o.scaleY === 1 &&
    !o.kind &&
    !o.hidden &&
    !o.link
  );
}

/**
 * Every document-changing command of the editor, bound to the active
 * artboard. Each command is one undo step.
 */
export function useEditorActions({ artboard, layouts }: Context): EditorActions {
  const { t } = useTranslation();

  return useMemo<EditorActions>(() => {
    const editor = () => useEditorStore.getState();
    const selection = () => {
      const project = currentProject();
      const ids = new Set(editor().selectedIds);
      return project ? project.layers.filter((l) => ids.has(l.id)) : [];
    };
    const boundsOf = (layers: readonly Layer[]) => {
      const map = new Map<string, { x: number; y: number; width: number; height: number }>();
      for (const layer of layers) {
        if (layer.locked) continue;
        const b = layerBounds(layer, layer.kind === 'text' ? layouts.get(layer.id) : undefined);
        if (b) map.set(layer.id, b);
      }
      return map;
    };
    const insert = (layers: Layer[]) => {
      if (layers.length === 0) return;
      applyToDocument((draft) => {
        insertLayers(draft, layers);
      });
      editor().select(layers.map((l) => l.id));
    };

    const actions: EditorActions = {
      undo,
      redo,
      addText: (run) => {
        insert([run]);
      },
      deleteSelection: () => {
        const parts = selectedParts(layouts);
        if (parts && parts.parts.length > 0) {
          updateParts(
            parts.run.id,
            parts.parts.map((p) => p.key),
            (o) => ({ ...o, hidden: true }),
          );
          return;
        }
        const ids = selection()
          .filter((l) => !l.locked)
          .map((l) => l.id);
        if (ids.length === 0) return;
        editor().select(null);
        applyToDocument((draft) => {
          deleteLayers(draft, ids);
        });
      },
      duplicateSelection: () => {
        insert(cloneLayers(selection(), artboard.id, PASTE_OFFSET, PASTE_OFFSET));
      },
      copy: () => {
        const layers = selection();
        if (layers.length > 0) copyLayers(layers);
      },
      cut: () => {
        const layers = selection();
        if (layers.length === 0) return;
        copyLayers(layers);
        actions.deleteSelection();
      },
      paste: async () => {
        const layers = await readClipboardLayers();
        if (layers.length === 0) return;
        const project = currentProject();
        const sameArtboard = layers.every((l) =>
          project?.layers.some((p) => p.id === l.id && p.artboardId === artboard.id),
        );
        const offset = sameArtboard ? PASTE_OFFSET : 0;
        insert(cloneLayers(layers, artboard.id, offset, offset));
      },
      selectAll: () => {
        const project = currentProject();
        if (!project) return;
        const state = editor();
        if (state.editLayerId && state.editLevel !== 'object') {
          const run = project.layers.find((l) => l.id === state.editLayerId);
          const layout = run ? layouts.get(run.id) : undefined;
          if (run?.kind === 'text' && layout) {
            state.selectUnits(
              buildUnits(resolveParts(run, layout), state.editLevel, state.lockMarks).units.map((u) => u.id),
            );
          }
          return;
        }
        state.select(
          project.layers
            .filter((l) => l.artboardId === artboard.id && !l.hidden && !l.locked)
            .map((l) => l.id),
        );
      },
      nudge: (dx, dy) => {
        const parts = selectedParts(layouts);
        if (parts) {
          if (parts.parts.length === 0) return;
          // Convert the artboard-space step into layout space.
          const inv = invert(textMatrix(parts.run));
          const origin = applyToPoint(inv, { x: 0, y: 0 });
          const step = applyToPoint(inv, { x: dx, y: dy });
          const ldx = step.x - origin.x;
          const ldy = step.y - origin.y;
          updateParts(
            parts.run.id,
            parts.parts.map((p) => p.key),
            (o) => ({
              ...o,
              dx: Math.round((o.dx + ldx) * 1000) / 1000,
              dy: Math.round((o.dy + ldy) * 1000) / 1000,
            }),
          );
          return;
        }
        const ids = editor().selectedIds;
        if (ids.length === 0) return;
        applyToDocument((draft) => {
          translateLayers(draft, ids, dx, dy);
        });
      },
      reorder: (mode) => {
        const ids = editor().selectedIds;
        if (ids.length === 0) return;
        applyToDocument((draft) => {
          reorderLayers(draft, ids, mode);
        });
      },
      moveLayerNextTo: (id, targetId, above) => {
        applyToDocument((draft) => {
          moveLayerNextTo(draft, id, targetId, above);
        });
      },
      group: () => {
        const ids = editor().selectedIds;
        if (ids.length < 2) return;
        const project = currentProject();
        const name = t('editor.layers.groupName', { index: (project?.groups.length ?? 0) + 1 });
        applyToDocument((draft) => {
          groupLayers(draft, ids, name);
        });
      },
      ungroup: (groupId) => {
        const project = currentProject();
        const ids = groupId
          ? [groupId]
          : [
              ...new Set(
                selection()
                  .map((l) => l.groupId)
                  .filter((g): g is string => g !== null),
              ),
            ];
        if (!project || ids.length === 0) return;
        applyToDocument((draft) => {
          for (const id of ids) ungroup(draft, id);
        });
      },
      renameGroup: (groupId, name) => {
        applyToDocument((draft) => {
          const group = draft.groups.find((g) => g.id === groupId);
          if (group) group.name = normalizeName(name, group.name);
        });
      },
      toggleHidden: (ids) => {
        applyToDocument((draft) => {
          const layers = draft.layers.filter((l) => ids.includes(l.id));
          const hide = !layers.every((l) => l.hidden);
          for (const layer of layers) layer.hidden = hide;
        });
      },
      toggleLocked: (ids) => {
        applyToDocument((draft) => {
          const layers = draft.layers.filter((l) => ids.includes(l.id));
          const lock = !layers.every((l) => l.locked);
          for (const layer of layers) layer.locked = lock;
        });
      },
      renameLayer: (id, name) => {
        applyToDocument((draft) => {
          const layer = draft.layers.find((l) => l.id === id);
          if (layer) layer.name = name.replace(/\s+/g, ' ').trim().slice(0, 200);
        });
      },
      patchLayer: (id, recipe) => {
        applyToDocument((draft) => {
          const layer = draft.layers.find((l) => l.id === id);
          if (layer) recipe(layer);
        });
      },
      align: (mode) => {
        const bounds = boundsOf(selection());
        if (bounds.size === 0) return;
        applyToDocument((draft) => {
          alignLayers(draft, bounds, mode, artboard);
        });
      },
      distribute: (axis) => {
        const bounds = boundsOf(selection());
        applyToDocument((draft) => {
          distributeLayers(draft, bounds, axis);
        });
      },
      flip: (axis) => {
        const layers = selection();
        const bounds = [...boundsOf(layers).values()];
        if (bounds.length === 0) return;
        const minX = Math.min(...bounds.map((b) => b.x));
        const maxX = Math.max(...bounds.map((b) => b.x + b.width));
        const minY = Math.min(...bounds.map((b) => b.y));
        const maxY = Math.max(...bounds.map((b) => b.y + b.height));
        const at = axis === 'x' ? (minX + maxX) / 2 : (minY + maxY) / 2;
        applyToDocument((draft) => {
          mirrorLayers(
            draft,
            layers.map((l) => l.id),
            axis,
            at,
          );
        });
      },
      mirrorCopy: (axis) => {
        const copies = cloneLayers(selection(), artboard.id, 0, 0);
        if (copies.length === 0) return;
        const at = axis === 'x' ? artboard.width / 2 : artboard.height / 2;
        applyToDocument((draft) => {
          insertLayers(draft, copies);
          mirrorLayers(
            draft,
            copies.map((l) => l.id),
            axis,
            at,
          );
        });
        editor().select(copies.map((l) => l.id));
      },
      changeLayers: (changes) => {
        applyToDocument((draft) => {
          applyLayerChanges(draft, changes);
        });
      },
      changeParts: (layerId, overrides) => {
        applyToDocument((draft) => {
          const run = draft.layers.find((l) => l.id === layerId);
          if (run?.kind !== 'text') return;
          for (const [key, override] of Object.entries(overrides)) {
            if (isEmptyOverride(override)) {
              run.parts = Object.fromEntries(Object.entries(run.parts).filter(([k]) => k !== key));
            } else {
              run.parts[key] = override;
            }
          }
        });
      },
      addGuide: (axis, position) => {
        applyToDocument((draft) => {
          const target = draft.artboards.find((a) => a.id === artboard.id);
          if (target && target.guides.length < 200) target.guides.push({ id: createId(), axis, position });
        });
      },
      moveGuide: (id, position) => {
        applyToDocument((draft) => {
          const target = draft.artboards.find((a) => a.id === artboard.id);
          if (!target) return;
          if (position === null) target.guides = target.guides.filter((g) => g.id !== id);
          else {
            const guide = target.guides.find((g) => g.id === id);
            if (guide) guide.position = position;
          }
        });
      },
      clearGuides: () => {
        applyToDocument((draft) => {
          const target = draft.artboards.find((a) => a.id === artboard.id);
          if (target) target.guides = [];
        });
      },
      setKashida: (layerId, letter, value) => {
        const v = clamp(Math.round(value * 100) / 100, 0, MAX_KASHIDA_EM);
        applyToDocument((draft) => {
          const run = draft.layers.find((l) => l.id === layerId);
          if (run?.kind !== 'text') return;
          if (v <= 0) {
            run.kashida = Object.fromEntries(
              Object.entries(run.kashida).filter(([k]) => k !== String(letter)),
            );
          } else {
            run.kashida[String(letter)] = v;
          }
        });
      },
      setAlternate: (layerId, letter, form) => {
        applyToDocument((draft) => {
          const run = draft.layers.find((l) => l.id === layerId);
          if (run?.kind !== 'text') return;
          const end = endOfLetter(run.text, letter);
          run.features = run.features.filter((f) => f.end <= letter || f.start >= end);
          if (form) run.features.push({ tag: form.tag, value: form.value, start: letter, end: letter + 1 });
        });
      },
      reclassifyParts: (kind) => {
        const parts = selectedParts(layouts);
        if (!parts || parts.parts.length === 0) return;
        updateParts(
          parts.run.id,
          parts.parts.map((p) => p.key),
          (o) => {
            const next = { ...o };
            if (kind === null) delete next.kind;
            else next.kind = kind;
            return next;
          },
        );
      },
      setPartsHidden: (hidden) => {
        const parts = selectedParts(layouts);
        if (!parts || parts.parts.length === 0) return;
        updateParts(
          parts.run.id,
          parts.parts.map((p) => p.key),
          (o) => {
            const next = { ...o };
            if (hidden) next.hidden = true;
            else delete next.hidden;
            return next;
          },
        );
      },
      resetParts: (all = false) => {
        const state = editor();
        const project = currentProject();
        const layerId = state.editLayerId ?? state.selectedIds.at(-1);
        if (!project || !layerId) return;
        if (all || !state.editLayerId) {
          applyToDocument((draft) => {
            const run = draft.layers.find((l) => l.id === layerId);
            if (run?.kind === 'text') {
              run.parts = {};
              run.kashida = {};
              run.features = [];
            }
          });
          return;
        }
        const parts = selectedParts(layouts);
        if (!parts || parts.parts.length === 0) return;
        updateParts(
          parts.run.id,
          parts.parts.map((p) => p.key),
          (o) => {
            const next: PartOverride = { dx: 0, dy: 0, angle: 0, scaleX: 1, scaleY: 1 };
            if (o.kind) next.kind = o.kind;
            if (o.link) next.link = o.link;
            return next;
          },
        );
      },
      mergeParts: () => {
        const parts = selectedParts(layouts);
        if (!parts || parts.parts.length < 2) return;
        const link = createId().slice(0, 12);
        updateParts(
          parts.run.id,
          parts.parts.map((p) => p.key),
          (o) => ({ ...o, link }),
        );
        editor().selectUnits([`g:${link}`]);
      },
      splitParts: () => {
        const parts = selectedParts(layouts);
        if (!parts || parts.parts.length === 0) return;
        updateParts(
          parts.run.id,
          parts.parts.map((p) => p.key),
          (o) => {
            const next = { ...o };
            delete next.link;
            return next;
          },
        );
        editor().selectUnits(parts.parts.map((p) => `p:${p.key}`));
      },
      addArtboard: () => {
        const project = currentProject();
        if (!project || project.artboards.length >= MAX_ARTBOARDS) return;
        const id = createId();
        const preset = getPreset(artboard.presetId === 'custom' ? 'square-post' : artboard.presetId);
        applyToDocument((draft) => {
          draft.artboards.push({
            id,
            name: t('projects.defaultArtboardName', { index: draft.artboards.length + 1 }),
            presetId: artboard.presetId,
            width: artboard.presetId === 'custom' ? artboard.width : preset.width,
            height: artboard.presetId === 'custom' ? artboard.height : preset.height,
            background: artboard.background,
            guides: [],
          });
        });
        editor().setActiveArtboard(id);
      },
      duplicateArtboard: (id) => {
        const project = currentProject();
        const source = project?.artboards.find((a) => a.id === id);
        if (!project || !source || project.artboards.length >= MAX_ARTBOARDS) return;
        const copyId = createId();
        const layers = cloneLayers(
          project.layers.filter((l) => l.artboardId === id),
          copyId,
          0,
          0,
        );
        applyToDocument((draft) => {
          const index = draft.artboards.findIndex((a) => a.id === id);
          draft.artboards.splice(index + 1, 0, {
            ...structuredClone(source),
            id: copyId,
            name: t('projects.copyName', { name: source.name }).slice(0, 120),
            guides: source.guides.map((g) => ({ ...g, id: createId() })),
          });
          insertLayers(draft, layers);
        });
        editor().setActiveArtboard(copyId);
      },
      deleteArtboard: (id) => {
        const project = currentProject();
        if (!project || project.artboards.length <= 1) return;
        const index = project.artboards.findIndex((a) => a.id === id);
        const next = project.artboards[index === 0 ? 1 : index - 1];
        applyToDocument((draft) => {
          draft.artboards = draft.artboards.filter((a) => a.id !== id);
          deleteLayers(
            draft,
            draft.layers.filter((l) => l.artboardId === id).map((l) => l.id),
          );
        });
        if (next) editor().setActiveArtboard(next.id);
      },
      patchArtboard: (id, recipe) => {
        applyToDocument((draft) => {
          const target = draft.artboards.find((a) => a.id === id);
          if (target) recipe(target);
        });
      },
      placeSvgMarkup: (svg, name, options = {}) => {
        const result = parseSvg(svg);
        if (!result.ok) {
          toast.error(t('projects.toast.importFailed'), {
            description: t(`projects.svgErrors.${result.error}`),
          });
          return;
        }
        const { width, height } = result.value;
        let box: { x: number; y: number; width: number; height: number };
        if (options.cover) {
          box = { x: 0, y: 0, width: artboard.width, height: artboard.height };
        } else {
          const s = Math.min(1, (artboard.width * 0.6) / width, (artboard.height * 0.6) / height);
          const w = width * s;
          const h = height * s;
          box = { x: (artboard.width - w) / 2, y: (artboard.height - h) / 2, width: w, height: h };
        }
        const layer = createSvgLayer(result.value, artboard.id, name, box);
        if (options.bottom) {
          applyToDocument((draft) => {
            const index = draft.layers.findIndex((l) => l.artboardId === artboard.id);
            draft.layers.splice(index === -1 ? draft.layers.length : index, 0, layer);
          });
          editor().select([layer.id]);
        } else {
          insert([layer]);
        }
      },
      placeOrnament: (id, color, name) => {
        const ornament = getOrnament(id);
        if (!ornament) return;
        const cover = ornament.category !== 'ornament';
        actions.placeSvgMarkup(ornament.build(artboard.width, artboard.height, color), name, {
          cover,
          bottom: ornament.category === 'pattern',
        });
      },
      placeSvgFile: async () => {
        const file = await pickFile({ accept: SVG_ACCEPT });
        if (!file) return;
        if (file.size > MAX_SVG_BYTES) {
          toast.error(t('projects.toast.importFailed'), { description: t('projects.svgErrors.tooLarge') });
          return;
        }
        actions.placeSvgMarkup(await file.text(), baseName(file.name) || t('projects.untitled'));
      },
    };
    return actions;
  }, [artboard, layouts, t]);
}
