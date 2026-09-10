/**
 * e2e/longpress.spec.js — v5.2.19 kept in-tree (was a temporary probe).
 * A real press-hold on reader ayah text must open the quick sheet
 * through its on-demand chunk. The press must land on non-interactive
 * text — the card's own buttons keep their taps by design.
 */
import { test, expect } from '@playwright/test';

test('long-press: hold on ayah text opens the quick sheet', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/quran?id=112');
  const arabic = page.locator('.ayah-card__arabic').first();
  await expect(arabic).toBeVisible({ timeout: 20000 });
  const box = await arabic.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.up();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
