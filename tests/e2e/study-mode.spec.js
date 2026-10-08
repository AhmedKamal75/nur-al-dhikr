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

  // (v5.17.136) An ayah tap opens the WORD study first — the per-word lexicon
  // surface. The ayah-level Study Mode surface, which is what carries the
  // hadith text-match scoping this spec is about, is the deliberate secondary
  // step from there (its own tafsir continuation). The old spec expected the
  // ayah modal straight from the tap, which is the pre-split arrangement.
  const wordStudy = page.locator('.modal').first();
  await expect(wordStudy, 'word study surface opens from the ayah tap').toBeVisible({
    timeout: 20000,
  });
  await expect(wordStudy).toContainText(/Word Study|دراسة الكلمات|Word study/);
  await wordStudy.locator('[data-action="tafsir-open"]').first().click();

  const modal = page.locator('.mushaf-ayah-detail').first();
  await expect(modal, 'Study Mode surface opens from word study').toBeVisible({ timeout: 20000 });

  await expect(modal.locator('.mushaf-ayah-detail__mode')).toHaveText(
    /Word Study|دراسة الكلمات|Study Mode|وضع الدراسة/
  );
  const section = page.locator('.mushaf-ayah-detail__study-hadith').first();
  await expect(section, 'hadith text-match section renders').toBeVisible({ timeout: 15000 });
  await expect(section).toContainText(/Searched \d+ of \d+|تم البحث في \d+ من \d+/);
  await expect(section).toContainText(/text matches|تطابقات نصية/);
  expect(pageErrors).toEqual([]);
});
