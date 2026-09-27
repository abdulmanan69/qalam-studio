import {
  Baseline,
  Circle,
  Columns3,
  Hand,
  Image as ImageIcon,
  ImagePlus,
  MousePointer2,
  Minus,
  MoveHorizontal,
  Square,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ShortcutKeys } from '@/components/layout/ShortcutLabel';
import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useEditorStore, type EditorTool } from './editor-store';
import type { EditorActions } from './use-editor-actions';

type ToolId = EditorTool | 'text' | 'placeSvg' | 'placeImage';

interface ToolDef {
  id: ToolId;
  icon: LucideIcon;
  combo: string;
}

const TOOLS: readonly ToolDef[] = [
  { id: 'select', icon: MousePointer2, combo: shortcutCombo('selectTool') },
  { id: 'hand', icon: Hand, combo: shortcutCombo('handTool') },
  { id: 'text', icon: Type, combo: shortcutCombo('textTool') },
  { id: 'kashida', icon: MoveHorizontal, combo: shortcutCombo('kashidaTool') },
  { id: 'baseline', icon: Baseline, combo: shortcutCombo('baselineTool') },
  { id: 'frame', icon: Columns3, combo: shortcutCombo('frameTool') },
  { id: 'placeImage', icon: ImageIcon, combo: shortcutCombo('placeImage') },
  { id: 'placeSvg', icon: ImagePlus, combo: shortcutCombo('placeSvg') },
  { id: 'box', icon: Square, combo: shortcutCombo('boxTool') },
  { id: 'rule', icon: Minus, combo: shortcutCombo('ruleTool') },
  { id: 'ellipse', icon: Circle, combo: shortcutCombo('ellipseTool') },
];

const MODES = new Set<ToolId>(['select', 'hand', 'kashida', 'baseline', 'frame', 'box', 'rule', 'ellipse']);
const HINTS = ['kashida', 'baseline', 'frame', 'box', 'rule', 'ellipse'] as const;
type HintTool = (typeof HINTS)[number];
const hasHint = (tool: EditorTool): tool is HintTool => (HINTS as readonly string[]).includes(tool);

export function ToolsPanel({ actions }: { actions: EditorActions }) {
  const { t } = useTranslation();
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const setTextDialogOpen = useEditorStore((s) => s.setTextDialogOpen);

  const activate = (id: ToolId) => {
    if (id === 'text') setTextDialogOpen(true);
    else if (id === 'placeSvg') void actions.placeSvgFile();
    else if (id === 'placeImage') void actions.placeImageFile();
    else setTool(id);
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.tools.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-2 pb-2">
        <div role="toolbar" aria-label={t('editor.tools.title')} className="grid grid-cols-4 gap-1">
          {TOOLS.map(({ id, icon: Icon, combo }) => {
            const label = t(`editor.tools.${id}`);
            const isMode = MODES.has(id);
            const active = isMode && tool === id;
            return (
              <SimpleTooltip
                key={id}
                side="bottom"
                label={
                  <span className="flex items-center gap-2">
                    {label}
                    <ShortcutKeys combo={combo} />
                  </span>
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  aria-pressed={isMode ? active : undefined}
                  className={cn('w-full', active && 'bg-primary text-primary-foreground hover:bg-primary/90')}
                  onClick={() => {
                    activate(id);
                  }}
                >
                  <Icon aria-hidden />
                </Button>
              </SimpleTooltip>
            );
          })}
        </div>
        {hasHint(tool) && (
          <p className="px-1 text-[0.6875rem] text-muted-foreground" role="status">
            {t(`editor.tools.${tool}Hint`)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
