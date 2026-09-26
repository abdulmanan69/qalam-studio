// @vitest-environment node
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LoadedFont } from '@/features/shaping/engine';

import {
  DEFAULT_FONT_ID,
  defaultFontFor,
  fontFileUrl,
  FONTS,
  fontsForLanguage,
  getFont,
  resolveFont,
} from './registry';

const FONT_DIR = resolve(__dirname, '../../../public/fonts');

/** Letters each language needs (the test checks every declared language). */
const LANGUAGE_LETTERS: Record<string, string> = {
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآة',
  ur: 'ابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوہھءیےۓ',
  fa: 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی',
  ku: 'ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆهەیێ',
  ps: 'ابپتټثجچحخځڅدډذرړزژږسشښصضطظعغفقکګلمنڼوهيېۍ',
  sd: 'ابٻڀتٺٽٿثپجڄڃچڇحخدڌڏڊڍذرڙزسشصضطظعغفڦقڪکگڳڱلمنڻوهھءي',
};

function loadFontFile(file: string): ArrayBuffer {
  const bytes = readFileSync(resolve(FONT_DIR, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('font registry', () => {
  it('has a valid default font', () => {
    expect(getFont(DEFAULT_FONT_ID)).toBeDefined();
    expect(resolveFont('does-not-exist').id).toBe(DEFAULT_FONT_ID);
  });

  it('ships every font file together with its OFL license', () => {
    for (const font of FONTS) {
      expect(existsSync(resolve(FONT_DIR, font.file)), font.file).toBe(true);
      const license = resolve(FONT_DIR, font.license);
      expect(existsSync(license), font.license).toBe(true);
      expect(readFileSync(license, 'utf8')).toMatch(/SIL OPEN FONT LICENSE/i);
    }
  });

  it.each(FONTS.map((font) => [font.id, font] as const))(
    '%s covers the letters of every language it declares',
    (_id, font) => {
      const loaded = new LoadedFont(loadFontFile(font.file));
      for (const language of font.languages) {
        const letters = LANGUAGE_LETTERS[language];
        expect(letters, `no letter list for "${language}"`).toBeDefined();
        const missing = Array.from(letters ?? '').filter(
          (ch) => !loaded.hasCodePoint(ch.codePointAt(0) ?? 0),
        );
        expect(missing, `${font.id} missing ${language} letters`).toEqual([]);
      }
    },
  );

  it('starts each language with a suitable default font', () => {
    expect(defaultFontFor('ur').style).toBe('nastaliq');
    expect(defaultFontFor('ar').id).toBe('amiri');
    for (const language of ['ur', 'ar', 'fa', 'ku', 'ps', 'sd']) {
      expect(defaultFontFor(language).languages).toContain(language);
    }
  });

  it('filters fonts by language', () => {
    expect(fontsForLanguage('ur').map((f) => f.id)).toContain('noto-nastaliq-urdu');
    expect(fontsForLanguage('sd').every((f) => f.languages.includes('sd'))).toBe(true);
  });

  it('builds URLs under the deployment base path', () => {
    const font = resolveFont('gulzar');
    expect(fontFileUrl(font, '/qalam-studio/', 'https://example.github.io/qalam-studio/#/editor/1')).toBe(
      'https://example.github.io/qalam-studio/fonts/gulzar/Gulzar-Regular.ttf',
    );
  });
});
