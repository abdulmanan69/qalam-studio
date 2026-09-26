import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import '@/i18n';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Route chunks are lazy-loaded; under a fully parallel run on slow CI machines
// the default 1s wait for findBy* queries is too tight.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

// Browser polyfills — skipped for tests that opt into the Node environment
// (e.g. the shaping engine).
if (typeof window !== 'undefined') {
  // jsdom does not implement matchMedia; the theme hooks need it.
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      })),
    });
  }

  // Radix UI primitives rely on these browser APIs that jsdom lacks.
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => undefined;
  }

  // jsdom has no 2D canvas; report "unsupported" quietly instead of logging
  // "not implemented" errors. The editor shows its no-canvas fallback.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
