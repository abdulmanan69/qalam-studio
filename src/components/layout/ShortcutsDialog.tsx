import { useTranslation } from 'react-i18next';

import { useAppDialog } from '@/app/ui-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { ShortcutKeys } from './ShortcutLabel';
import { SHORTCUT_GROUPS, SHORTCUTS } from './shortcuts';

export function ShortcutsDialog() {
  const { t } = useTranslation();
  const { open, onOpenChange } = useAppDialog('shortcuts');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group} aria-labelledby={`shortcut-group-${group}`}>
              <h3
                id={`shortcut-group-${group}`}
                className="mb-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {t(`shortcuts.groups.${group}`)}
              </h3>
              <dl className="divide-y divide-border rounded-md border border-border">
                {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <dt>{t(`shortcuts.items.${shortcut.id}`)}</dt>
                    <dd>
                      <ShortcutKeys combo={shortcut.combo} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
