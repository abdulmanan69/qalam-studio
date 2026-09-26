import type { AlternateForm, LayoutOptions, ShapeOptions, TextLayout } from './types';

interface FontRequest {
  id: number;
  /** Stable cache key for the font (the registry id). */
  fontKey: string;
  /** Absolute URL the worker fetches the font from on first use. */
  fontUrl: string;
  text: string;
}

/** Main thread → worker: lay out text. */
export interface LayoutRequestMessage extends FontRequest {
  type: 'layout';
  options: LayoutOptions;
}

/** Main thread → worker: list the alternate forms of one letter. */
export interface AlternatesRequestMessage extends FontRequest {
  type: 'alternates';
  letterIndex: number;
  options: ShapeOptions;
}

export type ShapingRequest = LayoutRequestMessage | AlternatesRequestMessage;

/** Worker → main thread. */
export type ShapingResponse =
  | { id: number; ok: true; layout: TextLayout }
  | { id: number; ok: true; alternates: AlternateForm[] }
  | { id: number; ok: false; error: string };
