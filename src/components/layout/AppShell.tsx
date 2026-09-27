import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { NewDesignDialog } from '@/features/projects/NewDesignDialog';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { AUTHOR_HANDLE, AUTHOR_URL } from '@/lib/config';
import { useHotkeys } from '@/lib/use-hotkeys';

import { AboutDialog } from './AboutDialog';
import { ClearDataDialog } from './ClearDataDialog';
import { MainNav } from './MainNav';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { GLOBAL_SEARCH_INPUT_ID, shortcutCombo } from './shortcuts';
import { ShortcutsDialog } from './ShortcutsDialog';
import { TopBar } from './TopBar';

const MAIN_ID = 'main-content';

function useGlobalShortcuts() {
  const openDialog = useUiStore((s) => s.openDialog);
  const dialogOpen = useUiStore((s) => s.dialog !== null);
  const actions = useProjectActions();

  useHotkeys([
    {
      combo: shortcutCombo('focusSearch'),
      handler: () => document.getElementById(GLOBAL_SEARCH_INPUT_ID)?.focus(),
      enabled: !dialogOpen,
    },
    {
      combo: shortcutCombo('showShortcuts'),
      handler: () => {
        openDialog('shortcuts');
      },
    },
    {
      combo: shortcutCombo('newDesign'),
      handler: () => {
        openDialog('newDesign');
      },
      enabled: !dialogOpen,
    },
    {
      combo: shortcutCombo('openProject'),
      handler: () => void actions.openProjectFile(),
      enabled: !dialogOpen,
    },
    {
      combo: shortcutCombo('importSvg'),
      handler: () => void actions.importSvgFile(),
      enabled: !dialogOpen,
    },
  ]);
}

/** Application frame: top bar, main navigation, routed page, global dialogs. */
export function AppShell() {
  const { t } = useTranslation();
  useGlobalShortcuts();

  return (
    <div className="flex h-dvh flex-col">
      {/* In-page skip link. Uses focus() instead of a #fragment, which HashRouter would treat as a route. */}
      <a
        href={`#${MAIN_ID}`}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(MAIN_ID)?.focus();
        }}
        className="sr-only z-[100] rounded-md bg-card px-3 py-2 font-medium text-foreground shadow-popover focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('shell.skipToContent')}
      </a>
      <TopBar />
      <MainNav />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-auto focus:outline-none"
      >
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <footer className="flex h-7 shrink-0 items-center justify-center gap-1.5 border-t border-border bg-card px-4 text-[0.6875rem] text-muted-foreground">
        <span>{t('shell.developedBy')}</span>
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="inline-flex items-center gap-1 font-medium text-foreground hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
          </svg>
          {AUTHOR_HANDLE}
        </a>
      </footer>
      <NewDesignDialog />
      <ShortcutsDialog />
      <AboutDialog />
      <ClearDataDialog />
    </div>
  );
}
