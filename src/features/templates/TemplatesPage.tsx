import { Feather, FilePlus2, Flower2, Signature, Sparkles, Stamp, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/app/ui-store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentTitle } from '@/lib/use-document-title';

interface TemplateCategory {
  id: 'bismillah' | 'names' | 'logos' | 'poetry' | 'frames';
  icon: LucideIcon;
  /** Sample text for the preview strip (UI font until calligraphy fonts ship). */
  sample: string;
  sampleLang: string;
}

const CATEGORIES: readonly TemplateCategory[] = [
  { id: 'bismillah', icon: Sparkles, sample: 'بسم الله الرحمن الرحيم', sampleLang: 'ar' },
  { id: 'names', icon: Signature, sample: 'علی · فاطمہ · زینب', sampleLang: 'ur' },
  { id: 'logos', icon: Stamp, sample: 'قلم', sampleLang: 'ur' },
  { id: 'poetry', icon: Feather, sample: 'خودی کو کر بلند اتنا', sampleLang: 'ur' },
  { id: 'frames', icon: Flower2, sample: '❁ ✿ ❁', sampleLang: 'und' },
];

export function TemplatesPage() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  useDocumentTitle(t('templates.title'));

  return (
    <>
      <PageHeader
        title={t('templates.title')}
        actions={
          <Button
            size="sm"
            onClick={() => {
              openDialog('newDesign');
            }}
          >
            <FilePlus2 aria-hidden />
            {t('templates.startBlank')}
          </Button>
        }
      />
      <div className="grid gap-4 p-4 sm:p-6">
        <p className="max-w-2xl text-muted-foreground">{t('templates.intro')}</p>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map(({ id, icon: Icon, sample, sampleLang }) => (
            <li key={id}>
              <Card className="h-full overflow-hidden">
                <div
                  className="flex h-28 items-center justify-center border-b border-border bg-surface-sunken px-4 text-2xl text-foreground/80"
                  lang={sampleLang}
                  dir="auto"
                  aria-hidden
                >
                  {sample}
                </div>
                <CardHeader>
                  <CardTitle as="h2" className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {t(`templates.categories.${id}.title`)}
                  </CardTitle>
                  <Badge variant="outline">{t('common.comingSoon')}</Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(`templates.categories.${id}.description`)}</CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
