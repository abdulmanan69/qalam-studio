import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useEditorStore } from './editor-store';
import type { EditorActions } from './use-editor-actions';

const STEPS = [0.25, 1, 5, 10] as const;

/**
 * Position adjuster: move the selection — a whole text, a word, a letter or
 * single dots and marks — in small steps with buttons (or the arrow keys).
 */
export function PositionPad({ actions }: { actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const [step, setStep] = useState<number>(1);
  const editing = useEditorStore((s) => s.editLayerId !== null && s.editLevel !== 'object');
  const hasUnits = useEditorStore((s) => s.selectedUnits.length > 0);
  const hasLayers = useEditorStore((s) => s.selectedIds.length > 0);
  const lockMarks = useEditorStore((s) => s.lockMarks);
  const setLockMarks = useEditorStore((s) => s.setLockMarks);
  const enabled = editing ? hasUnits : hasLayers;

  const move = (dx: number, dy: number) => () => {
    actions.nudge(dx * step, dy * step);
  };
  const arrow = (label: string, Icon: typeof ArrowUp, dx: number, dy: number, className: string) => (
    <Button
      variant="outline"
      size="icon-sm"
      className={className}
      aria-label={label}
      disabled={!enabled}
      onClick={move(dx, dy)}
    >
      <Icon aria-hidden />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('position.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-4">
          {/* Directions are physical (screen) directions, also in right-to-left interfaces. */}
          <div
            className="grid grid-cols-3 grid-rows-3 gap-1"
            dir="ltr"
            role="group"
            aria-label={t('position.pad')}
          >
            {arrow(t('position.up'), ArrowUp, 0, -1, 'col-start-2 row-start-1')}
            {arrow(t('position.left'), ArrowLeft, -1, 0, 'col-start-1 row-start-2')}
            {arrow(t('position.right'), ArrowRight, 1, 0, 'col-start-3 row-start-2')}
            {arrow(t('position.down'), ArrowDown, 0, 1, 'col-start-2 row-start-3')}
          </div>
          <div className="grid gap-1">
            <span id={`${id}-step`} className="text-[0.6875rem] font-medium text-muted-foreground">
              {t('position.step')}
            </span>
            <div role="radiogroup" aria-labelledby={`${id}-step`} className="grid grid-cols-2 gap-1">
              {STEPS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={step === value}
                  className={cn(
                    'h-7 rounded-md border border-input px-2 text-[0.6875rem] tabular-nums hover:bg-accent',
                    step === value && 'border-ring bg-accent font-medium',
                  )}
                  onClick={() => {
                    setStep(value);
                  }}
                >
                  {value === 0.25 ? '¼' : value} px
                </button>
              ))}
            </div>
          </div>
        </div>

        {editing && (
          <div className="grid gap-1.5">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={lockMarks}
                onChange={(e) => {
                  setLockMarks(e.target.checked);
                }}
                className="size-4 accent-primary"
              />
              {t('position.withMarks')}
            </label>
            <div className="flex flex-wrap gap-1">
              {(['dot', 'mark', 'body'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  size="sm"
                  disabled={!hasUnits}
                  onClick={() => {
                    actions.selectPartsOfKind(kind);
                  }}
                >
                  {t(`position.only_${kind}`)}
                </Button>
              ))}
            </div>
          </div>
        )}
        <p className="text-[0.6875rem] text-muted-foreground">{t('position.hint')}</p>
      </CardContent>
    </Card>
  );
}
