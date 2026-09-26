import {
  FilePlus2,
  FileUp,
  FolderOpen,
  Keyboard,
  LayoutTemplate,
  PenTool,
  Search,
  SunMoon,
  type LucideIcon,
} from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { usePreferencesStore, useResolvedTheme } from '@/app/preferences-store';
import { useUiStore } from '@/app/ui-store';
import { Kbd } from '@/components/ui/kbd';
import { useProjects } from '@/features/projects/hooks';
import { useProjectActions } from '@/features/projects/use-project-actions';
import { normalizeForSearch } from '@/lib/search';
import { formatRelativeTime } from '@/lib/time';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';

import { GLOBAL_SEARCH_INPUT_ID } from './shortcuts';

interface SearchItem {
  id: string;
  group: 'actions' | 'projects';
  label: string;
  hint?: string;
  keywords: string;
  icon: LucideIcon;
  run: () => void;
}

const MAX_PROJECT_RESULTS = 6;

/**
 * Top-bar command search (ARIA combobox pattern): finds app actions and
 * projects by name. Opens with "/" from anywhere.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openDialog = useUiStore((s) => s.openDialog);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const resolvedTheme = useResolvedTheme();
  const actions = useProjectActions();
  const projects = useProjects();
  const now = useNow();

  const actionItems = useMemo<SearchItem[]>(
    () => [
      {
        id: 'new-design',
        group: 'actions',
        label: t('quickActions.newDesign'),
        keywords: 'create new design artboard',
        icon: FilePlus2,
        run: () => {
          openDialog('newDesign');
        },
      },
      {
        id: 'open-project',
        group: 'actions',
        label: t('quickActions.openProject'),
        keywords: 'open load qalam file project',
        icon: FolderOpen,
        run: () => void actions.openProjectFile(),
      },
      {
        id: 'import-svg',
        group: 'actions',
        label: t('quickActions.importSvg'),
        keywords: 'import svg vector ornament',
        icon: FileUp,
        run: () => void actions.importSvgFile(),
      },
      {
        id: 'templates',
        group: 'actions',
        label: t('quickActions.templates'),
        keywords: 'templates gallery bismillah names logos poetry',
        icon: LayoutTemplate,
        run: () => void navigate('/templates'),
      },
      {
        id: 'shortcuts',
        group: 'actions',
        label: t('help.shortcuts'),
        keywords: 'keyboard shortcuts hotkeys help',
        icon: Keyboard,
        run: () => {
          openDialog('shortcuts');
        },
      },
      {
        id: 'toggle-theme',
        group: 'actions',
        label: resolvedTheme === 'dark' ? t('search.lightMode') : t('search.darkMode'),
        keywords: 'theme dark light mode appearance',
        icon: SunMoon,
        run: () => {
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        },
      },
    ],
    [actions, navigate, openDialog, resolvedTheme, setTheme, t],
  );

  const results = useMemo<SearchItem[]>(() => {
    const q = normalizeForSearch(query);
    const matchedActions = q
      ? actionItems.filter((item) => normalizeForSearch(`${item.label} ${item.keywords}`).includes(q))
      : actionItems;
    const matchedProjects = (projects ?? [])
      .filter((p) => !q || normalizeForSearch(p.name).includes(q))
      .slice(0, MAX_PROJECT_RESULTS)
      .map<SearchItem>((p) => ({
        id: `project-${p.id}`,
        group: 'projects',
        label: p.name,
        hint: formatRelativeTime(p.updatedAt, now),
        keywords: '',
        icon: PenTool,
        run: () => void navigate(`/editor/${p.id}`),
      }));
    return [...matchedActions, ...matchedProjects];
  }, [actionItems, navigate, now, projects, query]);

  const safeActive = results.length === 0 ? -1 : Math.min(activeIndex, results.length - 1);
  const activeItem = safeActive >= 0 ? results[safeActive] : undefined;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const close = () => {
    setOpen(false);
    setActiveIndex(0);
  };

  const execute = (item: SearchItem) => {
    close();
    setQuery('');
    inputRef.current?.blur();
    item.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
        break;
      case 'Enter':
        if (open && activeItem) {
          event.preventDefault();
          execute(activeItem);
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (query) {
          setQuery('');
        } else {
          close();
          inputRef.current?.blur();
        }
        break;
      default:
        break;
    }
  };

  const renderGroup = (group: SearchItem['group'], heading: string) => {
    const items = results.map((item, index) => ({ item, index })).filter(({ item }) => item.group === group);
    if (items.length === 0) return null;
    return (
      <li role="presentation">
        <div
          role="presentation"
          className="px-2.5 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
        >
          {heading}
        </div>
        <ul role="group" aria-label={heading}>
          {items.map(({ item, index }) => {
            const Icon = item.icon;
            const active = index === safeActive;
            return (
              // Options are chosen via the combobox's arrow keys + Enter (aria-activedescendant);
              // the click handler is a pointer convenience.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={active}
                className={cn(
                  'mx-1 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5',
                  active && 'bg-accent text-accent-foreground',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
                onClick={() => {
                  execute(item);
                }}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate" dir="auto">
                  {item.label}
                </span>
                {item.hint && (
                  <span className="ms-auto shrink-0 text-xs text-muted-foreground">{item.hint}</span>
                )}
              </li>
            );
          })}
        </ul>
      </li>
    );
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={inputRef}
        id={GLOBAL_SEARCH_INPUT_ID}
        type="search"
        role="combobox"
        aria-label={t('search.label')}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && safeActive >= 0 ? optionId(safeActive) : undefined}
        autoComplete="off"
        spellCheck={false}
        dir="auto"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="h-8 w-full rounded-md border border-input bg-surface-sunken ps-8 pe-8 text-[0.8125rem] text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {!open && (
        <Kbd
          className="pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex"
          aria-hidden
        >
          /
        </Kbd>
      )}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('search.results')}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover pb-1 text-popover-foreground shadow-popover"
        >
          {renderGroup('actions', t('search.actions'))}
          {renderGroup('projects', t('search.projects'))}
          {results.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-center text-muted-foreground">
              {t('search.noResults')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
