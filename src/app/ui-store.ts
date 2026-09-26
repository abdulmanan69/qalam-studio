import { create } from 'zustand';

/** App-level dialogs that can be opened from anywhere (menus, tiles, shortcuts, search). */
export type AppDialog = 'newDesign' | 'shortcuts' | 'about' | 'clearData';

interface UiState {
  dialog: AppDialog | null;
  openDialog: (dialog: AppDialog) => void;
  closeDialog: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  dialog: null,
  openDialog: (dialog) => {
    set({ dialog });
  },
  closeDialog: () => {
    set({ dialog: null });
  },
}));

/** Props helper for a Radix dialog bound to one AppDialog id. */
export function useAppDialog(id: AppDialog): { open: boolean; onOpenChange: (open: boolean) => void } {
  const open = useUiStore((s) => s.dialog === id);
  const openDialog = useUiStore((s) => s.openDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  return {
    open,
    onOpenChange: (next) => {
      if (next) openDialog(id);
      else closeDialog();
    },
  };
}
