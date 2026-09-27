import { Copy, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { FontSelect } from '@/features/fonts/FontSelect';
import { defaultFontFor, getFont } from '@/features/fonts/registry';
import {
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  PARAGRAPH_ALIGNS,
  type ParagraphStyle,
  type Project,
  type TextLanguage,
} from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { NumberField } from '../editor/NumberField';
import { ColorField } from '../editor/StyleEditor';
import { LanguageSelect } from '../editor/text/LanguageSelect';
import type { EditorActions } from '../editor/use-editor-actions';

function StyleForm({ style, actions }: { style: ParagraphStyle; actions: EditorActions }) {
  const { t } = useTranslation();
  const id = useId();
  const [name, setName] = useState(style.name);
  const patch = (changes: Partial<Omit<ParagraphStyle, 'id'>>) => {
    actions.updateParagraphStyle(style.id, changes);
  };

  return (
    <div className="grid gap-3 rounded-md border border-border p-2">
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="text-[0.6875rem] font-medium text-muted-foreground">
          {t('publishing.styleName')}
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={120}
          dir="auto"
          onChange={(e) => {
            setName(e.target.value);
          }}
          onBlur={() => {
            const next = name.trim();
            if (next && next !== style.name) patch({ name: next });
            else setName(style.name);
          }}
          className="h-8 rounded-md border border-input bg-card px-2 text-xs"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-lang`} className="text-[0.6875rem] font-medium text-muted-foreground">
          {t('editor.properties.language')}
        </label>
        <LanguageSelect
          id={`${id}-lang`}
          value={style.language}
          onValueChange={(language: TextLanguage) => {
            const supported = getFont(style.fontId)?.languages.includes(language) ?? false;
            patch(supported ? { language } : { language, fontId: defaultFontFor(language).id });
          }}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-font`} className="text-[0.6875rem] font-medium text-muted-foreground">
          {t('editor.properties.font')}
        </label>
        <FontSelect
          id={`${id}-font`}
          value={style.fontId}
          language={style.language}
          onValueChange={(fontId) => {
            patch({ fontId });
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          key={`fs-${String(style.fontSize)}`}
          id={`${id}-size`}
          label={t('editor.properties.fontSize')}
          value={style.fontSize}
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          suffix="px"
          onCommit={(fontSize) => {
            patch({ fontSize });
          }}
        />
        <NumberField
          key={`lh-${String(style.lineHeight)}`}
          id={`${id}-lh`}
          label={t('editor.properties.lineHeight')}
          value={style.lineHeight}
          min={MIN_LINE_HEIGHT}
          max={MAX_LINE_HEIGHT}
          suffix="×"
          onCommit={(lineHeight) => {
            patch({ lineHeight });
          }}
        />
      </div>
      <div className="grid gap-1">
        <span id={`${id}-align`} className="text-[0.6875rem] font-medium text-muted-foreground">
          {t('editor.properties.align')}
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-align`} className="grid grid-cols-4 gap-1">
          {PARAGRAPH_ALIGNS.map((align) => (
            <button
              key={align}
              type="button"
              role="radio"
              aria-checked={style.align === align}
              className={cn(
                'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                style.align === align && 'border-ring bg-accent font-medium',
              )}
              onClick={() => {
                patch({ align });
              }}
            >
              {t(`publishing.align_${align}`)}
            </button>
          ))}
        </div>
      </div>
      {style.align === 'justify' && (
        <div className="grid gap-1">
          <span id={`${id}-justify`} className="text-[0.6875rem] font-medium text-muted-foreground">
            {t('publishing.justifyWith')}
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-justify`} className="grid grid-cols-2 gap-1">
            {(['kashida', 'space'] as const).map((method) => (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={style.justify === method}
                className={cn(
                  'h-7 rounded-md border border-input px-1 text-[0.6875rem] hover:bg-accent',
                  style.justify === method && 'border-ring bg-accent font-medium',
                )}
                onClick={() => {
                  patch({ justify: method });
                }}
              >
                {t(`publishing.justify_${method}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          key={`fi-${String(style.firstIndent)}`}
          id={`${id}-indent`}
          label={t('publishing.firstIndent')}
          value={style.firstIndent}
          min={0}
          max={10}
          suffix="em"
          onCommit={(firstIndent) => {
            patch({ firstIndent });
          }}
        />
        <NumberField
          key={`sb-${String(style.spaceBefore)}`}
          id={`${id}-before`}
          label={t('publishing.spaceBefore')}
          value={style.spaceBefore}
          min={0}
          max={1000}
          suffix="px"
          onCommit={(spaceBefore) => {
            patch({ spaceBefore });
          }}
        />
        <NumberField
          key={`sa-${String(style.spaceAfter)}`}
          id={`${id}-after`}
          label={t('publishing.spaceAfter')}
          value={style.spaceAfter}
          min={0}
          max={1000}
          suffix="px"
          onCommit={(spaceAfter) => {
            patch({ spaceAfter });
          }}
        />
      </div>
      <ColorField
        id={`${id}-color`}
        label={t('editor.properties.fill')}
        value={style.color}
        onChange={(color) => {
          patch({ color });
        }}
      />
    </div>
  );
}

/** Named paragraph styles (body, headline, caption…) used by stories. */
export function ParagraphStylesPanel({ project, actions }: { project: Project; actions: EditorActions }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(project.paragraphStyles[0]?.id ?? '');
  const style = project.paragraphStyles.find((s) => s.id === selected) ?? project.paragraphStyles[0];

  return (
    <div className="grid gap-2">
      <ul aria-label={t('publishing.styles')} className="grid gap-0.5">
        {project.paragraphStyles.map((s) => (
          <li key={s.id} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={s.id === style?.id}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-xs hover:bg-accent',
                s.id === style?.id && 'bg-accent font-medium',
              )}
              onClick={() => {
                setSelected(s.id);
              }}
            >
              <span className="truncate" dir="auto">
                {s.name}
              </span>
              <span className="shrink-0 text-[0.625rem] text-muted-foreground tabular-nums">
                {s.fontSize}px
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              aria-label={t('publishing.duplicateStyle', { name: s.name })}
              onClick={() => {
                const id = actions.addParagraphStyle(s.id);
                if (id) setSelected(id);
              }}
            >
              <Copy aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              disabled={project.paragraphStyles.length <= 1}
              aria-label={t('publishing.deleteStyle', { name: s.name })}
              onClick={() => {
                actions.deleteParagraphStyle(s.id);
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {style && <StyleForm key={style.id} style={style} actions={actions} />}
      <p className="text-[0.6875rem] text-muted-foreground">{t('publishing.stylesHint')}</p>
    </div>
  );
}
