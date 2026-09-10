/**
 * e2e/typing.spec.js — v5.2.20 kept in-tree (was a temporary probe).
 * Search-as-you-type must debounce into a replaceGo navigation AND keep
 * the caret in the box (the focus-salvage contract the factory owns).
 * One case per debounced path; the hadith-query path dispatches instead
 * of navigating and is pinned by unit tests.
 */
import { test, expect } from '@playwright/test';

test('typing: debounced search navigates and keeps focus', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const cases = [
    ['#/search', '#search-input', 'sabr'],
    ['#/roots', '#roots-search-input', 'ktb'],
    ['#/quran', '#quran-search-input', 'raid'],
  ];
  for (const [route, sel, text] of cases) {
    await page.goto(route);
    await expect(page.locator(sel)).toBeVisible({ timeout: 20000 });
    await page.locator(sel).click();
    await page.keyboard.type(text, { delay: 40 });
    await page.waitForTimeout(600);
    const url = page.url();
    expect(url.includes(`q=${text}`), `${route}: url lacks q=${text} (got ${url})`).toBe(true);
    const focused = await page.evaluate((s) => document.activeElement?.matches(s), sel);
    expect(focused, `${route}: focus lost from ${sel}`).toBe(true);
  }

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
