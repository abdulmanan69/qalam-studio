import { expect, test } from '@playwright/test';

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <rect x="10" y="10" width="180" height="80" rx="12" fill="#4a7d5a"/>
</svg>`;

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
});

test('dashboard shows the enterprise shell', async ({ page }) => {
  await expect(page).toHaveTitle(/Home · Qalam Studio/);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search projects and actions' })).toBeVisible();
  const tiles = page.getByRole('list', { name: 'Quick Actions' });
  await expect(tiles.getByRole('button')).toHaveCount(4);
});

test('create a design, rename it, and find it on the dashboard', async ({ page }) => {
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'New Design' }).click();
  const dialog = page.getByRole('dialog', { name: 'New design' });
  await dialog.getByLabel('Name').fill('Nastaliq poster');
  await dialog.getByRole('button', { name: 'Create design' }).click();

  const nameInput = page.getByRole('textbox', { name: 'Project name' });
  await expect(nameInput).toHaveValue('Nastaliq poster');
  await expect(page).toHaveURL(/#\/editor\//);

  await nameInput.fill('خوشخط poster');
  await nameInput.press('Enter');
  await expect(page).toHaveTitle(/خوشخط poster/);

  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }).click();
  const table = page.getByRole('table', { name: 'Recent Projects' });
  await expect(table.getByRole('link', { name: 'خوشخط poster' })).toBeVisible();
});

test('import an SVG and see it on the artboard', async ({ page }) => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'Import SVG' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'ornament.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(SAMPLE_SVG),
  });

  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('ornament');
  const artboard = page.getByRole('group', { name: /200 × 100 pixels/ });
  await expect(artboard).toBeVisible();
  const layers = page.getByRole('list', { name: 'Layers' });
  await expect(layers.getByRole('button', { name: 'ornament', exact: true })).toBeVisible();
  await expect(layers.getByRole('button', { name: 'Hide ornament' })).toBeVisible();

  // The sanitized SVG decoded and was drawn on the canvas: count its green pixels.
  await expect
    .poll(() =>
      page
        .locator('[data-canvas-root] canvas')
        .first()
        .evaluate((canvas: HTMLCanvasElement) => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return 0;
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let green = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;
            if (g > r + 30 && g > b + 20) green++;
          }
          return green;
        }),
    )
    .toBeGreaterThan(500);
});

test('keyboard: "/" focuses search and "?" opens the shortcuts', async ({ page }) => {
  await page.keyboard.press('/');
  const search = page.getByRole('combobox', { name: 'Search projects and actions' });
  await expect(search).toBeFocused();
  await search.press('Escape');
  await expect(search).not.toBeFocused();

  await page.keyboard.press('Shift+Slash');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('dark mode toggle persists across reloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
