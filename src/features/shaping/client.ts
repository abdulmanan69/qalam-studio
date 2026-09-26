import type { ShapingRequest, ShapingResponse } from './protocol';
import type { LayoutOptions, TextLayout } from './types';

export interface LayoutRequest {
  fontKey: string;
  fontUrl: string;
  text: string;
  options: LayoutOptions;
}

/** The subset of the Worker API the client uses (lets tests inject a fake). */
export interface WorkerLike {
  postMessage(message: ShapingRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<ShapingResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  terminate(): void;
}

interface Pending {
  resolve: (layout: TextLayout) => void;
  reject: (error: Error) => void;
}

/** Deterministic cache key: property and feature order do not matter. */
export function layoutCacheKey(request: LayoutRequest): string {
  const { features, ...rest } = request.options;
  const sortedFeatures = Object.entries(features ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const optionEntries = Object.entries(rest).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([request.fontKey, request.text, optionEntries, sortedFeatures]);
}

/**
 * Promise-based client for the shaping worker, with an LRU cache so moving
 * or restyling text never re-shapes it.
 */
export class ShapingClient {
  private worker: WorkerLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly inflight = new Map<string, Promise<TextLayout>>();
  private readonly cache = new Map<string, TextLayout>();

  constructor(
    private readonly createWorker: () => WorkerLike,
    private readonly cacheSize = 256,
    /** A request that gets no answer (e.g. a stuck worker) fails instead of hanging the UI. */
    private readonly timeoutMs = 30_000,
  ) {}

  /** Synchronous cache lookup, so already-shaped text renders without waiting a frame. */
  peek(request: LayoutRequest): TextLayout | undefined {
    return this.cache.get(layoutCacheKey(request));
  }

  layout(request: LayoutRequest): Promise<TextLayout> {
    const key = layoutCacheKey(request);
    const cached = this.cache.get(key);
    if (cached) {
      // Refresh recency.
      this.cache.delete(key);
      this.cache.set(key, cached);
      return Promise.resolve(cached);
    }
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = new Promise<TextLayout>((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error('Text shaping timed out'));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: (layout) => {
          clearTimeout(timer);
          resolve(layout);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.getWorker().postMessage({ id, type: 'layout', ...request });
    })
      .then((layout) => {
        this.remember(key, layout);
        return layout;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, promise);
    return promise;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.failAll(new Error('Shaping client disposed'));
  }

  private remember(key: string, layout: TextLayout): void {
    this.cache.set(key, layout);
    while (this.cache.size > this.cacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private getWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const worker = this.createWorker();
    worker.addEventListener('message', (event: MessageEvent<ShapingResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.ok) pending.resolve(response.layout);
      else pending.reject(new Error(response.error));
    });
    worker.addEventListener('error', (event: ErrorEvent) => {
      // A crashed worker is replaced on the next request.
      this.worker = null;
      worker.terminate();
      this.failAll(new Error(event.message || 'Shaping worker failed'));
    });
    this.worker = worker;
    return worker;
  }
}

let shared: ShapingClient | null = null;

/** The app-wide client backed by a module Web Worker. */
export function getShapingClient(): ShapingClient {
  if (!shared) {
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not available in this environment');
    }
    shared = new ShapingClient(
      () =>
        new Worker(new URL('./shaping.worker.ts', import.meta.url), {
          type: 'module',
          name: 'qalam-shaping',
        }),
    );
  }
  return shared;
}
