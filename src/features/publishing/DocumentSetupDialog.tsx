import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getPreset, matchPreset } from '@/features/projects/artboard-presets';
import { PresetSelect } from '@/features/projects/PresetSelect';
import {
  MAX_ARTBOARD_SIZE,
  MAX_COLUMNS,
  MIN_ARTBOARD_SIZE,
  type Artboard,
  type ArtboardPresetId,
  type Project,
} from '@/features/projects/schema';

import { NumberField } from '../editor/NumberField';
import { useEditorStore } from '../editor/editor-store';
import type { EditorActions } from '../editor/use-editor-actions';

/** 1 mm in CSS pixels (96 DPI). */
const MM = 96 / 25.4;
const mm = (px: number) => Math.round((px / MM) * 10) / 10;
const px = (millimetres: number) => Math.round(millimetres * MM * 100) / 100;

function SetupForm({
  project,
  artboard,
  actions,
  onDone,
}: {
  project: Project;
  artboard: Artboard;
  actions: EditorActions;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [presetId, setPresetId] = useState<ArtboardPresetId>(artboard.presetId);
  const [width, setWidth] = useState(artboard.width);
  const [height, setHeight] = useState(artboard.height);
  const m = artboard.margins ?? { top: 48, bottom: 48, left: 48, right: 48 };
  const [margins, setMargins] = useState({ ...m });
  const [useGrid, setUseGrid] = useState(Boolean(artboard.margins || artboard.columns));
  const [columns, setColumns] = useState(artboard.columns?.count ?? 1);
  const [gutter, setGutter] = useState(artboard.columns?.gutter ?? 16);
  const [bleed, setBleed] = useState(artboard.bleed ?? 0);
  const [all, setAll] = useState(true);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targets = all ? project.artboards.map((a) => a.id) : [artboard.id];
    actions.applyPageSetup(targets, {
      presetId: matchPreset(width, height) === presetId ? presetId : matchPreset(width, height),
      width,
      height,
      margins: useGrid ? margins : null,
      columns: useGrid ? { count: columns, gutter } : null,
      bleed,
    });
    onDone();
  };

  const marginField = (side: keyof typeof margins) => (
    <NumberField
      key={`${side}-${String(margins[side])}`}
      id={`${id}-${side}`}
      label={t(`publishing.margin_${side}`)}
      value={mm(margins[side])}
      min={0}
      max={500}
      suffix="mm"
      onCommit={(value) => {
        setMargins((prev) => ({ ...prev, [side]: px(value) }));
      }}
    />
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1">
        <Label htmlFor={`${id}-preset`}>{t('newDesign.size')}</Label>
        <PresetSelect
          id={`${id}-preset`}
          value={presetId}
          showSizes
          onValueChange={(value) => {
            setPresetId(value);
            if (value !== 'custom') {
              const preset = getPreset(value);
              setWidth(preset.width);
              setHeight(preset.height);
            }
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          key={`w-${String(width)}`}
          id={`${id}-w`}
          label={t('newDesign.width')}
          value={mm(width)}
          min={mm(MIN_ARTBOARD_SIZE)}
          max={mm(MAX_ARTBOARD_SIZE)}
          suffix="mm"
          onCommit={(value) => {
            setWidth(Math.round(px(value)));
            setPresetId('custom');
          }}
        />
        <NumberField
          key={`h-${String(height)}`}
          id={`${id}-h`}
          label={t('newDesign.height')}
          value={mm(height)}
          min={mm(MIN_ARTBOARD_SIZE)}
          max={mm(MAX_ARTBOARD_SIZE)}
          suffix="mm"
          onCommit={(value) => {
            setHeight(Math.round(px(value)));
            setPresetId('custom');
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-grid`}>{t('publishing.marginsAndColumns')}</Label>
        <Switch id={`${id}-grid`} checked={useGrid} onCheckedChange={setUseGrid} />
      </div>
      {useGrid && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {marginField('top')}
            {marginField('bottom')}
            {marginField('right')}
            {marginField('left')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              key={`c-${String(columns)}`}
              id={`${id}-cols`}
              label={t('publishing.columns')}
              value={columns}
              min={1}
              max={MAX_COLUMNS}
              integer
              onCommit={setColumns}
            />
            <NumberField
              key={`g-${String(gutter)}`}
              id={`${id}-gutter`}
              label={t('publishing.gutter')}
              value={mm(gutter)}
              min={0}
              max={100}
              suffix="mm"
              onCommit={(value) => {
                setGutter(px(value));
              }}
            />
          </div>
        </>
      )}
      <NumberField
        key={`b-${String(bleed)}`}
        id={`${id}-bleed`}
        label={t('publishing.bleed')}
        value={mm(bleed)}
        min={0}
        max={20}
        suffix="mm"
        onCommit={(value) => {
          setBleed(px(value));
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${id}-all`}>{t('publishing.applyAllPages')}</Label>
        <Switch id={`${id}-all`} checked={all} onCheckedChange={setAll} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}

/** Page size, margins, column grid and bleed for print documents. */
export function DocumentSetupDialog({
  project,
  artboard,
  actions,
}: {
  project: Project;
  artboard: Artboard;
  actions: EditorActions;
}) {
  const { t } = useTranslation();
  const open = useEditorStore((s) => s.setupDialogOpen);
  const setOpen = useEditorStore((s) => s.setSetupDialogOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('publishing.setupTitle')}</DialogTitle>
          <DialogDescription>{t('publishing.setupDescription')}</DialogDescription>
        </DialogHeader>
        {open && (
          <SetupForm
            project={project}
            artboard={artboard}
            actions={actions}
            onDone={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
