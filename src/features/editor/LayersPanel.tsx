import {
  ArrowDown,
  ArrowUp,
  Camera,
  Circle,
  Columns3,
  Eye,
  EyeOff,
  Folder,
  Group,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Minus,
  Square,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react';
import { useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { Artboard, Layer, Project } from '@/features/projects/schema';
import { textRunLabel } from '@/features/projects/text-runs';
import { cn } from '@/lib/utils';

import { useEditorStore } from './editor-store';
import type { EditorActions } from './use-editor-actions';

interface LayersPanelProps {
  project: Project;
  artboard: Artboard;
  actions: EditorActions;
}

type Row =
  | { type: 'layer'; layer: Layer; nested: boolean }
  | { type: 'group'; id: string; name: string; members: Layer[] };

/** Layers top-most first; consecutive members of a group are shown under a group row. */
function layerRows(project: Pick<Project, 'layers' | 'groups'>, artboardId: string): Row[] {
  const layers = project.layers.filter((l) => l.artboardId === artboardId).reverse();
  const rows: Row[] = [];
  let current = null as Extract<Row, { type: 'group' }> | null;
  for (const layer of layers) {
    if (layer.groupId) {
      if (current?.id !== layer.groupId) {
        const group = project.groups.find((g) => g.id === layer.groupId);
        current = { type: 'group', id: layer.groupId, name: group?.name ?? '', members: [] };
        rows.push(current);
      }
      current.members.push(layer);
      rows.push({ type: 'layer', layer, nested: true });
    } else {
      current = null;
      rows.push({ type: 'layer', layer, nested: false });
    }
  }
  return rows;
}

function NameEditor({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onCommit(draft);
    if (event.key === 'Escape') onCancel();
  };
  return (
    <input
      // eslint-disable-next-line jsx-a11y/no-autofocus -- rename starts on explicit user action
      autoFocus
      aria-label={t('common.rename')}
      value={draft}
      dir="auto"
      maxLength={200}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={() => {
        onCommit(draft);
      }}
      onKeyDown={onKeyDown}
      className="h-6 min-w-0 flex-1 rounded-sm border border-ring bg-card px-1 text-xs focus-visible:outline-none"
    />
  );
}

export function LayersPanel({ project, artboard, actions }: LayersPanelProps) {
  const { t } = useTranslation();
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; above: boolean } | null>(null);

  const rows = layerRows(project, artboard.id);
  const selected = new Set(selectedIds);
  const labelOf = (layer: Layer): string => {
    if (layer.name) return layer.name;
    if (layer.kind === 'text') return textRunLabel(layer.text) || t('editor.layers.untitledText');
    if (layer.kind === 'frame') {
      const story = project.stories.find((s) => s.id === layer.storyId);
      const first = story?.paragraphs.find((p) => p.text.trim())?.text ?? '';
      return textRunLabel(first) || t('publishing.frame');
    }
    if (layer.kind === 'image') return t('publishing.photo');
    if (layer.kind === 'shape') return t(`publishing.shapes.${layer.shape}`);
    return t('editor.layers.untitledArtwork');
  };

  const onRowClick = (event: MouseEvent, ids: string[]) => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      const next = new Set(selectedIds);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      select([...next]);
    } else {
      select(ids);
    }
  };

  const onDragOver = (event: DragEvent<HTMLLIElement>, id: string) => {
    if (!dragId || dragId === id) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    // Rows are listed top-most first, so the upper half means "paint above".
    setDropTarget({ id, above: event.clientY < rect.top + rect.height / 2 });
  };

  const onDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    if (dragId && dropTarget) actions.moveLayerNextTo(dragId, dropTarget.id, dropTarget.above);
    setDragId(null);
    setDropTarget(null);
  };

  const selectionGroups = [
    ...new Set(project.layers.filter((l) => selected.has(l.id)).map((l) => l.groupId)),
  ].filter((g): g is string => g !== null);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div role="toolbar" aria-label={t('editor.layers.actions')} className="flex flex-wrap gap-0.5">
        <SimpleTooltip label={t('shortcuts.items.bringForward')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.bringForward')}
            disabled={selectedIds.length === 0}
            onClick={() => {
              actions.reorder('forward');
            }}
          >
            <ArrowUp aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('shortcuts.items.sendBackward')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.sendBackward')}
            disabled={selectedIds.length === 0}
            onClick={() => {
              actions.reorder('backward');
            }}
          >
            <ArrowDown aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('shortcuts.items.group')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.group')}
            disabled={selectedIds.length < 2}
            onClick={actions.group}
          >
            <Group aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('shortcuts.items.ungroup')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.ungroup')}
            disabled={selectionGroups.length === 0}
            onClick={() => {
              actions.ungroup();
            }}
          >
            <Ungroup aria-hidden />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip label={t('shortcuts.items.deleteLayer')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('shortcuts.items.deleteLayer')}
            disabled={selectedIds.length === 0}
            onClick={actions.deleteSelection}
          >
            <Trash2 aria-hidden />
          </Button>
        </SimpleTooltip>
      </div>

      <ul aria-label={t('editor.layers.title')} className="grid gap-0.5">
        {rows.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">{t('editor.layers.empty')}</li>
        )}
        {rows.map((row) => {
          if (row.type === 'group') {
            const ids = row.members.map((l) => l.id);
            const isSelected = ids.every((id) => selected.has(id));
            const hidden = row.members.every((l) => l.hidden);
            const locked = row.members.every((l) => l.locked);
            return (
              <li key={`g-${row.id}`} className="flex items-center gap-1">
                {renaming === row.id ? (
                  <NameEditor
                    value={row.name}
                    onCommit={(name) => {
                      if (name.trim()) actions.renameGroup(row.id, name);
                      setRenaming(null);
                    }}
                    onCancel={() => {
                      setRenaming(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1 text-start text-xs font-medium hover:bg-accent',
                      isSelected && 'bg-accent',
                    )}
                    aria-pressed={isSelected}
                    onClick={(e) => {
                      onRowClick(e, ids);
                    }}
                    onDoubleClick={() => {
                      setRenaming(row.id);
                    }}
                  >
                    <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate" dir="auto">
                      {row.name}
                    </span>
                  </button>
                )}
                <RowToggles
                  name={row.name}
                  hidden={hidden}
                  locked={locked}
                  onHide={() => {
                    actions.toggleHidden(ids);
                  }}
                  onLock={() => {
                    actions.toggleLocked(ids);
                  }}
                />
              </li>
            );
          }
          const { layer, nested } = row;
          const label = labelOf(layer);
          const isSelected = selected.has(layer.id);
          const Icon =
            layer.kind === 'text'
              ? Type
              : layer.kind === 'frame'
                ? Columns3
                : layer.kind === 'image'
                  ? Camera
                  : layer.kind === 'shape'
                    ? layer.shape === 'line'
                      ? Minus
                      : layer.shape === 'ellipse'
                        ? Circle
                        : Square
                    : ImageIcon;
          return (
            <li
              key={layer.id}
              draggable={renaming !== layer.id}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDragId(layer.id);
              }}
              onDragOver={(e) => {
                onDragOver(e, layer.id);
              }}
              onDragLeave={() => {
                setDropTarget(null);
              }}
              onDrop={onDrop}
              onDragEnd={() => {
                setDragId(null);
                setDropTarget(null);
              }}
              className={cn(
                'flex items-center gap-1 border-y-2 border-transparent',
                nested && 'ps-4',
                dropTarget?.id === layer.id && (dropTarget.above ? 'border-t-primary' : 'border-b-primary'),
              )}
            >
              {renaming === layer.id ? (
                <NameEditor
                  value={layer.name || label}
                  onCommit={(name) => {
                    actions.renameLayer(layer.id, name === label ? layer.name : name);
                    setRenaming(null);
                  }}
                  onCancel={() => {
                    setRenaming(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1 text-start text-xs hover:bg-accent',
                    isSelected && 'bg-accent font-medium',
                    layer.hidden && 'text-muted-foreground',
                  )}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    onRowClick(e, [layer.id]);
                  }}
                  onDoubleClick={() => {
                    setRenaming(layer.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'F2') setRenaming(layer.id);
                  }}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate" dir={layer.kind === 'text' && !layer.name ? 'rtl' : 'auto'}>
                    {label}
                  </span>
                </button>
              )}
              <RowToggles
                name={label}
                hidden={layer.hidden}
                locked={layer.locked}
                onHide={() => {
                  actions.toggleHidden([layer.id]);
                }}
                onLock={() => {
                  actions.toggleLocked([layer.id]);
                }}
              />
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-[0.6875rem] text-muted-foreground">{t('editor.layers.hint')}</p>
    </div>
  );
}

function RowToggles({
  name,
  hidden,
  locked,
  onHide,
  onLock,
}: {
  name: string;
  hidden: boolean;
  locked: boolean;
  onHide: () => void;
  onLock: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-6"
        aria-label={locked ? t('editor.layers.unlock', { name }) : t('editor.layers.lock', { name })}
        aria-pressed={locked}
        onClick={onLock}
      >
        {locked ? <Lock aria-hidden /> : <LockOpen aria-hidden className="opacity-40" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-6"
        aria-label={hidden ? t('editor.layers.show', { name }) : t('editor.layers.hide', { name })}
        onClick={onHide}
      >
        {hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </>
  );
}
