import { useEffect, type ReactNode } from 'react';

import { useResolvedTheme } from '@/app/preferences-store';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/** Applies the resolved theme class to <html> so CSS tokens switch. */
function ThemeSync() {
  const theme = useResolvedTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#243240' : '#3f5465');
  }, [theme]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      <ThemeSync />
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
