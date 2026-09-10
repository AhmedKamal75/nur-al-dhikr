/**
 * e2e/lazy-views.spec.js — v5.2.15 kept in-tree (was a temporary probe).
 * Lazy routes must resolve from skeleton to real content in a real
 * browser with zero console errors. A stuck skeleton here means the
 * dynamic import broke while every unit test stayed green.
 */
import { test, expect } from '@playwright/test';

test('lazy views resolve to real content', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  for (const route of ['quiz', 'garden', 'about', 'journal', 'certificate']) {
    await page.goto(`#/${route}`);
    await page.waitForTimeout(1500);
    const html = await page.locator('#main').innerHTML();
    if (html.includes('sk-block')) throw new Error(`${route} stuck on skeleton`);
    if (!html.trim()) throw new Error(`${route} blank`);
  }

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
