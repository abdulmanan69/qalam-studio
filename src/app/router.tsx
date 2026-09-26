import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { PageLoader } from '@/components/layout/PageLoader';

// Route-level code splitting: each page is its own chunk.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const EditorPage = lazy(() =>
  import('@/features/editor/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const TemplatesPage = lazy(() =>
  import('@/features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const NotFoundPage = lazy(() => import('@/app/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/** Route table. Exported separately so tests can mount it inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Lazy>
              <DashboardPage />
            </Lazy>
          }
        />
        <Route
          path="editor/:projectId"
          element={
            <Lazy>
              <EditorPage />
            </Lazy>
          }
        />
        <Route
          path="templates"
          element={
            <Lazy>
              <TemplatesPage />
            </Lazy>
          }
        />
        <Route
          path="*"
          element={
            <Lazy>
              <NotFoundPage />
            </Lazy>
          }
        />
      </Route>
    </Routes>
  );
}

/**
 * HashRouter keeps deep links working on GitHub Pages, which has no
 * server-side rewrite to index.html.
 */
export function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
