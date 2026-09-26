import { describe, expect, it } from 'vitest';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';

type Tree = { [key: string]: string | Tree };

const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** Keys with plural suffixes folded into their base key. */
function baseKeys(map: Map<string, string>): Set<string> {
  return new Set([...map.keys()].map((k) => k.replace(PLURAL, '')));
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1] ?? '').sort();
}

const english = flatten(en);
const LOCALES: Record<string, Tree> = { ur: ur, ar: ar, fa: fa };

describe.each(Object.entries(LOCALES))('%s translation', (_code, tree) => {
  const translated = flatten(tree);

  it('has exactly the English keys', () => {
    expect([...baseKeys(translated)].sort()).toEqual([...baseKeys(english)].sort());
  });

  it('keeps every placeholder', () => {
    for (const [key, value] of translated) {
      const base = key.replace(PLURAL, '');
      const source = english.get(key) ?? english.get(`${base}_other`) ?? english.get(base);
      if (source === undefined) continue;
      for (const name of placeholders(source)) {
        if (name === 'count') continue;
        expect(value, key).toContain(`{{${name}}}`);
      }
    }
  });

  it('has no empty strings', () => {
    for (const [key, value] of translated) expect(value.trim(), key).not.toBe('');
  });
});
