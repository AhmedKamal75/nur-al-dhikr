/**
 * e2e/esc-order.spec.js — APP-FLOW I2 in a real browser.
 * Esc unwinds EXACTLY ONE layer, top-first: modal → drawer →
 * mushaf-fullscreen → reader-immersive. The case that matters is the
 * one the code comment warns about: a modal over immersive reading —
 * one Esc must close the modal WITHOUT stripping the reading mode
 * underneath it. node:test can assert the chain exists; only the
 * browser proves one press removes one layer.
 */
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('esc: modal closes, immersive reading survives, next esc leaves it', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/quran?id=112');
  await expect(page.locator('.ayah-card').first()).toBeVisible({ timeout: 20000 });

  // Enter immersive reading (chrome-free column, CSS-only — no native API).
  await page.locator('[data-action="quran-toggle-immersive"]').first().click();
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(1, { timeout: 5000 });

  // Open the quick sheet over it with a real press-hold.
  const arabic = page.locator('.ayah-card__arabic').first();
  const box = await arabic.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.up();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });

  // First Esc: exactly the modal goes; immersive stays.
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal__body')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(1, { timeout: 5000 });
  expect(page.url().includes('#/quran'), 'still on the reader route').toBe(true);

  // Second Esc: immersive itself leaves.
  await page.keyboard.press('Escape');
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(0, { timeout: 5000 });

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('esc: mobile drawer closes, route stays put', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(1500);

  await page.locator('[data-action="nav-toggle"]').first().click();
  await expect(page.locator('body.nav-drawer-open')).toHaveCount(1, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('body.nav-drawer-open')).toHaveCount(0, { timeout: 5000 });
  expect(page.url().includes('#/mushaf'), 'drawer esc keeps the route').toBe(true);

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
});
