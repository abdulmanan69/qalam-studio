import { FilePlus2, FileUp, FolderOpen, LayoutTemplate, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { cn } from '@/lib/utils';

interface Tile {
  id: 'newDesign' | 'openProject' | 'templates' | 'importSvg';
  icon: LucideIcon;
  className: string;
  run: () => void;
}

export function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openDialog = useUiStore((s) => s.openDialog);
  const actions = useProjectActions();

  const tiles: Tile[] = [
    {
      id: 'newDesign',
      icon: FilePlus2,
      className: 'bg-tile-mustard text-tile-mustard-foreground',
      run: () => {
        openDialog('newDesign');
      },
    },
    {
      id: 'openProject',
      icon: FolderOpen,
      className: 'bg-tile-green text-tile-green-foreground',
      run: () => void actions.openProjectFile(),
    },
    {
      id: 'templates',
      icon: LayoutTemplate,
      className: 'bg-tile-terracotta text-tile-terracotta-foreground',
      run: () => void navigate('/templates'),
    },
    {
      id: 'importSvg',
      icon: FileUp,
      className: 'bg-tile-slate text-tile-slate-foreground',
      run: () => void actions.importSvgFile(),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul aria-label={t('dashboard.quickActions')} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(({ id, icon: Icon, className, run }) => (
            <li key={id}>
              <button
                type="button"
                onClick={run}
                className={cn(
                  'flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md px-3 text-center shadow-card transition-[filter,transform] hover:-translate-y-px hover:brightness-105 active:translate-y-0',
                  className,
                )}
                aria-describedby={`tile-${id}-hint`}
              >
                <span className="flex size-9 items-center justify-center rounded-sm border-2 border-current/60">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-[0.8125rem] leading-tight font-semibold">
                  {t(`quickActions.${id}`)}
                </span>
              </button>
              <span id={`tile-${id}-hint`} className="sr-only">
                {t(`quickActions.hints.${id}`)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
