/**
 * e2e/mushaf-sheet.spec.js — (v5.17.29) the windowed page-height sheet.
 *
 * The windowed .mushaf-page reads as a SHEET of paper: a viewport-relative
 * floor (min-block-size, never a fixed height) so a short page still fills
 * the viewport like paper, while a tall page keeps growing with the
 * document. TRUE fullscreen is a different contract (the auto-fit engine
 * owns it) and must be untouched: there the chain still floors at 0.
 */
import { test, expect } from '@playwright/test';

test('windowed mushaf page holds a viewport-relative sheet floor at 390px', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/mushaf?page=1');
  await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });

  const m = await page.evaluate(() => {
    const sheet = document.querySelector('.mushaf-page');
    const r = sheet.getBoundingClientRect();
    return {
      height: r.height,
      viewport: window.innerHeight,
      minBlock: getComputedStyle(sheet).minBlockSize,
      fullscreen: document.body.classList.contains('is-mushaf-fullscreen'),
    };
  });
  expect(m.fullscreen).toBe(false);
  // The 75dvh floor: 0.75 * 844 = 633. A 5% tolerance absorbs chrome math.
  expect(m.height).toBeGreaterThanOrEqual(m.viewport * 0.7);
  expect(m.minBlock).not.toBe('0px');
  expect(pageErrors).toEqual([]);
});

test('desktop spread: both facing sheets share the sheet height', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });

  const m = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('.mushaf-book--spread .mushaf-page')];
    return {
      count: sheets.length,
      heights: sheets.map((s) => s.getBoundingClientRect().height),
      viewport: window.innerHeight,
    };
  });
  // Spread is pref-on and viewport-wide: two facing sheets, same height.
  expect(m.count).toBe(2);
  for (const h of m.heights) expect(h).toBeGreaterThanOrEqual(m.viewport * 0.7);
  expect(Math.abs(m.heights[0] - m.heights[1])).toBeLessThanOrEqual(2);
  expect(pageErrors).toEqual([]);
});

test('fullscreen keeps its own geometry: the windowed floor does not leak in', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/mushaf?page=1');
  await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="mushaf-toggle-fullscreen"]').first().click();
  await expect
    .poll(
      async () => page.evaluate(() => document.body.classList.contains('is-mushaf-fullscreen')),
      { timeout: 15000 }
    )
    .toBe(true);

  const m = await page.evaluate(() => {
    const sheet = document.querySelector('.mushaf-page');
    return {
      minBlock: getComputedStyle(sheet).minBlockSize,
      fit: document
        .querySelector('[data-mushaf-fs] .mushaf-page-wrap')
        ?.style.getPropertyValue('--mushaf-fit-scale'),
    };
  });
  // layout.css still floors the fullscreen chain at 0 (untouched), and the
  // auto-fit engine still commits its measured scale there.
  expect(m.minBlock).toBe('0px');
  expect(m.fit).not.toBe('');
  expect(pageErrors).toEqual([]);
});
