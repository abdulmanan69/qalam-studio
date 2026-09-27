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
  | 'deselect'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'duplicate'
  | 'selectAll'
  | 'group'
  | 'ungroup'
  | 'bringForward'
  | 'sendBackward'
  | 'bringToFront'
  | 'sendToBack'
  | 'editLetters'
  | 'kashidaTool'
  | 'baselineTool'
  | 'nudge'
  | 'toggleGrid'
  | 'toggleRulers'
  | 'lockLayer'
  | 'exportDesign'
  | 'placeSvg'
  | 'frameTool'
  | 'placeImage'
  | 'boxTool'
  | 'ruleTool'
  | 'ellipseTool';

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
  { id: 'undo', combo: 'mod+z', group: 'editor' },
  { id: 'redo', combo: 'mod+shift+z', group: 'editor' },
  { id: 'copy', combo: 'mod+c', group: 'editor' },
  { id: 'cut', combo: 'mod+x', group: 'editor' },
  { id: 'paste', combo: 'mod+v', group: 'editor' },
  { id: 'duplicate', combo: 'mod+d', group: 'editor' },
  { id: 'selectAll', combo: 'mod+a', group: 'editor' },
  { id: 'group', combo: 'mod+g', group: 'editor' },
  { id: 'ungroup', combo: 'mod+shift+g', group: 'editor' },
  { id: 'bringForward', combo: 'mod+]', group: 'editor' },
  { id: 'sendBackward', combo: 'mod+[', group: 'editor' },
  { id: 'bringToFront', combo: 'mod+shift+]', group: 'editor' },
  { id: 'sendToBack', combo: 'mod+shift+[', group: 'editor' },
  { id: 'editLetters', combo: 'enter', group: 'editor' },
  { id: 'kashidaTool', combo: 'k', group: 'editor' },
  { id: 'baselineTool', combo: 'b', group: 'editor' },
  { id: 'nudge', combo: 'arrowleft', group: 'editor' },
  { id: 'toggleGrid', combo: "mod+'", group: 'editor' },
  { id: 'toggleRulers', combo: 'shift+r', group: 'editor' },
  { id: 'lockLayer', combo: 'mod+l', group: 'editor' },
  { id: 'exportDesign', combo: 'mod+e', group: 'editor' },
  { id: 'placeSvg', combo: 'mod+shift+i', group: 'editor' },
  { id: 'frameTool', combo: 'f', group: 'editor' },
  { id: 'placeImage', combo: 'shift+p', group: 'editor' },
  { id: 'boxTool', combo: 'r', group: 'editor' },
  { id: 'ruleTool', combo: 'l', group: 'editor' },
  { id: 'ellipseTool', combo: 'e', group: 'editor' },
];

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ['general', 'projects', 'editor'];

export function shortcutCombo(id: ShortcutId): string {
  const found = SHORTCUTS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown shortcut: ${id}`);
  return found.combo;
}

export const GLOBAL_SEARCH_INPUT_ID = 'global-search-input';
