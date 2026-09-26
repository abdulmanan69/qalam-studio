import { useTranslation } from 'react-i18next';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEXT_LANGUAGES, type TextLanguage } from '@/features/projects/schema';

/** Language names in their own script, shown next to the UI-language name. */
const NATIVE_NAMES: Record<TextLanguage, string> = {
  ur: 'اردو',
  ar: 'العربية',
  fa: 'فارسی',
  ku: 'کوردی',
  ps: 'پښتو',
  sd: 'سنڌي',
};

function isTextLanguage(value: string): value is TextLanguage {
  return (TEXT_LANGUAGES as readonly string[]).includes(value);
}

interface LanguageSelectProps {
  id?: string;
  value: TextLanguage;
  onValueChange: (language: TextLanguage) => void;
}

export function LanguageSelect({ id, value, onValueChange }: LanguageSelectProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isTextLanguage(next)) onValueChange(next);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TEXT_LANGUAGES.map((language) => (
          <SelectItem key={language} value={language}>
            {t(`languages.${language}`)}
            <span className="ms-2 text-muted-foreground">
              <bdi lang={language} dir="rtl">
                {NATIVE_NAMES[language]}
              </bdi>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
