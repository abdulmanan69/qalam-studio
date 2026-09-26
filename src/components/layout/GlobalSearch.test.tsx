import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/app/ui-store';
import { db } from '@/features/projects/db';
import { createProject } from '@/features/projects/repository';
import { renderWithProviders } from '@/test/render';

import { GlobalSearch } from './GlobalSearch';

beforeEach(async () => {
  await db.projects.clear();
  useUiStore.setState({ dialog: null });
});

describe('GlobalSearch', () => {
  it('shows actions on focus and filters as you type', async () => {
    const { user } = renderWithProviders(<GlobalSearch />);
    const input = screen.getByRole('combobox', { name: 'Search projects and actions' });

    await user.click(input);
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'New Design' })).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await user.type(input, 'svg');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Import SVG']);

    await user.clear(input);
    await user.type(input, 'zzz-nothing');
    expect(within(listbox).getByText('No matches')).toBeInTheDocument();
  });

  it('finds projects by name, ignoring Arabic-script diacritics', async () => {
    await createProject({ name: 'بسم اللہ', presetId: 'custom', width: 500, height: 500 });
    const { user } = renderWithProviders(<GlobalSearch />);
    const input = screen.getByRole('combobox', { name: 'Search projects and actions' });

    await user.type(input, 'بِسْمِ');
    expect(await screen.findByRole('option', { name: /بسم اللہ/ })).toBeInTheDocument();
  });

  it('runs the active option with the keyboard', async () => {
    const { user } = renderWithProviders(<GlobalSearch />);
    const input = screen.getByRole('combobox', { name: 'Search projects and actions' });

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    // Second action is "Open Project"; step back to "New Design" and run it.
    await user.keyboard('{ArrowUp}{Enter}');
    expect(useUiStore.getState().dialog).toBe('newDesign');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', async () => {
    const { user } = renderWithProviders(<GlobalSearch />);
    const input = screen.getByRole('combobox', { name: 'Search projects and actions' });
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
