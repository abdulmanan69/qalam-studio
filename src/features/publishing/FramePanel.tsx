import { FileText, Link2, Link2Off, PanelLeft, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { previewFontStack } from '@/features/fonts/font-faces';
import { resolveFont } from '@/features/fonts/registry';
import { MAX_COLUMNS, VERTICAL_ALIGNS, type Project, type TextFrame } from '@/features/projects/schema';
import type { FlowResult } from '@/features/shaping/flow';
import { cn } from '@/lib/utils';

import { NumberField } from '../editor/NumberField';
import { ColorField } from '../editor/StyleEditor';
import type { EditorActions } from '../editor/use-editor-actions';

import { storyFrames, storyWordCount } from './pages';

/** Paragraphs ↔ text: one paragraph per line. */
function toText(paragraphs: readonly { text: string }[]): string {
  return paragraphs.map((p) => p.text).join('\n');
}

interface FramePanelProps {
  project: Project;
  frame: TextFrame;
  flow: FlowResult | undefined;
  actions: EditorActions;
}

/** Story editing, columns and threading of a text frame. */
export function FramePanel({ project, frame, flow, actions }: FramePanelProps) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const story = project.stories.find((s) => s.id === frame.storyId);
  const chain = storyFrames(project, frame.storyId);
  const position = chain.findIndex((f) => f.id === frame.id) + 1;
  const bodyStyle = project.paragraphStyles.find((s) => s.id === story?.paragraphs[0]?.styleId);
  const font = resolveFont(bodyStyle?.fontId ?? 'noto-nastaliq-urdu');

  const storyText = story ? toText(story.paragraphs) : '';
  const [draft, setDraft] = useState(storyText);
  const [seen, setSeen] = useState(storyText);
  if (storyText !== seen) {
    setSeen(storyText);
    setDraft(storyText);
  }

  // Commit typing shortly after it pauses; each line is a paragraph and keeps
  // the style of the paragraph at the same position (new lines inherit it).
  useEffect(() => {
    if (!story || draft === storyText) return;
    const timer = window.setTimeout(() => {
      actions.updateStory(story.id, (s) => {
        const lines = draft.split('\n');
        s.paragraphs = lines.map((text, i) => ({
          text,
          styleId:
            s.paragraphs[i]?.styleId ??
            s.paragraphs[i - 1]?.styleId ??
            s.paragraphs.at(-1)?.styleId ??
            'body',
        }));
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, storyText, story, actions]);

  if (!story) return null;
  const number = new Intl.NumberFormat(i18n.language);
  const patch = (recipe: (f: TextFrame) => void) => {
    actions.patchLayer(frame.id, (layer) => {
      if (layer.kind === 'frame') recipe(layer);
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-1.5">
          <CardTitle>{t('publishing.story')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {flow?.overflow && (
            <div
              role="alert"
              className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs"
            >
              <p className="flex items-center gap-1.5 font-medium text-destructive">
                <TriangleAlert className="size-4" aria-hidden />
                {t('publishing.overflow')}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    actions.addLinkedFrame(chain.at(-1)?.id ?? frame.id, 'nextPage');
                  }}
                >
                  {t('publishing.continueNextPage')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    actions.addLinkedFrame(chain.at(-1)?.id ?? frame.id, 'beside');
                  }}
                >
                  {t('publishing.continueBeside')}
                </Button>
              </div>
            </div>
          )}
          <label htmlFor={`${id}-text`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('publishing.storyText')}
          </label>
          <textarea
            id={`${id}-text`}
            value={draft}
            dir="rtl"
            lang={bodyStyle?.language}
            rows={8}
            spellCheck={false}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            style={{ fontFamily: previewFontStack(font) }}
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base leading-[2.2] text-foreground shadow-card focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <p className="text-[0.6875rem] text-muted-foreground" role="status">
            {t('publishing.words', {
              placed: number.format(flow?.placedWords ?? 0),
              total: number.format(storyWordCount(story)),
            })}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => void actions.importStoryText(story.id)}
          >
            <FileText aria-hidden />
            {t('publishing.importText')}
          </Button>

          <details className="grid gap-1">
            <summary className="cursor-pointer text-xs font-medium">
              {t('publishing.paragraphStyles', { count: story.paragraphs.length })}
            </summary>
            <ol className="mt-1 grid max-h-64 gap-1 overflow-y-auto">
              {story.paragraphs.slice(0, 500).map((paragraph, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-end text-[0.6875rem] text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs" dir="rtl">
                    {paragraph.text || '—'}
                  </span>
                  <select
                    aria-label={t('publishing.paragraphStyle', { index: index + 1 })}
                    value={paragraph.styleId}
                    onChange={(e) => {
                      const styleId = e.target.value;
                      actions.updateStory(story.id, (s) => {
                        const target = s.paragraphs[index];
                        if (target) target.styleId = styleId;
                      });
                    }}
                    className="h-7 max-w-28 rounded-md border border-input bg-card px-1 text-[0.6875rem]"
                  >
                    {project.paragraphStyles.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ol>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1.5">
          <CardTitle>{t('publishing.frame')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              key={`c-${String(frame.columns.count)}`}
              id={`${id}-cols`}
              label={t('publishing.columns')}
              value={frame.columns.count}
              min={1}
              max={MAX_COLUMNS}
              integer
              onCommit={(count) => {
                patch((f) => {
                  f.columns.count = count;
                });
              }}
            />
            <NumberField
              key={`g-${String(frame.columns.gutter)}`}
              id={`${id}-gutter`}
              label={t('publishing.gutter')}
              value={frame.columns.gutter}
              min={0}
              max={500}
              suffix="px"
              onCommit={(gutter) => {
                patch((f) => {
                  f.columns.gutter = gutter;
                });
              }}
            />
            <NumberField
              key={`i-${String(frame.inset)}`}
              id={`${id}-inset`}
              label={t('publishing.inset')}
              value={frame.inset}
              min={0}
              max={500}
              suffix="px"
              onCommit={(inset) => {
                patch((f) => {
                  f.inset = inset;
                });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-bg`}>{t('publishing.background')}</Label>
            <Switch
              id={`${id}-bg`}
              checked={frame.background !== null}
              onCheckedChange={(on) => {
                patch((f) => {
                  f.background = on ? '#f3efe4' : null;
                });
              }}
            />
          </div>
          {frame.background && (
            <ColorField
              id={`${id}-bg-color`}
              label={t('publishing.backgroundColor')}
              value={frame.background}
              onChange={(color) => {
                patch((f) => {
                  f.background = color;
                });
              }}
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-border`}>{t('publishing.border')}</Label>
            <Switch
              id={`${id}-border`}
              checked={frame.border !== null}
              onCheckedChange={(on) => {
                patch((f) => {
                  f.border = on ? { color: '#1a1a1a', width: 1 } : null;
                });
              }}
            />
          </div>
          {frame.border && (
            <div className="grid grid-cols-[1fr_6rem] items-end gap-2">
              <ColorField
                id={`${id}-border-color`}
                label={t('publishing.borderColor')}
                value={frame.border.color}
                onChange={(color) => {
                  patch((f) => {
                    if (f.border) f.border.color = color;
                  });
                }}
              />
              <NumberField
                key={`bw-${String(frame.border.width)}`}
                id={`${id}-border-width`}
                label={t('publishing.borderWidth')}
                value={frame.border.width}
                min={0}
                max={50}
                suffix="px"
                onCommit={(width) => {
                  patch((f) => {
                    if (f.border) f.border.width = width;
                  });
                }}
              />
            </div>
          )}
          {frame.columns.count > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-rule`}>{t('publishing.columnRule')}</Label>
              <Switch
                id={`${id}-rule`}
                checked={Boolean(frame.columnRule)}
                onCheckedChange={(on) => {
                  patch((f) => {
                    f.columnRule = on ? { color: '#1a1a1a', width: 0.75 } : null;
                  });
                }}
              />
            </div>
          )}
          {frame.columns.count > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-balance`}>{t('publishing.balanceColumns')}</Label>
              <Switch
                id={`${id}-balance`}
                checked={frame.balanceColumns ?? false}
                onCheckedChange={(on) => {
                  patch((f) => {
                    f.balanceColumns = on;
                  });
                }}
              />
            </div>
          )}
          {frame.columns.count > 1 && frame.columnRule && (
            <div className="grid grid-cols-[1fr_6rem] items-end gap-2">
              <ColorField
                id={`${id}-rule-color`}
                label={t('publishing.columnRuleColor')}
                value={frame.columnRule.color}
                onChange={(color) => {
                  patch((f) => {
                    if (f.columnRule) f.columnRule.color = color;
                  });
                }}
              />
              <NumberField
                key={`rw-${String(frame.columnRule.width)}`}
                id={`${id}-rule-width`}
                label={t('publishing.borderWidth')}
                value={frame.columnRule.width}
                min={0}
                max={20}
                suffix="px"
                onCommit={(width) => {
                  patch((f) => {
                    if (f.columnRule) f.columnRule.width = width;
                  });
                }}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-ignore-wrap`}>{t('publishing.ignoreWrap')}</Label>
            <Switch
              id={`${id}-ignore-wrap`}
              checked={frame.ignoreWrap ?? false}
              onCheckedChange={(on) => {
                patch((f) => {
                  f.ignoreWrap = on;
                });
              }}
            />
          </div>
          <div className="grid gap-1">
            <span id={`${id}-valign`} className="text-[0.6875rem] font-medium text-muted-foreground">
              {t('publishing.verticalAlign')}
            </span>
            <div role="radiogroup" aria-labelledby={`${id}-valign`} className="grid grid-cols-3 gap-1">
              {VERTICAL_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  role="radio"
                  aria-checked={(frame.verticalAlign ?? 'top') === align}
                  className={cn(
                    'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                    (frame.verticalAlign ?? 'top') === align && 'border-ring bg-accent font-medium',
                  )}
                  onClick={() => {
                    patch((f) => {
                      f.verticalAlign = align;
                    });
                  }}
                >
                  {t(`publishing.valign_${align}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5 border-t border-border pt-2">
            <p className="text-xs" role="status">
              {t('publishing.thread', { position, count: chain.length })}
            </p>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  actions.addLinkedFrame(frame.id, 'nextPage');
                }}
              >
                <Link2 aria-hidden />
                {t('publishing.linkNextPage')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  actions.addLinkedFrame(frame.id, 'beside');
                }}
              >
                <PanelLeft aria-hidden />
                {t('publishing.linkBeside')}
              </Button>
              {chain.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    actions.unlinkFrame(frame.id);
                  }}
                >
                  <Link2Off aria-hidden />
                  {t('publishing.unlink')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
