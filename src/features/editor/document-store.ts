import { produce, type Draft } from 'immer';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { projectSchema, type Project } from '@/features/projects/schema';

interface DocumentState {
  /** The project being edited (the in-memory source of truth while the editor is open). */
  project: Project | null;
  /** Load a project and start a fresh undo history. */
  load: (project: Project) => void;
  unload: () => void;
  /**
   * Apply an Immer recipe. The result is validated against the schema; an
   * invalid document is rejected (returns false) and never stored.
   */
  apply: (recipe: (draft: Draft<Project>) => void) => boolean;
  /** Replace the whole document (e.g. restoring a version); undoable. */
  replace: (project: Project) => boolean;
}

/**
 * Editor document store. Every accepted change is one undo step (unlimited
 * history via zundo); `useAutosave` persists changes to IndexedDB.
 */
export const useDocumentStore = create<DocumentState>()(
  temporal(
    (set, get) => ({
      project: null,
      load: (project) => {
        set({ project });
        useDocumentStore.temporal.getState().clear();
      },
      unload: () => {
        set({ project: null });
        useDocumentStore.temporal.getState().clear();
      },
      apply: (recipe) => {
        const current = get().project;
        if (!current) return false;
        const changed = produce(current, recipe);
        if (changed === current) return false;
        const next = produce(changed, (draft) => {
          draft.updatedAt = Math.max(Date.now(), current.updatedAt);
        });
        const result = projectSchema.safeParse(next);
        if (!result.success) {
          console.error('Rejected invalid document change', result.error);
          return false;
        }
        set({ project: next });
        return true;
      },
      replace: (project) => {
        const current = get().project;
        if (!current) return false;
        const result = projectSchema.safeParse({ ...project, id: current.id, updatedAt: Date.now() });
        if (!result.success) return false;
        set({ project: result.data });
        return true;
      },
    }),
    {
      partialize: (state) => ({ project: state.project }),
      equality: (past, current) => past.project === current.project,
    },
  ),
);

export function undo(): void {
  useDocumentStore.temporal.getState().undo();
}

export function redo(): void {
  useDocumentStore.temporal.getState().redo();
}

/** Apply a change to the open document (no-op when no document is open). */
export function applyToDocument(recipe: (draft: Draft<Project>) => void): boolean {
  return useDocumentStore.getState().apply(recipe);
}
