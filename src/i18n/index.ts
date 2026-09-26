import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

export type TextDirection = 'ltr' | 'rtl';

export interface UiLanguage {
  code: string;
  /** Name in its own script, shown in the language picker. */
  nativeName: string;
  dir: TextDirection;
  /** Translations shipped. Arabic-script UI languages arrive with Phase 6. */
  available: boolean;
}

export const UI_LANGUAGES: readonly UiLanguage[] = [
  { code: 'en', nativeName: 'English', dir: 'ltr', available: true },
  { code: 'ur', nativeName: 'اردو', dir: 'rtl', available: false },
  { code: 'ar', nativeName: 'العربية', dir: 'rtl', available: false },
  { code: 'fa', nativeName: 'فارسی', dir: 'rtl', available: false },
];

export const DEFAULT_LANGUAGE = 'en';

export function getDirection(code: string): TextDirection {
  const base = code.split('-')[0];
  return UI_LANGUAGES.find((l) => l.code === base)?.dir ?? 'ltr';
}

/** Keep <html lang/dir> in sync so CSS logical properties and fonts follow the UI language. */
function applyDocumentLanguage(code: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = getDirection(code);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: UI_LANGUAGES.filter((l) => l.available).map((l) => l.code),
  interpolation: {
    // React already escapes rendered strings.
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', applyDocumentLanguage);
applyDocumentLanguage(i18n.language);

export default i18n;
