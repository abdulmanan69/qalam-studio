/**
 * Shaping Web Worker: keeps HarfBuzz and parsed fonts off the main thread so
 * typing and canvas interaction never stall.
 *
 * The engine is imported dynamically: harfbuzzjs initializes its WebAssembly
 * with a top-level await, and a static import would delay registering the
 * message listener — messages posted meanwhile would be lost.
 */
import type { ShapingEngine } from './engine';
import type { ShapingRequest, ShapingResponse } from './protocol';

interface WorkerScope {
  postMessage(message: ShapingResponse): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<ShapingRequest>) => void): void;
}

const scope = self as unknown as WorkerScope;
const enginePromise: Promise<ShapingEngine> = import('./engine').then((module) => new module.ShapingEngine());
const loading = new Map<string, Promise<void>>();

function ensureFont(engine: ShapingEngine, fontKey: string, fontUrl: string): Promise<void> {
  if (engine.hasFont(fontKey)) return Promise.resolve();
  let pending = loading.get(fontKey);
  if (!pending) {
    pending = fetch(fontUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Font download failed (${response.status}): ${fontUrl}`);
        return response.arrayBuffer();
      })
      .then((bytes) => {
        engine.loadFont(fontKey, bytes);
      })
      .finally(() => {
        loading.delete(fontKey);
      });
    loading.set(fontKey, pending);
  }
  return pending;
}

async function handle(request: ShapingRequest): Promise<ShapingResponse> {
  try {
    const engine = await enginePromise;
    await ensureFont(engine, request.fontKey, request.fontUrl);
    const layout = engine.layout(request.fontKey, request.text, request.options);
    return { id: request.id, ok: true, layout };
  } catch (error) {
    return { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

scope.addEventListener('message', (event) => {
  void handle(event.data).then((response) => {
    scope.postMessage(response);
  });
});
