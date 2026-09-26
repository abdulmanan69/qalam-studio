import type { Project } from '@/features/projects/schema';

export type SortKey = 'name' | 'updatedAt' | 'createdAt';
export type SortDir = 'asc' | 'desc';

/** Stable, locale-aware project sort (names compare naturally: "Design 2" < "Design 10"). */
export function sortProjects(
  projects: readonly Project[],
  key: SortKey,
  dir: SortDir,
  locale = 'en',
): Project[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const sign = dir === 'asc' ? 1 : -1;
  return [...projects].sort((a, b) => {
    const cmp = key === 'name' ? collator.compare(a.name, b.name) : a[key] - b[key];
    return cmp * sign;
  });
}
