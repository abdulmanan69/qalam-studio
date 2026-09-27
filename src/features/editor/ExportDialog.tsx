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
import {
  masterLayersFor,
  pageNumber,
  pagesOf,
  substitutePageTokens,
  wrapTextLayers,
} from '@/features/publishing/pages';
import { computeStoryFlows } from '@/features/publishing/use-story-flows';
import type { TextLayout } from '@/features/shaping/types';
import { downloadBlob } from '@/lib/files';
import { cn, toSafeFileName } from '@/lib/utils';

import { layoutRequestFor, tryGetShapingClient } from './canvas/use-text-layouts';
import { useEditorStore } from './editor-store';
import { renderPdf } from './export/pdf';
import { fitCanvasSize, renderPng, scaleForDpi } from './export/png';
import { printMargin, renderArtboardSvg } from './export/render-svg';

type Format = 'png' | 'svg' | 'pdf';
type Resolution = '1' | '2' | '4' | 'dpi';

/** Shape text runs (cached layouts return at once). */
async function shapeRuns(runs: readonly TextRun[]): Promise<Map<string, TextLayout>> {
  const client = tryGetShapingClient();
  const layouts = new Map<string, TextLayout>();
  if (!client) return layouts;
  const results = await Promise.all(runs.map((run) => client.layout(layoutRequestFor(run))));
  runs.forEach((run, i) => {
    const layout = results[i];
    if (layout) layouts.set(run.id, layout);
  });
  return layouts;
}

/** Layouts for one page: its text, its master's text (page numbers filled in) and wrapped text. */
function pageLayouts(project: Project, page: Artboard): Promise<Map<string, TextLayout>> {
  const number = pageNumber(project, page.id);
  const count = pagesOf(project).length;
  const seen = new Set<string>();
  const runs: TextRun[] = [];
  const candidates = [
    ...masterLayersFor(project, page),
    ...project.layers.filter((l) => l.artboardId === page.id),
    ...wrapTextLayers(project),
  ];
  for (const layer of candidates) {
    if (layer.kind !== 'text' || layer.hidden || seen.has(layer.id)) continue;
    seen.add(layer.id);
    runs.push({ ...layer, text: substitutePageTokens(layer.text, number, count, layer.language) });
  }
  return shapeRuns(runs);
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
  const pages = pagesOf(project);
  // Multi-page documents export every page by default.
  const [allArtboards, setAllArtboards] = useState(pages.length > 1 && !artboard.master);
  const [printMarks, setPrintMarks] = useState((artboard.bleed ?? 0) > 0);
  const [busy, setBusy] = useState(false);

  const scale = resolution === 'dpi' ? scaleForDpi(dpi) : Number(resolution);
  const outputDpi = resolution === 'dpi' ? dpi : 96 * Number(resolution);
  const size = fitCanvasSize(artboard.width, artboard.height, scale);
  const artboards = allArtboards && !artboard.master ? pages : [artboard];

  const run = async () => {
    setBusy(true);
    try {
      const wrapLayouts = await shapeRuns(wrapTextLayers(project));
      const flows = (await computeStoryFlows(project, wrapLayouts)).frames;
      const base = toSafeFileName(project.name);
      const suffix = (a: Artboard) => (artboards.length > 1 ? `-${toSafeFileName(a.name)}` : '');
      const svgOf = async (a: Artboard, transparentBg: boolean, marks: boolean) =>
        renderArtboardSvg(a, project.layers, await pageLayouts(project, a), {
          transparent: transparentBg,
          flows,
          masterLayers: masterLayersFor(project, a),
          printMarks: marks,
        });
      if (format === 'pdf') {
        const rendered = [];
        for (const a of artboards) {
          const margin = printMarks ? printMargin(a) * 2 : 0;
          rendered.push({
            svg: await svgOf(a, false, printMarks),
            width: a.width + margin,
            height: a.height + margin,
          });
        }
        downloadBlob(await renderPdf(rendered, project.name), `${base}.pdf`);
      } else {
        for (const a of artboards) {
          if (format === 'svg') {
            downloadBlob(
              new Blob([await svgOf(a, transparent, false)], { type: 'image/svg+xml' }),
              `${base}${suffix(a)}.svg`,
            );
          } else {
            const blob = await renderPng(await svgOf(a, transparent, false), {
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

      {pages.length > 1 && !artboard.master && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-all`}>{t('editor.export.allArtboards', { count: pages.length })}</Label>
          <Switch id={`${id}-all`} checked={allArtboards} onCheckedChange={setAllArtboards} />
        </div>
      )}

      {format === 'pdf' && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-marks`}>{t('publishing.printMarks')}</Label>
          <Switch id={`${id}-marks`} checked={printMarks} onCheckedChange={setPrintMarks} />
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
