import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { downloadBlob, pickFile } from '@/lib/files';

import { createQalamBlob, parseQalamFile, QALAM_ACCEPT, qalamFileName } from './qalam-file';
import {
  buildProjectFromSvg,
  deleteProject,
  duplicateProject,
  importProject,
  renameProject,
  saveNewProject,
} from './repository';
import type { Project } from './schema';
import { baseName, MAX_SVG_BYTES, parseSvg, SVG_ACCEPT } from './svg-import';

export interface ProjectActions {
  openProjectFile: () => Promise<void>;
  importSvgFile: () => Promise<void>;
  downloadProject: (project: Project) => void;
  duplicate: (project: Project) => Promise<void>;
  rename: (project: Project, name: string) => Promise<void>;
  remove: (project: Project) => Promise<void>;
}

/**
 * User-facing project operations with consistent feedback (toasts,
 * navigation, error handling). UI components call these instead of the
 * repository directly.
 */
export function useProjectActions(): ProjectActions {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const reportUnexpected = useCallback(
    (title: string, error: unknown) => {
      console.error(error);
      toast.error(title, { description: t('projects.toast.unexpected') });
    },
    [t],
  );

  const openProjectFile = useCallback(async () => {
    const file = await pickFile({ accept: QALAM_ACCEPT });
    if (!file) return;
    try {
      const result = parseQalamFile(await file.text());
      if (!result.ok) {
        toast.error(t('projects.toast.openFailed'), {
          description: t(`projects.qalamErrors.${result.error}`),
        });
        return;
      }
      const project = await importProject(result.project);
      toast.success(t('projects.toast.opened', { name: project.name }));
      void navigate(`/editor/${project.id}`);
    } catch (error) {
      reportUnexpected(t('projects.toast.openFailed'), error);
    }
  }, [navigate, reportUnexpected, t]);

  const importSvgFile = useCallback(async () => {
    const file = await pickFile({ accept: SVG_ACCEPT });
    if (!file) return;
    try {
      if (file.size > MAX_SVG_BYTES) {
        toast.error(t('projects.toast.importFailed'), { description: t('projects.svgErrors.tooLarge') });
        return;
      }
      const result = parseSvg(await file.text());
      if (!result.ok) {
        toast.error(t('projects.toast.importFailed'), {
          description: t(`projects.svgErrors.${result.error}`),
        });
        return;
      }
      const project = await saveNewProject(
        buildProjectFromSvg(
          result.value,
          baseName(file.name) || t('projects.untitled'),
          Date.now(),
          t('projects.defaultArtboardName', { index: 1 }),
        ),
      );
      toast.success(t('projects.toast.imported', { name: project.name }));
      void navigate(`/editor/${project.id}`);
    } catch (error) {
      reportUnexpected(t('projects.toast.importFailed'), error);
    }
  }, [navigate, reportUnexpected, t]);

  const downloadProject = useCallback(
    (project: Project) => {
      downloadBlob(createQalamBlob(project), qalamFileName(project));
      toast.success(t('projects.toast.downloaded', { file: qalamFileName(project) }));
    },
    [t],
  );

  const duplicate = useCallback(
    async (project: Project) => {
      try {
        const copy = await duplicateProject(project.id, t('projects.copyName', { name: project.name }));
        toast.success(t('projects.toast.duplicated', { name: copy.name }));
      } catch (error) {
        reportUnexpected(t('projects.toast.actionFailed'), error);
      }
    },
    [reportUnexpected, t],
  );

  const rename = useCallback(
    async (project: Project, name: string) => {
      try {
        await renameProject(project.id, name);
      } catch (error) {
        reportUnexpected(t('projects.toast.actionFailed'), error);
      }
    },
    [reportUnexpected, t],
  );

  const remove = useCallback(
    async (project: Project) => {
      const snapshot = structuredClone(project);
      try {
        await deleteProject(project.id);
        toast.success(t('projects.toast.deleted', { name: project.name }), {
          action: {
            label: t('common.undo'),
            onClick: () => {
              void saveNewProject(snapshot);
            },
          },
        });
      } catch (error) {
        reportUnexpected(t('projects.toast.actionFailed'), error);
      }
    },
    [reportUnexpected, t],
  );

  return useMemo(
    () => ({ openProjectFile, importSvgFile, downloadProject, duplicate, rename, remove }),
    [openProjectFile, importSvgFile, downloadProject, duplicate, rename, remove],
  );
}
