import { FileQuestion } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { PageLoader } from '@/components/layout/PageLoader';
import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProject } from '@/features/projects/hooks';
import { normalizeName } from '@/features/projects/repository';
import type { Project, TextRun } from '@/features/projects/schema';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useHotkeys, type HotkeyBinding } from '@/lib/use-hotkeys';

import { ArtboardsPanel } from './ArtboardsPanel';
import { AssetsPanel } from './AssetsPanel';
import type { StageCallbacks, StageScene } from './canvas/artboard-stage';
import { useTextLayouts } from './canvas/use-text-layouts';
import { CanvasViewport } from './CanvasViewport';
import { applyToDocument, useDocumentStore } from './document-store';
import { EditorToolbar } from './EditorToolbar';
import { useEditorCommands, useEditorStore, type EditLevel } from './editor-store';
import { ExportDialog } from './ExportDialog';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AddTextDialog } from './text/AddTextDialog';
import { ToolsPanel } from './ToolsPanel';
import { useAutosave } from './use-autosave';
import { useEditorActions, type EditorActions } from './use-editor-actions';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { nextZoomStep } from './zoom';

const DEEPER: Record<EditLevel, EditLevel> = {
  object: 'letter',
  word: 'letter',
  letter: 'part',
  part: 'part',
};
const SHALLOWER: Record<EditLevel, EditLevel> = {
  object: 'object',
  word: 'object',
  letter: 'word',
  part: 'letter',
};

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

function useEditorShortcuts(actions: EditorActions, onDownload: () => void) {
  const store = useEditorStore;
  const textDialogOpen = useEditorStore((s) => s.textDialogOpen);
  const exportOpen = useEditorStore((s) => s.exportDialogOpen);
  const historyOpen = useEditorStore((s) => s.historyDialogOpen);
  const appDialogOpen = useUiStore((s) => s.dialog !== null);
  const idle = !textDialogOpen && !exportOpen && !historyOpen && !appDialogOpen;
  const zoomBy = (dir: 1 | -1) => {
    const state = store.getState();
    state.setZoom(Math.min(nextZoomStep(state.zoom, dir), state.maxZoom));
  };
  const on = (
    id: Parameters<typeof shortcutCombo>[0],
    handler: () => void,
    enabled = idle,
  ): HotkeyBinding => ({
    combo: shortcutCombo(id),
    handler,
    enabled,
  });
  const nudge = (dx: number, dy: number) => () => {
    actions.nudge(dx, dy);
  };

  const bindings: HotkeyBinding[] = [
    on('downloadProject', onDownload, true),
    on(
      'zoomIn',
      () => {
        zoomBy(1);
      },
      true,
    ),
    {
      combo: 'mod+plus',
      handler: () => {
        zoomBy(1);
      },
    },
    on(
      'zoomOut',
      () => {
        zoomBy(-1);
      },
      true,
    ),
    on('zoomFit', () => {
      store.getState().requestFit();
    }),
    on(
      'zoomActual',
      () => {
        store.getState().setZoom(1);
      },
      true,
    ),
    on('selectTool', () => {
      store.getState().setTool('select');
    }),
    on('handTool', () => {
      store.getState().setTool('hand');
    }),
    on('kashidaTool', () => {
      store.getState().setTool('kashida');
    }),
    on('baselineTool', () => {
      store.getState().setTool('baseline');
    }),
    on('textTool', () => {
      store.getState().setTextDialogOpen(true);
    }),
    on('deleteLayer', actions.deleteSelection),
    { combo: 'backspace', handler: actions.deleteSelection, enabled: idle },
    on('deselect', () => {
      const state = store.getState();
      if (state.tool !== 'select') state.setTool('select');
      else if (state.editLayerId) state.setEditLevel(SHALLOWER[state.editLevel]);
      else state.select(null);
    }),
    on('editLetters', () => {
      const state = store.getState();
      const id = state.editLayerId ?? state.selectedIds.at(-1);
      const layer = useDocumentStore.getState().project?.layers.find((l) => l.id === id);
      if (layer?.kind !== 'text') return;
      if (state.editLayerId) state.setEditLevel(DEEPER[state.editLevel]);
      else state.editLayer(layer.id, 'letter');
    }),
    on('undo', actions.undo),
    on('redo', actions.redo),
    { combo: 'mod+y', handler: actions.redo, enabled: idle },
    on('copy', actions.copy),
    on('cut', actions.cut),
    on('paste', () => {
      void actions.paste();
    }),
    on('duplicate', actions.duplicateSelection),
    on('selectAll', actions.selectAll),
    on('group', actions.group),
    on('ungroup', () => {
      actions.ungroup();
    }),
    on('bringForward', () => {
      actions.reorder('forward');
    }),
    on('sendBackward', () => {
      actions.reorder('backward');
    }),
    on('bringToFront', () => {
      actions.reorder('front');
    }),
    on('sendToBack', () => {
      actions.reorder('back');
    }),
    on('lockLayer', () => {
      actions.toggleLocked(store.getState().selectedIds);
    }),
    on('toggleGrid', () => {
      const state = store.getState();
      state.setView({ grid: !state.view.grid });
    }),
    on('toggleRulers', () => {
      const state = store.getState();
      state.setView({ rulers: !state.view.rulers });
    }),
    on('exportDesign', () => {
      store.getState().setExportDialogOpen(true);
    }),
    on('placeSvg', () => {
      void actions.placeSvgFile();
    }),
    { combo: 'arrowleft', handler: nudge(-1, 0), enabled: idle },
    { combo: 'arrowright', handler: nudge(1, 0), enabled: idle },
    { combo: 'arrowup', handler: nudge(0, -1), enabled: idle },
    { combo: 'arrowdown', handler: nudge(0, 1), enabled: idle },
    { combo: 'shift+arrowleft', handler: nudge(-10, 0), enabled: idle },
    { combo: 'shift+arrowright', handler: nudge(10, 0), enabled: idle },
    { combo: 'shift+arrowup', handler: nudge(0, -10), enabled: idle },
    { combo: 'shift+arrowdown', handler: nudge(0, 10), enabled: idle },
    // Fine positioning of dots and marks.
    { combo: 'alt+arrowleft', handler: nudge(-0.25, 0), enabled: idle },
    { combo: 'alt+arrowright', handler: nudge(0.25, 0), enabled: idle },
    { combo: 'alt+arrowup', handler: nudge(0, -0.25), enabled: idle },
    { combo: 'alt+arrowdown', handler: nudge(0, 0.25), enabled: idle },
  ];
  useHotkeys(bindings);
}

function EditorWorkspace({ project }: { project: Project }) {
  const { t } = useTranslation();
  const projectActions = useProjectActions();
  useAutosave();

  const activeArtboardId = useEditorStore((s) => s.activeArtboardId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const editLayerId = useEditorStore((s) => s.editLayerId);
  const editLevel = useEditorStore((s) => s.editLevel);
  const selectedUnits = useEditorStore((s) => s.selectedUnits);
  const lockMarks = useEditorStore((s) => s.lockMarks);
  const tool = useEditorStore((s) => s.tool);
  const view = useEditorStore((s) => s.view);
  const kashidaPreview = useEditorStore((s) => s.kashidaPreview);
  const reset = useEditorStore((s) => s.reset);

  useDocumentTitle(project.name);
  useEffect(() => {
    reset();
  }, [project.id, reset]);

  const artboard = project.artboards.find((a) => a.id === activeArtboardId) ?? project.artboards[0];
  const artboardId = artboard?.id;
  const layers = useMemo(
    () => project.layers.filter((l) => l.artboardId === artboardId),
    [project.layers, artboardId],
  );
  const texts = useMemo(() => layers.filter((l): l is TextRun => l.kind === 'text'), [layers]);
  const { layouts, errors } = useTextLayouts(texts, kashidaPreview);

  // Leave unit editing if the edited layer disappears (undo, delete).
  useEffect(() => {
    const state = useEditorStore.getState();
    if (editLayerId && !layers.some((l) => l.id === editLayerId && l.kind === 'text')) state.editLayer(null);
    const existing = state.selectedIds.filter((id) => layers.some((l) => l.id === id));
    if (existing.length !== state.selectedIds.length && !state.editLayerId) state.select(existing);
  }, [layers, editLayerId]);

  const scene = useMemo<StageScene | null>(
    () =>
      artboard
        ? {
            artboard,
            layers: layers.map((layer) => ({
              layer,
              layout: layer.kind === 'text' ? layouts.get(layer.id) : undefined,
            })),
            selectedIds,
            edit:
              editLayerId && editLevel !== 'object'
                ? { layerId: editLayerId, level: editLevel, lockMarks, selectedUnits }
                : null,
            tool,
            view,
          }
        : null,
    [artboard, layers, layouts, selectedIds, editLayerId, editLevel, lockMarks, selectedUnits, tool, view],
  );

  const actions = useEditorActions({
    artboard: artboard ?? {
      id: '',
      name: '',
      presetId: 'custom',
      width: 1,
      height: 1,
      background: '#ffffff',
      guides: [],
    },
    layouts,
  });

  const callbacks = useMemo<StageCallbacks>(
    () => ({
      selectLayers: (ids) => {
        useEditorStore.getState().select(ids);
      },
      selectUnits: (ids) => {
        useEditorStore.getState().selectUnits(ids);
      },
      drillDown: (layerId, unitId) => {
        const state = useEditorStore.getState();
        if (state.editLayerId !== layerId || state.editLevel === 'object') {
          state.editLayer(layerId, 'letter');
        } else if (unitId) {
          state.setEditLevel(DEEPER[state.editLevel]);
        }
      },
      exitEdit: () => {
        useEditorStore.getState().editLayer(null);
      },
      changeLayers: actions.changeLayers,
      changeParts: actions.changeParts,
      addGuide: actions.addGuide,
      moveGuide: actions.moveGuide,
      previewKashida: (layerId, letter, value) => {
        useEditorStore.getState().setKashidaPreview({ layerId, letter, value });
      },
      commitKashida: (layerId, letter, value) => {
        actions.setKashida(layerId, letter, value);
        useEditorStore.getState().setKashidaPreview(null);
      },
    }),
    [actions],
  );

  useEffect(() => {
    useEditorCommands.setState({ actions });
    return () => {
      useEditorCommands.setState({ actions: null });
    };
  }, [actions]);

  const download = () => {
    projectActions.downloadProject(project);
  };
  useEditorShortcuts(actions, download);

  if (!artboard || !scene) return <ProjectMissing />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{t('editor.heading', { name: project.name })}</h1>
      <EditorToolbar
        project={project}
        actions={actions}
        onDownload={download}
        onRename={(name) => {
          applyToDocument((draft) => {
            draft.name = normalizeName(name, draft.name);
          });
        }}
      />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label={t('editor.leftPanel')}
          className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-e border-border bg-background p-3 md:flex"
        >
          <ToolsPanel actions={actions} />
          <Tabs defaultValue="layers" className="flex min-h-0 flex-col gap-2">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="layers">{t('editor.layers.title')}</TabsTrigger>
              <TabsTrigger value="artboards">{t('editor.artboards.title')}</TabsTrigger>
              <TabsTrigger value="assets">{t('editor.assets.title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="layers">
              <LayersPanel project={project} artboard={artboard} actions={actions} />
            </TabsContent>
            <TabsContent value="artboards">
              <ArtboardsPanel project={project} activeId={artboard.id} actions={actions} />
            </TabsContent>
            <TabsContent value="assets">
              <AssetsPanel actions={actions} />
            </TabsContent>
          </Tabs>
        </aside>

        <CanvasViewport scene={scene} callbacks={callbacks} onAddGuide={actions.addGuide} />

        <aside
          aria-label={t('editor.properties.title')}
          className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-s border-border bg-background p-3 lg:flex"
        >
          <PropertiesPanel
            project={project}
            artboard={artboard}
            layouts={layouts}
            errors={errors}
            actions={actions}
          />
        </aside>
      </div>
      <AddTextDialog artboard={artboard} onAdd={actions.addText} />
      <ExportDialog project={project} artboard={artboard} />
      <VersionHistoryDialog project={project} />
    </div>
  );
}

/** Loads the project from IndexedDB into the document store once, then edits it in memory. */
export function EditorPage() {
  const { projectId } = useParams();
  const stored = useProject(projectId);
  const project = useDocumentStore((s) => s.project);
  const load = useDocumentStore((s) => s.load);
  const unload = useDocumentStore((s) => s.unload);

  useEffect(() => {
    if (stored && useDocumentStore.getState().project?.id !== stored.id) load(stored);
  }, [stored, load]);

  useEffect(
    () => () => {
      unload();
    },
    [projectId, unload],
  );

  if (stored === undefined) return <PageLoader />;
  if (stored === null) return <ProjectMissing />;
  if (project?.id !== stored.id) return <PageLoader />;
  return <EditorWorkspace key={project.id} project={project} />;
}
