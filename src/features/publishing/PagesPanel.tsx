import { ArrowDown, ArrowUp, Copy, FileStack, Plus, Settings2, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { Project } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from '../editor/NumberField';
import { useEditorStore } from '../editor/editor-store';
import type { EditorActions } from '../editor/use-editor-actions';

import { mastersOf, pageNumber, pagesOf } from './pages';

interface PagesPanelProps {
  project: Project;
  activeId: string;
  actions: EditorActions;
}

/** Pages of the document (with their numbers and master page) and master pages. */
export function PagesPanel({ project, activeId, actions }: PagesPanelProps) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const setActive = useEditorStore((s) => s.setActiveArtboard);
  const openSetup = useEditorStore((s) => s.setSetupDialogOpen);
  const [count, setCount] = useState(1);
  const pages = pagesOf(project);
  const masters = mastersOf(project);
  const number = new Intl.NumberFormat(i18n.language);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-1">
        <div className="w-16">
          <NumberField
            key={`n-${String(count)}`}
            id={`${id}-count`}
            label={t('publishing.pagesToAdd')}
            value={count}
            min={1}
            max={200}
            integer
            onCommit={setCount}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            actions.addPages(count);
          }}
        >
          <Plus aria-hidden />
          {t('publishing.addPages')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            openSetup(true);
          }}
        >
          <Settings2 aria-hidden />
          {t('publishing.setup')}
        </Button>
      </div>

      <ol aria-label={t('publishing.pages')} className="grid gap-0.5">
        {pages.map((page, index) => {
          const active = page.id === activeId;
          const master = masters.find((m) => m.id === page.masterId);
          const n = pageNumber(project, page.id) ?? index + 1;
          return (
            <li key={page.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-start text-xs hover:bg-accent',
                  active && 'bg-accent font-medium',
                )}
                onClick={() => {
                  setActive(page.id);
                }}
              >
                <span className="w-7 shrink-0 text-center font-semibold tabular-nums">
                  {number.format(n)}
                </span>
                <span className="min-w-0 flex-1 truncate" dir="auto">
                  {page.name}
                </span>
                {master && (
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">{master.name}</span>
                )}
              </button>
              <SimpleTooltip label={t('publishing.moveUp')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  disabled={index === 0}
                  aria-label={t('publishing.moveUp')}
                  onClick={() => {
                    actions.movePage(page.id, -1);
                  }}
                >
                  <ArrowUp aria-hidden />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip label={t('publishing.moveDown')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  disabled={index === pages.length - 1}
                  aria-label={t('publishing.moveDown')}
                  onClick={() => {
                    actions.movePage(page.id, 1);
                  }}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip label={t('common.duplicate')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  aria-label={t('editor.artboards.duplicate', { name: page.name })}
                  onClick={() => {
                    actions.duplicateArtboard(page.id);
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
                  disabled={pages.length <= 1}
                  aria-label={t('editor.artboards.delete', { name: page.name })}
                  onClick={() => {
                    actions.deleteArtboard(page.id);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </SimpleTooltip>
            </li>
          );
        })}
      </ol>

      {(() => {
        const page = pages.find((p) => p.id === activeId);
        if (!page) return null;
        return (
          <div className="grid gap-1">
            <label htmlFor={`${id}-master`} className="text-[0.6875rem] font-medium text-muted-foreground">
              {t('publishing.masterForPage')}
            </label>
            <div className="flex gap-1">
              <select
                id={`${id}-master`}
                value={page.masterId ?? ''}
                onChange={(e) => {
                  actions.assignMaster([page.id], e.target.value || null);
                }}
                className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-xs"
              >
                <option value="">{t('publishing.noMaster')}</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {page.masterId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actions.assignMaster(
                      pages.map((p) => p.id),
                      page.masterId ?? null,
                    );
                  }}
                >
                  {t('publishing.applyToAll')}
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      <section aria-labelledby={`${id}-masters`} className="grid gap-1 border-t border-border pt-2">
        <div className="flex items-center justify-between">
          <h3 id={`${id}-masters`} className="text-[0.6875rem] font-semibold text-muted-foreground uppercase">
            {t('publishing.masters')}
          </h3>
          <Button variant="ghost" size="sm" onClick={actions.createMaster}>
            <FileStack aria-hidden />
            {t('publishing.newMaster')}
          </Button>
        </div>
        {masters.length === 0 ? (
          <p className="text-[0.6875rem] text-muted-foreground">{t('publishing.mastersHint')}</p>
        ) : (
          <ul className="grid gap-0.5">
            {masters.map((master) => (
              <li key={master.id} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-current={master.id === activeId ? 'page' : undefined}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-start text-xs hover:bg-accent',
                    master.id === activeId && 'bg-accent font-medium',
                  )}
                  onClick={() => {
                    setActive(master.id);
                  }}
                >
                  <FileStack className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate" dir="auto">
                    {master.name}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  aria-label={t('editor.artboards.delete', { name: master.name })}
                  onClick={() => {
                    actions.deleteArtboard(master.id);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="w-32 border-t border-border pt-2">
        <NumberField
          key={`fp-${String(project.firstPageNumber)}`}
          id={`${id}-first`}
          label={t('publishing.firstPageNumber')}
          value={project.firstPageNumber}
          min={-9999}
          max={99_999}
          integer
          onCommit={actions.setFirstPageNumber}
        />
      </div>
      <p className="text-[0.6875rem] text-muted-foreground">{t('publishing.pageNumberHint')}</p>
    </div>
  );
}
