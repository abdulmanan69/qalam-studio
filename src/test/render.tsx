import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { AppProviders } from '@/app/providers';
import { AppRoutes } from '@/app/router';

export interface RenderAppResult extends RenderResult {
  user: UserEvent;
}

/** Render the full app (shell + routes) at a given path, as a user would see it. */
export function renderApp(path = '/'): RenderAppResult {
  const user = userEvent.setup();
  const result = render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, user };
}

/** Render a single component inside the providers and a router. */
export function renderWithProviders(ui: ReactElement, path = '/'): RenderAppResult {
  const user = userEvent.setup();
  const result = render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { ...result, user };
}
