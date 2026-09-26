import { useEffect, useState } from 'react';

/**
 * Current time as render-safe state, refreshed every `intervalMs`.
 * Keeps relative labels ("5 minutes ago") fresh without calling the impure
 * Date.now() during render.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
