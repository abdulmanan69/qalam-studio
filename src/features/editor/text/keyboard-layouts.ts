import type { TextLanguage } from '@/features/projects/schema';

/**
 * On-screen keyboard layouts. Rows follow the familiar physical layouts
 * (Urdu phonetic-style, Arabic 101, Persian standard) so users who know a
 * hardware layout find letters where they expect them.
 */

export type KeyboardLayoutId = 'ur' | 'ar' | 'fa';

export const LETTER_ROWS: Record<KeyboardLayoutId, readonly (readonly string[])[]> = {
  ur: [
    ['ط', 'ص', 'ھ', 'د', 'ٹ', 'پ', 'ت', 'ب', 'ج', 'ح'],
    ['م', 'و', 'ر', 'ن', 'ل', 'ہ', 'ا', 'ک', 'ی', 'ے'],
    ['ق', 'ف', 'ع', 'س', 'ش', 'غ', 'ء', 'ژ', 'ز', 'ذ'],
    ['ث', 'خ', 'چ', 'گ', 'ض', 'ظ', 'ڈ', 'ڑ', 'ں', 'ۓ'],
    ['آ', 'أ', 'ئ', 'ؤ', 'ۃ', 'ۂ', 'ي', 'ك', 'ة', 'ى'],
  ],
  ar: [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
    ['ذ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', 'د'],
    ['أ', 'إ', 'آ', 'ئ', 'ٱ'],
  ],
  fa: [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'چ'],
    ['ش', 'س', 'ی', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ک', 'گ'],
    ['ظ', 'ط', 'ز', 'ر', 'ذ', 'د', 'پ', 'و', 'ژ', 'آ', 'ئ'],
    ['ء', 'أ', 'ؤ', 'إ', 'ة', 'ۀ'],
  ],
};

/** Letters specific to a language, shown as an extra row. */
export const EXTRA_LETTERS: Partial<Record<TextLanguage, readonly string[]>> = {
  ku: ['ڕ', 'ۆ', 'ێ', 'ڵ', 'ە', 'ڤ', 'ھ'],
  ps: ['ټ', 'ډ', 'ړ', 'ږ', 'ښ', 'ګ', 'ڼ', 'ځ', 'څ', 'ۍ', 'ې'],
  sd: ['ٻ', 'ڀ', 'ٺ', 'ٽ', 'ٿ', 'ڄ', 'ڃ', 'ڇ', 'ڌ', 'ڏ', 'ڊ', 'ڍ', 'ڙ', 'ڦ', 'ڪ', 'ڳ', 'ڱ', 'ڻ', 'ھ'],
};

export type MarkName =
  | 'fatha'
  | 'kasra'
  | 'damma'
  | 'shadda'
  | 'sukun'
  | 'fathatan'
  | 'kasratan'
  | 'dammatan'
  | 'superscriptAlef'
  | 'hamzaAbove'
  | 'maddaAbove';

/** Harakat and other combining marks, in the order calligraphers usually need them. */
export const MARKS: readonly { char: string; name: MarkName }[] = [
  { char: 'َ', name: 'fatha' }, // zabar
  { char: 'ِ', name: 'kasra' }, // zer
  { char: 'ُ', name: 'damma' }, // pesh
  { char: 'ّ', name: 'shadda' },
  { char: 'ْ', name: 'sukun' }, // jazm
  { char: 'ً', name: 'fathatan' }, // do zabar
  { char: 'ٍ', name: 'kasratan' }, // do zer
  { char: 'ٌ', name: 'dammatan' }, // do pesh
  { char: 'ٰ', name: 'superscriptAlef' }, // khari zabar
  { char: 'ٔ', name: 'hamzaAbove' },
  { char: 'ٓ', name: 'maddaAbove' },
];

const MARK_CHARS = new Set(MARKS.map((mark) => mark.char));

export const PUNCTUATION: Record<KeyboardLayoutId, readonly string[]> = {
  ur: ['۔', '،', '؟', '؛', '٪', '«', '»', 'ـ', '﷽'],
  ar: ['.', '،', '؟', '؛', '٪', '«', '»', 'ـ', '﷽'],
  fa: ['.', '،', '؟', '؛', '٪', '«', '»', 'ـ', '﷽'],
};

export const DIGITS: Record<KeyboardLayoutId, readonly string[]> = {
  ur: ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'],
  fa: ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'],
  ar: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'],
};

/** Zero-width non-joiner: the Urdu/Persian "nim-fasila" (half space). */
export const ZWNJ = '‌';

export function keyboardLayoutFor(language: TextLanguage): KeyboardLayoutId {
  switch (language) {
    case 'ur':
      return 'ur';
    case 'fa':
    case 'ku':
    case 'ps':
      return 'fa';
    case 'ar':
    case 'sd':
      return 'ar';
  }
}

/** Show a combining mark on a dotted circle so it is visible on a key. */
export function displayKey(char: string): string {
  return MARK_CHARS.has(char) ? `◌${char}` : char;
}
