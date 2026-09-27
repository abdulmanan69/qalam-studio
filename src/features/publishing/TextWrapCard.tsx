import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Layer } from '@/features/projects/schema';

import { NumberField } from '../editor/NumberField';
import type { EditorActions } from '../editor/use-editor-actions';

/** Text wrap: text frames flow around the selected layers. */
export function TextWrapCard({ layers, actions }: { layers: readonly Layer[]; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const ids = layers.map((l) => l.id);
  const wrapped = layers.filter((l) => l.wrap);
  const on = wrapped.length === layers.length && layers.length > 0;
  const offset = wrapped[0]?.wrap?.offset ?? 12;

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('publishing.wrap')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-on`}>{t('publishing.wrapAround')}</Label>
          <Switch
            id={`${id}-on`}
            checked={on}
            onCheckedChange={(checked) => {
              actions.setWrap(ids, checked ? offset : null);
            }}
          />
        </div>
        {on && (
          <NumberField
            key={`w-${String(offset)}`}
            id={`${id}-offset`}
            label={t('publishing.wrapOffset')}
            value={offset}
            min={0}
            max={500}
            suffix="px"
            onCommit={(value) => {
              actions.setWrap(ids, value);
            }}
          />
        )}
        <p className="text-[0.6875rem] text-muted-foreground">{t('publishing.wrapHint')}</p>
      </CardContent>
    </Card>
  );
}
