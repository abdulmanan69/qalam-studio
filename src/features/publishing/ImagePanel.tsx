import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import type { ImageLayer } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from '../editor/NumberField';
import type { EditorActions } from '../editor/use-editor-actions';

const FITS = ['cover', 'contain', 'stretch'] as const;

/** Photo options: how it fills its box, the crop focus and opacity. */
export function ImagePanel({ image, actions }: { image: ImageLayer; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const patch = (recipe: (layer: ImageLayer) => void) => {
    actions.patchLayer(image.id, (layer) => {
      if (layer.kind === 'image') recipe(layer);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="truncate" dir="auto">
          {image.name || t('publishing.photo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-[0.6875rem] text-muted-foreground">
          {t('publishing.photoSize', { width: image.naturalWidth, height: image.naturalHeight })}
        </p>
        <div className="grid gap-1">
          <span id={`${id}-fit`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('publishing.fit')}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-fit`} className="grid grid-cols-3 gap-1">
            {FITS.map((fit) => (
              <button
                key={fit}
                type="button"
                role="radio"
                aria-checked={image.fit === fit}
                className={cn(
                  'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                  image.fit === fit && 'border-ring bg-accent font-medium',
                )}
                onClick={() => {
                  patch((layer) => {
                    layer.fit = fit;
                  });
                }}
              >
                {t(`publishing.fit_${fit}`)}
              </button>
            ))}
          </div>
        </div>
        {image.fit === 'cover' && (
          <div className="grid gap-2">
            {(['focusX', 'focusY'] as const).map((key) => (
              <div key={key} className="grid gap-1">
                <span id={`${id}-${key}`} className="text-xs font-medium">
                  {t(`publishing.${key}`)}
                </span>
                <Slider
                  key={image[key]}
                  aria-labelledby={`${id}-${key}`}
                  thumbLabel={t(`publishing.${key}`)}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={[Math.round(image[key] * 100)]}
                  onValueCommit={([v]) => {
                    patch((layer) => {
                      layer[key] = (v ?? 50) / 100;
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <NumberField
          key={`o-${String(image.opacity)}`}
          id={`${id}-o`}
          label={t('editor.style.opacity')}
          value={Math.round(image.opacity * 100)}
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
      </CardContent>
    </Card>
  );
}
