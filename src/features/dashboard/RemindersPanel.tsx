import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/features/projects/schema';
import { useNow } from '@/lib/use-now';

import { countWorkspace, type WorkspaceCounts } from './workspace-counts';

const TIP_KEYS = ['search', 'backup', 'import', 'shortcuts'] as const;

export function RemindersPanel({ projects }: { projects: Project[] | undefined }) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const counts = countWorkspace(projects ?? [], now);
  const number = new Intl.NumberFormat(i18n.language);

  const reminders: { key: keyof WorkspaceCounts; value: number }[] = [
    { key: 'projects', value: counts.projects },
    { key: 'editedThisWeek', value: counts.editedThisWeek },
    { key: 'artboards', value: counts.artboards },
    { key: 'importedArtwork', value: counts.importedArtwork },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.reminders.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3" aria-busy={projects === undefined}>
          {reminders.map(({ key, value }) => (
            <li key={key} className="border-s-2 border-primary/70 ps-3">
              <span className="block text-xl leading-none font-semibold tabular-nums">
                {projects === undefined ? '—' : number.format(value)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`dashboard.reminders.${key}`, { count: value })}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <Lightbulb className="size-3.5 text-tile-mustard" aria-hidden />
          {t('dashboard.tips.title')}
        </h3>
        <ul className="grid gap-2 text-xs text-muted-foreground">
          {TIP_KEYS.map((key) => (
            <li key={key} className="border-s-2 border-border ps-3">
              {t(`dashboard.tips.${key}`)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
