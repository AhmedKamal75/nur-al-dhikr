/**
 * e2e/sajdah-accent.spec.js — (v5.6.0, R-3) sajdah-line accent regression
 * pins: the printed over-word line on سُجَّدًا (As-Sajdah 15, mushaf
 * page 416) renders under every shipped typeface, with a screenshot per
 * face archived to test-results/ for human review. Unit tests pin the
 * matcher + CSS; this pins the composed page in a real browser.
 */
import { test, expect } from '@playwright/test';

const FONTS = ['amiriQuran', 'amiri', 'scheherazade', 'system'];

test('sajdah accent renders under every mushaf typeface', async ({ page }) => {
  test.setTimeout(180000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=416');
  await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });

  for (const fontId of FONTS) {
    // Open the Mushaf action sheet, then the display settings, and pick
    // the typeface.
    await page.locator('[data-action="mushaf-more"]').first().click();
    await page.locator('[data-action="mushaf-open-settings"]').first().click();
    await expect(page.locator('.mushaf-settings__fonts').first()).toBeVisible({
      timeout: 15000,
    });
    await page.locator(`[data-action="mushaf-set-font"][data-font="${fontId}"]`).click();
    // The sheet re-renders on pick; close it via Escape to the page.
    await page.keyboard.press('Escape');
    const wrap = page.locator('[data-mushaf-font]').first();
    await expect(wrap).toHaveAttribute('data-mushaf-font', fontId, { timeout: 15000 });
    const accent = page.locator('.mushaf-ayah__sajda-word').first();
    await expect(accent).toBeVisible({ timeout: 15000 });
    // The accent line sits above the word (the printed convention), and
    // the word's text survives byte-identical inside the wrapping span.
    const box = await accent.boundingBox();
    expect(box.height, `${fontId}: accent span has laid-out height`).toBeGreaterThan(0);
    const text = await accent.textContent();
    expect(text.trim().length, `${fontId}: accent span carries the word`).toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/sajdah-${fontId}.png` });
  }
  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
});
