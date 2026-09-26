import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { db } from '@/features/projects/db';
import type { Project } from '@/features/projects/schema';
import { maybeAutoVersion } from '@/features/projects/versions';

import { useDocumentStore } from './document-store';
import { useEditorStore } from './editor-store';

/**
 * Persist the open document to IndexedDB right after each change (every
 * change is a discrete, committed edit — typing is already debounced
 * upstream), and take periodic snapshots for the version history. Writes are
 * serialized; a burst of changes only writes the latest document.
 */
export function useAutosave(): void {
  const { t } = useTranslation();
  const setSaveState = useEditorStore((s) => s.setSaveState);

  useEffect(() => {
    let pending: Project | null = null;
    let lastSaved = useDocumentStore.getState().project;
    let chain: Promise<void> = Promise.resolve();

    const write = async () => {
      const project = pending;
      pending = null;
      if (!project || project === lastSaved) return;
      setSaveState('saving');
      try {
        await db.projects.put(project);
        lastSaved = project;
        await maybeAutoVersion(project);
        // Saved unless a newer change arrived meanwhile (it has its own write queued).
        if (useDocumentStore.getState().project === project) setSaveState('saved');
      } catch (error) {
        console.error('Autosave failed', error);
        setSaveState('error');
        toast.error(t('editor.saveFailed'), { description: t('projects.toast.unexpected') });
      }
    };

    const flush = () => {
      chain = chain.then(write);
      return chain;
    };

    const unsubscribe = useDocumentStore.subscribe((state, previous) => {
      if (!state.project || state.project === previous.project) return;
      if (!previous.project || state.project.id !== previous.project.id) {
        // A project was (re)loaded, not edited.
        lastSaved = state.project;
        return;
      }
      pending = state.project;
      setSaveState('pending');
      void flush();
    });

    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [setSaveState, t]);
}
