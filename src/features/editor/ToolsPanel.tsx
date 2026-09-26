import { Baseline, Hand, MousePointer2, MoveHorizontal, Type, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ShortcutKeys } from '@/components/layout/ShortcutLabel';
import { shortcutCombo } from '@/components/layout/shortcuts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useEditorStore } from './editor-store';

type ToolId = 'select' | 'hand' | 'text' | 'baseline' | 'kashida';

interface ToolDef {
  id: ToolId;
  icon: LucideIcon;
  combo?: string;
  available: boolean;
}

const TOOLS: readonly ToolDef[] = [
  { id: 'select', icon: MousePointer2, combo: shortcutCombo('selectTool'), available: true },
  { id: 'hand', icon: Hand, combo: shortcutCombo('handTool'), available: true },
  { id: 'text', icon: Type, combo: shortcutCombo('textTool'), available: true },
  { id: 'baseline', icon: Baseline, available: false },
  { id: 'kashida', icon: MoveHorizontal, available: false },
];

export function ToolsPanel() {
  const { t } = useTranslation();
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const setTextDialogOpen = useEditorStore((s) => s.setTextDialogOpen);

  const activate = (id: ToolId) => {
    if (id === 'select' || id === 'hand') setTool(id);
    else if (id === 'text') setTextDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle>{t('editor.tools.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div role="toolbar" aria-label={t('editor.tools.title')} className="grid grid-cols-5 gap-1">
          {TOOLS.map(({ id, icon: Icon, combo, available }) => {
            const label = t(`editor.tools.${id}`);
            const isMode = id === 'select' || id === 'hand';
            const active = isMode && tool === id;
            return (
              <SimpleTooltip
                key={id}
                side="bottom"
                label={
                  <span className="flex items-center gap-2">
                    {label}
                    {available ? (
                      combo && <ShortcutKeys combo={combo} />
                    ) : (
                      <span>· {t('common.comingSoon')}</span>
                    )}
                  </span>
                }
              >
                {/* aria-disabled (not disabled) keeps the tooltip reachable by keyboard and pointer. */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  aria-pressed={isMode ? active : undefined}
                  aria-disabled={!available}
                  className={cn(
                    'w-full',
                    active && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    !available && 'cursor-not-allowed opacity-45 hover:bg-transparent',
                  )}
                  onClick={() => {
                    if (available) activate(id);
                  }}
                >
                  <Icon aria-hidden />
                </Button>
              </SimpleTooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
