import { z } from 'zod';

import rawRegistry from './registry.json';

/**
 * Calligraphy font registry. Adding a font = one folder in public/fonts and
 * one entry in registry.json (see docs/adding-fonts.md). The registry is
 * validated at startup and by tests, so a broken entry fails loudly.
 */

export const FONT_STYLES = ['nastaliq', 'naskh', 'thuluth', 'ruqaa', 'kufi', 'diwani', 'display'] as const;
export type FontStyle = (typeof FONT_STYLES)[number];

const relativePath = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+\/[A-Za-z0-9._-]+$/, 'Expected "<font-id>/<file>"');

const fontEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase id with hyphens'),
  name: z.string().min(1),
  style: z.enum(FONT_STYLES),
  file: relativePath,
  license: relativePath,
  languages: z.array(z.string().min(2).max(8)).min(1),
  /** Recommended line-height multiplier for new text in this font. */
  lineHeight: z.number().min(0.3).max(4).default(1),
  /**
   * How letters are extended (kashida): with tatweel characters (Naskh) or by
   * stretching the joining stroke (Nastaliq, Ruqaa — tatweel is not idiomatic there).
   */
  kashida: z.enum(['tatweel', 'stretch']).default('tatweel'),
  /** Default OpenType features for this font. */
  features: z.record(z.string().length(4), z.union([z.boolean(), z.number()])).default({}),
});

const registrySchema = z
  .object({
    defaultFontId: z.string(),
    /** Preferred font per content language for new text. */
    languageDefaults: z.record(z.string(), z.string()).default({}),
    fonts: z.array(fontEntrySchema).min(1),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();
    registry.fonts.forEach((font, index) => {
      if (seen.has(font.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fonts', index, 'id'],
          message: `Duplicate font id "${font.id}"`,
        });
      }
      seen.add(font.id);
      if (!font.file.startsWith(`${font.id}/`) || !font.license.startsWith(`${font.id}/`)) {
        ctx.addIssue({
          code: 'custom',
          path: ['fonts', index],
          message: 'Files must live in the font id folder',
        });
      }
    });
    if (!seen.has(registry.defaultFontId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultFontId'],
        message: 'Default font is not in the registry',
      });
    }
    for (const [language, fontId] of Object.entries(registry.languageDefaults)) {
      const font = registry.fonts.find((f) => f.id === fontId);
      if (!font?.languages.includes(language)) {
        ctx.addIssue({
          code: 'custom',
          path: ['languageDefaults', language],
          message: `"${fontId}" is not a registered font supporting "${language}"`,
        });
      }
    }
  });

export type FontEntry = z.infer<typeof fontEntrySchema>;

export const FONT_REGISTRY = registrySchema.parse(rawRegistry);
export const FONTS: readonly FontEntry[] = FONT_REGISTRY.fonts;
export const DEFAULT_FONT_ID: string = FONT_REGISTRY.defaultFontId;

export function getFont(id: string): FontEntry | undefined {
  return FONTS.find((font) => font.id === id);
}

/** The font for an id, or the default font if the id is unknown (e.g. removed from the registry). */
export function resolveFont(id: string): FontEntry {
  const font = getFont(id) ?? getFont(DEFAULT_FONT_ID);
  if (!font) throw new Error('Font registry has no default font');
  return font;
}

/** Fonts that declare support for a language, registry order preserved. */
export function fontsForLanguage(language: string): FontEntry[] {
  return FONTS.filter((font) => font.languages.includes(language));
}

/** The font new text in this language starts with. */
export function defaultFontFor(language: string): FontEntry {
  const preferred = FONT_REGISTRY.languageDefaults[language];
  if (preferred) return resolveFont(preferred);
  const fallback = resolveFont(DEFAULT_FONT_ID);
  if (fallback.languages.includes(language)) return fallback;
  return fontsForLanguage(language)[0] ?? fallback;
}

/** Absolute URL of a font file, honoring the deployment base path. */
export function fontFileUrl(
  font: FontEntry,
  baseUrl: string = import.meta.env.BASE_URL,
  pageUrl: string = globalThis.location.href,
): string {
  return new URL(`${baseUrl}fonts/${font.file}`, pageUrl).href;
}
