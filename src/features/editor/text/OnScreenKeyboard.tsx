import { CornerDownLeft, Delete } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { TextLanguage } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

import {
  DIGITS,
  displayKey,
  EXTRA_LETTERS,
  keyboardLayoutFor,
  LETTER_ROWS,
  MARKS,
  PUNCTUATION,
  ZWNJ,
} from './keyboard-layouts';

interface OnScreenKeyboardProps {
  id?: string;
  language: TextLanguage;
  onInsert: (text: string) => void;
  onBackspace: () => void;
}

const keyClass =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-sm border border-border bg-card px-1.5 text-lg leading-none text-foreground shadow-card transition-colors hover:bg-accent active:bg-muted';

/**
 * Tap-to-type keyboard for Arabic-script languages. Keys never take focus
 * away from the text field (mouse down is prevented), so the caret stays put.
 */
export function OnScreenKeyboard({ id, language, onInsert, onBackspace }: OnScreenKeyboardProps) {
  const { t } = useTranslation();
  const layout = keyboardLayoutFor(language);
  const extra = EXTRA_LETTERS[language];
  const rows = extra ? [...LETTER_ROWS[layout], extra] : LETTER_ROWS[layout];

  const key = (keyId: string, content: ReactNode, onPress: () => void, label: string, className?: string) => (
    <button
      key={keyId}
      type="button"
      className={cn(keyClass, className)}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onPress}
    >
      {content}
    </button>
  );

  const charKey = (char: string, label?: string) =>
    key(
      char,
      <span lang={language}>{displayKey(char)}</span>,
      () => {
        onInsert(char);
      },
      label ?? char,
    );

  return (
    <div
      id={id}
      role="group"
      aria-label={t('keyboard.label')}
      dir="rtl"
      className="grid gap-1 rounded-md border border-border bg-surface-sunken p-2"
    >
      {rows.map((row) => (
        <div key={row.join('')} className="flex flex-wrap justify-center gap-1">
          {row.map((char) => charKey(char))}
        </div>
      ))}
      <div role="group" aria-label={t('keyboard.marksLabel')} className="flex flex-wrap justify-center gap-1">
        {MARKS.map((mark) => charKey(mark.char, t(`keyboard.marks.${mark.name}`)))}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {DIGITS[layout].map((digit) => charKey(digit))}
        {PUNCTUATION[layout].map((mark) => charKey(mark))}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {key(
          'newline',
          t('keyboard.newline'),
          () => {
            onInsert('\n');
          },
          t('keyboard.newline'),
          'px-3 text-xs',
        )}
        {key(
          'zwnj',
          <CornerDownLeft className="size-4 rotate-180" aria-hidden />,
          () => {
            onInsert(ZWNJ);
          },
          t('keyboard.zwnj'),
          'px-3',
        )}
        {key(
          'space',
          t('keyboard.space'),
          () => {
            onInsert(' ');
          },
          t('keyboard.space'),
          'min-w-40 text-xs',
        )}
        {key(
          'backspace',
          <Delete className="size-4" aria-hidden />,
          onBackspace,
          t('keyboard.backspace'),
          'px-3',
        )}
      </div>
    </div>
  );
}
