/**
 * e2e/overhaul-orthography.spec.js — (ORTH-01) deterministic Mushaf
 * orthography sweep: real Chromium, real fonts, 4 viewports.
 *
 * Loads the actual Mushaf reader page and asserts measurable layout
 * health (no horizontal overflow of the reading column, page element
 * present and visible) at each viewport × tajweed-coloring state, and
 * saves screenshots to evidence/overhaul-orth/ for human review of
 * Madd collisions / mark stacking (which no DOM assertion can certify).
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const VIEWPORTS = [
  { name: 'mobile-portrait', width: 390, height: 844 },
  { name: 'mobile-landscape', width: 844, height: 390 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

test('ORTH-01 mushaf orthography sweep: no overflow, screenshots kept', async ({ browser }) => {
  const dir = path.join(process.cwd(), 'evidence', 'overhaul-orth');
  mkdirSync(dir, { recursive: true });
  const report = [];
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    for (const tajweed of [false, true]) {
      test.setTimeout(120000);
      await page.goto('#/mushaf?page=1');
      // Wait for the lazy Mushaf page to actually render (not just the shell).
      await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });
      // Toggle tajweed coloring through the real Mushaf sheet (topbar
      // "more" button -> sheet modal -> switch), the same path a user takes.
      await page.locator('[data-action="mushaf-more"]').first().click({ timeout: 15000 });
      const toggle = page.locator(
        '.mushaf-sheet [data-action="toggle-mushaf-pref"][data-key="tajweedColoring"]'
      );
      await expect(toggle, 'tajweed toggle renders').toBeAttached({ timeout: 15000 });
      if (tajweed) await toggle.check({ force: true });
      else await toggle.uncheck({ force: true });
      await page.keyboard.press('Escape');
      await page.goto('#/mushaf?page=1');
      await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });
      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        pages: document.querySelectorAll('.mushaf-page').length,
      }));
      const shot = `mushaf-${vp.name}-tajweed-${tajweed ? 'on' : 'off'}.png`;
      await page.screenshot({ path: path.join(dir, shot), fullPage: false });
      report.push({ viewport: vp.name, tajweed, ...overflow, shot });
      expect(
        overflow.scrollW,
        `${vp.name} tajweed=${tajweed}: no horizontal overflow`
      ).toBeLessThanOrEqual(overflow.innerW + 1);
    }
    expect(pageErrors, `${vp.name} uncaught: ${pageErrors.join('\n')}`).toEqual([]);
    await context.close();
  }
  writeFileSync(
    path.join(dir, 'orthography-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)
  );
});
