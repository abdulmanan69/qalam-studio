import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

import { useResolvedTheme } from '@/app/preferences-store';

/** App-themed toast container. Place once near the root. */
function Toaster(props: ToasterProps) {
  const resolvedTheme = useResolvedTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-md! border! border-border! bg-popover! text-popover-foreground! shadow-popover! text-[0.8125rem]!',
          description: 'text-muted-foreground!',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
