import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';

export type TextDirection = 'ltr' | 'rtl';

export interface UiLanguage {
  code: string;
  /** Name in its own script, shown in the language picker. */
  nativeName: string;
  dir: TextDirection;
  available: boolean;
}

export const UI_LANGUAGES: readonly UiLanguage[] = [
  { code: 'en', nativeName: 'English', dir: 'ltr', available: true },
  { code: 'ur', nativeName: 'اردو', dir: 'rtl', available: true },
  { code: 'ar', nativeName: 'العربية', dir: 'rtl', available: true },
  { code: 'fa', nativeName: 'فارسی', dir: 'rtl', available: true },
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'qalam.language';

/** The saved UI language, if it is one we ship. */
function savedLanguage(): string | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved && UI_LANGUAGES.some((l) => l.code === saved && l.available) ? saved : null;
  } catch {
    return null;
  }
}

/** Switch the UI language and remember it in this browser. */
export function setUiLanguage(code: string): void {
  void i18n.changeLanguage(code);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Not persisted; the switch still applies to this session.
  }
}

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
    ur: { translation: ur },
    ar: { translation: ar },
    fa: { translation: fa },
  },
  lng: savedLanguage() ?? DEFAULT_LANGUAGE,
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
