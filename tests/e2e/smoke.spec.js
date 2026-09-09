/**
 * e2e/smoke.spec.js — boot once, walk the core routes, burst the tasbih,
 * reload: every route renders, the count survives, and the whole pass
 * produces zero console errors and zero uncaught exceptions.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  'home',
  'tasbih',
  'prayer',
  'quran',
  'mushaf',
  'hadith',
  'audio',
  'calendar',
  'settings',
  'offline',
];

test('smoke: core routes render with zero console errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  for (const route of ROUTES) {
    await page.goto(`#/${route}`);
    // The renderer swaps views into #main; a blank main is the failure.
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  }

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('smoke: tasbih burst counts and survives reload', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw new Error(`uncaught exception: ${err}`);
  });
  await page.goto('#/tasbih');
  const dial = page.locator('[data-action="tasbih-tap"]').first();
  await expect(dial).toBeVisible({ timeout: 20000 });
  const count = page.locator('.tasbih-dial__count').first();
  const before = Number(await count.textContent());
  for (let i = 0; i < 5; i += 1) await dial.click();
  await expect(count).toHaveText(String(before + 5));
  await page.reload();
  await expect(page.locator('.tasbih-dial__count').first()).toHaveText(String(before + 5), {
    timeout: 20000,
  });
});
