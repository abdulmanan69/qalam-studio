import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useAppDialog } from '@/app/ui-store';
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
import { clearAllProjects } from '@/features/projects/repository';

export function ClearDataDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open, onOpenChange } = useAppDialog('clearData');

  const onConfirm = async () => {
    try {
      await clearAllProjects();
      toast.success(t('settings.clearDataDone'));
      void navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(t('projects.toast.actionFailed'), { description: t('projects.toast.unexpected') });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.clearDataTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('settings.clearDataDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction destructive onClick={() => void onConfirm()}>
            {t('settings.clearDataConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
