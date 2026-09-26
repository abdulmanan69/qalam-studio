import { Copy, Frame, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { MAX_ARTBOARDS, type Project } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { useEditorStore } from './editor-store';
import type { EditorActions } from './use-editor-actions';

interface ArtboardsPanelProps {
  project: Project;
  activeId: string;
  actions: EditorActions;
}

/** Pages of the project. The active one is shown on the canvas. */
export function ArtboardsPanel({ project, activeId, actions }: ArtboardsPanelProps) {
  const { t } = useTranslation();
  const setActive = useEditorStore((s) => s.setActiveArtboard);
  const full = project.artboards.length >= MAX_ARTBOARDS;

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={full}
        onClick={actions.addArtboard}
      >
        <Plus aria-hidden />
        {t('editor.artboards.add')}
      </Button>
      <ul aria-label={t('editor.artboards.title')} className="grid gap-0.5">
        {project.artboards.map((artboard, index) => {
          const active = artboard.id === activeId;
          const count = project.layers.filter((l) => l.artboardId === artboard.id).length;
          return (
            <li key={artboard.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-start text-xs hover:bg-accent',
                  active && 'bg-accent font-medium',
                )}
                onClick={() => {
                  setActive(artboard.id);
                }}
              >
                <Frame className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate" dir="auto">
                  {artboard.name}
                </span>
                <span className="shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">
                  {index + 1} · {t('editor.artboards.layerCount', { count })}
                </span>
              </button>
              <SimpleTooltip label={t('common.duplicate')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  disabled={full}
                  aria-label={t('editor.artboards.duplicate', { name: artboard.name })}
                  onClick={() => {
                    actions.duplicateArtboard(artboard.id);
                  }}
                >
                  <Copy aria-hidden />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip label={t('common.delete')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  disabled={project.artboards.length <= 1}
                  aria-label={t('editor.artboards.delete', { name: artboard.name })}
                  onClick={() => {
                    actions.deleteArtboard(artboard.id);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </SimpleTooltip>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
