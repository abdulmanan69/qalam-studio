import { FilePlus2, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useUiStore } from '@/app/ui-store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { layoutRequestFor, tryGetShapingClient } from '@/features/editor/canvas/use-text-layouts';
import { renderArtboardSvg } from '@/features/editor/export/render-svg';
import { saveNewProject } from '@/features/projects/repository';
import type { TextLayout } from '@/features/shaping/types';
import { useDocumentTitle } from '@/lib/use-document-title';

import {
  instantiateTemplate,
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type MeasureText,
  type TemplateDef,
} from './templates';

const measure: MeasureText = async (run) => {
  const client = tryGetShapingClient();
  if (!client) return null;
  try {
    return await client.layout(layoutRequestFor(run));
  } catch {
    return null;
  }
};

/** SVG data URL of a template, rendered with the real fonts (as outlines). */
async function previewUrl(template: TemplateDef): Promise<string> {
  const project = await instantiateTemplate(template, 'preview', measure);
  const layouts = new Map<string, TextLayout>();
  for (const layer of project.layers) {
    if (layer.kind !== 'text') continue;
    const layout = await measure(layer);
    if (layout) layouts.set(layer.id, layout);
  }
  const artboard = project.artboards[0];
  if (!artboard) return '';
  const svg = renderArtboardSvg(artboard, project.layers, layouts);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function TemplateCard({ template }: { template: TemplateDef }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = t(`templates.items.${template.id}`);

  useEffect(() => {
    let active = true;
    previewUrl(template).then(
      (url) => {
        if (active) setPreview(url);
      },
      (error: unknown) => {
        console.warn('Template preview failed', error);
      },
    );
    return () => {
      active = false;
    };
  }, [template]);

  const use = async () => {
    setBusy(true);
    try {
      const project = await saveNewProject(
        await instantiateTemplate(template, name, measure, t('projects.defaultArtboardName', { index: 1 })),
      );
      void navigate(`/editor/${project.id}`);
    } catch (error) {
      console.error(error);
      toast.error(t('templates.failed'));
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex h-44 items-center justify-center border-b border-border bg-surface-sunken p-3">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="max-h-full max-w-full shadow-card"
            style={{ aspectRatio: `${String(template.width)} / ${String(template.height)}` }}
          />
        ) : (
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
      <CardHeader className="flex-1">
        <CardTitle as="h3">{name}</CardTitle>
        <CardDescription>
          {t('templates.size', { width: template.width, height: template.height })}
        </CardDescription>
        <Button size="sm" className="mt-2 justify-self-start" disabled={busy} onClick={() => void use()}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {t('templates.use')}
        </Button>
      </CardHeader>
    </Card>
  );
}

export function TemplatesPage() {
  const { t } = useTranslation();
  const openDialog = useUiStore((s) => s.openDialog);
  useDocumentTitle(t('templates.title'));

  return (
    <>
      <PageHeader
        title={t('templates.title')}
        actions={
          <Button
            size="sm"
            onClick={() => {
              openDialog('newDesign');
            }}
          >
            <FilePlus2 aria-hidden />
            {t('templates.startBlank')}
          </Button>
        }
      />
      <div className="grid gap-8 p-4 sm:p-6">
        <p className="max-w-2xl text-muted-foreground">{t('templates.intro')}</p>
        {TEMPLATE_CATEGORIES.map((category) => (
          <section key={category} aria-labelledby={`tpl-${category}`} className="grid gap-3">
            <div>
              <h2 id={`tpl-${category}`} className="text-base font-semibold">
                {t(`templates.categories.${category}.title`)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`templates.categories.${category}.description`)}
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {TEMPLATES.filter((tpl) => tpl.category === category).map((template) => (
                <li key={template.id}>
                  <TemplateCard template={template} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
