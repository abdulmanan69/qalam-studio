import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SHAPE_KINDS, STROKE_DASHES, type ShapeLayer } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from '../editor/NumberField';
import { ColorField } from '../editor/StyleEditor';
import type { EditorActions } from '../editor/use-editor-actions';

function Choice<T extends string>({
  labelId,
  label,
  options,
  value,
  text,
  onChange,
}: {
  labelId: string;
  label: string;
  options: readonly T[];
  value: T;
  text: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div className="grid gap-1">
      <span id={labelId} className="text-[0.6875rem] font-medium text-muted-foreground">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={cn(
              'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
              value === option && 'border-ring bg-accent font-medium',
            )}
            onClick={() => {
              onChange(option);
            }}
          >
            {text(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Box, rule and ellipse options: fill, outline, line style, double line, corners, opacity. */
export function ShapePanel({ shape, actions }: { shape: ShapeLayer; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const patch = (recipe: (layer: ShapeLayer) => void) => {
    actions.patchLayer(shape.id, (layer) => {
      if (layer.kind === 'shape') recipe(layer);
    });
  };
  const isLine = shape.shape === 'line';

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="truncate" dir="auto">
          {shape.name || t(`publishing.shapes.${shape.shape}`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Choice
          labelId={`${id}-kind`}
          label={t('publishing.shapeKind')}
          options={SHAPE_KINDS}
          value={shape.shape}
          text={(kind) => t(`publishing.shapes.${kind}`)}
          onChange={(kind) => {
            patch((layer) => {
              layer.shape = kind;
              if (kind === 'line' && !layer.stroke) {
                layer.stroke = { color: layer.fill ?? '#1a1a1a', width: 1.5, dash: 'solid' };
              }
            });
          }}
        />
        {!isLine && (
          <>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-fill`}>{t('publishing.fill')}</Label>
              <Switch
                id={`${id}-fill`}
                checked={shape.fill !== null}
                onCheckedChange={(on) => {
                  patch((layer) => {
                    layer.fill = on ? '#1a1a1a' : null;
                  });
                }}
              />
            </div>
            {shape.fill && (
              <ColorField
                id={`${id}-fill-color`}
                label={t('publishing.fillColor')}
                value={shape.fill}
                onChange={(color) => {
                  patch((layer) => {
                    layer.fill = color;
                  });
                }}
              />
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-stroke`}>{t(isLine ? 'publishing.line' : 'publishing.stroke')}</Label>
          <Switch
            id={`${id}-stroke`}
            checked={shape.stroke !== null}
            onCheckedChange={(on) => {
              patch((layer) => {
                layer.stroke = on ? { color: '#1a1a1a', width: 1, dash: 'solid' } : null;
              });
            }}
          />
        </div>
        {shape.stroke && (
          <>
            <div className="grid grid-cols-[1fr_6rem] items-end gap-2">
              <ColorField
                id={`${id}-stroke-color`}
                label={t('publishing.strokeColor')}
                value={shape.stroke.color}
                onChange={(color) => {
                  patch((layer) => {
                    if (layer.stroke) layer.stroke.color = color;
                  });
                }}
              />
              <NumberField
                key={`sw-${String(shape.stroke.width)}`}
                id={`${id}-stroke-width`}
                label={t('publishing.strokeWidth')}
                value={shape.stroke.width}
                min={0}
                max={200}
                suffix="px"
                onCommit={(width) => {
                  patch((layer) => {
                    if (layer.stroke) layer.stroke.width = width;
                  });
                }}
              />
            </div>
            <Choice
              labelId={`${id}-dash`}
              label={t('publishing.dash')}
              options={STROKE_DASHES}
              value={shape.stroke.dash}
              text={(dash) => t(`publishing.dash_${dash}`)}
              onChange={(dash) => {
                patch((layer) => {
                  if (layer.stroke) layer.stroke.dash = dash;
                });
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-double`}>{t('publishing.double')}</Label>
              <Switch
                id={`${id}-double`}
                checked={shape.double}
                onCheckedChange={(on) => {
                  patch((layer) => {
                    layer.double = on;
                  });
                }}
              />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          {shape.shape === 'rect' && (
            <NumberField
              key={`r-${String(shape.radius)}`}
              id={`${id}-radius`}
              label={t('publishing.radius')}
              value={shape.radius}
              min={0}
              max={1000}
              suffix="px"
              onCommit={(radius) => {
                patch((layer) => {
                  layer.radius = radius;
                });
              }}
            />
          )}
          <NumberField
            key={`o-${String(shape.opacity)}`}
            id={`${id}-o`}
            label={t('editor.style.opacity')}
            value={Math.round(shape.opacity * 100)}
            min={0}
            max={100}
            integer
            suffix="%"
            onCommit={(value) => {
              patch((layer) => {
                layer.opacity = value / 100;
              });
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
