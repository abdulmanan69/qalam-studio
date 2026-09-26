import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';

import { getProject, listProjects } from './repository';
import type { Project } from './schema';

/** Live list of projects (newest first). `undefined` while loading. */
export function useProjects(): Project[] | undefined {
  return useLiveQuery(listProjects, []);
}

/**
 * Live single project. `undefined` while loading, `null` if it does not
 * exist (or was deleted while open).
 */
export function useProject(id: string | undefined): Project | null | undefined {
  return useLiveQuery(() => (id ? getProject(id) : Promise.resolve(null)), [id]);
}

/**
 * Image URL for sanitized SVG markup. A data: URL (rather than blob:) needs
 * no revocation, so it is safe under StrictMode double effects. Rendering
 * through <img> never executes scripts.
 */
export function useSvgDataUrl(svg: string | undefined): string | undefined {
  return useMemo(
    () => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined),
    [svg],
  );
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

/** Browser storage usage for this origin, if the API is available. */
export function useStorageEstimate(refreshKey?: unknown): StorageEstimate | null {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === 'undefined' || !('storage' in navigator)) return;
    navigator.storage
      .estimate()
      .then((result) => {
        if (!cancelled) setEstimate({ usage: result.usage ?? 0, quota: result.quota ?? 0 });
      })
      .catch(() => {
        if (!cancelled) setEstimate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);
  return estimate;
}
