import { useEffect, type ReactNode } from 'react';

import { AppProviders } from '../src/app/providers';
import i18n, { getDirection } from '../src/i18n';

/** Wraps stories in the app providers with the toolbar's language (and direction) and theme. */
export function AppContext({
  locale,
  theme,
  children,
}: {
  locale: string;
  theme: string;
  children: ReactNode;
}) {
  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [locale, theme]);
  return (
    <AppProviders>
      <div dir={getDirection(locale)} className="bg-background p-4 text-foreground">
        {children}
      </div>
    </AppProviders>
  );
}
