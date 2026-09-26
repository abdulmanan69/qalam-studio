import { useEffect } from 'react';

import { APP_NAME } from './config';

/** Set `document.title` to "<title> · Qalam Studio" while mounted. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
