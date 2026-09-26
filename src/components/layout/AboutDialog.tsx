import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAppDialog } from '@/app/ui-store';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { APP_NAME, APP_VERSION, DOCS_URL, REPO_URL } from '@/lib/config';

import { Logo } from './Logo';

export function AboutDialog() {
  const { t } = useTranslation();
  const { open, onOpenChange } = useAppDialog('about');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" closeLabel={t('common.close')}>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <Logo className="size-10" />
            <div>
              <DialogTitle>{APP_NAME}</DialogTitle>
              <Badge variant="outline" className="mt-1">
                {t('about.version', { version: APP_VERSION })}
              </Badge>
            </div>
          </div>
          <DialogDescription>{t('about.description')}</DialogDescription>
        </DialogHeader>
        <ul className="grid list-disc gap-1.5 ps-5 text-[0.8125rem]">
          <li>{t('about.privacy')}</li>
          <li>{t('about.license')}</li>
          <li>{t('about.fonts')}</li>
          <li>{t('about.author')}</li>
        </ul>
        <div className="flex flex-wrap gap-4 border-t border-border pt-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-link hover:underline"
          >
            {t('about.sourceCode')}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-link hover:underline"
          >
            {t('help.documentation')}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
