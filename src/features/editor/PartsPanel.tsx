import { EyeOff, Eye, Link2, Link2Off, RotateCcw } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MAX_KASHIDA_EM, PART_KINDS, type TextRun } from '@/features/projects/schema';
import type { AlternateForm, TextLayout } from '@/features/shaping/types';
import { cn } from '@/lib/utils';

import { alternatesRequestFor, tryGetShapingClient } from './canvas/use-text-layouts';
import { useEditorStore, type EditLevel } from './editor-store';
import { buildUnits, resolveParts } from './units';
import type { EditorActions } from './use-editor-actions';

const LEVELS: readonly EditLevel[] = ['object', 'word', 'letter', 'part'];

function KashidaControl({ run, letter, actions }: { run: TextRun; letter: number; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const value = run.kashida[String(letter)] ?? 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span id={id} className="text-xs font-medium">
          {t('editor.parts.kashida')}
        </span>
        <span className="text-[0.6875rem] text-muted-foreground tabular-nums">
          {t('editor.parts.kashidaValue', { value: value.toFixed(2) })}
        </span>
      </div>
      <Slider
        key={value}
        aria-labelledby={id}
        thumbLabel={t('editor.parts.kashida')}
        min={0}
        max={Math.min(MAX_KASHIDA_EM, 4)}
        step={0.05}
        defaultValue={[value]}
        onValueCommit={([v]) => {
          actions.setKashida(run.id, letter, v ?? 0);
        }}
      />
    </div>
  );
}

function AlternatesPicker({
  run,
  letter,
  actions,
}: {
  run: TextRun;
  letter: number;
  actions: EditorActions;
}) {
  const { t } = useTranslation();
  const [forms, setForms] = useState<{ key: string; forms: AlternateForm[] } | null>(null);
  const client = useMemo(() => tryGetShapingClient(), []);
  const key = `${run.fontId}|${run.language}|${run.text}|${String(letter)}|${JSON.stringify(
    run.features.filter((f) => f.start !== letter),
  )}`;

  useEffect(() => {
    if (!client) return;
    let active = true;
    client
      .alternates(
        alternatesRequestFor({ ...run, features: run.features.filter((f) => f.start !== letter) }, letter),
      )
      .then(
        (result) => {
          if (active) setForms({ key, forms: result });
        },
        () => {
          if (active) setForms({ key, forms: [] });
        },
      );
    return () => {
      active = false;
    };
    // `key` captures everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  const current = run.features.find((f) => f.start === letter);
  const loading = forms?.key !== key;
  const list = forms && !loading ? forms.forms : [];

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium">{t('editor.parts.alternates')}</span>
      {loading ? (
        <p className="text-[0.6875rem] text-muted-foreground">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <p className="text-[0.6875rem] text-muted-foreground">{t('editor.parts.noAlternates')}</p>
      ) : (
        <ul className="grid grid-cols-4 gap-1">
          <li>
            <button
              type="button"
              aria-pressed={!current}
              className={cn(
                'flex aspect-square w-full items-center justify-center rounded-md border border-border text-[0.625rem] hover:border-ring',
                !current && 'border-ring bg-accent',
              )}
              onClick={() => {
                actions.setAlternate(run.id, letter, null);
              }}
            >
              {t('editor.parts.defaultForm')}
            </button>
          </li>
          {list.map((form) => {
            const selected = current?.tag === form.tag && current.value === form.value;
            return (
              <li key={`${form.tag}-${String(form.value)}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={t('editor.parts.alternate', { tag: form.tag, value: form.value })}
                  title={`${form.tag} ${String(form.value)}`}
                  className={cn(
                    'flex aspect-square w-full items-center justify-center rounded-md border border-border bg-white p-1 hover:border-ring',
                    selected && 'border-ring ring-2 ring-ring',
                  )}
                  onClick={() => {
                    actions.setAlternate(run.id, letter, form);
                  }}
                >
                  <svg
                    viewBox={`0 0 ${String(form.size)} ${String(form.size)}`}
                    className="size-full"
                    aria-hidden
                  >
                    <path d={form.path} fill="#1a1a1a" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface PartsPanelProps {
  run: TextRun;
  layout: TextLayout | undefined;
  actions: EditorActions;
}

/** Drill-down editing of a text layer: words, letters and their parts (body, dots, marks). */
export function PartsPanel({ run, layout, actions }: PartsPanelProps) {
  const { t } = useTranslation();
  const baseId = useId();
  const editLayerId = useEditorStore((s) => s.editLayerId);
  const level = useEditorStore((s) => (s.editLayerId === run.id ? s.editLevel : 'object'));
  const selectedUnits = useEditorStore((s) => s.selectedUnits);
  const lockMarks = useEditorStore((s) => s.lockMarks);
  const setLockMarks = useEditorStore((s) => s.setLockMarks);
  const editLayer = useEditorStore((s) => s.editLayer);
  const editing = editLayerId === run.id && level !== 'object';

  const selection = useMemo(() => {
    if (!editing || !layout) return [];
    const { units } = buildUnits(resolveParts(run, layout), level, lockMarks);
    const wanted = new Set(selectedUnits);
    return units.filter((u) => wanted.has(u.id));
  }, [editing, layout, level, lockMarks, run, selectedUnits]);

  const parts = selection.flatMap((u) => u.parts);
  const letters = [...new Set(selection.map((u) => u.letter).filter((l): l is number => l !== null))];
  const singleLetter = letters.length === 1 && level !== 'word' ? letters[0] : undefined;
  const extendable = singleLetter !== undefined && (layout?.extendable.includes(singleLetter) ?? false);
  const allHidden = parts.length > 0 && parts.every((p) => p.hidden);
  const kinds = new Set(parts.map((p) => p.override?.kind ?? 'auto'));
  const kindValue = kinds.size === 1 ? [...kinds][0] : '';
  const adjusted = Object.keys(run.parts).length + Object.keys(run.kashida).length + run.features.length;

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.parts.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          <span id={`${baseId}-level`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('editor.parts.level')}
          </span>
          <div role="radiogroup" aria-labelledby={`${baseId}-level`} className="grid grid-cols-4 gap-1">
            {LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={level === value}
                className={cn(
                  'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                  level === value && 'border-ring bg-accent font-medium',
                )}
                onClick={() => {
                  editLayer(value === 'object' ? null : run.id, value === 'object' ? undefined : value);
                }}
              >
                {t(`editor.parts.levels.${value}`)}
              </button>
            ))}
          </div>
          <p className="text-[0.6875rem] text-muted-foreground">{t('editor.parts.levelHint')}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${baseId}-lock`}>{t('editor.parts.lockMarks')}</Label>
          <Switch id={`${baseId}-lock`} checked={lockMarks} onCheckedChange={setLockMarks} />
        </div>

        {editing && (
          <>
            <p className="text-xs" role="status">
              {selection.length === 0
                ? t('editor.parts.nothingSelected')
                : t('editor.parts.selected', { count: selection.length, parts: parts.length })}
            </p>
            {parts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actions.resetParts();
                  }}
                >
                  <RotateCcw aria-hidden />
                  {t('editor.parts.reset')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actions.setPartsHidden(!allHidden);
                  }}
                >
                  {allHidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                  {allHidden ? t('editor.parts.show') : t('editor.parts.hide')}
                </Button>
                {level === 'part' && selection.length > 1 && (
                  <Button variant="outline" size="sm" onClick={actions.mergeParts}>
                    <Link2 aria-hidden />
                    {t('editor.parts.merge')}
                  </Button>
                )}
                {level === 'part' && parts.some((p) => p.link) && (
                  <Button variant="outline" size="sm" onClick={actions.splitParts}>
                    <Link2Off aria-hidden />
                    {t('editor.parts.split')}
                  </Button>
                )}
              </div>
            )}
            {level === 'part' && parts.length > 0 && (
              <div className="grid gap-1">
                <span id={`${baseId}-kind`} className="text-[0.6875rem] font-medium text-muted-foreground">
                  {t('editor.parts.kind')}
                </span>
                <div role="radiogroup" aria-labelledby={`${baseId}-kind`} className="grid grid-cols-4 gap-1">
                  {(['auto', ...PART_KINDS] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={kindValue === kind}
                      className={cn(
                        'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                        kindValue === kind && 'border-ring bg-accent font-medium',
                      )}
                      onClick={() => {
                        actions.reclassifyParts(kind === 'auto' ? null : kind);
                      }}
                    >
                      {t(`editor.parts.kinds.${kind}`)}
                    </button>
                  ))}
                </div>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {t('editor.parts.detected', {
                    kinds: [...new Set(parts.map((p) => t(`editor.parts.kinds.${p.autoKind}`)))].join(', '),
                  })}
                </p>
              </div>
            )}
            {singleLetter !== undefined && extendable && (
              <KashidaControl run={run} letter={singleLetter} actions={actions} />
            )}
            {singleLetter !== undefined && (
              <AlternatesPicker run={run} letter={singleLetter} actions={actions} />
            )}
          </>
        )}

        {adjusted > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start text-muted-foreground"
            onClick={() => {
              actions.resetParts(true);
            }}
          >
            <RotateCcw aria-hidden />
            {t('editor.parts.resetAll')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
