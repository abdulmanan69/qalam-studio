import { z } from 'zod';

import { layerSchema, type Layer } from '@/features/projects/schema';

/**
 * Layer clipboard. Copies are kept in memory (always works, also between
 * projects in the same tab) and written to the system clipboard as JSON so
 * they can be pasted into another tab or window.
 */

export const CLIPBOARD_FORMAT = 'qalam-layers';

const payloadSchema = z.object({
  format: z.literal(CLIPBOARD_FORMAT),
  layers: z.array(layerSchema).min(1).max(500),
});

let memory: Layer[] = [];

export function serializeLayers(layers: readonly Layer[]): string {
  return JSON.stringify({ format: CLIPBOARD_FORMAT, layers });
}

export function parseLayers(text: string): Layer[] | null {
  try {
    const result = payloadSchema.safeParse(JSON.parse(text));
    return result.success ? result.data.layers : null;
  } catch {
    return null;
  }
}

export function copyLayers(layers: readonly Layer[]): void {
  memory = layers.map((l) => structuredClone(l));
  try {
    const clipboard = navigator.clipboard as Clipboard | undefined;
    void clipboard?.writeText(serializeLayers(layers)).catch(() => undefined);
  } catch {
    // The in-memory copy is enough.
  }
}

/** Layers to paste: the system clipboard if it holds Qalam layers, otherwise the in-memory copy. */
export async function readClipboardLayers(): Promise<Layer[]> {
  try {
    const clipboard = navigator.clipboard as Clipboard | undefined;
    const text = await clipboard?.readText();
    const parsed = text ? parseLayers(text) : null;
    if (parsed) return parsed;
  } catch {
    // Permission denied or unsupported: fall back to memory.
  }
  return memory.map((l) => structuredClone(l));
}

export function hasClipboardLayers(): boolean {
  return memory.length > 0;
}
