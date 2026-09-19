/**
 * e2e/shell-chrome.spec.js — (v5.12.0 hostile review) shell chrome honesty:
 * the skip link speaks the UI language (AR renders Arabic, EN renders
 * English) and the #playerbar landmark exists from first paint.
 */
import { test, expect } from '@playwright/test';

test('shell chrome: skip link localizes, playerbar is a landmark', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/settings');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  // Landmark exists in the first-paint HTML (static shell, pre-session —
  // the renderer removes it again once mounted with no audio, correctly).
  const firstPaint = await page.request.get('/');
  const staticHtml = await firstPaint.text();
  expect(staticHtml).toContain('<div id="playerbar" role="region" aria-label="Audio player">');
  expect(staticHtml).toContain('<a class="skip-link" href="#main">');

  // Switch to Arabic through the real settings control.
  await page.locator('[data-action="set-setting"][data-key="language"][data-value="ar"]').click();
  await expect(page.locator('.skip-link')).toHaveText('تخطَّ إلى المحتوى', { timeout: 10000 });

  // Back to English.
  await page.locator('[data-action="set-setting"][data-key="language"][data-value="en"]').click();
  await expect(page.locator('.skip-link')).toHaveText('Skip to content', { timeout: 10000 });

  expect(pageErrors).toEqual([]);
});
