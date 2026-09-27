import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

async function createDesignWithText(page: Page, text: string): Promise<void> {
  await page.goto('./');
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'New Design' }).click();
  const dialog = page.getByRole('dialog', { name: 'New design' });
  await dialog.getByLabel('Name').fill('Letters check');
  await dialog.getByRole('combobox', { name: 'Artboard size' }).click();
  await page.getByRole('option', { name: /Square post/ }).click();
  await dialog.getByRole('button', { name: 'Create design' }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Letters check');

  await page
    .getByRole('toolbar', { name: 'Tools' })
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  const add = page.getByRole('dialog', { name: 'Add text' });
  await add.getByLabel('Text', { exact: true }).fill(text);
  await add.getByRole('button', { name: 'Add to artboard' }).click();
  await expect(add).toBeHidden();
}

/** Make the selected text big, so its strokes are thick enough to measure on screen. */
async function setFontSize(page: Page, size: number): Promise<void> {
  const field = page.getByRole('textbox', { name: 'Font size' });
  await field.fill(String(size));
  await field.press('Enter');
  await expect(field).toHaveValue(String(size));
}

/** Horizontal extent of all ink on the artboard canvas, in canvas pixels. */
function inkWidth(page: Page): Promise<number> {
  return page
    .locator('[data-canvas-root] canvas')
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i] ?? 255) < 110 && (data[i + 3] ?? 0) > 200) {
          const x = (i / 4) % canvas.width;
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
      }
      return Number.isFinite(min) ? max - min : 0;
    });
}

/**
 * Screen centers of the separate ink shapes on the artboard canvas, smallest
 * first (a dot is much smaller than a letter body).
 */
function inkShapes(page: Page): Promise<{ x: number; y: number; size: number }[]> {
  return page
    .locator('[data-canvas-root] canvas')
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      const step = 2;
      const w = Math.floor(canvas.width / step);
      const h = Math.floor(canvas.height / step);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const ink = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * step * canvas.width + x * step) * 4;
          ink[y * w + x] = (data[i] ?? 255) < 110 && (data[i + 3] ?? 0) > 200 ? 1 : 0;
        }
      }
      const seen = new Uint8Array(w * h);
      const shapes: { x: number; y: number; size: number }[] = [];
      for (let start = 0; start < w * h; start++) {
        if (!ink[start] || seen[start]) continue;
        const stack = [start];
        seen[start] = 1;
        let count = 0;
        let sx = 0;
        let sy = 0;
        while (stack.length > 0) {
          const p = stack.pop() ?? 0;
          const px = p % w;
          const py = Math.floor(p / w);
          count++;
          sx += px;
          sy += py;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const nx = px + dx;
            const ny = py + dy;
            const n = ny * w + nx;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && ink[n] && !seen[n]) {
              seen[n] = 1;
              stack.push(n);
            }
          }
        }
        if (count > 3) shapes.push({ x: (sx / count) * step, y: (sy / count) * step, size: count });
      }
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / canvas.width;
      return shapes
        .map((s) => ({ x: rect.left + s.x * scale, y: rect.top + s.y * scale, size: s.size }))
        .sort((a, b) => a.size - b.size);
    });
}

test('select a dot on its own, move it, undo, redo and export SVG', async ({ page }) => {
  // "ب": a body with a single dot below it.
  await createDesignWithText(page, 'ب');
  await setFontSize(page, 300);
  await expect.poll(async () => (await inkShapes(page)).length).toBeGreaterThanOrEqual(2);

  // Drill down to single parts.
  const levels = page.getByRole('radiogroup', { name: 'Edit level' });
  await levels.getByRole('radio', { name: 'Parts' }).click();
  await expect(levels.getByRole('radio', { name: 'Parts' })).toBeChecked();

  const [dot] = await inkShapes(page);
  await page.mouse.click(dot.x, dot.y);
  await expect(page.getByRole('status').filter({ hasText: '1 selected (1 parts)' })).toBeVisible();
  await expect(page.getByText('Detected: Dot')).toBeVisible();

  // Drag only the dot.
  await page.mouse.move(dot.x, dot.y);
  await page.mouse.down();
  await page.mouse.move(dot.x + 20, dot.y + 15, { steps: 5 });
  await page.mouse.move(dot.x + 40, dot.y + 30, { steps: 5 });
  await page.mouse.up();

  const resetAll = page.getByRole('button', { name: 'Reset all letter adjustments' });
  await expect(resetAll).toBeVisible();

  // Undo puts the dot back, redo moves it again.
  await page.keyboard.press('Control+z');
  await expect(resetAll).toBeHidden();
  await page.keyboard.press('Control+Shift+z');
  await expect(resetAll).toBeVisible();

  // The adjustment survives a reload (autosave), once the toolbar says it is saved.
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await page.getByRole('list', { name: 'Layers' }).getByRole('button', { name: 'ب', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset all letter adjustments' })).toBeVisible();

  // Export SVG: text as outlines, including the moved dot.
  await page.keyboard.press('Control+e');
  const exportDialog = page.getByRole('dialog', { name: 'Export design' });
  await exportDialog.getByRole('radio', { name: 'SVG' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportDialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Letters check.svg');
  const svg = await readFile(await download.path(), 'utf8');
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1080" height="1080"/);
  expect(svg).toContain('<path d="M');
  expect(svg).not.toContain('<text');
});

test('kashida tool lengthens a joining letter', async ({ page }) => {
  await createDesignWithText(page, 'بب');
  await setFontSize(page, 200);
  await expect.poll(() => inkWidth(page)).toBeGreaterThan(40);
  const before = await inkWidth(page);
  const shapes = await inkShapes(page);
  const body = shapes[shapes.length - 1];
  // Pressing anywhere on the word picks the nearest letter that can stretch.
  const grab = { x: body.x, y: body.y };

  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: 'Kashida', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x - 60, grab.y, { steps: 8 });
  await page.mouse.up();

  await expect.poll(() => inkWidth(page)).toBeGreaterThan(before + 10);
});

test('layers can be grouped, locked and reordered from the layers panel', async ({ page }) => {
  await createDesignWithText(page, 'الف');
  await page
    .getByRole('toolbar', { name: 'Tools' })
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  const add = page.getByRole('dialog', { name: 'Add text' });
  await add.getByLabel('Text', { exact: true }).fill('ب');
  await add.getByRole('button', { name: 'Add to artboard' }).click();

  const layers = page.getByRole('list', { name: 'Layers' });
  await layers.getByRole('button', { name: 'الف', exact: true }).click();
  await layers.getByRole('button', { name: 'ب', exact: true }).click({ modifiers: ['Control'] });
  await page.keyboard.press('Control+g');
  await expect(layers.getByRole('button', { name: 'Group 1', exact: true })).toBeVisible();

  await layers.getByRole('button', { name: 'Lock ب' }).click();
  await expect(layers.getByRole('button', { name: 'Unlock ب' })).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Control+z');
  await expect(layers.getByRole('button', { name: 'Lock ب' })).toBeVisible();
});

test('letter styles reshape one letter everywhere, and can be removed', async ({ page }) => {
  await createDesignWithText(page, 'کے لیے سے');
  const letters = page.getByRole('radiogroup', { name: 'Letter' });
  await letters.getByRole('radio', { name: 'ے', exact: true }).click();
  await expect(page.getByText('3 letters will change')).toBeVisible();
  const before = await inkWidth(page);

  await page.getByRole('list', { name: 'Styles' }).getByRole('button', { name: 'Widest' }).click();
  const resetAll = page.getByRole('button', { name: 'Reset all letter adjustments' });
  await expect(resetAll).toBeVisible();
  await expect.poll(() => inkWidth(page)).toBeGreaterThan(before);

  await page.getByRole('button', { name: 'Remove style' }).click();
  await expect(resetAll).toBeHidden();
});

test('spacing tuner and position pad', async ({ page }) => {
  await createDesignWithText(page, 'دل دل دل');
  await expect.poll(() => inkWidth(page)).toBeGreaterThan(20);
  const before = await inkWidth(page);
  await page.getByRole('group', { name: 'Spacing presets' }).getByRole('button', { name: 'Airy' }).click();
  await expect.poll(() => inkWidth(page)).toBeGreaterThan(before + 5);

  const x = page.getByRole('textbox', { name: 'X', exact: true });
  const startX = Number(await x.inputValue());
  const pad = page.getByRole('group', { name: 'Move selection' });
  await page.getByRole('radio', { name: '10 px' }).click();
  await pad.getByRole('button', { name: 'Move right' }).click();
  await expect.poll(async () => Number(await x.inputValue())).toBeCloseTo(startX + 10);
});

test('symbols panel inserts honorifics and ayah numbers in the current font', async ({ page }) => {
  await createDesignWithText(page, 'محمد');
  await page.getByRole('button', { name: 'Show symbols' }).click();
  await expect(page.getByText(/Symbols are shown in|symbols? (is|are) hidden/)).toBeVisible();
  await page.getByRole('tab', { name: "Qur'anic marks" }).click();
  await page.getByRole('spinbutton', { name: 'Ayah number' }).fill('12');
  await page
    .getByRole('button', { name: /^Insert/ })
    .filter({ hasText: '۝' })
    .first()
    .click();
  await expect(page.locator('textarea').first()).toHaveValue('محمد۝۱۲');
});

test('publishing: page setup, text frame with columns, linked frame, print PDF', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('list', { name: 'Quick Actions' }).getByRole('button', { name: 'New Design' }).click();
  const dialog = page.getByRole('dialog', { name: 'New design' });
  await dialog.getByLabel('Name').fill('Daily');
  await dialog.getByRole('combobox', { name: 'Artboard size' }).click();
  await page.getByRole('option', { name: /Tabloid newspaper/ }).click();
  await dialog.getByRole('button', { name: 'Create design' }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Daily');

  // Page setup: margins and a 4-column grid.
  await page.getByRole('tab', { name: 'Pages' }).click();
  await page.getByRole('button', { name: 'Page setup' }).click();
  const setup = page.getByRole('dialog', { name: 'Page setup' });
  await setup.getByLabel('Margins and columns').click();
  await setup.getByRole('textbox', { name: 'Columns' }).fill('4');
  await setup.getByRole('button', { name: 'Save' }).click();
  await expect(setup).toBeHidden();

  // Draw a frame across the page: it snaps to the grid and takes its 4 columns.
  const canvas = page.locator('[data-canvas-root] canvas').last();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not visible');
  await page.keyboard.press('f');
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.3, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Columns', exact: true })).toHaveValue('4');

  // A long story overflows the small frame…
  const paragraph =
    'یہ خبر کا متن ہے جو اخبار کے کالموں میں بہتا ہے اور جگہ ختم ہونے پر اگلے فریم میں چلا جاتا ہے۔ '.repeat(
      8,
    );
  await page
    .getByRole('textbox', { name: 'Text (one paragraph per line)' })
    .fill(Array.from({ length: 12 }, () => paragraph.trim()).join('\n'));
  const overflow = page.getByText('The text does not fit. Add a linked frame to continue it.');
  await expect(overflow).toBeVisible({ timeout: 15_000 });

  // …and continues on a new page in a linked frame.
  await page.getByRole('button', { name: 'Continue on next page' }).click();
  await expect(page.getByText(/Frame 2 of 2 in this story/)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Pages' }).locator('li')).toHaveCount(2);

  // Print PDF with crop marks: one page per page of the document.
  await page.keyboard.press('Control+e');
  const exportDialog = page.getByRole('dialog', { name: 'Export design' });
  await exportDialog.getByRole('radio', { name: 'PDF' }).click();
  await exportDialog.getByLabel('Crop marks and bleed (for the printer)').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportDialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  const pdf = await readFile(await download.path(), 'latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(2);
});
