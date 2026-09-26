import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ensurePreviewFonts, previewFontStack } from './font-faces';
import { FONT_STYLES, fontsForLanguage, resolveFont, type FontEntry } from './registry';

const SAMPLE = 'خوشخط';

interface FontSelectProps {
  id?: string;
  value: string;
  /** Only fonts supporting this language are offered (plus the current one). */
  language: string;
  onValueChange: (fontId: string) => void;
}

/** Calligraphy font picker grouped by script style, with live previews. */
export function FontSelect({ id, value, language, onValueChange }: FontSelectProps) {
  const { t } = useTranslation();
  const current = resolveFont(value);

  const fonts = useMemo(() => {
    const list: FontEntry[] = fontsForLanguage(language);
    return list.some((font) => font.id === current.id) ? list : [current, ...list];
  }, [language, current]);

  const groups = FONT_STYLES.map((style) => ({
    style,
    fonts: fonts.filter((font) => font.style === style),
  })).filter((group) => group.fonts.length > 0);

  return (
    <Select
      value={current.id}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) ensurePreviewFonts(fonts);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.style}>
            <SelectLabel>{t(`fonts.styles.${group.style}`)}</SelectLabel>
            {group.fonts.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                {font.name}
                <span className="ms-3 text-base leading-none text-muted-foreground" aria-hidden>
                  <bdi dir="rtl" style={{ fontFamily: previewFontStack(font) }}>
                    {SAMPLE}
                  </bdi>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
