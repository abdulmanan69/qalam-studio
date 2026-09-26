import { describe, expect, it, vi } from 'vitest';

import { layoutCacheKey, ShapingClient, type LayoutRequest, type WorkerLike } from './client';
import type { ShapingRequest, ShapingResponse } from './protocol';
import type { TextLayout } from './types';

const LAYOUT: TextLayout = {
  width: 10,
  height: 5,
  fontSize: 5,
  ascent: 4,
  descent: 1,
  lineAdvance: 5,
  lines: [],
  glyphs: [],
  extendable: [],
};

class FakeWorker implements WorkerLike {
  readonly sent: ShapingRequest[] = [];
  terminated = false;
  private onMessage: ((event: MessageEvent<ShapingResponse>) => void) | undefined;
  private onError: ((event: ErrorEvent) => void) | undefined;

  postMessage(message: ShapingRequest): void {
    this.sent.push(message);
  }

  addEventListener(type: 'message' | 'error', listener: (event: never) => void): void {
    if (type === 'message') this.onMessage = listener as (event: MessageEvent<ShapingResponse>) => void;
    else this.onError = listener as (event: ErrorEvent) => void;
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(response: ShapingResponse): void {
    this.onMessage?.({ data: response } as MessageEvent<ShapingResponse>);
  }

  crash(message: string): void {
    this.onError?.({ message } as ErrorEvent);
  }
}

const request: LayoutRequest = {
  fontKey: 'amiri',
  fontUrl: 'https://example.test/fonts/amiri/Amiri-Regular.ttf',
  text: 'سلام',
  options: { language: 'ar', fontSize: 5 },
};

function setup() {
  const workers: FakeWorker[] = [];
  const factory = vi.fn(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  });
  return { client: new ShapingClient(factory, 2), workers, factory };
}

describe('ShapingClient', () => {
  it('sends a request and resolves with the layout', async () => {
    const { client, workers } = setup();
    const promise = client.layout(request);
    const worker = workers[0];
    expect(worker?.sent[0]).toMatchObject({ type: 'layout', fontKey: 'amiri', text: 'سلام' });
    worker?.reply({ id: worker.sent[0]?.id ?? 0, ok: true, layout: LAYOUT });
    await expect(promise).resolves.toEqual(LAYOUT);
    expect(client.peek(request)).toEqual(LAYOUT);
  });

  it('deduplicates concurrent requests and serves repeats from the cache', async () => {
    const { client, workers } = setup();
    const a = client.layout(request);
    const b = client.layout(request);
    expect(workers[0]?.sent).toHaveLength(1);
    workers[0]?.reply({ id: 1, ok: true, layout: LAYOUT });
    await Promise.all([a, b]);
    await client.layout(request);
    expect(workers[0]?.sent).toHaveLength(1);
  });

  it('evicts the least recently used layouts', async () => {
    const { client, workers } = setup();
    for (const text of ['a', 'b', 'c']) {
      const p = client.layout({ ...request, text });
      const sent = workers[0]?.sent.at(-1);
      workers[0]?.reply({ id: sent?.id ?? 0, ok: true, layout: LAYOUT });
      await p;
    }
    expect(client.peek({ ...request, text: 'a' })).toBeUndefined();
    expect(client.peek({ ...request, text: 'c' })).toEqual(LAYOUT);
  });

  it('rejects with the worker error message', async () => {
    const { client, workers } = setup();
    const promise = client.layout(request);
    workers[0]?.reply({ id: 1, ok: false, error: 'Font download failed (404)' });
    await expect(promise).rejects.toThrow('Font download failed (404)');
  });

  it('fails pending requests and starts a fresh worker after a crash', async () => {
    const { client, workers, factory } = setup();
    const promise = client.layout(request);
    workers[0]?.crash('boom');
    await expect(promise).rejects.toThrow('boom');
    expect(workers[0]?.terminated).toBe(true);
    void client.layout({ ...request, text: 'x' }).catch(() => undefined);
    expect(factory).toHaveBeenCalledTimes(2);
    client.dispose();
  });

  it('times out requests the worker never answers', async () => {
    vi.useFakeTimers();
    try {
      const client = new ShapingClient(() => new FakeWorker(), 8, 1000);
      const promise = client.layout(request);
      vi.advanceTimersByTime(1001);
      await expect(promise).rejects.toThrow('timed out');
    } finally {
      vi.useRealTimers();
    }
  });

  it('builds cache keys independent of option and feature order', () => {
    const a = layoutCacheKey({
      ...request,
      options: { fontSize: 5, language: 'ar', features: { kern: 1, liga: 0 } },
    });
    const b = layoutCacheKey({
      ...request,
      options: { language: 'ar', fontSize: 5, features: { liga: 0, kern: 1 } },
    });
    expect(a).toBe(b);
  });
});
