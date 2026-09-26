export type ShortcutGroup = 'general' | 'projects' | 'editor';

export type ShortcutId =
  | 'focusSearch'
  | 'showShortcuts'
  | 'newDesign'
  | 'openProject'
  | 'importSvg'
  | 'downloadProject'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomFit'
  | 'zoomActual'
  | 'selectTool'
  | 'handTool'
  | 'textTool'
  | 'deleteLayer'
  | 'deselect';

export interface ShortcutDefinition {
  id: ShortcutId;
  combo: string;
  group: ShortcutGroup;
}

/**
 * Single registry of keyboard shortcuts. Handlers live where the behavior
 * lives (AppShell for global ones, EditorPage for editor ones); this list
 * drives the help dialog and menu hints so they never drift apart.
 */
export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { id: 'focusSearch', combo: '/', group: 'general' },
  { id: 'showShortcuts', combo: '?', group: 'general' },
  { id: 'newDesign', combo: 'alt+n', group: 'projects' },
  { id: 'openProject', combo: 'mod+o', group: 'projects' },
  { id: 'importSvg', combo: 'alt+i', group: 'projects' },
  { id: 'downloadProject', combo: 'mod+s', group: 'projects' },
  { id: 'zoomIn', combo: 'mod+=', group: 'editor' },
  { id: 'zoomOut', combo: 'mod+-', group: 'editor' },
  { id: 'zoomFit', combo: 'shift+1', group: 'editor' },
  { id: 'zoomActual', combo: 'mod+0', group: 'editor' },
  { id: 'selectTool', combo: 'v', group: 'editor' },
  { id: 'handTool', combo: 'h', group: 'editor' },
  { id: 'textTool', combo: 't', group: 'editor' },
  { id: 'deleteLayer', combo: 'delete', group: 'editor' },
  { id: 'deselect', combo: 'escape', group: 'editor' },
];

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ['general', 'projects', 'editor'];

export function shortcutCombo(id: ShortcutId): string {
  const found = SHORTCUTS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown shortcut: ${id}`);
  return found.combo;
}

export const GLOBAL_SEARCH_INPUT_ID = 'global-search-input';
