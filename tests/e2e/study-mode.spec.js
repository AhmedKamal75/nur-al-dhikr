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

  // An ayah tap opens the current Word Study surface directly. The Tafsir &
  // I'rab continuation is a deliberate secondary action from that surface.
  const ayah = page.locator('[data-action="mushaf-ayah-tap"]').first();
  await expect(ayah, 'ayah tap target renders').toBeVisible({ timeout: 20000 });
  await ayah.click();
  const modal = page.locator('.mushaf-ayah-detail').first();
  await expect(modal, 'Word Study surface opens').toBeVisible({ timeout: 20000 });

  await expect(modal.locator('.mushaf-ayah-detail__mode')).toHaveText(
    /Word Study|دراسة الكلمات|Study Mode|وضع الدراسة/
  );
  const tafsirAction = modal
    .locator('[data-action="tafsir-open"], [data-action="word-study-open-tafsir"]')
    .first();
  await expect(tafsirAction).toBeVisible({ timeout: 15000 });
  await tafsirAction.click();
  const section = page.locator('.mushaf-ayah-detail__study-hadith').first();
  await expect(section, 'hadith text-match section renders').toBeVisible({ timeout: 15000 });
  await expect(section).toContainText(/Searched \d+ of \d+|تم البحث في \d+ من \d+/);
  await expect(section).toContainText(/text matches|تطابقات نصية/);
  expect(pageErrors).toEqual([]);
});
