import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { FontSelect } from '@/features/fonts/FontSelect';
import { defaultFontFor, getFont } from '@/features/fonts/registry';
import { getPreset, matchPreset } from '@/features/projects/artboard-presets';
import { PresetSelect } from '@/features/projects/PresetSelect';
import {
  MAX_ARTBOARD_SIZE,
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MAX_NAME_LENGTH,
  MIN_ARTBOARD_SIZE,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  type Artboard,
  type Layer,
  type Project,
  type SvgAsset,
  type TextAlign,
  type TextLanguage,
  type TextRun,
} from '@/features/projects/schema';
import { normalizeText, remapForTextEdit } from '@/features/projects/text-runs';
import type { TextLayout } from '@/features/shaping/types';
import { normalizeAngle } from '@/lib/matrix';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

import { SHAPING_UNAVAILABLE } from './canvas/use-text-layouts';
import { useEditorStore } from './editor-store';
import type { AlignMode } from './layer-ops';
import { NumberField } from './NumberField';
import { FramePanel } from '@/features/publishing/FramePanel';
import { ImagePanel } from '@/features/publishing/ImagePanel';
import { ShapePanel } from '@/features/publishing/ShapePanel';
import { TextWrapCard } from '@/features/publishing/TextWrapCard';
import type { StoryFlows } from '@/features/publishing/use-story-flows';

import { LetterStylesPanel } from './LetterStylesPanel';
import { PartsPanel } from './PartsPanel';
import { PositionPad } from './PositionPad';
import { SpacingCard } from './SpacingCard';
import { ColorField, StyleEditor } from './StyleEditor';
import { LanguageSelect } from './text/LanguageSelect';
import { TextInput } from './text/TextInput';
import type { EditorActions } from './use-editor-actions';

const MAX_COORD = 100_000;

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="justify-self-start text-destructive" onClick={onClick}>
      <Trash2 aria-hidden />
      {label}
    </Button>
  );
}

function ArtboardProperties({ artboard, actions }: { artboard: Artboard; actions: EditorActions }) {
  const { t } = useTranslation();
  const baseId = useId();
  const [name, setName] = useState(artboard.name);
  const patch = (recipe: (a: Artboard) => void) => {
    actions.patchArtboard(artboard.id, recipe);
  };
  const setSize = (width: number, height: number) => {
    patch((a) => {
      a.width = width;
      a.height = height;
      a.presetId = matchPreset(width, height);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.properties.artboard')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${baseId}-name`} className="text-[0.6875rem] text-muted-foreground">
            {t('editor.artboards.name')}
          </Label>
          <input
            id={`${baseId}-name`}
            value={name}
            dir="auto"
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value);
            }}
            onBlur={() => {
              const next = name.replace(/\s+/g, ' ').trim();
              if (next && next !== artboard.name) {
                patch((a) => {
                  a.name = next;
                });
              } else setName(artboard.name);
            }}
            className="h-8 rounded-md border border-input bg-card px-2 text-[0.8125rem] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
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
                patch((a) => {
                  a.presetId = 'custom';
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
            key={`w-${String(artboard.width)}`}
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
            key={`h-${String(artboard.height)}`}
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
            patch((a) => {
              a.background = background;
            });
          }}
        />
      </CardContent>
    </Card>
  );
}

function GuidesCard({ artboard, actions }: { artboard: Artboard; actions: EditorActions }) {
  const { t } = useTranslation();
  const baseId = useId();
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.guides.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.addGuide('y', Math.round(artboard.height / 2));
            }}
          >
            <Plus aria-hidden />
            {t('editor.guides.baseline')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.addGuide('x', Math.round(artboard.width / 2));
            }}
          >
            <Plus aria-hidden />
            {t('editor.guides.vertical')}
          </Button>
        </div>
        {artboard.guides.length === 0 ? (
          <p className="text-[0.6875rem] text-muted-foreground">{t('editor.guides.empty')}</p>
        ) : (
          <ul className="grid gap-1">
            {artboard.guides.map((guide, index) => (
              <li key={guide.id} className="flex items-end gap-1">
                <div className="flex-1">
                  <NumberField
                    key={`${guide.id}-${String(guide.position)}`}
                    id={`${baseId}-${String(index)}`}
                    label={
                      guide.axis === 'y' ? t('editor.guides.horizontalAt') : t('editor.guides.verticalAt')
                    }
                    value={guide.position}
                    min={-MAX_COORD}
                    max={MAX_COORD}
                    suffix="px"
                    onCommit={(position) => {
                      actions.moveGuide(guide.id, position);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('editor.guides.remove')}
                  onClick={() => {
                    actions.moveGuide(guide.id, null);
                  }}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[0.6875rem] text-muted-foreground">{t('editor.guides.hint')}</p>
      </CardContent>
    </Card>
  );
}

function TransformFields({
  layer,
  onPatch,
}: {
  layer: Layer;
  onPatch: (
    changes: Partial<Record<'x' | 'y' | 'angle' | 'scaleX' | 'scaleY' | 'width' | 'height', number>>,
  ) => void;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberField
        key={`x-${String(layer.x)}`}
        id={`${baseId}-x`}
        label="X"
        value={layer.x}
        min={-MAX_COORD}
        max={MAX_COORD}
        suffix="px"
        onCommit={(x) => {
          onPatch({ x });
        }}
      />
      <NumberField
        key={`y-${String(layer.y)}`}
        id={`${baseId}-y`}
        label="Y"
        value={layer.y}
        min={-MAX_COORD}
        max={MAX_COORD}
        suffix="px"
        onCommit={(y) => {
          onPatch({ y });
        }}
      />
      {layer.kind === 'text' ? (
        <>
          <NumberField
            key={`sx-${String(layer.scaleX)}`}
            id={`${baseId}-sx`}
            label={t('editor.properties.scaleX')}
            value={Math.abs(layer.scaleX) * 100}
            min={1}
            max={10_000}
            suffix="%"
            onCommit={(p) => {
              onPatch({ scaleX: Math.sign(layer.scaleX) * (p / 100) });
            }}
          />
          <NumberField
            key={`sy-${String(layer.scaleY)}`}
            id={`${baseId}-sy`}
            label={t('editor.properties.scaleY')}
            value={Math.abs(layer.scaleY) * 100}
            min={1}
            max={10_000}
            suffix="%"
            onCommit={(p) => {
              onPatch({ scaleY: Math.sign(layer.scaleY) * (p / 100) });
            }}
          />
        </>
      ) : (
        <>
          <NumberField
            key={`w-${String(layer.width)}`}
            id={`${baseId}-w`}
            label={t('newDesign.width')}
            value={layer.width}
            min={1}
            max={MAX_COORD}
            suffix="px"
            onCommit={(width) => {
              // Frames and shapes resize freely; artwork and photos keep their proportions.
              onPatch(
                layer.kind === 'frame' || layer.kind === 'shape'
                  ? { width }
                  : { width, height: width * (layer.height / layer.width) },
              );
            }}
          />
          <NumberField
            key={`h-${String(layer.height)}`}
            id={`${baseId}-h`}
            label={t('newDesign.height')}
            value={layer.height}
            min={1}
            max={MAX_COORD}
            suffix="px"
            onCommit={(height) => {
              onPatch(
                layer.kind === 'frame' || layer.kind === 'shape'
                  ? { height }
                  : { height, width: height * (layer.width / layer.height) },
              );
            }}
          />
        </>
      )}
      {layer.kind !== 'frame' && (
        <NumberField
          key={`r-${String(layer.angle)}`}
          id={`${baseId}-r`}
          label={t('editor.properties.rotation')}
          value={layer.angle}
          min={-3600}
          max={3600}
          suffix="°"
          onCommit={(angle) => {
            onPatch({ angle: normalizeAngle(angle) });
          }}
        />
      )}
    </div>
  );
}

const ALIGN_BUTTONS: readonly { mode: AlignMode; icon: typeof AlignStartVertical }[] = [
  { mode: 'left', icon: AlignStartVertical },
  { mode: 'centerX', icon: AlignCenterVertical },
  { mode: 'right', icon: AlignEndVertical },
  { mode: 'top', icon: AlignStartHorizontal },
  { mode: 'centerY', icon: AlignCenterHorizontal },
  { mode: 'bottom', icon: AlignEndHorizontal },
];

function IconButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <SimpleTooltip label={label}>
      <Button variant="outline" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </SimpleTooltip>
  );
}

function ArrangeCard({ count, actions }: { count: number; actions: EditorActions }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>
          {count > 1 ? t('editor.arrange.titleMany', { count }) : t('editor.arrange.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="text-[0.6875rem] text-muted-foreground">
          {count > 1 ? t('editor.arrange.toSelection') : t('editor.arrange.toArtboard')}
        </p>
        <div className="flex flex-wrap gap-1">
          {ALIGN_BUTTONS.map(({ mode, icon: Icon }) => (
            <IconButton
              key={mode}
              label={t(`editor.arrange.${mode}`)}
              onClick={() => {
                actions.align(mode);
              }}
            >
              <Icon aria-hidden />
            </IconButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <IconButton
            label={t('editor.arrange.distributeX')}
            disabled={count < 3}
            onClick={() => {
              actions.distribute('x');
            }}
          >
            <AlignHorizontalDistributeCenter aria-hidden />
          </IconButton>
          <IconButton
            label={t('editor.arrange.distributeY')}
            disabled={count < 3}
            onClick={() => {
              actions.distribute('y');
            }}
          >
            <AlignVerticalDistributeCenter aria-hidden />
          </IconButton>
          <IconButton
            label={t('editor.arrange.flipX')}
            onClick={() => {
              actions.flip('x');
            }}
          >
            <FlipHorizontal2 aria-hidden />
          </IconButton>
          <IconButton
            label={t('editor.arrange.flipY')}
            onClick={() => {
              actions.flip('y');
            }}
          >
            <FlipVertical2 aria-hidden />
          </IconButton>
          <IconButton label={t('shortcuts.items.duplicate')} onClick={actions.duplicateSelection}>
            <Copy aria-hidden />
          </IconButton>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.mirrorCopy('x');
            }}
          >
            {t('editor.arrange.mirrorCopyX')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.mirrorCopy('y');
            }}
          >
            {t('editor.arrange.mirrorCopyY')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetProperties({ asset, actions }: { asset: SvgAsset; actions: EditorActions }) {
  const { t } = useTranslation();
  const baseId = useId();
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="truncate" dir="auto">
          {asset.name || t('editor.layers.untitledArtwork')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <TransformFields
          layer={asset}
          onPatch={(changes) => {
            actions.patchLayer(asset.id, (l) => Object.assign(l, changes));
          }}
        />
        <NumberField
          key={`o-${String(asset.opacity)}`}
          id={`${baseId}-o`}
          label={t('editor.style.opacity')}
          value={Math.round(asset.opacity * 100)}
          min={0}
          max={100}
          integer
          suffix="%"
          onCommit={(value) => {
            actions.patchLayer(asset.id, (l) => {
              if (l.kind === 'svg') l.opacity = value / 100;
            });
          }}
        />
        <p className="text-[0.6875rem] text-muted-foreground">{t('editor.properties.aspectLocked')}</p>
        <RemoveButton label={t('editor.properties.removeArtwork')} onClick={actions.deleteSelection} />
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
  actions,
}: {
  run: TextRun;
  error: string | undefined;
  actions: EditorActions;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const errorId = `${baseId}-error`;
  const [draft, setDraft] = useState(run.text);
  const [seenText, setSeenText] = useState(run.text);
  // Follow external changes (undo, version restore) without fighting the user's typing.
  if (run.text !== seenText) {
    setSeenText(run.text);
    if (normalizeText(draft) !== run.text) setDraft(run.text);
  }

  const patch = useCallback(
    (changes: Partial<Omit<TextRun, 'id' | 'kind' | 'artboardId'>>) => {
      actions.patchLayer(run.id, (layer) => Object.assign(layer, changes));
    },
    [actions, run.id],
  );

  // Live preview: commit the text shortly after typing pauses. Adjustments of
  // unchanged letters (moved dots, kashida, alternates) are carried over.
  useEffect(() => {
    const next = normalizeText(draft);
    if (!next || next === run.text) return;
    const timer = window.setTimeout(() => {
      patch(remapForTextEdit(run, next));
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, run, patch]);

  const empty = normalizeText(draft) === '';

  const onLanguageChange = (language: TextLanguage) => {
    const fontSupports = getFont(run.fontId)?.languages.includes(language) ?? false;
    patch(fontSupports ? { language } : { language, fontId: defaultFontFor(language).id });
  };

  return (
    <>
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
                // Part keys depend on glyph ids, which differ between fonts.
                patch({ fontId, parts: {}, features: [] });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumberField
              key={`fs-${String(run.fontSize)}`}
              id={`${baseId}-size`}
              label={t('editor.properties.fontSize')}
              value={run.fontSize}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              suffix="px"
              onCommit={(fontSize) => {
                // Part offsets are in layout pixels; scale them with the text.
                const ratio = fontSize / run.fontSize;
                patch({
                  fontSize,
                  parts: Object.fromEntries(
                    Object.entries(run.parts).map(([k, o]) => [
                      k,
                      { ...o, dx: o.dx * ratio, dy: o.dy * ratio },
                    ]),
                  ),
                });
              }}
            />
            <NumberField
              key={`lh-${String(run.lineHeight)}`}
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

          <TransformFields layer={run} onPatch={patch} />
          <RemoveButton label={t('editor.properties.removeText')} onClick={actions.deleteSelection} />
        </CardContent>
      </Card>
    </>
  );
}

interface PropertiesPanelProps {
  project: Project;
  artboard: Artboard;
  layouts: ReadonlyMap<string, TextLayout>;
  errors: ReadonlyMap<string, string>;
  flows: StoryFlows;
  actions: EditorActions;
}

export function PropertiesPanel({
  project,
  artboard,
  layouts,
  errors,
  flows,
  actions,
}: PropertiesPanelProps) {
  const { t, i18n } = useTranslation();
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selected = project.layers.filter((l) => selectedIds.includes(l.id));
  const single = selected.length === 1 ? selected[0] : undefined;

  return (
    <>
      {single?.kind === 'text' && (
        <>
          <TextProperties key={single.id} run={single} error={errors.get(single.id)} actions={actions} />
          <PartsPanel run={single} layout={layouts.get(single.id)} actions={actions} />
          <PositionPad actions={actions} />
          <LetterStylesPanel run={single} layout={layouts.get(single.id)} actions={actions} />
          <SpacingCard run={single} actions={actions} />
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle>{t('editor.style.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StyleEditor
                style={single.style}
                onChange={(style) => {
                  actions.patchLayer(single.id, (l) => {
                    if (l.kind === 'text') l.style = style;
                  });
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
      {single?.kind === 'svg' && (
        <>
          <AssetProperties key={single.id} asset={single} actions={actions} />
          <PositionPad actions={actions} />
        </>
      )}
      {single?.kind === 'frame' && (
        <>
          <FramePanel
            key={single.id}
            project={project}
            frame={single}
            flow={flows.stories.get(single.storyId)}
            actions={actions}
          />
          <Card>
            <CardContent className="pt-3">
              <TransformFields
                layer={single}
                onPatch={(changes) => {
                  actions.patchLayer(single.id, (l) => Object.assign(l, changes));
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
      {single?.kind === 'shape' && (
        <>
          <ShapePanel key={single.id} shape={single} actions={actions} />
          <Card>
            <CardContent className="pt-3">
              <TransformFields
                layer={single}
                onPatch={(changes) => {
                  actions.patchLayer(single.id, (l) => Object.assign(l, changes));
                }}
              />
            </CardContent>
          </Card>
          <PositionPad actions={actions} />
        </>
      )}
      {single?.kind === 'image' && (
        <>
          <ImagePanel key={single.id} image={single} actions={actions} />
          <Card>
            <CardContent className="pt-3">
              <TransformFields
                layer={single}
                onPatch={(changes) => {
                  actions.patchLayer(single.id, (l) => Object.assign(l, changes));
                }}
              />
            </CardContent>
          </Card>
          <PositionPad actions={actions} />
        </>
      )}
      {selected.length > 0 && <TextWrapCard layers={selected} actions={actions} />}
      {selected.length > 0 && <ArrangeCard count={selected.length} actions={actions} />}
      {selected.length === 0 && (
        <>
          <ArtboardProperties key={artboard.id} artboard={artboard} actions={actions} />
          <GuidesCard artboard={artboard} actions={actions} />
        </>
      )}
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
