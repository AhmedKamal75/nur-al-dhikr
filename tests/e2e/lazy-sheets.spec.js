/**
 * e2e/lazy-sheets.spec.js — v5.2.18 kept in-tree (was a temporary probe).
 * Every on-demand modal/sheet chunk must open with real content in a
 * real browser. Unit tests pin the builders; only the browser proves
 * the dynamic import + openModal path they travel.
 */
import { test, expect } from '@playwright/test';

test('sheets: drill from more-sheet through track to plan, plus study', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(1500);

  await page.locator('#main [data-action="mushaf-more"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal [data-action="mushaf-open-jump"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal__close').first().click();
  await expect(page.locator('.modal__body')).toHaveCount(0, { timeout: 5000 });

  await page.locator('#main [data-action="mushaf-more"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal [data-action="mushaf-open-track"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal [data-action="khatma-open-plan"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal__close').first().click();
  await expect(page.locator('.modal__body')).toHaveCount(0, { timeout: 5000 });

  // The ayah-study modal travels its own on-demand chunk (lazyData).
  await page.goto('#/quran?id=112');
  await expect(page.locator('.ayah-card').first()).toBeVisible({ timeout: 20000 });
  await page.locator('[data-action="tafsir-open"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  await page.locator('.modal__close').first().click();

  // The hadith browser + the home daily panel (shared leaf module).
  await page.goto('#/hadith');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.goto('#/home');
  await page.waitForTimeout(3000);
  const home = await page.locator('#main').innerHTML();
  expect(home.includes('panel--hadith-daily'), 'home renders the daily hadith card').toBe(true);

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
