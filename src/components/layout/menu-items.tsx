import { BookOpen, Bug, GraduationCap, Info, Keyboard, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { usePreferencesStore, type ThemePreference } from '@/app/preferences-store';
import { useUiStore } from '@/app/ui-store';
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { DOCS_URL, ISSUES_URL, USER_GUIDE_URL } from '@/lib/config';
import { shortcutText } from '@/lib/hotkeys';

import { shortcutCombo } from './shortcuts';

const THEME_OPTIONS: readonly { value: ThemePreference; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

function isThemePreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Light / Dark / System radio items, shared by the Settings and workspace menus. */
export function ThemeRadioItems() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  return (
    <DropdownMenuRadioGroup
      value={theme}
      onValueChange={(value) => {
        if (isThemePreference(value)) setTheme(value);
      }}
    >
      {THEME_OPTIONS.map(({ value, icon: Icon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon aria-hidden />
          {t(`settings.theme.${value}`)}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** Help menu contents, shared by the top bar and the main navigation. */
export function HelpMenuItems() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  return (
    <>
      <DropdownMenuItem
        onSelect={() => {
          openDialog('shortcuts');
        }}
      >
        <Keyboard aria-hidden />
        {t('help.shortcuts')}
        <DropdownMenuShortcut>{shortcutText(shortcutCombo('showShortcuts'))}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href={USER_GUIDE_URL} target="_blank" rel="noreferrer">
          <GraduationCap aria-hidden />
          {t('help.userGuide')}
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href={DOCS_URL} target="_blank" rel="noreferrer">
          <BookOpen aria-hidden />
          {t('help.documentation')}
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          <Bug aria-hidden />
          {t('help.reportIssue')}
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => {
          openDialog('about');
        }}
      >
        <Info aria-hidden />
        {t('help.about')}
      </DropdownMenuItem>
    </>
  );
}
