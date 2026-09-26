import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { db } from '@/features/projects/db';
import type { Project } from '@/features/projects/schema';
import { maybeAutoVersion } from '@/features/projects/versions';

import { useDocumentStore } from './document-store';
import { useEditorStore } from './editor-store';

const SAVE_DELAY_MS = 400;

/**
 * Persist the open document to IndexedDB shortly after each change (and when
 * the editor closes or the page is hidden), and take periodic snapshots for
 * the version history.
 */
export function useAutosave(): void {
  const { t } = useTranslation();
  const setSaveState = useEditorStore((s) => s.setSaveState);

  useEffect(() => {
    let timer: number | undefined;
    let pending: Project | null = null;
    let lastSaved = useDocumentStore.getState().project;

    const flush = async () => {
      window.clearTimeout(timer);
      timer = undefined;
      const project = pending;
      pending = null;
      if (!project || project === lastSaved) return;
      setSaveState('saving');
      try {
        await db.projects.put(project);
        lastSaved = project;
        await maybeAutoVersion(project);
        setSaveState('saved');
      } catch (error) {
        console.error('Autosave failed', error);
        setSaveState('error');
        toast.error(t('editor.saveFailed'), { description: t('projects.toast.unexpected') });
      }
    };

    const unsubscribe = useDocumentStore.subscribe((state, previous) => {
      if (!state.project || state.project === previous.project) return;
      if (previous.project && state.project.id !== previous.project.id) {
        lastSaved = state.project;
        return;
      }
      pending = state.project;
      setSaveState('pending');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
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
