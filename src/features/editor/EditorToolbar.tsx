import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Download,
  FileDown,
  History,
  LoaderCircle,
  Maximize,
  Minus,
  Plus,
  Redo2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useStore } from 'zustand';

import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { MAX_NAME_LENGTH, type Project } from '@/features/projects/schema';
import { shortcutText } from '@/lib/hotkeys';
import { formatDateTime } from '@/lib/time';

import { useDocumentStore } from './document-store';
import { useEditorStore, type SymmetryMode } from './editor-store';
import type { EditorActions } from './use-editor-actions';
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
      className="h-7 min-w-0 flex-1 truncate rounded-sm border border-transparent bg-transparent px-1.5 text-[0.875rem] font-semibold hover:border-input focus-visible:border-ring focus-visible:bg-card focus-visible:outline-none sm:max-w-72"
    />
  );
}

function SaveStatus({ updatedAt }: { updatedAt: number }) {
  const { t, i18n } = useTranslation();
  const state = useEditorStore((s) => s.saveState);
  const icon =
    state === 'error' ? (
      <CircleAlert className="size-3.5 text-destructive" aria-hidden />
    ) : state === 'saved' ? (
      <CircleCheck className="size-3.5 text-tile-green" aria-hidden />
    ) : (
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
    );
  return (
    <span
      role="status"
      className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex"
      title={t('editor.savedAt', { time: formatDateTime(updatedAt, i18n.language) })}
    >
      {icon}
      {t(`editor.saveState.${state}`)}
    </span>
  );
}

function tip(label: string, combo?: string): string {
  return combo ? `${label} (${shortcutText(combo)})` : label;
}

interface EditorToolbarProps {
  project: Project;
  actions: EditorActions;
  onRename: (name: string) => void;
  onDownload: () => void;
}

export function EditorToolbar({ project, actions, onRename, onDownload }: EditorToolbarProps) {
  const { t, i18n } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestFit = useEditorStore((s) => s.requestFit);
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const setExportOpen = useEditorStore((s) => s.setExportDialogOpen);
  const setHistoryOpen = useEditorStore((s) => s.setHistoryDialogOpen);
  const canUndo = useStore(useDocumentStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useDocumentStore.temporal, (s) => s.futureStates.length > 0);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <nav aria-label={t('editor.breadcrumb')} className="flex min-w-0 flex-1 items-center gap-1">
        <Link to="/" className="shrink-0 rounded-sm text-link hover:underline">
          {t('dashboard.title')}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
        <ProjectNameInput key={project.name} name={project.name} onRename={onRename} />
        <SaveStatus updatedAt={project.updatedAt} />
      </nav>

      <div role="group" aria-label={t('editor.history.label')} className="flex items-center gap-0.5">
        <SimpleTooltip label={tip(t('shortcuts.items.undo'), shortcutCombo('undo'))}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.undo')}
            disabled={!canUndo}
            onClick={actions.undo}
          >
            <Undo2 aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={tip(t('shortcuts.items.redo'), shortcutCombo('redo'))}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.redo')}
            disabled={!canRedo}
            onClick={actions.redo}
          >
            <Redo2 aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('editor.history.title')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('editor.history.title')}
            onClick={() => {
              setHistoryOpen(true);
            }}
          >
            <History aria-hidden />
          </Button>
        </SimpleTooltip>
      </div>

      <span className="h-5 w-px bg-border" aria-hidden />

      <div role="group" aria-label={t('editor.zoom.label')} className="flex items-center gap-0.5">
        <SimpleTooltip label={tip(t('shortcuts.items.zoomOut'), shortcutCombo('zoomOut'))}>
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
        <SimpleTooltip label={tip(t('shortcuts.items.zoomIn'), shortcutCombo('zoomIn'))}>
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
        <SimpleTooltip label={tip(t('shortcuts.items.zoomFit'), shortcutCombo('zoomFit'))}>
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

      <DropdownMenu>
        <SimpleTooltip label={t('editor.view.title')}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('editor.view.title')}>
              <SlidersHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </SimpleTooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('editor.view.title')}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={view.rulers}
            onCheckedChange={(rulers) => {
              setView({ rulers });
            }}
          >
            {t('editor.view.rulers')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={view.grid}
            onCheckedChange={(grid) => {
              setView({ grid });
            }}
          >
            {t('editor.view.grid')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={view.snap}
            onCheckedChange={(snap) => {
              setView({ snap });
            }}
          >
            {t('editor.view.snap')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={view.smartGuides}
            onCheckedChange={(smartGuides) => {
              setView({ smartGuides });
            }}
          >
            {t('editor.view.smartGuides')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('editor.view.gridSize')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(view.gridSize)}
            onValueChange={(value) => {
              setView({ gridSize: Number(value) });
            }}
          >
            {[10, 20, 50, 100].map((size) => (
              <DropdownMenuRadioItem key={size} value={String(size)}>
                {size} px
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('editor.view.symmetry')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={view.symmetry}
            onValueChange={(value) => {
              setView({ symmetry: value as SymmetryMode });
            }}
          >
            {(['off', 'vertical', 'horizontal', 'both'] as const).map((mode) => (
              <DropdownMenuRadioItem key={mode} value={mode}>
                {t(`editor.view.symmetry_${mode}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="h-5 w-px bg-border" aria-hidden />

      <SimpleTooltip label={tip(t('file.downloadProject'), shortcutCombo('downloadProject'))}>
        <Button variant="ghost" size="sm" onClick={onDownload} aria-label={t('file.downloadProject')}>
          <Download aria-hidden />
          <span className="hidden xl:inline">{t('editor.download')}</span>
        </Button>
      </SimpleTooltip>
      <SimpleTooltip label={tip(t('editor.export.title'), shortcutCombo('exportDesign'))}>
        <Button
          size="sm"
          onClick={() => {
            setExportOpen(true);
          }}
        >
          <FileDown aria-hidden />
          <span className="hidden md:inline">{t('editor.export.button')}</span>
        </Button>
      </SimpleTooltip>
    </div>
  );
}
