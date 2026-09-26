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
import { FontSelect } from '@/features/fonts/FontSelect';
import { defaultFontFor, getFont, resolveFont } from '@/features/fonts/registry';
import type { Artboard, TextLanguage, TextRun } from '@/features/projects/schema';
import {
  centeredPosition,
  createTextRun,
  defaultFontSize,
  fitFontSize,
  normalizeText,
} from '@/features/projects/text-runs';

import { layoutRequestFor, tryGetShapingClient } from '../canvas/use-text-layouts';
import { useEditorStore } from '../editor-store';

import { LanguageSelect } from './LanguageSelect';
import { TextInput } from './TextInput';

interface AddTextFormProps {
  artboard: Artboard;
  onAdd: (run: TextRun) => void;
  onDone: () => void;
}

function AddTextForm({ artboard, onAdd, onDone }: AddTextFormProps) {
  const { t } = useTranslation();
  const textId = useId();
  const languageId = useId();
  const fontFieldId = useId();
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<TextLanguage>('ur');
  const [fontId, setFontId] = useState(() => defaultFontFor('ur').id);
  const [submitting, setSubmitting] = useState(false);
  const normalized = normalizeText(text);

  const onLanguageChange = (next: TextLanguage) => {
    setLanguage(next);
    if (!getFont(fontId)?.languages.includes(next)) setFontId(defaultFontFor(next).id);
  };

  const submit = async () => {
    if (!normalized || submitting) return;
    setSubmitting(true);
    const font = resolveFont(fontId);
    let fontSize = defaultFontSize(artboard);
    let position = { x: Math.round(artboard.width * 0.1), y: Math.round(artboard.height * 0.4) };
    const client = tryGetShapingClient();
    if (client) {
      try {
        // Measure once to fit the text on the artboard and center it.
        const layout = await client.layout(
          layoutRequestFor({
            fontId: font.id,
            text: normalized,
            language,
            fontSize,
            lineHeight: font.lineHeight,
            align: 'start',
            kashida: {},
            features: [],
          }),
        );
        const fitted = fitFontSize(fontSize, layout.width, artboard);
        const scale = fitted / fontSize;
        position = centeredPosition(artboard, layout.width * scale, layout.height * scale);
        fontSize = fitted;
      } catch (error) {
        console.warn('Could not measure text before placing it', error);
      }
    }
    onAdd(
      createTextRun({
        artboardId: artboard.id,
        text: normalized,
        fontId: font.id,
        language,
        fontSize,
        lineHeight: font.lineHeight,
        ...position,
      }),
    );
    onDone();
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form onSubmit={onFormSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t('textDialog.title')}</DialogTitle>
        <DialogDescription>{t('textDialog.description')}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={languageId}>{t('editor.properties.language')}</Label>
          <LanguageSelect id={languageId} value={language} onValueChange={onLanguageChange} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={fontFieldId}>{t('editor.properties.font')}</Label>
          <FontSelect id={fontFieldId} value={fontId} language={language} onValueChange={setFontId} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={textId}>{t('editor.properties.text')}</Label>
        <TextInput
          id={textId}
          value={text}
          onValueChange={setText}
          language={language}
          fontId={fontId}
          rows={3}
          placeholder={t('textDialog.placeholder')}
          focusOnMount
          onSubmit={() => void submit()}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!normalized || submitting}>
          {t('textDialog.add')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddTextDialog({ artboard, onAdd }: Omit<AddTextFormProps, 'onDone'>) {
  const { t } = useTranslation();
  const open = useEditorStore((s) => s.textDialogOpen);
  const setOpen = useEditorStore((s) => s.setTextDialogOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl" closeLabel={t('common.close')}>
        {open && (
          <AddTextForm
            artboard={artboard}
            onAdd={onAdd}
            onDone={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
