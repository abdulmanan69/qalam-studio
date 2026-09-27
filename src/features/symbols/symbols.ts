/**
 * Symbols often needed in Arabic-script writing and Qur'anic publishing,
 * grouped for the Symbols panel. Items are plain text; the panel draws them in
 * the current font and hides those the font cannot render.
 */

export type SymbolCategory = 'honorifics' | 'quranic' | 'surahs' | 'paras' | 'punctuation';

export interface SymbolItem {
  /** Text inserted into the document. */
  text: string;
  /** Optional name shown as a tooltip (e.g. the Unicode name). */
  hint?: string;
  /** Combining sign: shown on a dotted circle, inserted after the current letter. */
  combining?: boolean;
}

export const SYMBOL_CATEGORIES: readonly SymbolCategory[] = [
  'honorifics',
  'quranic',
  'surahs',
  'paras',
  'punctuation',
];

const HONORIFICS: readonly SymbolItem[] = [
  { text: 'ﷺ', hint: 'Sallallahu alayhi wa sallam (U+FDFA)' },
  { text: 'ﷻ', hint: 'Jalla jalaluhu (U+FDFB)' },
  { text: 'ﷲ', hint: 'Allah ligature (U+FDF2)' },
  { text: '﷽', hint: 'Bismillah ligature (U+FDFD)' },
  { text: 'ؐ', hint: 'Small sallallahu sign (U+0610)', combining: true },
  { text: 'ؑ', hint: 'Small alayhis salam sign (U+0611)', combining: true },
  { text: 'ؒ', hint: 'Small rahmatullah sign (U+0612)', combining: true },
  { text: 'ؓ', hint: 'Small radiallahu sign (U+0613)', combining: true },
  { text: 'ؔ', hint: 'Takhallus sign (U+0614)', combining: true },
  { text: 'صلی اللہ علیہ وآلہ وسلم' },
  { text: 'صلی اللہ علیہ وسلم' },
  { text: 'علیہ السلام' },
  { text: 'علیہا السلام' },
  { text: 'علیہم السلام' },
  { text: 'رضی اللہ عنہ' },
  { text: 'رضی اللہ عنہا' },
  { text: 'رضی اللہ عنہما' },
  { text: 'رضی اللہ عنہم' },
  { text: 'رضی اللہ عنہن' },
  { text: 'رحمۃ اللہ علیہ' },
  { text: 'رحمہ اللہ' },
  { text: 'رضی اللہ تعالیٰ عنہ' },
  { text: 'کرم اللہ وجہہ الکریم' },
  { text: 'سبحانہ و تعالیٰ' },
  { text: 'عزوجل' },
  { text: 'جل جلالہ' },
  { text: 'حفظہ اللہ' },
  { text: 'دامت برکاتہم' },
  { text: 'بسم اللہ الرحمن الرحیم' },
  { text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
];

const QURANIC: readonly SymbolItem[] = [
  { text: '۝', hint: 'End of ayah (U+06DD)' },
  { text: '۞', hint: 'Start of rub el hizb (U+06DE)' },
  { text: '۩', hint: 'Place of sajdah (U+06E9)' },
  { text: 'ۖ', hint: 'Small high ligature sad with lam with alef maksura (U+06D6)', combining: true },
  { text: 'ۗ', hint: 'Small high ligature qaf with lam with alef maksura (U+06D7)', combining: true },
  { text: 'ۘ', hint: 'Small high meem initial form (U+06D8)', combining: true },
  { text: 'ۙ', hint: 'Small high lam alef (U+06D9)', combining: true },
  { text: 'ۚ', hint: 'Small high jeem (U+06DA)', combining: true },
  { text: 'ۛ', hint: 'Small high three dots (U+06DB)', combining: true },
  { text: 'ۜ', hint: 'Small high seen (U+06DC)', combining: true },
  { text: '۟', hint: 'Small high rounded zero (U+06DF)', combining: true },
  { text: '۠', hint: 'Small high upright rectangular zero (U+06E0)', combining: true },
  { text: 'ۢ', hint: 'Small high meem isolated form (U+06E2)', combining: true },
  { text: 'ۭ', hint: 'Small low meem (U+06ED)', combining: true },
  { text: 'ٰ', hint: 'Superscript alef (U+0670)', combining: true },
  { text: 'ٖ', hint: 'Subscript alef (U+0656)', combining: true },
  { text: 'ٓ', hint: 'Maddah above (U+0653)', combining: true },
  { text: '﴾', hint: 'Ornate left parenthesis (U+FD3E)' },
  { text: '﴿', hint: 'Ornate right parenthesis (U+FD3F)' },
  { text: 'ع', hint: 'Ruku mark' },
  { text: 'رکوع' },
  { text: 'منزل' },
  { text: 'سجدہ' },
  { text: 'وقف لازم' },
];

/** The 114 surahs in order. */
export const SURAH_NAMES: readonly string[] = [
  'الفاتحة',
  'البقرة',
  'آل عمران',
  'النساء',
  'المائدة',
  'الأنعام',
  'الأعراف',
  'الأنفال',
  'التوبة',
  'يونس',
  'هود',
  'يوسف',
  'الرعد',
  'إبراهيم',
  'الحجر',
  'النحل',
  'الإسراء',
  'الكهف',
  'مريم',
  'طه',
  'الأنبياء',
  'الحج',
  'المؤمنون',
  'النور',
  'الفرقان',
  'الشعراء',
  'النمل',
  'القصص',
  'العنكبوت',
  'الروم',
  'لقمان',
  'السجدة',
  'الأحزاب',
  'سبأ',
  'فاطر',
  'يس',
  'الصافات',
  'ص',
  'الزمر',
  'غافر',
  'فصلت',
  'الشورى',
  'الزخرف',
  'الدخان',
  'الجاثية',
  'الأحقاف',
  'محمد',
  'الفتح',
  'الحجرات',
  'ق',
  'الذاريات',
  'الطور',
  'النجم',
  'القمر',
  'الرحمن',
  'الواقعة',
  'الحديد',
  'المجادلة',
  'الحشر',
  'الممتحنة',
  'الصف',
  'الجمعة',
  'المنافقون',
  'التغابن',
  'الطلاق',
  'التحريم',
  'الملك',
  'القلم',
  'الحاقة',
  'المعارج',
  'نوح',
  'الجن',
  'المزمل',
  'المدثر',
  'القيامة',
  'الإنسان',
  'المرسلات',
  'النبأ',
  'النازعات',
  'عبس',
  'التكوير',
  'الانفطار',
  'المطففين',
  'الانشقاق',
  'البروج',
  'الطارق',
  'الأعلى',
  'الغاشية',
  'الفجر',
  'البلد',
  'الشمس',
  'الليل',
  'الضحى',
  'الشرح',
  'التين',
  'العلق',
  'القدر',
  'البينة',
  'الزلزلة',
  'العاديات',
  'القارعة',
  'التكاثر',
  'العصر',
  'الهمزة',
  'الفيل',
  'قريش',
  'الماعون',
  'الكوثر',
  'الكافرون',
  'النصر',
  'المسد',
  'الإخلاص',
  'الفلق',
  'الناس',
];

/** The 30 paras (juz), by their opening words. */
export const PARA_NAMES: readonly string[] = [
  'الم',
  'سیقول',
  'تلک الرسل',
  'لن تنالوا',
  'والمحصنات',
  'لا یحب اللہ',
  'و اذا سمعوا',
  'و لو اننا',
  'قال الملا',
  'و اعلموا',
  'یعتذرون',
  'و ما من دابۃ',
  'و ما ابرئ',
  'ربما',
  'سبحن الذی',
  'قال الم',
  'اقترب للناس',
  'قد افلح',
  'و قال الذین',
  'امن خلق',
  'اتل ما اوحی',
  'و من یقنت',
  'و ما لی',
  'فمن اظلم',
  'الیہ یرد',
  'حم',
  'قال فما خطبکم',
  'قد سمع اللہ',
  'تبرک الذی',
  'عم',
];

const PUNCTUATION: readonly SymbolItem[] = [
  { text: '۔', hint: 'Urdu full stop (U+06D4)' },
  { text: '،', hint: 'Arabic comma (U+060C)' },
  { text: '؛', hint: 'Arabic semicolon (U+061B)' },
  { text: '؟', hint: 'Arabic question mark (U+061F)' },
  { text: '٪', hint: 'Arabic percent sign (U+066A)' },
  { text: '٭', hint: 'Arabic five-pointed star (U+066D)' },
  { text: '؎', hint: 'Poetic verse sign (U+060E)' },
  { text: '؏', hint: 'Misra sign (U+060F)' },
  { text: '؍', hint: 'Date separator (U+060D)' },
  { text: '«', hint: 'Left guillemet' },
  { text: '»', hint: 'Right guillemet' },
  { text: 'ـ', hint: 'Tatweel (U+0640)' },
  { text: '٫', hint: 'Arabic decimal separator (U+066B)' },
  { text: '٬', hint: 'Arabic thousands separator (U+066C)' },
];

/** Surah heading text in the conventions of each language. */
export function surahTitle(name: string, language: string): string {
  const prefix = language === 'ar' ? 'سورة' : language === 'fa' ? 'سوره' : 'سورۃ';
  return `${prefix} ${name}`;
}

export function paraTitle(name: string, index: number, language: string): string {
  const word = language === 'ar' ? 'الجزء' : language === 'fa' ? 'جزء' : 'پارہ';
  return `${word} ${toArabicDigits(index + 1, language)} — ${name}`;
}

/** Digits in the script's own numerals (Arabic-Indic for Arabic, extended for Urdu/Persian). */
export function toArabicDigits(value: number, language: string): string {
  const zero = language === 'ar' ? 0x0660 : 0x06f0;
  return String(Math.trunc(Math.abs(value))).replace(/\d/g, (d) => String.fromCharCode(zero + Number(d)));
}

/**
 * End-of-ayah sign with its number. Fonts with Qur'anic support draw the
 * digits inside the ornament when they directly follow U+06DD.
 */
export function ayahNumber(value: number, language: string): string {
  return `۝${toArabicDigits(value, language)}`;
}

export function symbolsFor(category: SymbolCategory, language: string): SymbolItem[] {
  switch (category) {
    case 'honorifics':
      return [...HONORIFICS];
    case 'quranic':
      return [...QURANIC];
    case 'surahs':
      return SURAH_NAMES.map((name, i) => ({
        text: surahTitle(name, language),
        hint: String(i + 1),
      }));
    case 'paras':
      return PARA_NAMES.map((name, i) => ({ text: paraTitle(name, i, language), hint: String(i + 1) }));
    case 'punctuation':
      return [...PUNCTUATION];
  }
}
