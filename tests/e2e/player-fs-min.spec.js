/**
 * e2e/player-fs-min.spec.js — (sweep) minimize from mushaf fullscreen:
 * the fs console carries a minimize chevron, the slim pill overlays the
 * book (exactly one chrome — the rows yield), and restore brings the
 * session console back with audio untouched.
 */
import { test, expect } from '@playwright/test';

test('player fs minimize: pill overlays the book, restore returns', async ({ page }) => {
  // Audio session start dominates the clock (network fetch + engine
  // warmup), like the other audio specs — 120s, same as mushaf-zoom.
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  // Page 4 sits mid-Baqarah: its fullscreen spread is single-surah, so
  // the transport carries direct from-here play (page 2's spread opens
  // the surah picker instead — covered by the picker unit pins).
  await page.goto('#/mushaf?page=4');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(2000);
  // Enter fullscreen.
  await page.locator('[data-action="mushaf-toggle-fullscreen"]').first().click();
  await expect(page.locator('body.is-mushaf-fullscreen')).toBeAttached({ timeout: 8000 });
  // Start a verse session from the fullscreen play button.
  await page
    .locator('.mushaf-fs-controls [data-action="surah-play"]')
    .first()
    .click({ force: true });
  await expect(page.locator('.mushaf-fs-console')).toBeVisible({ timeout: 20000 });
  // The fs console carries minimize.
  const fsMin = page.locator('.mushaf-fs-console [data-action="player-min-toggle"]').first();
  await expect(fsMin).toBeVisible({ timeout: 8000 });
  await fsMin.click();
  // Pill overlays the book; the full rows yield (exactly one chrome).
  await expect(page.locator('.player-bar--min')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.mushaf-fs-console')).toHaveCount(0, { timeout: 5000 });
  // Restore from the pill → session console back, position kept.
  await page.locator('.player-bar--min [data-action="player-min-toggle"]').click();
  await expect(page.locator('.mushaf-fs-console')).toBeVisible({ timeout: 10000 });
  expect(pageErrors).toEqual([]);
});
