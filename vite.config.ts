/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages serves the site from `/<repo-name>/`. The deploy workflow sets
 * BASE_PATH to that value; local dev and preview default to `/`.
 */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // Offline support: the app shell, fonts and the shaping engine (wasm) are
    // precached, so the editor works without a network after the first visit.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Qalam Studio',
        short_name: 'Qalam',
        description:
          'Open-source calligraphy editor for Urdu, Arabic, Persian, Kurdish, Pashto and Sindhi. Works offline.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#3f5465',
        background_color: '#f3f4f6',
        categories: ['design', 'graphics', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf,otf,wasm,txt}'],
        // Calligraphy fonts and the HarfBuzz engine are larger than the 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // harfbuzzjs locates its .wasm via `new URL(…, import.meta.url)`; pre-bundling
    // would move the module away from the wasm file in dev.
    exclude: ['harfbuzzjs'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 15_000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
