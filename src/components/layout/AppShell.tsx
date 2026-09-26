import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { useUiStore } from '@/app/ui-store';
import { NewDesignDialog } from '@/features/projects/NewDesignDialog';
import { useProjectActions } from '@/features/projects/use-project-actions';
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
      <NewDesignDialog />
      <ShortcutsDialog />
      <AboutDialog />
      <ClearDataDialog />
    </div>
  );
}
