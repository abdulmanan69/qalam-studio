import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { previewFontStack } from '@/features/fonts/font-faces';
import { fontFileUrl, resolveFont } from '@/features/fonts/registry';
import {
  ayahNumber,
  SYMBOL_CATEGORIES,
  symbolsFor,
  type SymbolCategory,
  type SymbolItem,
} from '@/features/symbols/symbols';
import { cn } from '@/lib/utils';

import { tryGetShapingClient } from '../canvas/use-text-layouts';

interface SymbolsPanelProps {
  id: string;
  language: string;
  fontId: string;
  onInsert: (text: string) => void;
}

/** Which of the given strings the font can draw; null while unknown (or without a worker). */
function useCoverage(fontId: string, strings: readonly string[]): Map<string, boolean> | null {
  const [result, setResult] = useState<{ key: string; map: Map<string, boolean> } | null>(null);
  const key = `${fontId}|${strings.join('\u0000')}`;
  useEffect(() => {
    const client = tryGetShapingClient();
    if (!client) return;
    let active = true;
    const font = resolveFont(fontId);
    client.coverage(font.id, fontFileUrl(font), [...strings]).then(
      (flags) => {
        if (active) setResult({ key, map: new Map(strings.map((s, i) => [s, flags[i] ?? true])) });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
    // `key` captures fontId and strings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result.map : null;
}

function SymbolGrid({
  items,
  fontFamily,
  wide,
  onInsert,
}: {
  items: readonly SymbolItem[];
  fontFamily: string;
  wide: boolean;
  onInsert: (text: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className={cn('grid max-h-56 gap-1 overflow-y-auto p-0.5', wide ? 'grid-cols-2' : 'grid-cols-5')}>
      {items.map((item) => (
        <li key={item.text}>
          <button
            type="button"
            title={item.hint}
            aria-label={t('symbols.insert', { symbol: item.hint ?? item.text })}
            className="flex h-11 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card px-1 text-xl leading-none hover:border-ring hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            style={{ fontFamily }}
            dir="rtl"
            onClick={() => {
              onInsert(item.text);
            }}
          >
            <span className={cn('truncate', wide && 'text-base')}>
              {item.combining ? `◌${item.text}` : item.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Honorifics, Qur'anic marks, surah and para names and punctuation, drawn in
 * the current font. Symbols the font does not contain are hidden.
 */
export function SymbolsPanel({ id, language, fontId, onInsert }: SymbolsPanelProps) {
  const { t } = useTranslation();
  const ayahId = useId();
  const font = resolveFont(fontId);
  const fontFamily = previewFontStack(font);
  const [ayah, setAyah] = useState(1);

  const all = useMemo(
    () => new Map(SYMBOL_CATEGORIES.map((c) => [c, symbolsFor(c, language)] as const)),
    [language],
  );
  const strings = useMemo(() => [...all.values()].flat().map((s) => s.text), [all]);
  const coverage = useCoverage(fontId, strings);
  const visible = (category: SymbolCategory) =>
    (all.get(category) ?? []).filter((item) => coverage?.get(item.text) ?? true);
  const hiddenCount = coverage ? [...coverage.values()].filter((ok) => !ok).length : 0;

  return (
    <div id={id} className="grid gap-2 rounded-md border border-border bg-surface-sunken p-2">
      <Tabs defaultValue="honorifics" className="grid gap-2">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {SYMBOL_CATEGORIES.map((category) => (
            <TabsTrigger key={category} value={category}>
              {t(`symbols.categories.${category}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {SYMBOL_CATEGORIES.map((category) => (
          <TabsContent key={category} value={category} className="grid gap-2">
            {category === 'quranic' && (
              <div className="flex items-end gap-2">
                <div className="grid gap-1">
                  <label htmlFor={ayahId} className="text-[0.6875rem] text-muted-foreground">
                    {t('symbols.ayahNumber')}
                  </label>
                  <input
                    id={ayahId}
                    type="number"
                    min={1}
                    max={286}
                    value={ayah}
                    onChange={(e) => {
                      setAyah(Math.max(1, Math.min(286, Number(e.target.value) || 1)));
                    }}
                    className="h-8 w-20 rounded-md border border-input bg-card px-2 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  style={{ fontFamily }}
                  onClick={() => {
                    onInsert(ayahNumber(ayah, language));
                  }}
                >
                  {t('symbols.insertAyah')} <span dir="rtl">{ayahNumber(ayah, language)}</span>
                </Button>
              </div>
            )}
            <SymbolGrid
              items={visible(category)}
              fontFamily={fontFamily}
              wide={category === 'surahs' || category === 'paras' || category === 'honorifics'}
              onInsert={onInsert}
            />
          </TabsContent>
        ))}
      </Tabs>
      <p className="text-[0.6875rem] text-muted-foreground" role="status">
        {hiddenCount > 0
          ? t('symbols.hidden', { count: hiddenCount, font: font.name })
          : t('symbols.hint', { font: font.name })}
      </p>
    </div>
  );
}
