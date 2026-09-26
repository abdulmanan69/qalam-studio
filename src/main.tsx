import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-arabic';
import '@/styles/globals.css';
import '@/i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

// Offline support (production builds only). The user decides when to reload
// into a new version, so an update never interrupts unsaved work.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('./pwa').then(({ registerServiceWorker }) => {
    registerServiceWorker();
  });
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
