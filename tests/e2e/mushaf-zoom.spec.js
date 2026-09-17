/**
 * e2e/mushaf-zoom.spec.js — (v5.9.0) the merged zoom contract: fullscreen
 * auto-fills by default; the text-size slider takes manual control
 * (persisted scale + internal scroll); the auto-fit toggle refills.
 * The fs controls auto-fade, so the spec reveals them with pointer
 * movement before each chrome interaction.
 */
import { test, expect } from '@playwright/test';

test('mushaf fullscreen: auto-fill, manual slider zoom, back to auto', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=1');
  await expect(page.locator('.mushaf-page__text').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="mushaf-toggle-fullscreen"]').first().click();

  const fitOf = () =>
    page.evaluate(() => {
      const wrap = document.querySelector('[data-mushaf-fs] .mushaf-page-wrap');
      const text = wrap?.querySelector('.mushaf-page__text');
      return {
        fit: wrap?.style.getPropertyValue('--mushaf-fit-scale') || null,
        manual: document.body.classList.contains('is-mushaf-manual'),
        scrollable: text ? text.scrollHeight - text.clientHeight : null,
      };
    });
  const openSettings = async () => {
    await page.mouse.move(195, 400);
    await page
      .locator('.mushaf-fs-controls [data-action="mushaf-open-settings"]')
      .first()
      .click({ timeout: 15000 });
    await expect(page.locator('[data-bind="mushaf-font-scale"]').first()).toBeVisible({
      timeout: 15000,
    });
  };

  // Auto-fill by default: fitted scale, body not manual, zero overflow.
  await openSettings();
  let m = await fitOf();
  expect(m.manual).toBe(false);
  expect(m.scrollable).toBe(0);

  // Slider zoom takes manual control: exact slider scale, scrollable.
  await page.evaluate(() => {
    const el = document.querySelector('[data-bind="mushaf-font-scale"]');
    el.value = '2.0';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  m = await fitOf();
  expect(m.manual).toBe(true);
  expect(parseFloat(m.fit)).toBeCloseTo(2.0, 1);
  expect(m.scrollable).toBeGreaterThan(0);

  // The toggle refills: back to fitted, zero overflow.
  await openSettings();
  const tgl = page.locator('[data-action="toggle-mushaf-pref"][data-key="autoFit"]');
  await expect(tgl).toBeAttached({ timeout: 15000 });
  await tgl.check({ force: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  m = await fitOf();
  expect(m.manual).toBe(false);
  expect(m.scrollable).toBe(0);
  expect(pageErrors).toEqual([]);
});
