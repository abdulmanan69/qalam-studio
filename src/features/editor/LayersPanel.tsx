import { Eye, EyeOff, Frame, Image as ImageIcon, Type, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Artboard, SvgAsset, TextRun } from '@/features/projects/schema';
import { textRunLabel } from '@/features/projects/text-runs';
import { cn } from '@/lib/utils';

import { useEditorStore } from './editor-store';

interface LayersPanelProps {
  artboard: Artboard;
  assets: readonly SvgAsset[];
  texts: readonly TextRun[];
  onToggleHidden: (layerId: string) => void;
}

interface LayerRow {
  id: string;
  label: string;
  icon: LucideIcon;
  hidden: boolean;
  rtl: boolean;
}

export function LayersPanel({ artboard, assets, texts, onToggleHidden }: LayersPanelProps) {
  const { t } = useTranslation();
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);

  // Top-most layer first (text paints above artwork), like every layers panel.
  const rows: LayerRow[] = [
    ...[...texts].reverse().map((run) => ({
      id: run.id,
      label: textRunLabel(run.text) || t('editor.layers.untitledText'),
      icon: Type,
      hidden: run.hidden,
      rtl: true,
    })),
    ...[...assets].reverse().map((asset) => ({
      id: asset.id,
      label: asset.name || t('editor.layers.untitledArtwork'),
      icon: ImageIcon,
      hidden: asset.hidden,
      rtl: false,
    })),
  ];

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.layers.title')}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 overflow-y-auto px-2 pb-2">
        <ul aria-label={t('editor.layers.title')} className="grid gap-0.5">
          <li>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start hover:bg-accent',
                selectedId === null && 'bg-accent font-medium',
              )}
              aria-current={selectedId === null ? 'true' : undefined}
              onClick={() => {
                select(null);
              }}
            >
              <Frame className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate" dir="auto">
                {artboard.name}
              </span>
            </button>
            <ul className="mt-0.5 grid gap-0.5 ps-4">
              {rows.length === 0 && (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">{t('editor.layers.empty')}</li>
              )}
              {rows.map(({ id, label, icon: Icon, hidden, rtl }) => {
                const selected = id === selectedId;
                return (
                  <li key={id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-start hover:bg-accent',
                        selected && 'bg-accent font-medium',
                        hidden && 'text-muted-foreground',
                      )}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => {
                        select(id);
                      }}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate" dir={rtl ? 'rtl' : 'auto'}>
                        {label}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        hidden
                          ? t('editor.layers.show', { name: label })
                          : t('editor.layers.hide', { name: label })
                      }
                      onClick={() => {
                        onToggleHidden(id);
                      }}
                    >
                      {hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
