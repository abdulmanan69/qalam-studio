import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/app/ui-store';
import { db } from '@/features/projects/db';
import { createProject } from '@/features/projects/repository';
import { renderApp } from '@/test/render';

beforeEach(async () => {
  await db.projects.clear();
  useUiStore.setState({ dialog: null });
});

describe('Dashboard', () => {
  it('renders the shell, quick actions and an empty project list', async () => {
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search projects and actions' })).toBeInTheDocument();

    const quickActions = screen.getByRole('list', { name: 'Quick Actions' });
    for (const label of ['New Design', 'Open Project', 'Templates', 'Import SVG']) {
      expect(within(quickActions).getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(await screen.findByText('No projects yet', { selector: 'p' })).toBeInTheDocument();
  });

  it('lists existing projects with links to the editor', async () => {
    const project = await createProject({
      name: 'Bismillah study',
      presetId: 'square-post',
      width: 1080,
      height: 1080,
    });
    renderApp('/');

    const table = await screen.findByRole('table', { name: 'Recent Projects' });
    const link = within(table).getByRole('link', { name: 'Bismillah study' });
    expect(link).toHaveAttribute('href', `/editor/${project.id}`);
    expect(within(table).getByText(/Square post/)).toBeInTheDocument();
  });

  it('creates a design from the New Design dialog and opens it in the editor', async () => {
    const { user } = renderApp('/');

    const quickActions = await screen.findByRole('list', { name: 'Quick Actions' });
    await user.click(within(quickActions).getByRole('button', { name: 'New Design' }));

    const dialog = await screen.findByRole('dialog', { name: 'New design' });
    await user.type(within(dialog).getByLabelText('Name'), 'Nastaliq poster');
    await user.click(within(dialog).getByRole('button', { name: 'Create design' }));

    expect(await screen.findByRole('textbox', { name: 'Project name' })).toHaveValue('Nastaliq poster');
    await waitFor(async () => {
      expect(await db.projects.count()).toBe(1);
    });
  });

  it('validates artboard size input', async () => {
    const { user } = renderApp('/');
    useUiStore.getState().openDialog('newDesign');

    const dialog = await screen.findByRole('dialog', { name: 'New design' });
    const width = within(dialog).getByLabelText('Width');
    await user.clear(width);
    await user.type(width, '5');

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Width and height must be whole numbers');
    expect(within(dialog).getByRole('button', { name: 'Create design' })).toBeDisabled();
  });
});
