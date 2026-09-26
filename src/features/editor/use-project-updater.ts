import type { Draft } from 'immer';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { updateProject } from '@/features/projects/repository';
import type { Project } from '@/features/projects/schema';

export type ProjectUpdater = (recipe: (draft: Draft<Project>) => void) => void;

/**
 * Returns a fire-and-forget updater for the open project. Writes go straight
 * to IndexedDB (autosave); the live query re-renders the editor.
 */
export function useProjectUpdater(projectId: string): ProjectUpdater {
  const { t } = useTranslation();
  return useCallback<ProjectUpdater>(
    (recipe) => {
      updateProject(projectId, recipe).catch((error: unknown) => {
        console.error(error);
        toast.error(t('editor.saveFailed'), { description: t('projects.toast.unexpected') });
      });
    },
    [projectId, t],
  );
}
