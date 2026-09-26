import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { Project } from './schema';

interface DeleteProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (project: Project) => void;
}

export function DeleteProjectDialog({ project, onOpenChange, onConfirm }: DeleteProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={project !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('projects.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('projects.deleteDescription', { name: project?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            destructive
            onClick={() => {
              if (project) onConfirm(project);
            }}
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
