import type { FlowInput, FlowResult } from './flow';
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

/** Main thread → worker: which strings the font can draw completely (no missing glyphs). */
export interface CoverageRequestMessage extends FontRequest {
  type: 'coverage';
  strings: string[];
}

/** Main thread → worker: flow a story through its frames (fonts listed separately). */
export interface FlowRequestMessage extends FontRequest {
  type: 'flow';
  fonts: { key: string; url: string }[];
  input: FlowInput;
}

export type ShapingRequest =
  LayoutRequestMessage | AlternatesRequestMessage | CoverageRequestMessage | FlowRequestMessage;

/** Worker → main thread. */
export type ShapingResponse =
  | { id: number; ok: true; layout: TextLayout }
  | { id: number; ok: true; alternates: AlternateForm[] }
  | { id: number; ok: true; coverage: boolean[] }
  | { id: number; ok: true; flow: FlowResult }
  | { id: number; ok: false; error: string };
