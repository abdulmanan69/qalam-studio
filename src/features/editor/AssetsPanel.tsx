import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { DEFAULT_ORNAMENT_COLOR, ORNAMENTS, type OrnamentCategory } from '@/features/ornaments/ornaments';

import type { EditorActions } from './use-editor-actions';

const CATEGORIES: readonly OrnamentCategory[] = ['ornament', 'frame', 'pattern'];

function dataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Ornaments, frames and background patterns that can be placed on the artboard. */
export function AssetsPanel({ actions }: { actions: EditorActions }) {
  const { t } = useTranslation();
  const colorId = useId();
  const [color, setColor] = useState(DEFAULT_ORNAMENT_COLOR);
  const previews = useMemo(
    () => new Map(ORNAMENTS.map((o) => [o.id, dataUrl(o.build(240, 240, color))])),
    [color],
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <input
          id={colorId}
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
          }}
          className="h-7 w-9 cursor-pointer rounded-md border border-input bg-card p-0.5"
        />
        <Label htmlFor={colorId}>{t('ornaments.color')}</Label>
      </div>
      {CATEGORIES.map((category) => (
        <section key={category} aria-labelledby={`${colorId}-${category}`} className="grid gap-1.5">
          <h3
            id={`${colorId}-${category}`}
            className="text-[0.6875rem] font-semibold text-muted-foreground uppercase"
          >
            {t(`ornaments.categories.${category}`)}
          </h3>
          <ul className="grid grid-cols-3 gap-1.5">
            {ORNAMENTS.filter((o) => o.category === category).map((ornament) => {
              const name = t(`ornaments.items.${ornament.nameKey}`);
              return (
                <li key={ornament.id}>
                  <button
                    type="button"
                    title={name}
                    aria-label={t('ornaments.place', { name })}
                    className="flex aspect-square w-full items-center justify-center rounded-md border border-border bg-white p-1 hover:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => {
                      actions.placeOrnament(ornament.id, color, name);
                    }}
                  >
                    <img
                      src={previews.get(ornament.id)}
                      alt=""
                      className="max-h-full max-w-full"
                      draggable={false}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-[0.6875rem] text-muted-foreground">{t('ornaments.license')}</p>
    </div>
  );
}
