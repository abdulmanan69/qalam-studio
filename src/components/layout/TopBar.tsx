import { CircleHelp, HardDrive, Info, Keyboard, Moon, Sun, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { usePreferencesStore, useResolvedTheme } from '@/app/preferences-store';
import { useUiStore } from '@/app/ui-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';

import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { HelpMenuItems, ThemeRadioItems } from './menu-items';

function ThemeToggle() {
  const { t } = useTranslation();
  const resolved = useResolvedTheme();
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const label = resolved === 'dark' ? t('search.lightMode') : t('search.darkMode');
  return (
    <SimpleTooltip label={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={() => {
          setTheme(resolved === 'dark' ? 'light' : 'dark');
        }}
      >
        {resolved === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </Button>
    </SimpleTooltip>
  );
}

/**
 * There are no user accounts (everything is local), so the "profile" slot
 * describes the local workspace and hosts per-browser settings.
 */
function WorkspaceMenu() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={t('topBar.workspaceMenu')}>
          <span
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden
          >
            <HardDrive className="size-3.5" />
          </span>
          <span className="hidden text-start leading-tight md:block">
            <span className="block text-[0.8125rem] font-medium">{t('topBar.workspace')}</span>
            <span className="block text-[0.6875rem] font-normal text-muted-foreground">
              {t('topBar.workspaceHint')}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>{t('settings.appearance')}</DropdownMenuLabel>
        <ThemeRadioItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            openDialog('shortcuts');
          }}
        >
          <Keyboard aria-hidden />
          {t('help.shortcuts')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            openDialog('about');
          }}
        >
          <Info aria-hidden />
          {t('help.about')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            openDialog('clearData');
          }}
        >
          <Trash2 aria-hidden />
          {t('settings.clearData')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  const { t } = useTranslation();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
      <Link to="/" className="flex shrink-0 items-center gap-2 rounded-sm" aria-label={t('topBar.home')}>
        <Logo />
        <span className="hidden text-[0.9375rem] leading-none font-semibold tracking-tight sm:inline">
          Qalam <span className="font-normal text-muted-foreground">Studio</span>
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <GlobalSearch className="w-full max-w-md" />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="px-2" aria-label={t('nav.help')}>
              <CircleHelp aria-hidden />
              <span className="hidden lg:inline">{t('nav.help')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <HelpMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
        <WorkspaceMenu />
      </div>
    </header>
  );
}
