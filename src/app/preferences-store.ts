import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface PreferencesState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const PREFERENCES_STORAGE_KEY = 'qalam.preferences';

/**
 * Per-browser UI preferences. Persisted to localStorage (a convenience only:
 * the app works identically if storage is unavailable).
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(callback: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', callback);
  return () => {
    media.removeEventListener('change', callback);
  };
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** The OS-level color scheme, kept in sync with system changes. */
export function useSystemTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, () => 'light');
}

/** The theme actually applied to the document ("system" resolved). */
export function useResolvedTheme(): ResolvedTheme {
  const preference = usePreferencesStore((s) => s.theme);
  const system = useSystemTheme();
  return preference === 'system' ? system : preference;
}
