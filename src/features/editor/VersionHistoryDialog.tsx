import { useLiveQuery } from 'dexie-react-hooks';
import { History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Project } from '@/features/projects/schema';
import { deleteVersion, listVersions, saveVersion, versionProject } from '@/features/projects/versions';
import { formatDateTime } from '@/lib/time';

import { useDocumentStore } from './document-store';
import { useEditorStore } from './editor-store';

function HistoryBody({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [label, setLabel] = useState('');
  const versions = useLiveQuery(() => listVersions(project.id), [project.id]);
  const setOpen = useEditorStore((s) => s.setHistoryDialogOpen);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = label.replace(/\s+/g, ' ').trim().slice(0, 120);
    await saveVersion(project, 'manual', name || null);
    setLabel('');
    toast.success(t('editor.history.saved'));
  };

  const restore = (versionId: string) => {
    const version = versions?.find((v) => v.id === versionId);
    const snapshot = version ? versionProject(version) : null;
    if (!snapshot || !useDocumentStore.getState().replace(snapshot)) {
      toast.error(t('editor.history.restoreFailed'));
      return;
    }
    useEditorStore.getState().select(null);
    toast.success(t('editor.history.restored'), { description: t('editor.history.undoHint') });
    setOpen(false);
  };

  return (
    <div className="grid gap-4">
      <form onSubmit={(e) => void onSave(e)} className="flex items-end gap-2">
        <div className="grid flex-1 gap-1">
          <label htmlFor={`${id}-label`} className="text-xs font-medium">
            {t('editor.history.labelField')}
          </label>
          <Input
            id={`${id}-label`}
            value={label}
            maxLength={120}
            placeholder={t('editor.history.labelPlaceholder')}
            onChange={(e) => {
              setLabel(e.target.value);
            }}
          />
        </div>
        <Button type="submit">
          <Save aria-hidden />
          {t('editor.history.save')}
        </Button>
      </form>

      {versions === undefined ? (
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('editor.history.empty')}</p>
      ) : (
        <ul className="grid max-h-80 gap-1 overflow-y-auto" aria-label={t('editor.history.list')}>
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium" dir="auto">
                  {version.label ??
                    (version.kind === 'auto' ? t('editor.history.auto') : t('editor.history.manual'))}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {formatDateTime(version.createdAt, i18n.language)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  restore(version.id);
                }}
              >
                <RotateCcw aria-hidden />
                {t('editor.history.restore')}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('editor.history.delete')}
                onClick={() => void deleteVersion(version.id)}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Named and automatic snapshots of the project, stored in this browser. */
export function VersionHistoryDialog({ project }: { project: Project }) {
  const { t } = useTranslation();
  const open = useEditorStore((s) => s.historyDialogOpen);
  const setOpen = useEditorStore((s) => s.setHistoryDialogOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editor.history.title')}</DialogTitle>
          <DialogDescription>{t('editor.history.description')}</DialogDescription>
        </DialogHeader>
        {open && <HistoryBody project={project} />}
      </DialogContent>
    </Dialog>
  );
}
