import { LoaderCircle } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import type { Artboard, Project, TextRun } from '@/features/projects/schema';
import type { TextLayout } from '@/features/shaping/types';
import { downloadBlob } from '@/lib/files';
import { cn, toSafeFileName } from '@/lib/utils';

import { layoutRequestFor, tryGetShapingClient } from './canvas/use-text-layouts';
import { useEditorStore } from './editor-store';
import { renderPdf } from './export/pdf';
import { fitCanvasSize, renderPng, scaleForDpi } from './export/png';
import { renderArtboardSvg } from './export/render-svg';

type Format = 'png' | 'svg' | 'pdf';
type Resolution = '1' | '2' | '4' | 'dpi';

/** Shape every text layer of the given artboards (cached layouts return at once). */
async function layoutsFor(
  project: Project,
  artboardIds: ReadonlySet<string>,
): Promise<Map<string, TextLayout>> {
  const client = tryGetShapingClient();
  const layouts = new Map<string, TextLayout>();
  if (!client) return layouts;
  const runs = project.layers.filter(
    (l): l is TextRun => l.kind === 'text' && artboardIds.has(l.artboardId) && !l.hidden,
  );
  const results = await Promise.all(runs.map((run) => client.layout(layoutRequestFor(run))));
  runs.forEach((run, i) => {
    const layout = results[i];
    if (layout) layouts.set(run.id, layout);
  });
  return layouts;
}

function ExportForm({
  project,
  artboard,
  onDone,
}: {
  project: Project;
  artboard: Artboard;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [format, setFormat] = useState<Format>('png');
  const [resolution, setResolution] = useState<Resolution>('2');
  const [dpi, setDpi] = useState(300);
  const [transparent, setTransparent] = useState(false);
  const [allArtboards, setAllArtboards] = useState(false);
  const [busy, setBusy] = useState(false);

  const scale = resolution === 'dpi' ? scaleForDpi(dpi) : Number(resolution);
  const outputDpi = resolution === 'dpi' ? dpi : 96 * Number(resolution);
  const size = fitCanvasSize(artboard.width, artboard.height, scale);
  const artboards = allArtboards ? project.artboards : [artboard];

  const run = async () => {
    setBusy(true);
    try {
      const layouts = await layoutsFor(project, new Set(artboards.map((a) => a.id)));
      const base = toSafeFileName(project.name);
      const suffix = (a: Artboard) => (artboards.length > 1 ? `-${toSafeFileName(a.name)}` : '');
      const svgOf = (a: Artboard, transparentBg: boolean) =>
        renderArtboardSvg(a, project.layers, layouts, { transparent: transparentBg });
      if (format === 'pdf') {
        const blob = await renderPdf(
          artboards.map((a) => ({ svg: svgOf(a, false), width: a.width, height: a.height })),
          project.name,
        );
        downloadBlob(blob, `${base}.pdf`);
      } else {
        for (const a of artboards) {
          if (format === 'svg') {
            downloadBlob(
              new Blob([svgOf(a, transparent)], { type: 'image/svg+xml' }),
              `${base}${suffix(a)}.svg`,
            );
          } else {
            const blob = await renderPng(svgOf(a, transparent), {
              width: a.width,
              height: a.height,
              scale,
              dpi: outputDpi,
            });
            downloadBlob(blob, `${base}${suffix(a)}.png`);
          }
        }
      }
      toast.success(t('editor.export.done'));
      onDone();
    } catch (error) {
      console.error(error);
      toast.error(t('editor.export.failed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run();
  };

  const choice = <T extends string>(value: T, current: T, set: (v: T) => void, label: string) => (
    <button
      key={value}
      type="button"
      role="radio"
      aria-checked={current === value}
      className={cn(
        'h-8 flex-1 rounded-md border border-input px-2 text-xs hover:bg-accent',
        current === value && 'border-ring bg-accent font-medium',
      )}
      onClick={() => {
        set(value);
      }}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <span id={`${id}-format`} className="text-xs font-medium">
          {t('editor.export.format')}
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-format`} className="flex gap-1">
          {choice<Format>('png', format, setFormat, 'PNG')}
          {choice<Format>('svg', format, setFormat, 'SVG')}
          {choice<Format>('pdf', format, setFormat, 'PDF')}
        </div>
        <p className="text-[0.6875rem] text-muted-foreground">{t(`editor.export.formatHint_${format}`)}</p>
      </div>

      {format === 'png' && (
        <div className="grid gap-1.5">
          <span id={`${id}-res`} className="text-xs font-medium">
            {t('editor.export.resolution')}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-res`} className="flex gap-1">
            {choice<Resolution>('1', resolution, setResolution, '1×')}
            {choice<Resolution>('2', resolution, setResolution, '2×')}
            {choice<Resolution>('4', resolution, setResolution, '4×')}
            {choice<Resolution>('dpi', resolution, setResolution, t('editor.export.customDpi'))}
          </div>
          {resolution === 'dpi' && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`${id}-dpi`}>DPI</Label>
              <input
                id={`${id}-dpi`}
                type="number"
                min={36}
                max={1200}
                value={dpi}
                onChange={(e) => {
                  setDpi(Math.min(1200, Math.max(36, Number(e.target.value) || 96)));
                }}
                className="h-8 w-24 rounded-md border border-input bg-card px-2 text-xs"
              />
            </div>
          )}
          <p className="text-[0.6875rem] text-muted-foreground" role="status">
            {t('editor.export.pixels', {
              width: size.width,
              height: size.height,
              dpi: Math.round(outputDpi),
            })}
            {size.scale < scale - 1e-6 && ` · ${t('editor.export.clamped')}`}
          </p>
        </div>
      )}

      {format !== 'pdf' && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-transparent`}>{t('editor.export.transparent')}</Label>
          <Switch id={`${id}-transparent`} checked={transparent} onCheckedChange={setTransparent} />
        </div>
      )}

      {project.artboards.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-all`}>
            {t('editor.export.allArtboards', { count: project.artboards.length })}
          </Label>
          <Switch id={`${id}-all`} checked={allArtboards} onCheckedChange={setAllArtboards} />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {t('editor.export.run')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ExportDialog({ project, artboard }: { project: Project; artboard: Artboard }) {
  const { t } = useTranslation();
  const open = useEditorStore((s) => s.exportDialogOpen);
  const setOpen = useEditorStore((s) => s.setExportDialogOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editor.export.title')}</DialogTitle>
          <DialogDescription>{t('editor.export.description')}</DialogDescription>
        </DialogHeader>
        {open && (
          <ExportForm
            project={project}
            artboard={artboard}
            onDone={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
