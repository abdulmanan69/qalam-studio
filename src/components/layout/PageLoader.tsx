import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-1 items-center justify-center gap-2 p-10 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{t('common.loading')}</span>
    </div>
  );
}
