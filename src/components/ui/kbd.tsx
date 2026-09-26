import * as React from 'react';

import { cn } from '@/lib/utils';

/** Keyboard key hint, e.g. <Kbd>Ctrl</Kbd>. */
function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[0.6875rem] leading-none font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
