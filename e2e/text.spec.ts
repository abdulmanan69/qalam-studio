import { expect, test, type Page } from '@playwright/test';

/** Number of dark ("ink") pixels on the artboard canvas. */
function inkPixels(page: Page): Promise<number> {
  return page
    .locator('[data-canvas-root] canvas')
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i] ?? 255) < 90 && (data[i + 1] ?? 255) < 90 && (data[i + 2] ?? 255) < 90) ink++;
      }
      return ink;
    });
}

async function createDesign(page: Page, name: string): Promise<void> {
  await page.goto('./');
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'New Design' }).click();
  const dialog = page.getByRole('dialog', { name: 'New design' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('combobox', { name: 'Artboard size' }).click();
  await page.getByRole('option', { name: /Square post/ }).click();
  await dialog.getByRole('button', { name: 'Create design' }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(name);
}

async function addText(page: Page, text: string): Promise<void> {
  await page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Text' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add text' });
  await dialog.getByLabel('Text', { exact: true }).fill(text);
  await dialog.getByRole('button', { name: 'Add to artboard' }).click();
  await expect(dialog).toBeHidden();
}

test('types Urdu text and draws the shaped glyphs on the canvas', async ({ page }) => {
  await createDesign(page, 'Shaping check');
  expect(await inkPixels(page)).toBe(0);

  await addText(page, 'خوش آمدید');

  await expect(
    page.getByRole('list', { name: 'Layers' }).getByRole('button', { name: 'خوش آمدید', exact: true }),
  ).toBeVisible();
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(1000);
  // The new text is selected, so its properties are shown.
  await expect(page.getByRole('combobox', { name: 'Font' })).toContainText('Noto Nastaliq Urdu');
});

test('changing the font re-shapes the text', async ({ page }) => {
  await createDesign(page, 'Font switch');
  await addText(page, 'بسم اللہ');
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(500);
  const before = await inkPixels(page);

  await page.getByRole('combobox', { name: 'Font' }).click();
  await page.getByRole('option', { name: /Amiri/ }).first().click();

  await expect.poll(() => inkPixels(page)).not.toBe(before);
  await expect(page.getByRole('combobox', { name: 'Font' })).toContainText('Amiri');
});

test('dragging text on the canvas moves it and the position is saved', async ({ page }) => {
  await createDesign(page, 'Drag check');
  await addText(page, 'قلم');
  const xField = page.getByRole('textbox', { name: 'X', exact: true });
  const startX = Number(await xField.inputValue());

  const canvas = page.locator('[data-canvas-root] canvas').last();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy, { steps: 5 });
  await page.mouse.move(cx + 80, cy, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () => Number(await xField.inputValue())).toBeGreaterThan(startX + 50);
  const movedX = await xField.inputValue();

  await page.reload();
  await page.getByRole('list', { name: 'Layers' }).getByRole('button', { name: 'قلم', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'X', exact: true })).toHaveValue(movedX);
});

test('the on-screen keyboard inserts letters and harakat', async ({ page }) => {
  await createDesign(page, 'Keyboard check');
  await page.keyboard.press('t');
  const dialog = page.getByRole('dialog', { name: 'Add text' });
  await dialog.getByRole('button', { name: 'Show keyboard' }).click();
  const keyboard = dialog.getByRole('group', { name: 'On-screen keyboard' });
  await keyboard.getByRole('button', { name: 'ب', exact: true }).click();
  await keyboard.getByRole('button', { name: 'Zer (kasra)' }).click();
  await keyboard.getByRole('button', { name: 'س', exact: true }).click();
  await expect(dialog.getByLabel('Text', { exact: true })).toHaveValue('بِس');
  await keyboard.getByRole('button', { name: 'Backspace' }).click();
  await expect(dialog.getByLabel('Text', { exact: true })).toHaveValue('بِ');
});

test('Delete removes the selected text layer', async ({ page }) => {
  await createDesign(page, 'Delete check');
  await addText(page, 'حذف');
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(200);

  await page.getByRole('list', { name: 'Layers' }).getByRole('button', { name: 'حذف', exact: true }).click();
  await page.keyboard.press('Delete');

  await expect(page.getByRole('list', { name: 'Layers' }).getByText('No layers yet')).toBeVisible();
  await expect.poll(() => inkPixels(page)).toBe(0);
});
