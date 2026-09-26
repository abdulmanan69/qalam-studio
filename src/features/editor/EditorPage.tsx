import { FileQuestion } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { PageLoader } from '@/components/layout/PageLoader';
import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import { useProject } from '@/features/projects/hooks';
import { normalizeName } from '@/features/projects/repository';
import type { Project, TextRun } from '@/features/projects/schema';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useHotkeys } from '@/lib/use-hotkeys';

import type { StageChange } from './canvas/artboard-stage';
import { useTextLayouts } from './canvas/use-text-layouts';
import { CanvasViewport } from './CanvasViewport';
import { EditorToolbar } from './EditorToolbar';
import { useEditorStore } from './editor-store';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel, type SelectedLayer } from './PropertiesPanel';
import { AddTextDialog } from './text/AddTextDialog';
import { ToolsPanel } from './ToolsPanel';
import { useProjectUpdater } from './use-project-updater';
import { nextZoomStep } from './zoom';

function ProjectMissing() {
  const { t } = useTranslation();
  useDocumentTitle(t('editor.missing.title'));
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <FileQuestion className="mx-auto mb-3 size-10 text-muted-foreground" aria-hidden />
        <h1 className="mb-1 text-lg font-semibold">{t('editor.missing.title')}</h1>
        <p className="mb-4 text-muted-foreground">{t('editor.missing.description')}</p>
        <Button asChild>
          <Link to="/">{t('notFound.backHome')}</Link>
        </Button>
      </div>
    </div>
  );
}

function useEditorShortcuts(onDownload: () => void, onDeleteSelected: () => void) {
  const setTool = useEditorStore((s) => s.setTool);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestFit = useEditorStore((s) => s.requestFit);
  const select = useEditorStore((s) => s.select);
  const setTextDialogOpen = useEditorStore((s) => s.setTextDialogOpen);
  const textDialogOpen = useEditorStore((s) => s.textDialogOpen);
  const appDialogOpen = useUiStore((s) => s.dialog !== null);
  const idle = !textDialogOpen && !appDialogOpen;
  const zoomBy = (dir: 1 | -1) => {
    const state = useEditorStore.getState();
    setZoom(Math.min(nextZoomStep(state.zoom, dir), state.maxZoom));
  };

  useHotkeys([
    { combo: shortcutCombo('downloadProject'), handler: onDownload },
    {
      combo: shortcutCombo('zoomIn'),
      handler: () => {
        zoomBy(1);
      },
    },
    // Also accept the "+" key itself (numeric keypad, non-US layouts).
    {
      combo: 'mod+plus',
      handler: () => {
        zoomBy(1);
      },
    },
    {
      combo: shortcutCombo('zoomOut'),
      handler: () => {
        zoomBy(-1);
      },
    },
    { combo: shortcutCombo('zoomFit'), handler: requestFit, enabled: idle },
    {
      combo: shortcutCombo('zoomActual'),
      handler: () => {
        setZoom(1);
      },
    },
    {
      combo: shortcutCombo('selectTool'),
      handler: () => {
        setTool('select');
      },
      enabled: idle,
    },
    {
      combo: shortcutCombo('handTool'),
      handler: () => {
        setTool('hand');
      },
      enabled: idle,
    },
    {
      combo: shortcutCombo('textTool'),
      handler: () => {
        setTextDialogOpen(true);
      },
      enabled: idle,
    },
    { combo: shortcutCombo('deleteLayer'), handler: onDeleteSelected, enabled: idle },
    { combo: 'backspace', handler: onDeleteSelected, enabled: idle },
    {
      combo: shortcutCombo('deselect'),
      handler: () => {
        select(null);
      },
      enabled: idle,
    },
  ]);
}

function EditorWorkspace({ project }: { project: Project }) {
  const { t } = useTranslation();
  const actions = useProjectActions();
  const update = useProjectUpdater(project.id);
  const reset = useEditorStore((s) => s.reset);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  useDocumentTitle(project.name);
  useEffect(() => {
    reset();
  }, [project.id, reset]);

  const artboard = project.artboards[0];
  const artboardId = artboard?.id;
  const assets = useMemo(
    () => project.assets.filter((asset) => asset.artboardId === artboardId),
    [project.assets, artboardId],
  );
  const texts = useMemo(
    () => project.texts.filter((run) => run.artboardId === artboardId),
    [project.texts, artboardId],
  );
  const { layouts, errors } = useTextLayouts(texts);

  const selectedText = texts.find((run) => run.id === selectedId);
  const selectedAsset = assets.find((asset) => asset.id === selectedId);
  const selected: SelectedLayer = selectedText
    ? { kind: 'text', run: selectedText }
    : selectedAsset
      ? { kind: 'asset', asset: selectedAsset }
      : null;

  const download = () => {
    actions.downloadProject(project);
  };

  const deleteLayer = useCallback(
    (id: string) => {
      select(null);
      update((draft) => {
        draft.texts = draft.texts.filter((run) => run.id !== id);
        draft.assets = draft.assets.filter((asset) => asset.id !== id);
      });
    },
    [select, update],
  );

  useEditorShortcuts(download, () => {
    if (selectedId) deleteLayer(selectedId);
  });

  const toggleHidden = (id: string) => {
    update((draft) => {
      const layer = draft.texts.find((run) => run.id === id) ?? draft.assets.find((asset) => asset.id === id);
      if (layer) layer.hidden = !layer.hidden;
    });
  };

  const onStageChange = useCallback(
    (change: StageChange) => {
      update((draft) => {
        if (change.kind === 'text') {
          const run = draft.texts.find((item) => item.id === change.id);
          if (run)
            Object.assign(run, {
              x: change.x,
              y: change.y,
              scaleX: change.scaleX,
              scaleY: change.scaleY,
              angle: change.angle,
            });
        } else {
          const asset = draft.assets.find((item) => item.id === change.id);
          if (asset)
            Object.assign(asset, {
              x: change.x,
              y: change.y,
              width: change.width,
              height: change.height,
              angle: change.angle,
            });
        }
      });
    },
    [update],
  );

  const addText = (run: TextRun) => {
    update((draft) => {
      draft.texts.push(run);
    });
    select(run.id);
  };

  if (!artboard) return <ProjectMissing />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{t('editor.heading', { name: project.name })}</h1>
      <EditorToolbar
        project={project}
        onDownload={download}
        onRename={(name) => {
          update((draft) => {
            draft.name = normalizeName(name, draft.name);
          });
        }}
      />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label={t('editor.leftPanel')}
          className="hidden w-60 shrink-0 flex-col gap-3 overflow-y-auto border-e border-border bg-background p-3 md:flex"
        >
          <ToolsPanel />
          <LayersPanel artboard={artboard} assets={assets} texts={texts} onToggleHidden={toggleHidden} />
        </aside>

        <CanvasViewport
          artboard={artboard}
          assets={assets}
          texts={texts}
          layouts={layouts}
          onChange={onStageChange}
        />

        <aside
          aria-label={t('editor.properties.title')}
          className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-s border-border bg-background p-3 lg:flex"
        >
          <PropertiesPanel
            project={project}
            selected={selected}
            layoutError={selectedText ? errors.get(selectedText.id) : undefined}
            update={update}
            onDeleteLayer={deleteLayer}
          />
        </aside>
      </div>
      <AddTextDialog artboard={artboard} onAdd={addText} />
    </div>
  );
}

export function EditorPage() {
  const { projectId } = useParams();
  const project = useProject(projectId);

  if (project === undefined) return <PageLoader />;
  if (project === null) return <ProjectMissing />;
  return <EditorWorkspace key={project.id} project={project} />;
}
