import { HardDrive, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStorageEstimate } from '@/features/projects/hooks';
import type { Project } from '@/features/projects/schema';
import { formatBytes } from '@/lib/utils';

type PersistState = 'unknown' | 'persisted' | 'best-effort' | 'unsupported';

/**
 * Tracks whether this origin's storage is "persistent" (exempt from the
 * browser's automatic eviction under storage pressure) and offers to request it.
 */
function persistApiSupported(): boolean {
  // Feature-detect: some browsers (and jsdom) lack the StorageManager API.
  const storage = (navigator as Partial<Navigator>).storage;
  return typeof storage?.persisted === 'function' && typeof storage.persist === 'function';
}

function usePersistentStorage(onDenied: () => void): [PersistState, () => Promise<void>] {
  const [state, setState] = useState<PersistState>(() => (persistApiSupported() ? 'unknown' : 'unsupported'));

  useEffect(() => {
    if (!persistApiSupported()) return;
    let cancelled = false;
    navigator.storage
      .persisted()
      .then((persisted) => {
        if (!cancelled) setState(persisted ? 'persisted' : 'best-effort');
      })
      .catch(() => {
        if (!cancelled) setState('unsupported');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const request = async () => {
    try {
      const granted = await navigator.storage.persist();
      setState(granted ? 'persisted' : 'best-effort');
      if (!granted) onDenied();
    } catch {
      setState('unsupported');
    }
  };

  return [state, request];
}

export function WorkspaceOverview({ projects }: { projects: Project[] | undefined }) {
  const { t, i18n } = useTranslation();
  const estimate = useStorageEstimate(projects?.length);
  const [persistState, requestPersist] = usePersistentStorage(() => {
    toast.info(t('dashboard.workspace.persistDenied'));
  });

  const ratio = estimate && estimate.quota > 0 ? estimate.usage / estimate.quota : 0;
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.workspace.title')}</CardTitle>
        <HardDrive className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">{t('dashboard.workspace.storage')}</span>
            <span className="text-xs tabular-nums">
              {estimate
                ? t('dashboard.workspace.storageOf', {
                    used: formatBytes(estimate.usage, i18n.language),
                    quota: formatBytes(estimate.quota, i18n.language),
                  })
                : '—'}
            </span>
          </div>
          <div
            role="meter"
            aria-label={t('dashboard.workspace.storage')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 1000) / 10}
            aria-valuetext={percent.format(ratio)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-tile-green transition-[width]"
              style={{ width: `${Math.max(ratio * 100, estimate && estimate.usage > 0 ? 1 : 0)}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-sunken p-3">
          {persistState === 'persisted' ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-tile-green" aria-hidden />
          ) : (
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-tile-terracotta" aria-hidden />
          )}
          <div className="grid gap-1.5">
            <p className="text-xs font-medium">{t(`dashboard.workspace.persist.${persistState}`)}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.workspace.persistHint')}</p>
            {persistState === 'best-effort' && (
              <Button
                size="sm"
                variant="outline"
                className="justify-self-start"
                onClick={() => void requestPersist()}
              >
                {t('dashboard.workspace.persistAction')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
