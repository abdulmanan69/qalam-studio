import { ArrowLeftRight } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useAppDialog } from '@/app/ui-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleTooltip } from '@/components/ui/tooltip';

import { DEFAULT_PRESET_ID, getPreset, matchPreset, parseDimension } from './artboard-presets';
import { PresetSelect } from './PresetSelect';
import { createProject } from './repository';
import { MAX_ARTBOARD_SIZE, MAX_NAME_LENGTH, MIN_ARTBOARD_SIZE, type ArtboardPresetId } from './schema';

/** Proportional thumbnail of the artboard being created. */
function AspectPreview({ width, height, background }: { width: number; height: number; background: string }) {
  const box = 96;
  const scale = box / Math.max(width, height);
  return (
    <div
      className="checkerboard flex size-28 shrink-0 items-center justify-center rounded-md border border-border"
      aria-hidden
    >
      <div
        className="border border-border shadow-card"
        style={{ width: Math.max(4, width * scale), height: Math.max(4, height * scale), background }}
      />
    </div>
  );
}

function NewDesignForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const nameId = useId();
  const presetFieldId = useId();
  const widthId = useId();
  const heightId = useId();
  const bgId = useId();
  const errorId = useId();

  const initial = getPreset(DEFAULT_PRESET_ID);
  const [name, setName] = useState('');
  const [presetId, setPresetId] = useState<ArtboardPresetId>(DEFAULT_PRESET_ID);
  const [width, setWidth] = useState(String(initial.width));
  const [height, setHeight] = useState(String(initial.height));
  const [background, setBackground] = useState('#ffffff');
  const [submitting, setSubmitting] = useState(false);

  const w = parseDimension(width);
  const h = parseDimension(height);
  const sizeInvalid = w === null || h === null;

  const syncPreset = (nextW: string, nextH: string) => {
    const pw = parseDimension(nextW);
    const ph = parseDimension(nextH);
    setPresetId(pw !== null && ph !== null ? matchPreset(pw, ph) : 'custom');
  };

  const onPresetChange = (value: ArtboardPresetId) => {
    setPresetId(value);
    if (value !== 'custom') {
      const preset = getPreset(value);
      setWidth(String(preset.width));
      setHeight(String(preset.height));
    }
  };

  const swapOrientation = () => {
    setWidth(height);
    setHeight(width);
    syncPreset(height, width);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (w === null || h === null || submitting) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim() || t('projects.untitled'),
        presetId,
        width: w,
        height: h,
        background,
        artboardName: t('projects.defaultArtboardName', { index: 1 }),
      });
      onDone();
      void navigate(`/editor/${project.id}`);
    } catch (error) {
      console.error(error);
      toast.error(t('projects.toast.createFailed'), { description: t('projects.toast.unexpected') });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{t('newDesign.title')}</DialogTitle>
        <DialogDescription>{t('newDesign.description')}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>{t('newDesign.name')}</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder={t('projects.untitled')}
          onChange={(e) => {
            setName(e.target.value);
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- first field of a modal the user just opened
          autoFocus
          dir="auto"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="grid flex-1 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={presetFieldId}>{t('newDesign.size')}</Label>
            <PresetSelect id={presetFieldId} value={presetId} onValueChange={onPresetChange} />
          </div>

          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor={widthId}>{t('newDesign.width')}</Label>
              <Input
                id={widthId}
                inputMode="numeric"
                value={width}
                aria-invalid={w === null}
                aria-describedby={sizeInvalid ? errorId : undefined}
                onChange={(e) => {
                  setWidth(e.target.value);
                  syncPreset(e.target.value, height);
                }}
              />
            </div>
            <SimpleTooltip label={t('newDesign.swap')}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swapOrientation}
                aria-label={t('newDesign.swap')}
              >
                <ArrowLeftRight aria-hidden />
              </Button>
            </SimpleTooltip>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor={heightId}>{t('newDesign.height')}</Label>
              <Input
                id={heightId}
                inputMode="numeric"
                value={height}
                aria-invalid={h === null}
                aria-describedby={sizeInvalid ? errorId : undefined}
                onChange={(e) => {
                  setHeight(e.target.value);
                  syncPreset(width, e.target.value);
                }}
              />
            </div>
          </div>
          {sizeInvalid && (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {t('newDesign.sizeError', { min: MIN_ARTBOARD_SIZE, max: MAX_ARTBOARD_SIZE })}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              id={bgId}
              type="color"
              value={background}
              onChange={(e) => {
                setBackground(e.target.value);
              }}
              className="h-8 w-10 cursor-pointer rounded-md border border-input bg-card p-0.5"
            />
            <Label htmlFor={bgId}>{t('newDesign.background')}</Label>
            <span className="font-mono text-xs text-muted-foreground uppercase">{background}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <AspectPreview width={w ?? 1} height={h ?? 1} background={background} />
          <span className="text-xs text-muted-foreground" dir="ltr">
            {w ?? '—'} × {h ?? '—'} px
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={sizeInvalid || submitting}>
          {t('newDesign.create')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function NewDesignDialog() {
  const { t } = useTranslation();
  const { open, onOpenChange } = useAppDialog('newDesign');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" closeLabel={t('common.close')}>
        {open && (
          <NewDesignForm
            onDone={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
