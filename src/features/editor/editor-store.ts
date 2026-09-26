import { create } from 'zustand';

import { clampZoom, MAX_ZOOM } from './zoom';

export type EditorTool = 'select' | 'hand';

interface EditorState {
  tool: EditorTool;
  zoom: number;
  /** Upper zoom bound for the current artboard (canvas size limits). */
  maxZoom: number;
  /** Incremented to ask the viewport to fit the artboard (it knows its own size). */
  fitRequest: number;
  /** Selected layer (text run or SVG asset) id. */
  selectedId: string | null;
  textDialogOpen: boolean;
  setTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setMaxZoom: (maxZoom: number) => void;
  requestFit: () => void;
  select: (id: string | null) => void;
  setTextDialogOpen: (open: boolean) => void;
  reset: () => void;
}

const initialState = {
  tool: 'select' as EditorTool,
  zoom: 1,
  maxZoom: MAX_ZOOM,
  selectedId: null,
  textDialogOpen: false,
};

/**
 * Transient editor UI state (not part of the document, not persisted).
 * Document changes go through the projects repository.
 */
export const useEditorStore = create<EditorState>()((set) => ({
  ...initialState,
  fitRequest: 0,
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
  select: (selectedId) => {
    set({ selectedId });
  },
  setTextDialogOpen: (textDialogOpen) => {
    set({ textDialogOpen });
  },
  reset: () => {
    set((s) => ({ ...initialState, fitRequest: s.fitRequest + 1 }));
  },
}));
