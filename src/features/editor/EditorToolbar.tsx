import { ChevronRight, CircleCheck, Download, Maximize, Minus, Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { MAX_NAME_LENGTH, type Project } from '@/features/projects/schema';
import { shortcutText } from '@/lib/hotkeys';
import { formatDateTime } from '@/lib/time';

import { useEditorStore } from './editor-store';
import { nextZoomStep } from './zoom';

function ProjectNameInput({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const next = draft.replace(/\s+/g, ' ').trim();
    if (next && next !== name) onRename(next);
    else setDraft(name);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setDraft(name);
      event.currentTarget.blur();
    }
  };

  return (
    <input
      aria-label={t('editor.projectName')}
      value={draft}
      maxLength={MAX_NAME_LENGTH}
      dir="auto"
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="h-7 min-w-0 flex-1 truncate rounded-sm border border-transparent bg-transparent px-1.5 text-[0.875rem] font-semibold hover:border-input focus-visible:border-ring focus-visible:bg-card focus-visible:outline-none sm:max-w-80"
    />
  );
}

interface EditorToolbarProps {
  project: Project;
  onRename: (name: string) => void;
  onDownload: () => void;
}

export function EditorToolbar({ project, onRename, onDownload }: EditorToolbarProps) {
  const { t, i18n } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestFit = useEditorStore((s) => s.requestFit);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <nav aria-label={t('editor.breadcrumb')} className="flex min-w-0 flex-1 items-center gap-1">
        <Link to="/" className="shrink-0 rounded-sm text-link hover:underline">
          {t('dashboard.title')}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
        <ProjectNameInput key={project.name} name={project.name} onRename={onRename} />
        <span
          className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex"
          title={t('editor.savedAt', { time: formatDateTime(project.updatedAt, i18n.language) })}
        >
          <CircleCheck className="size-3.5 text-tile-green" aria-hidden />
          {t('editor.saved')}
        </span>
      </nav>

      <div role="group" aria-label={t('editor.zoom.label')} className="flex items-center gap-0.5">
        <SimpleTooltip label={`${t('shortcuts.items.zoomOut')} (${shortcutText(shortcutCombo('zoomOut'))})`}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.zoomOut')}
            onClick={() => {
              setZoom(nextZoomStep(zoom, -1));
            }}
          >
            <Minus aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('editor.zoom.reset')}>
          <Button
            variant="ghost"
            size="sm"
            className="w-14 tabular-nums"
            aria-label={t('editor.zoom.current', { value: percent.format(zoom) })}
            onClick={() => {
              setZoom(1);
            }}
          >
            {percent.format(zoom)}
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={`${t('shortcuts.items.zoomIn')} (${shortcutText(shortcutCombo('zoomIn'))})`}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.zoomIn')}
            onClick={() => {
              setZoom(nextZoomStep(zoom, 1));
            }}
          >
            <Plus aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={`${t('shortcuts.items.zoomFit')} (${shortcutText(shortcutCombo('zoomFit'))})`}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.zoomFit')}
            onClick={requestFit}
          >
            <Maximize aria-hidden />
          </Button>
        </SimpleTooltip>
      </div>

      <span className="h-5 w-px bg-border" aria-hidden />

      <SimpleTooltip
        label={`${t('file.downloadProject')} (${shortcutText(shortcutCombo('downloadProject'))})`}
      >
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download aria-hidden />
          <span className="hidden md:inline">{t('editor.download')}</span>
        </Button>
      </SimpleTooltip>
    </div>
  );
}
