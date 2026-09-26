import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { LayerStyle, Paint } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from './NumberField';

export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="h-7 w-9 cursor-pointer rounded-md border border-input bg-card p-0.5"
      />
      <Label htmlFor={id}>{label}</Label>
      <span className="ms-auto font-mono text-[0.6875rem] text-muted-foreground uppercase">{value}</span>
    </div>
  );
}

function gradientCss(paint: Paint): string {
  if (paint.type === 'solid') return paint.color;
  const stops = paint.stops.map((s) => `${s.color} ${String(Math.round(s.offset * 100))}%`).join(', ');
  return `linear-gradient(${String(paint.angle + 90)}deg, ${stops})`;
}

interface StyleEditorProps {
  style: LayerStyle;
  onChange: (style: LayerStyle) => void;
}

/** Fill (solid or linear gradient), outline, opacity and shadow of a text layer. */
export function StyleEditor({ style, onChange }: StyleEditorProps) {
  const { t } = useTranslation();
  const id = useId();
  const patch = (changes: Partial<LayerStyle>) => {
    onChange({ ...style, ...changes });
  };
  const fill = style.fill;
  const firstColor = fill.type === 'solid' ? fill.color : (fill.stops[0]?.color ?? '#1a1a1a');

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <span className="text-[0.6875rem] font-medium text-muted-foreground">{t('editor.style.fill')}</span>
        <div role="radiogroup" aria-label={t('editor.style.fillType')} className="flex gap-1">
          {(['solid', 'linear'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={fill.type === type}
              className={cn(
                'h-7 flex-1 rounded-md border border-input px-2 text-xs hover:bg-accent',
                fill.type === type && 'border-ring bg-accent font-medium',
              )}
              onClick={() => {
                if (type === fill.type) return;
                patch({
                  fill:
                    type === 'solid'
                      ? { type: 'solid', color: firstColor }
                      : {
                          type: 'linear',
                          angle: 90,
                          stops: [
                            { offset: 0, color: firstColor },
                            { offset: 1, color: '#b8860b' },
                          ],
                        },
                });
              }}
            >
              {t(`editor.style.${type}`)}
            </button>
          ))}
        </div>
        {fill.type === 'solid' ? (
          <ColorField
            id={`${id}-fill`}
            label={t('editor.properties.fill')}
            value={fill.color}
            onChange={(color) => {
              patch({ fill: { type: 'solid', color } });
            }}
          />
        ) : (
          <div className="grid gap-2">
            <div
              className="h-4 rounded-sm border border-border"
              style={{ background: gradientCss(fill) }}
              aria-hidden
            />
            {fill.stops.map((stop, index) => (
              <ColorField
                key={index}
                id={`${id}-stop-${String(index)}`}
                label={t('editor.style.stop', { index: index + 1 })}
                value={stop.color}
                onChange={(color) => {
                  patch({
                    fill: { ...fill, stops: fill.stops.map((s, i) => (i === index ? { ...s, color } : s)) },
                  });
                }}
              />
            ))}
            <NumberField
              key={`angle-${String(fill.angle)}`}
              id={`${id}-angle`}
              label={t('editor.style.angle')}
              value={fill.angle}
              min={-360}
              max={360}
              suffix="°"
              onCommit={(angle) => {
                patch({ fill: { ...fill, angle } });
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-stroke`}>{t('editor.style.stroke')}</Label>
          <Switch
            id={`${id}-stroke`}
            checked={style.stroke !== null}
            onCheckedChange={(on) => {
              patch({ stroke: on ? { color: '#000000', width: 2 } : null });
            }}
          />
        </div>
        {style.stroke && (
          <div className="grid grid-cols-[1fr_6rem] items-end gap-2">
            <ColorField
              id={`${id}-stroke-color`}
              label={t('editor.style.strokeColor')}
              value={style.stroke.color}
              onChange={(color) => {
                if (style.stroke) patch({ stroke: { ...style.stroke, color } });
              }}
            />
            <NumberField
              key={`sw-${String(style.stroke.width)}`}
              id={`${id}-stroke-width`}
              label={t('editor.style.strokeWidth')}
              value={style.stroke.width}
              min={0}
              max={200}
              suffix="px"
              onCommit={(width) => {
                if (style.stroke) patch({ stroke: { ...style.stroke, width } });
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <span id={`${id}-opacity`} className="text-xs font-medium">
            {t('editor.style.opacity')}
          </span>
          <span className="text-[0.6875rem] text-muted-foreground tabular-nums">
            {Math.round(style.opacity * 100)}%
          </span>
        </div>
        {/* Uncontrolled while dragging; one undo step on release. */}
        <Slider
          key={style.opacity}
          aria-labelledby={`${id}-opacity`}
          thumbLabel={t('editor.style.opacity')}
          min={0}
          max={100}
          step={1}
          defaultValue={[Math.round(style.opacity * 100)]}
          onValueCommit={([v]) => {
            patch({ opacity: (v ?? 100) / 100 });
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-shadow`}>{t('editor.style.shadow')}</Label>
          <Switch
            id={`${id}-shadow`}
            checked={style.shadow !== null}
            onCheckedChange={(on) => {
              patch({
                shadow: on ? { color: '#000000', opacity: 0.35, blur: 8, offsetX: 3, offsetY: 3 } : null,
              });
            }}
          />
        </div>
        {style.shadow && (
          <div className="grid gap-2">
            <ColorField
              id={`${id}-shadow-color`}
              label={t('editor.style.shadowColor')}
              value={style.shadow.color}
              onChange={(color) => {
                if (style.shadow) patch({ shadow: { ...style.shadow, color } });
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['blur', 0, 500, 'px'],
                  ['offsetX', -500, 500, 'px'],
                  ['offsetY', -500, 500, 'px'],
                  ['opacity', 0, 1, ''],
                ] as const
              ).map(([key, min, max, suffix]) => (
                <NumberField
                  key={`${key}-${String(style.shadow?.[key])}`}
                  id={`${id}-shadow-${key}`}
                  label={t(`editor.style.shadow_${key}`)}
                  value={style.shadow?.[key] ?? 0}
                  min={min}
                  max={max}
                  suffix={suffix}
                  onCommit={(value) => {
                    if (style.shadow) patch({ shadow: { ...style.shadow, [key]: value } });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
