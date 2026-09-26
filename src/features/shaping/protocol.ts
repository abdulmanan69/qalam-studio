import type { LayoutOptions, TextLayout } from './types';

/** Main thread → worker. */
export interface LayoutRequestMessage {
  id: number;
  type: 'layout';
  /** Stable cache key for the font (the registry id). */
  fontKey: string;
  /** Absolute URL the worker fetches the font from on first use. */
  fontUrl: string;
  text: string;
  options: LayoutOptions;
}

export type ShapingRequest = LayoutRequestMessage;

/** Worker → main thread. */
export type ShapingResponse =
  { id: number; ok: true; layout: TextLayout } | { id: number; ok: false; error: string };
