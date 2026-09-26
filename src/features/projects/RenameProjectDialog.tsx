import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { MAX_NAME_LENGTH, type Project } from './schema';

interface RenameProjectDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onRename: (project: Project, name: string) => Promise<void>;
}

function RenameForm({
  project,
  onClose,
  onRename,
}: {
  project: Project;
  onClose: () => void;
  onRename: RenameProjectDialogProps['onRename'];
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [name, setName] = useState(project.name);
  const trimmed = name.trim();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed) return;
    await onRename(project, trimmed);
    onClose();
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t('projects.renameTitle')}</DialogTitle>
        <DialogDescription>{t('projects.renameDescription')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor={inputId}>{t('newDesign.name')}</Label>
        <Input
          id={inputId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          dir="auto"
          onChange={(e) => {
            setName(e.target.value);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- first field of a modal the user just opened
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!trimmed}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenameProjectDialog({ project, onOpenChange, onRename }: RenameProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')}>
        {project && (
          <RenameForm
            key={project.id}
            project={project}
            onRename={onRename}
            onClose={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
