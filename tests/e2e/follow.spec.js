/**
 * e2e/follow.spec.js — verse follow-along: the Mushaf turns pages as
 * recitation crosses page boundaries (2:5 → 2:6 flips page 2 → 3).
 * Skips drive the engine instantly instead of waiting out real ayahs.
 */
import { test, expect } from '@playwright/test';

test('follow: mushaf flips to the reciting ayahs page', async ({ page }) => {
  // (v5.17.2, matrix) a fixed-sleep multi-step flow (≈10s of sleeps plus
  // mushaf/audio load): triple the budget so parallel matrix workers on
  // small viewports don't starve it. Assertions are unchanged — a broken
  // flip still fails, just with room to breathe.
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);
  // Study action — always the ayah engine regardless of playback pref.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-action="surah-play"]')];
    const b = btns.find((x) => x.dataset.surah === '2') || btns[0];
    b.click();
  });
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });
  for (let i = 0; i < 6; i += 1) {
    await page.locator('[data-action="recite-ayah-next"]').first().click();
    await page.waitForTimeout(1200);
  }
  await expect(page).toHaveURL(/#\/mushaf\?page=3/, { timeout: 10000 });
  expect(pageErrors).toEqual([]);
});
