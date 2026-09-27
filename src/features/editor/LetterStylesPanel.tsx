import { Eraser } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { previewFontStack } from '@/features/fonts/font-faces';
import { resolveFont } from '@/features/fonts/registry';
import type { TextRun } from '@/features/projects/schema';
import type { AlternateForm, Box, TextLayout } from '@/features/shaping/types';
import { partMatrix, transformPathData } from '@/lib/matrix';
import { cn } from '@/lib/utils';

import { alternatesRequestFor, layoutRequestFor, tryGetShapingClient } from './canvas/use-text-layouts';
import { useEditorStore } from './editor-store';
import {
  anchoredShift,
  distinctLetters,
  LETTER_STYLES,
  letterOccurrences,
  type LetterStyle,
} from './letter-styles';
import { buildUnits, resolveParts, unionBoxes } from './units';
import type { EditorActions } from './use-editor-actions';

interface Preview {
  path: string;
  box: Box;
}

function viewBoxOf(box: Box): string {
  const pad = Math.max(box.width, box.height) * 0.15 + 1;
  const size = Math.max(box.width, box.height) + pad * 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return `${String(cx - size / 2)} ${String(cy - size / 2)} ${String(size)} ${String(size)}`;
}

/** The letter at `index` drawn with a shape style (no document change). */
function shapePreview(layout: TextLayout, index: number, style: LetterStyle | null): Preview | null {
  const parts = resolveParts({ parts: {} }, layout).filter((p) => p.letter === index);
  if (parts.length === 0) return null;
  const paths: string[] = [];
  for (const part of parts) {
    if (!style || style.kind !== 'shape') {
      paths.push(part.basePath);
      continue;
    }
    const rise = style.rise * layout.fontSize;
    const t =
      part.kind === 'body'
        ? {
            dx: anchoredShift(style.scaleX, part.box.width),
            dy: rise,
            angle: style.angle,
            scaleX: style.scaleX,
            scaleY: style.scaleY,
          }
        : { dx: 0, dy: rise, angle: 0, scaleX: 1, scaleY: 1 };
    paths.push(transformPathData(part.basePath, partMatrix(part.center, t)));
  }
  const box = unionBoxes(parts.map((p) => p.box));
  return box ? { path: paths.join(''), box } : null;
}

/** The word around a letter, laid out with extra kashida on that letter. */
function useKashidaPreviews(run: TextRun, index: number | null): Map<number, Preview> {
  const [result, setResult] = useState<{ key: string; map: Map<number, Preview> } | null>(null);
  const key = `${run.fontId}|${run.language}|${run.text}|${String(index)}`;
  useEffect(() => {
    const client = tryGetShapingClient();
    if (!client || index === null) return;
    let active = true;
    // The word containing the letter, with its local index.
    let start = index;
    while (start > 0 && !/\s/u.test(run.text.charAt(start - 1))) start--;
    let end = index;
    while (end < run.text.length && !/\s/u.test(run.text.charAt(end))) end++;
    const word = run.text.slice(start, end);
    const local = index - start;
    const values = LETTER_STYLES.filter((s) => s.kind === 'kashida').map((s) => s.em);
    Promise.all(
      values.map((em) =>
        client.layout(
          layoutRequestFor({
            ...run,
            text: word,
            kashida: { [String(local)]: em },
            features: [],
            fontSize: 48,
          }),
        ),
      ),
    ).then(
      (layouts) => {
        if (!active) return;
        const map = new Map<number, Preview>();
        layouts.forEach((layout, i) => {
          const parts = resolveParts({ parts: {} }, layout);
          const box = unionBoxes(parts.map((p) => p.box));
          if (box) map.set(values[i] ?? 0, { path: parts.map((p) => p.basePath).join(''), box });
        });
        setResult({ key, map });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
    // `key` captures everything the previews depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result.map : new Map<number, Preview>();
}

function useAlternates(run: TextRun, index: number | null): AlternateForm[] {
  const [result, setResult] = useState<{ key: string; forms: AlternateForm[] } | null>(null);
  const key = `${run.fontId}|${run.language}|${run.text}|${String(index)}`;
  useEffect(() => {
    const client = tryGetShapingClient();
    if (!client || index === null) return;
    let active = true;
    client.alternates(alternatesRequestFor({ ...run, features: [] }, index)).then(
      (forms) => {
        if (active) setResult({ key, forms });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result.forms : [];
}

function StyleButton({
  label,
  preview,
  onClick,
}: {
  label: string;
  preview: Preview | { path: string; viewBox: string } | null;
  onClick: () => void;
}) {
  const viewBox = preview ? ('viewBox' in preview ? preview.viewBox : viewBoxOf(preview.box)) : '0 0 1 1';
  return (
    <li>
      <button
        type="button"
        title={label}
        aria-label={label}
        className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-white p-1 hover:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={onClick}
      >
        <svg viewBox={viewBox} className="min-h-0 w-full flex-1" aria-hidden>
          {preview && <path d={preview.path} fill="#1a1a1a" />}
        </svg>
        <span className="w-full truncate text-center text-[0.5625rem] text-black/60">{label}</span>
      </button>
    </li>
  );
}

interface LetterStylesPanelProps {
  run: TextRun;
  layout: TextLayout | undefined;
  actions: EditorActions;
}

/**
 * Letter styles: choose a letter and give it a calligraphic shape everywhere
 * in the text or only in the selected word.
 */
export function LetterStylesPanel({ run, layout, actions }: LetterStylesPanelProps) {
  const { t } = useTranslation();
  const id = useId();
  const letters = useMemo(() => distinctLetters(run.text), [run.text]);
  const editLayerId = useEditorStore((s) => s.editLayerId);
  const editLevel = useEditorStore((s) => s.editLevel);
  const selectedUnits = useEditorStore((s) => s.selectedUnits);
  const lockMarks = useEditorStore((s) => s.lockMarks);
  const [chosen, setChosen] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'word'>('all');

  // The selected letter (and word) on the canvas, when editing this layer.
  const selection = useMemo(() => {
    if (!layout || editLayerId !== run.id || editLevel === 'object') return null;
    const wanted = new Set(selectedUnits);
    const parts = buildUnits(resolveParts(run, layout), editLevel, lockMarks)
      .units.filter((u) => wanted.has(u.id))
      .flatMap((u) => u.parts);
    const first = parts[0];
    return first ? { letter: run.text.charAt(first.letter), word: first.word } : null;
  }, [layout, editLayerId, editLevel, selectedUnits, lockMarks, run]);

  const letter = chosen && letters.includes(chosen) ? chosen : (selection?.letter ?? letters[0] ?? null);
  const word = scope === 'word' ? (selection?.word ?? null) : null;
  const occurrences = layout && letter ? letterOccurrences(run.text, letter, layout, word) : [];
  const first = occurrences[0] ?? null;
  const kashidaPreviews = useKashidaPreviews(run, first);
  const alternates = useAlternates(run, first);
  const extendable = first !== null && (layout?.extendable.includes(first) ?? false);
  const fontFamily = previewFontStack(resolveFont(run.fontId));

  if (!layout || letters.length === 0) return null;

  const apply = (style: Parameters<EditorActions['styleLetters']>[3]) => {
    if (letter) actions.styleLetters(run.id, letter, word, style);
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('letterStyles.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          <span id={`${id}-letter`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('letterStyles.letter')}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-letter`} className="flex flex-wrap gap-1" dir="rtl">
            {letters.map((ch) => (
              <button
                key={ch}
                type="button"
                role="radio"
                aria-checked={ch === letter}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md border border-input text-lg leading-none hover:bg-accent',
                  ch === letter && 'border-ring bg-accent',
                )}
                style={{ fontFamily }}
                onClick={() => {
                  setChosen(ch);
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <span id={`${id}-scope`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('letterStyles.scope')}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-scope`} className="grid grid-cols-2 gap-1">
            {(['all', 'word'] as const).map((value) => {
              const disabled = value === 'word' && !selection;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={scope === value}
                  disabled={disabled}
                  className={cn(
                    'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                    scope === value && 'border-ring bg-accent font-medium',
                  )}
                  onClick={() => {
                    setScope(value);
                  }}
                >
                  {t(`letterStyles.scope_${value}`)}
                </button>
              );
            })}
          </div>
          <p className="text-[0.6875rem] text-muted-foreground" role="status">
            {t('letterStyles.count', { count: occurrences.length })}
            {scope === 'word' && !selection && ` · ${t('letterStyles.selectWord')}`}
          </p>
        </div>

        <ul className="grid grid-cols-4 gap-1" aria-label={t('letterStyles.styles')}>
          {LETTER_STYLES.filter((s) => s.kind === 'shape' || extendable).map((style) => (
            <StyleButton
              key={style.id}
              label={t(`letterStyles.names.${style.id}`)}
              preview={
                style.kind === 'shape'
                  ? first !== null
                    ? shapePreview(layout, first, style)
                    : null
                  : (kashidaPreviews.get(style.em) ?? null)
              }
              onClick={() => {
                apply(style);
              }}
            />
          ))}
          {alternates.map((form) => (
            <StyleButton
              key={`${form.tag}-${String(form.value)}`}
              label={t('letterStyles.alternate', { tag: form.tag, value: form.value })}
              preview={{ path: form.path, viewBox: `0 0 ${String(form.size)} ${String(form.size)}` }}
              onClick={() => {
                apply({ tag: form.tag, value: form.value });
              }}
            />
          ))}
        </ul>

        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={occurrences.length === 0}
          onClick={() => {
            apply(null);
          }}
        >
          <Eraser aria-hidden />
          {t('letterStyles.clear')}
        </Button>
      </CardContent>
    </Card>
  );
}
