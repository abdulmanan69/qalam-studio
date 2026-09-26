import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/lib/use-document-title';

export function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.title'));

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <Compass className="mx-auto mb-3 size-10 text-muted-foreground" aria-hidden />
        <h1 className="mb-1 text-lg font-semibold">{t('notFound.title')}</h1>
        <p className="mb-4 text-muted-foreground">{t('notFound.description')}</p>
        <Button asChild>
          <Link to="/">{t('notFound.backHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
