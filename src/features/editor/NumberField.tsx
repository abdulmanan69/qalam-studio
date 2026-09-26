import { useState, type KeyboardEvent } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  integer?: boolean;
  suffix?: string;
  onCommit: (value: number) => void;
}

function format(value: number, integer: boolean): string {
  return integer ? String(Math.round(value)) : String(Math.round(value * 100) / 100);
}

/**
 * Numeric property input. Commits on Enter/blur, reverts on Escape or
 * invalid input. Render with `key={value}` so external changes reset the draft.
 */
export function NumberField({
  id,
  label,
  value,
  min,
  max,
  integer = false,
  suffix,
  onCommit,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => format(value, integer));

  const parsed = Number(draft.trim().replace(',', '.'));
  const valid = draft.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max;

  const commit = () => {
    if (!valid) {
      setDraft(format(value, integer));
      return;
    }
    const next = integer ? Math.round(parsed) : parsed;
    if (next !== value) onCommit(next);
    setDraft(format(next, integer));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      setDraft(format(value, integer));
      event.currentTarget.blur();
    }
  };

  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-[0.6875rem] text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={draft}
          aria-invalid={!valid}
          className="h-7 pe-7 tabular-nums"
          dir="ltr"
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        {suffix && (
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[0.6875rem] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
