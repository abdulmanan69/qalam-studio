import { RotateCcw } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TextRun } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from './NumberField';
import type { EditorActions } from './use-editor-actions';

type Spacing = NonNullable<TextRun['spacing']>;

const NATURAL: Spacing = { letter: 0, word: 0, optical: false };

const PRESETS: readonly { id: 'tight' | 'natural' | 'airy'; spacing: Spacing }[] = [
  { id: 'tight', spacing: { letter: -0.05, word: -0.15, optical: true } },
  { id: 'natural', spacing: { letter: 0, word: 0, optical: true } },
  { id: 'airy', spacing: { letter: 0.08, word: 0.25, optical: true } },
];

/**
 * Spacing tuner: letter and word spacing, and automatic (optical) spacing
 * that evens out the gaps between unconnected letters and words — tuned for
 * Nastaliq, useful for every script. Connected letters are never separated.
 */
export function SpacingCard({ run, actions }: { run: TextRun; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const spacing = run.spacing ?? NATURAL;
  const set = (patch: Partial<Spacing>) => {
    const next = { ...spacing, ...patch };
    actions.patchLayer(run.id, (layer) => {
      if (layer.kind !== 'text') return;
      if (next.letter === 0 && next.word === 0 && !next.optical) delete layer.spacing;
      else layer.spacing = next;
    });
  };
  const same = (a: Spacing, b: Spacing) =>
    a.letter === b.letter && a.word === b.word && a.optical === b.optical;

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('spacing.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('spacing.presets')}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={same(spacing, preset.spacing)}
              className={cn(
                'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                same(spacing, preset.spacing) && 'border-ring bg-accent font-medium',
              )}
              onClick={() => {
                set(preset.spacing);
              }}
            >
              {t(`spacing.preset_${preset.id}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-optical`}>{t('spacing.optical')}</Label>
          <Switch
            id={`${id}-optical`}
            checked={spacing.optical}
            onCheckedChange={(optical) => {
              set({ optical });
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            key={`ls-${String(spacing.letter)}`}
            id={`${id}-letter`}
            label={t('spacing.letter')}
            value={spacing.letter}
            min={-1}
            max={3}
            suffix="em"
            onCommit={(letter) => {
              set({ letter });
            }}
          />
          <NumberField
            key={`ws-${String(spacing.word)}`}
            id={`${id}-word`}
            label={t('spacing.word')}
            value={spacing.word}
            min={-1}
            max={5}
            suffix="em"
            onCommit={(word) => {
              set({ word });
            }}
          />
        </div>
        <p className="text-[0.6875rem] text-muted-foreground">{t('spacing.hint')}</p>
        {!same(spacing, NATURAL) && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start text-muted-foreground"
            onClick={() => {
              set(NATURAL);
            }}
          >
            <RotateCcw aria-hidden />
            {t('spacing.reset')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
