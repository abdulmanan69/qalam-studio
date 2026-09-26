import { useEffect, useRef } from 'react';

import { isEditableTarget, matchesCombo } from './hotkeys';

export interface HotkeyBinding {
  combo: string;
  handler: (event: KeyboardEvent) => void;
  /** Fire even while focus is in a text field (default: only for `mod` combos). */
  allowInInputs?: boolean;
  enabled?: boolean;
}

/**
 * Register window-level keyboard shortcuts. Bindings are read through a ref,
 * so passing a new array each render does not re-attach listeners.
 */
export function useHotkeys(bindings: HotkeyBinding[]): void {
  const ref = useRef(bindings);

  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const editable = isEditableTarget(event.target);
      for (const binding of ref.current) {
        if (binding.enabled === false) continue;
        if (!matchesCombo(event, binding.combo)) continue;
        const usesMod = binding.combo.toLowerCase().includes('mod+');
        if (editable && !(binding.allowInInputs ?? usesMod)) continue;
        event.preventDefault();
        binding.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
