/**
 * e2e/study-mode.spec.js — (NF01-STUDY) the ayah study modal is an
 * explicitly named Study Mode surface carrying the honest hadith
 * text-match section (scope line always visible, never a semantic
 * relatedness claim).
 */
import { test, expect } from '@playwright/test';

test('study mode: ayah modal names the surface and scopes hadith matches', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);

  // Open the word popup for the first tappable ayah, then enter the
  // study modal through its Tafsir action (the real user path).
  const ayah = page.locator('[data-action="mushaf-ayah-tap"]').first();
  await expect(ayah, 'ayah tap target renders').toBeVisible({ timeout: 20000 });
  await ayah.click();
  await expect(page.locator('.word-study').first(), 'word popup opens').toBeVisible({
    timeout: 20000,
  });
  await page.locator('.word-study [data-action="tafsir-open"]').first().click();
  const modal = page.locator('.mushaf-ayah-detail').first();
  await expect(modal, 'study modal opens').toBeVisible({ timeout: 20000 });

  await expect(modal.locator('.mushaf-ayah-detail__mode')).toHaveText(/Study Mode|وضع الدراسة/);
  const section = modal.locator('.mushaf-ayah-detail__study-hadith');
  await expect(section, 'hadith text-match section renders').toBeVisible({ timeout: 15000 });
  await expect(section).toContainText(/Searched \d+ of \d+|تم البحث في \d+ من \d+/);
  await expect(section).toContainText(/text matches|تطابقات نصية/);
  expect(pageErrors).toEqual([]);
});
