import { Kbd } from '@/components/ui/kbd';
import { formatCombo } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

/** Renders a combo like "mod+o" as <Kbd>Ctrl</Kbd><Kbd>O</Kbd>. */
export function ShortcutKeys({ combo, className }: { combo: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} dir="ltr">
      {formatCombo(combo).map((token) => (
        <Kbd key={token}>{token}</Kbd>
      ))}
    </span>
  );
}
