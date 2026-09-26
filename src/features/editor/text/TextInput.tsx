import { Keyboard } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ensurePreviewFonts, previewFontStack } from '@/features/fonts/font-faces';
import { resolveFont } from '@/features/fonts/registry';
import { MAX_TEXT_LENGTH, type TextLanguage } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import { OnScreenKeyboard } from './OnScreenKeyboard';
import { deleteBackward, insertText, type TextEdit } from './text-editing';

interface TextInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  language: TextLanguage;
  fontId: string;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  focusOnMount?: boolean;
  /** Ctrl/⌘ + Enter. */
  onSubmit?: () => void;
}

/**
 * Right-to-left text field that previews the selected calligraphy font,
 * with an optional on-screen keyboard.
 */
export function TextInput({
  id,
  value,
  onValueChange,
  language,
  fontId,
  rows = 3,
  placeholder,
  invalid = false,
  describedBy,
  focusOnMount = false,
  onSubmit,
}: TextInputProps) {
  const { t } = useTranslation();
  const keyboardId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const font = resolveFont(fontId);

  useEffect(() => {
    ensurePreviewFonts([font]);
  }, [font]);

  const apply = (edit: TextEdit) => {
    onValueChange(edit.value);
    // Restore the caret after React re-renders the controlled value.
    requestAnimationFrame(() => {
      const element = ref.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(edit.caret, edit.caret);
    });
  };

  const selection = (): [number, number] => {
    const element = ref.current;
    return element ? [element.selectionStart, element.selectionEnd] : [value.length, value.length];
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onSubmit && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="grid gap-1.5">
      <textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        dir="rtl"
        lang={language}
        maxLength={MAX_TEXT_LENGTH}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- first field of a dialog the user just opened
        autoFocus={focusOnMount}
        spellCheck={false}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        onKeyDown={onKeyDown}
        style={{ fontFamily: previewFontStack(font) }}
        className={cn(
          'w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-xl leading-[2.4] text-foreground shadow-card placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
          'aria-invalid:border-destructive',
        )}
      />
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={keyboardOpen}
          aria-controls={keyboardId}
          onClick={() => {
            setKeyboardOpen((open) => !open);
          }}
        >
          <Keyboard aria-hidden />
          {keyboardOpen ? t('keyboard.hide') : t('keyboard.show')}
        </Button>
      </div>
      {keyboardOpen && (
        <OnScreenKeyboard
          id={keyboardId}
          language={language}
          onInsert={(text) => {
            const [start, end] = selection();
            apply(insertText(value, start, end, text));
          }}
          onBackspace={() => {
            const [start, end] = selection();
            apply(deleteBackward(value, start, end));
          }}
        />
      )}
    </div>
  );
}
