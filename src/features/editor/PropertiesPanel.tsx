import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FontSelect } from '@/features/fonts/FontSelect';
import { defaultFontFor, getFont } from '@/features/fonts/registry';
import { getPreset, matchPreset } from '@/features/projects/artboard-presets';
import { PresetSelect } from '@/features/projects/PresetSelect';
import {
  MAX_ARTBOARD_SIZE,
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MIN_ARTBOARD_SIZE,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  type Project,
  type SvgAsset,
  type TextAlign,
  type TextLanguage,
  type TextRun,
} from '@/features/projects/schema';
import { normalizeText } from '@/features/projects/text-runs';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

import { SHAPING_UNAVAILABLE } from './canvas/use-text-layouts';
import { NumberField } from './NumberField';
import { LanguageSelect } from './text/LanguageSelect';
import { TextInput } from './text/TextInput';
import type { ProjectUpdater } from './use-project-updater';

const MAX_COORD = 100_000;

/** Normalize an angle to [0, 360). */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function ColorField({
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

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="justify-self-start text-destructive" onClick={onClick}>
      <Trash2 aria-hidden />
      {label}
    </Button>
  );
}

function ArtboardProperties({ project, update }: { project: Project; update: ProjectUpdater }) {
  const { t } = useTranslation();
  const baseId = useId();
  const artboard = project.artboards[0];
  if (!artboard) return null;

  const setSize = (width: number, height: number) => {
    update((draft) => {
      const target = draft.artboards.find((a) => a.id === artboard.id);
      if (!target) return;
      target.width = width;
      target.height = height;
      target.presetId = matchPreset(width, height);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.properties.artboard')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${baseId}-preset`} className="text-[0.6875rem] text-muted-foreground">
            {t('newDesign.size')}
          </Label>
          <PresetSelect
            id={`${baseId}-preset`}
            value={artboard.presetId}
            showSizes={false}
            onValueChange={(presetId) => {
              if (presetId === 'custom') {
                update((draft) => {
                  const target = draft.artboards.find((a) => a.id === artboard.id);
                  if (target) target.presetId = 'custom';
                });
                return;
              }
              const preset = getPreset(presetId);
              setSize(preset.width, preset.height);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            key={`w-${artboard.width}`}
            id={`${baseId}-w`}
            label={t('newDesign.width')}
            value={artboard.width}
            min={MIN_ARTBOARD_SIZE}
            max={MAX_ARTBOARD_SIZE}
            integer
            suffix="px"
            onCommit={(width) => {
              setSize(width, artboard.height);
            }}
          />
          <NumberField
            key={`h-${artboard.height}`}
            id={`${baseId}-h`}
            label={t('newDesign.height')}
            value={artboard.height}
            min={MIN_ARTBOARD_SIZE}
            max={MAX_ARTBOARD_SIZE}
            integer
            suffix="px"
            onCommit={(height) => {
              setSize(artboard.width, height);
            }}
          />
        </div>
        <ColorField
          id={`${baseId}-bg`}
          label={t('newDesign.background')}
          value={artboard.background}
          onChange={(background) => {
            update((draft) => {
              const target = draft.artboards.find((a) => a.id === artboard.id);
              if (target) target.background = background;
            });
          }}
        />
      </CardContent>
    </Card>
  );
}

function AssetProperties({
  asset,
  update,
  onDelete,
}: {
  asset: SvgAsset;
  update: ProjectUpdater;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const baseId = useId();

  const patch = (changes: Partial<Pick<SvgAsset, 'x' | 'y' | 'width' | 'height' | 'angle'>>) => {
    update((draft) => {
      const target = draft.assets.find((a) => a.id === asset.id);
      if (target) Object.assign(target, changes);
    });
  };
  const aspect = asset.height / asset.width;

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="truncate" dir="auto">
          {asset.name || t('editor.layers.untitledArtwork')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            key={`x-${asset.x}`}
            id={`${baseId}-x`}
            label="X"
            value={asset.x}
            min={-MAX_COORD}
            max={MAX_COORD}
            suffix="px"
            onCommit={(x) => {
              patch({ x });
            }}
          />
          <NumberField
            key={`y-${asset.y}`}
            id={`${baseId}-y`}
            label="Y"
            value={asset.y}
            min={-MAX_COORD}
            max={MAX_COORD}
            suffix="px"
            onCommit={(y) => {
              patch({ y });
            }}
          />
          <NumberField
            key={`w-${asset.width}`}
            id={`${baseId}-w`}
            label={t('newDesign.width')}
            value={asset.width}
            min={1}
            max={MAX_COORD}
            suffix="px"
            onCommit={(width) => {
              patch({ width, height: width * aspect });
            }}
          />
          <NumberField
            key={`h-${asset.height}`}
            id={`${baseId}-h`}
            label={t('newDesign.height')}
            value={asset.height}
            min={1}
            max={MAX_COORD}
            suffix="px"
            onCommit={(height) => {
              patch({ height, width: height / aspect });
            }}
          />
          <NumberField
            key={`r-${asset.angle}`}
            id={`${baseId}-r`}
            label={t('editor.properties.rotation')}
            value={asset.angle}
            min={-3600}
            max={3600}
            suffix="°"
            onCommit={(angle) => {
              patch({ angle: normalizeAngle(angle) });
            }}
          />
        </div>
        <p className="text-[0.6875rem] text-muted-foreground">{t('editor.properties.aspectLocked')}</p>
        <RemoveButton label={t('editor.properties.removeArtwork')} onClick={onDelete} />
      </CardContent>
    </Card>
  );
}

const ALIGN_OPTIONS: readonly { value: TextAlign; icon: typeof AlignRight }[] = [
  { value: 'start', icon: AlignRight },
  { value: 'center', icon: AlignCenter },
  { value: 'end', icon: AlignLeft },
];

function TextProperties({
  run,
  error,
  update,
  onDelete,
}: {
  run: TextRun;
  error: string | undefined;
  update: ProjectUpdater;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const [draft, setDraft] = useState(run.text);

  const patch = useCallback(
    (changes: Partial<Omit<TextRun, 'id' | 'kind' | 'artboardId'>>) => {
      update((doc) => {
        const target = doc.texts.find((item) => item.id === run.id);
        if (target) Object.assign(target, changes);
      });
    },
    [update, run.id],
  );

  // Live preview: commit the text shortly after typing pauses.
  useEffect(() => {
    const next = normalizeText(draft);
    if (!next || next === run.text) return;
    const timer = window.setTimeout(() => {
      patch({ text: next });
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, run.text, patch]);

  const empty = normalizeText(draft) === '';
  const scalePercent = Math.abs(run.scaleX) * 100;

  const onLanguageChange = (language: TextLanguage) => {
    const fontSupports = getFont(run.fontId)?.languages.includes(language) ?? false;
    patch(fontSupports ? { language } : { language, fontId: defaultFontFor(language).id });
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.properties.text')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <TextInput
          id={`${baseId}-text`}
          value={draft}
          onValueChange={setDraft}
          language={run.language}
          fontId={run.fontId}
          rows={3}
          invalid={empty}
          describedBy={empty || error ? errorId : undefined}
        />
        {(empty || error) && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {empty
              ? t('editor.properties.emptyText')
              : error === SHAPING_UNAVAILABLE
                ? t('editor.properties.shapingUnavailable')
                : t('editor.properties.shapingFailed', { error })}
          </p>
        )}

        <div className="grid gap-1">
          <Label htmlFor={`${baseId}-lang`} className="text-[0.6875rem] text-muted-foreground">
            {t('editor.properties.language')}
          </Label>
          <LanguageSelect id={`${baseId}-lang`} value={run.language} onValueChange={onLanguageChange} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${baseId}-font`} className="text-[0.6875rem] text-muted-foreground">
            {t('editor.properties.font')}
          </Label>
          <FontSelect
            id={`${baseId}-font`}
            value={run.fontId}
            language={run.language}
            onValueChange={(fontId) => {
              patch({ fontId });
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            key={`fs-${run.fontSize}`}
            id={`${baseId}-size`}
            label={t('editor.properties.fontSize')}
            value={run.fontSize}
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            suffix="px"
            onCommit={(fontSize) => {
              patch({ fontSize });
            }}
          />
          <NumberField
            key={`lh-${run.lineHeight}`}
            id={`${baseId}-lh`}
            label={t('editor.properties.lineHeight')}
            value={run.lineHeight}
            min={MIN_LINE_HEIGHT}
            max={MAX_LINE_HEIGHT}
            suffix="×"
            onCommit={(lineHeight) => {
              patch({ lineHeight });
            }}
          />
        </div>

        <div className="grid gap-1">
          <span id={`${baseId}-align`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('editor.properties.align')}
          </span>
          <div role="group" aria-labelledby={`${baseId}-align`} className="flex gap-1">
            {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant="outline"
                size="icon-sm"
                aria-label={t(`editor.properties.align_${value}`)}
                aria-pressed={run.align === value}
                className={cn(run.align === value && 'border-ring bg-accent')}
                onClick={() => {
                  patch({ align: value });
                }}
              >
                <Icon aria-hidden />
              </Button>
            ))}
          </div>
        </div>

        <ColorField
          id={`${baseId}-fill`}
          label={t('editor.properties.fill')}
          value={run.fill}
          onChange={(fill) => {
            patch({ fill });
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            key={`x-${run.x}`}
            id={`${baseId}-x`}
            label="X"
            value={run.x}
            min={-MAX_COORD}
            max={MAX_COORD}
            suffix="px"
            onCommit={(x) => {
              patch({ x });
            }}
          />
          <NumberField
            key={`y-${run.y}`}
            id={`${baseId}-y`}
            label="Y"
            value={run.y}
            min={-MAX_COORD}
            max={MAX_COORD}
            suffix="px"
            onCommit={(y) => {
              patch({ y });
            }}
          />
          <NumberField
            key={`s-${scalePercent}`}
            id={`${baseId}-scale`}
            label={t('editor.properties.scale')}
            value={scalePercent}
            min={1}
            max={10_000}
            suffix="%"
            onCommit={(percent) => {
              const factor = percent / 100;
              patch({ scaleX: Math.sign(run.scaleX) * factor, scaleY: Math.sign(run.scaleY) * factor });
            }}
          />
          <NumberField
            key={`r-${run.angle}`}
            id={`${baseId}-r`}
            label={t('editor.properties.rotation')}
            value={run.angle}
            min={-3600}
            max={3600}
            suffix="°"
            onCommit={(angle) => {
              patch({ angle: normalizeAngle(angle) });
            }}
          />
        </div>

        <RemoveButton label={t('editor.properties.removeText')} onClick={onDelete} />
      </CardContent>
    </Card>
  );
}

export type SelectedLayer = { kind: 'text'; run: TextRun } | { kind: 'asset'; asset: SvgAsset } | null;

interface PropertiesPanelProps {
  project: Project;
  selected: SelectedLayer;
  layoutError: string | undefined;
  update: ProjectUpdater;
  onDeleteLayer: (id: string) => void;
}

export function PropertiesPanel({
  project,
  selected,
  layoutError,
  update,
  onDeleteLayer,
}: PropertiesPanelProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {selected?.kind === 'text' && (
        <TextProperties
          key={selected.run.id}
          run={selected.run}
          error={layoutError}
          update={update}
          onDelete={() => {
            onDeleteLayer(selected.run.id);
          }}
        />
      )}
      {selected?.kind === 'asset' && (
        <AssetProperties
          key={selected.asset.id}
          asset={selected.asset}
          update={update}
          onDelete={() => {
            onDeleteLayer(selected.asset.id);
          }}
        />
      )}
      {selected === null && <ArtboardProperties project={project} update={update} />}
      <Card>
        <CardHeader className="pb-1.5">
          <CardTitle>{t('editor.properties.document')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t('dashboard.recent.created')}</dt>
            <dd>{formatDateTime(project.createdAt, i18n.language)}</dd>
            <dt className="text-muted-foreground">{t('dashboard.recent.modified')}</dt>
            <dd>{formatDateTime(project.updatedAt, i18n.language)}</dd>
            <dt className="text-muted-foreground">{t('editor.properties.storage')}</dt>
            <dd>{t('editor.properties.storageLocal')}</dd>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
