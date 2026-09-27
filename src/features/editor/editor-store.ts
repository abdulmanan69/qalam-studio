import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EditorActions } from './use-editor-actions';
import { clampZoom, MAX_ZOOM } from './zoom';

/**
 * Commands of the open editor, for UI outside it (the main menu bar).
 * `null` when no project is open.
 */
export const useEditorCommands = create<{ actions: EditorActions | null }>()(() => ({ actions: null }));

export type EditorTool = 'select' | 'hand' | 'kashida' | 'baseline' | 'frame';

/**
 * Drill-down level inside a text layer. "object" = the whole layer; the other
 * levels make its words, letters or single parts (body, dots, marks)
 * individually selectable and movable.
 */
export type EditLevel = 'object' | 'word' | 'letter' | 'part';

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

export type SymmetryMode = 'off' | 'vertical' | 'horizontal' | 'both';

export interface ViewOptions {
  grid: boolean;
  gridSize: number;
  rulers: boolean;
  snap: boolean;
  smartGuides: boolean;
  symmetry: SymmetryMode;
}

/** A kashida value being dragged on the canvas (committed on release). */
export interface KashidaPreview {
  layerId: string;
  letter: number;
  value: number;
}

interface EditorState {
  tool: EditorTool;
  zoom: number;
  /** Upper zoom bound for the current artboard (canvas size limits). */
  maxZoom: number;
  /** Incremented to ask the viewport to fit the artboard (it knows its own size). */
  fitRequest: number;
  activeArtboardId: string | null;
  /** Selected layer ids; the last one is the primary selection. */
  selectedIds: string[];
  /** Text layer being edited at word/letter/part level. */
  editLayerId: string | null;
  editLevel: EditLevel;
  /** Selected units inside the edited layer (unit ids from `units.ts`). */
  selectedUnits: string[];
  /** Keep dots and marks attached to their letter at the word and letter levels. */
  lockMarks: boolean;
  kashidaPreview: KashidaPreview | null;
  saveState: SaveState;
  view: ViewOptions;
  textDialogOpen: boolean;
  exportDialogOpen: boolean;
  historyDialogOpen: boolean;
  setupDialogOpen: boolean;
  setTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setMaxZoom: (maxZoom: number) => void;
  requestFit: () => void;
  setActiveArtboard: (id: string | null) => void;
  /** Select layers (leaves any unit editing). */
  select: (ids: string | readonly string[] | null) => void;
  /** Enter unit editing of a text layer at a level, or leave it with `null`. */
  editLayer: (layerId: string | null, level?: EditLevel) => void;
  setEditLevel: (level: EditLevel) => void;
  selectUnits: (ids: readonly string[]) => void;
  setLockMarks: (lock: boolean) => void;
  setKashidaPreview: (preview: KashidaPreview | null) => void;
  setSaveState: (state: SaveState) => void;
  setView: (patch: Partial<ViewOptions>) => void;
  setTextDialogOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setHistoryDialogOpen: (open: boolean) => void;
  setSetupDialogOpen: (open: boolean) => void;
  reset: () => void;
}

export const DEFAULT_VIEW: ViewOptions = {
  grid: false,
  gridSize: 20,
  rulers: true,
  snap: true,
  smartGuides: true,
  symmetry: 'off',
};

const initialState = {
  tool: 'select' as EditorTool,
  zoom: 1,
  maxZoom: MAX_ZOOM,
  activeArtboardId: null,
  selectedIds: [] as string[],
  editLayerId: null,
  editLevel: 'object' as EditLevel,
  selectedUnits: [] as string[],
  kashidaPreview: null,
  saveState: 'saved' as SaveState,
  textDialogOpen: false,
  exportDialogOpen: false,
  historyDialogOpen: false,
  setupDialogOpen: false,
};

const memory = new Map<string, string>();
const memoryStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

/** localStorage when usable (it can be missing, blocked or stubbed), else memory. */
function safeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function')
      return localStorage;
  } catch {
    // Access denied (e.g. storage disabled).
  }
  return memoryStorage;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Transient editor UI state (not part of the document). View options and
 * "lock dots" are remembered per browser.
 */
export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      ...initialState,
      fitRequest: 0,
      lockMarks: true,
      view: DEFAULT_VIEW,
      setTool: (tool) => {
        set({ tool });
      },
      setZoom: (zoom) => {
        set((s) => ({ zoom: clampZoom(zoom, s.maxZoom) }));
      },
      setMaxZoom: (maxZoom) => {
        set((s) => ({ maxZoom, zoom: clampZoom(s.zoom, maxZoom) }));
      },
      requestFit: () => {
        set((s) => ({ fitRequest: s.fitRequest + 1 }));
      },
      setActiveArtboard: (activeArtboardId) => {
        set((s) =>
          s.activeArtboardId === activeArtboardId
            ? s
            : {
                activeArtboardId,
                selectedIds: [],
                editLayerId: null,
                editLevel: 'object',
                selectedUnits: [],
                fitRequest: s.fitRequest + 1,
              },
        );
      },
      select: (ids) => {
        const next = ids === null ? [] : typeof ids === 'string' ? [ids] : [...ids];
        set((s) =>
          sameIds(s.selectedIds, next) && s.editLayerId === null
            ? s
            : { selectedIds: next, editLayerId: null, editLevel: 'object', selectedUnits: [] },
        );
      },
      editLayer: (layerId, level = 'letter') => {
        set(
          layerId === null
            ? { editLayerId: null, editLevel: 'object', selectedUnits: [] }
            : { editLayerId: layerId, editLevel: level, selectedIds: [layerId], selectedUnits: [] },
        );
      },
      setEditLevel: (level) => {
        set((s) =>
          level === 'object'
            ? { editLayerId: null, editLevel: 'object', selectedUnits: [] }
            : s.editLayerId || s.selectedIds.length === 1
              ? {
                  editLayerId: s.editLayerId ?? s.selectedIds[0] ?? null,
                  editLevel: level,
                  selectedUnits: [],
                }
              : s,
        );
      },
      selectUnits: (ids) => {
        set((s) => (sameIds(s.selectedUnits, ids) ? s : { selectedUnits: [...ids] }));
      },
      setLockMarks: (lockMarks) => {
        set({ lockMarks, selectedUnits: [] });
      },
      setKashidaPreview: (kashidaPreview) => {
        set({ kashidaPreview });
      },
      setSaveState: (saveState) => {
        set({ saveState });
      },
      setView: (patch) => {
        set((s) => ({ view: { ...s.view, ...patch } }));
      },
      setTextDialogOpen: (textDialogOpen) => {
        set({ textDialogOpen });
      },
      setExportDialogOpen: (exportDialogOpen) => {
        set({ exportDialogOpen });
      },
      setHistoryDialogOpen: (historyDialogOpen) => {
        set({ historyDialogOpen });
      },
      setSetupDialogOpen: (setupDialogOpen) => {
        set({ setupDialogOpen });
      },
      reset: () => {
        set((s) => ({ ...initialState, fitRequest: s.fitRequest + 1 }));
      },
    }),
    {
      name: 'qalam.editor',
      storage: createJSONStorage(safeStorage),
      partialize: (state) => ({ view: state.view, lockMarks: state.lockMarks }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<EditorState, 'view' | 'lockMarks'>>;
        return {
          ...current,
          view: { ...DEFAULT_VIEW, ...saved.view },
          lockMarks: typeof saved.lockMarks === 'boolean' ? saved.lockMarks : current.lockMarks,
        };
      },
    },
  ),
);

/** The primary selected layer id (the last one selected). */
export function primarySelection(ids: readonly string[]): string | null {
  return ids.at(-1) ?? null;
}
