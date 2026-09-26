// Render public/favicon.svg to the PNG app icons used by the PWA manifest.
// Usage: npm run icons   (needs Playwright's Chromium: npx playwright install chromium)
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = await readFile(`${root}public/favicon.svg`, 'utf8');
await mkdir(`${root}public/icons`, { recursive: true });

/** `padding` shrinks the artwork inside a full-bleed background (maskable icons). */
const ICONS = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'maskable-512.png', size: 512, padding: 0.18 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.08 },
];

const browser = await chromium.launch();
try {
  for (const { file, size, padding } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const inner = Math.round(size * (1 - padding * 2));
    await page.setContent(
      `<html><body style="margin:0;background:${padding ? '#3f5465' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">
        <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
      </body></html>`,
    );
    await page.screenshot({ path: `${root}public/icons/${file}`, omitBackground: padding === 0 });
    await page.close();
    console.log(`public/icons/${file}`);
  }
} finally {
  await browser.close();
}
