/**
 * Normalize text for forgiving search: case-insensitive, and ignores Latin
 * accents plus Arabic-script harakat (zabar/zer/pesh, tanwin, shadda, sukun,
 * superscript alef) so "بِسْمِ" matches "بسم".
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ًͯ-ٰٟ]/g, '')
    .toLowerCase()
    .trim();
}
