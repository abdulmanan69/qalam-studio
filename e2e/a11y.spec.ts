import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.1 A/AA checks with axe-core. The drawing canvas itself is excluded. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('[data-canvas-root]')
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

test('dashboard has no accessibility violations', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await audit(page);
});

test('templates page has no accessibility violations', async ({ page }) => {
  await page.goto('./#/templates');
  await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible();
  await audit(page);
});

test('editor has no accessibility violations', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'New Design' }).click();
  await page
    .getByRole('dialog', { name: 'New design' })
    .getByRole('button', { name: 'Create design' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeVisible();
  await audit(page);
});

test('the Urdu (right-to-left) interface has no accessibility violations', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('qalam.language', 'ur');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await audit(page);
});
