import { BookOpen, Bug, ExternalLink, Keyboard, LayoutTemplate } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DOCS_URL, ISSUES_URL } from '@/lib/config';

const linkClass = 'inline-flex items-center gap-2 rounded-sm text-link hover:underline';

/** "Navigation shortcuts" card: quick links to help and less-frequent destinations. */
export function ShortcutLinks() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.links.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          <li>
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className={linkClass}>
              <BookOpen className="size-4" aria-hidden />
              {t('dashboard.links.gettingStarted')}
              <ExternalLink className="size-3 opacity-70" aria-hidden />
            </a>
          </li>
          <li>
            <button
              type="button"
              className={linkClass}
              onClick={() => {
                openDialog('shortcuts');
              }}
            >
              <Keyboard className="size-4" aria-hidden />
              {t('help.shortcuts')}
            </button>
          </li>
          <li>
            <Link to="/templates" className={linkClass}>
              <LayoutTemplate className="size-4" aria-hidden />
              {t('quickActions.templates')}
            </Link>
          </li>
          <li>
            <a href={ISSUES_URL} target="_blank" rel="noreferrer" className={linkClass}>
              <Bug className="size-4" aria-hidden />
              {t('help.reportIssue')}
              <ExternalLink className="size-3 opacity-70" aria-hidden />
            </a>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
