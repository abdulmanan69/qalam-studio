import { useEffect, useMemo, useState } from 'react';

import { fontFileUrl, resolveFont } from '@/features/fonts/registry';
import type { TextRun } from '@/features/projects/schema';
import {
  getShapingClient,
  layoutCacheKey,
  type AlternatesRequest,
  type LayoutRequest,
  type ShapingClient,
} from '@/features/shaping/client';
import type { TextLayout } from '@/features/shaping/types';

import type { KashidaPreview } from '../editor-store';

export const SHAPING_UNAVAILABLE = 'unavailable';

export type LayoutSource = Pick<
  TextRun,
  'fontId' | 'text' | 'language' | 'fontSize' | 'lineHeight' | 'align' | 'kashida' | 'features'
>;

/** The shaping request for a text run (font resolved through the registry). */
export function layoutRequestFor(
  run: LayoutSource,
  kashidaOverride?: { letter: number; value: number },
): LayoutRequest {
  const font = resolveFont(run.fontId);
  const kashida = kashidaOverride
    ? { ...run.kashida, [String(kashidaOverride.letter)]: kashidaOverride.value }
    : run.kashida;
  return {
    fontKey: font.id,
    fontUrl: fontFileUrl(font),
    text: run.text,
    options: {
      language: run.language,
      fontSize: run.fontSize,
      lineHeight: run.lineHeight,
      align: run.align,
      features: font.features,
      rangeFeatures: run.features,
      kashida: Object.fromEntries(Object.entries(kashida).filter(([, v]) => v > 0)),
      kashidaMode: font.kashida,
    },
  };
}

/** Request for the alternate forms of one letter of a run. */
export function alternatesRequestFor(run: LayoutSource, letterIndex: number): AlternatesRequest {
  const font = resolveFont(run.fontId);
  return {
    fontKey: font.id,
    fontUrl: fontFileUrl(font),
    text: run.text,
    letterIndex,
    options: { language: run.language, features: font.features, rangeFeatures: run.features },
  };
}

/** The app-wide shaping client, or null where Web Workers are unavailable. */
export function tryGetShapingClient(): ShapingClient | null {
  try {
    return getShapingClient();
  } catch {
    return null;
  }
}

export interface TextLayoutsResult {
  /** Latest available layout per run id (may lag behind a pending edit by a moment). */
  layouts: ReadonlyMap<string, TextLayout>;
  /** Error message per run id, or SHAPING_UNAVAILABLE without Web Worker support. */
  errors: ReadonlyMap<string, string>;
}

/**
 * Shape text runs in the worker. Cached layouts are available synchronously;
 * while a run is re-shaped (after an edit) its previous layout stays visible,
 * so the canvas never flickers. A kashida being dragged on the canvas is
 * applied as a preview.
 */
export function useTextLayouts(
  runs: readonly TextRun[],
  preview: KashidaPreview | null = null,
): TextLayoutsResult {
  const client = useMemo(() => tryGetShapingClient(), []);
  const [resolved, setResolved] = useState<Record<string, TextLayout>>({});
  const [failed, setFailed] = useState<Record<string, { key: string; message: string }>>({});

  const requests = useMemo(
    () =>
      runs.map((run) => ({
        id: run.id,
        request: layoutRequestFor(
          run,
          preview?.layerId === run.id ? { letter: preview.letter, value: preview.value } : undefined,
        ),
      })),
    [runs, preview],
  );

  useEffect(() => {
    if (!client) return;
    let active = true;
    for (const { id, request } of requests) {
      if (client.peek(request)) continue;
      const key = layoutCacheKey(request);
      client.layout(request).then(
        (layout) => {
          if (!active) return;
          setResolved((previous) => ({ ...previous, [id]: layout }));
          setFailed((previous) =>
            id in previous
              ? Object.fromEntries(Object.entries(previous).filter(([k]) => k !== id))
              : previous,
          );
        },
        (error: unknown) => {
          if (!active) return;
          const message = error instanceof Error ? error.message : String(error);
          setFailed((previous) => ({ ...previous, [id]: { key, message } }));
        },
      );
    }
    return () => {
      active = false;
    };
  }, [client, requests]);

  return useMemo(() => {
    const layouts = new Map<string, TextLayout>();
    const errors = new Map<string, string>();
    for (const { id, request } of requests) {
      if (!client) {
        errors.set(id, SHAPING_UNAVAILABLE);
        continue;
      }
      const layout = client.peek(request) ?? resolved[id];
      if (layout) layouts.set(id, layout);
      const failure = failed[id];
      if (failure?.key === layoutCacheKey(request)) errors.set(id, failure.message);
    }
    return { layouts, errors };
  }, [client, requests, resolved, failed]);
}
