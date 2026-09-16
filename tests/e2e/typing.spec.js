/**
 * e2e/typing.spec.js — v5.2.20 kept in-tree (was a temporary probe).
 * Search-as-you-type must debounce into a replaceGo navigation AND keep
 * the caret in the box (the focus-salvage contract the factory owns).
 * One case per debounced path; the hadith-query path dispatches instead
 * of navigating and is pinned by unit tests.
 */
import { test, expect } from '@playwright/test';

test('typing: debounced search navigates and keeps focus', async ({ page }) => {
  // The roots case allows 45s (cold SW precache + ~1MB index behind a
  // 15s fetch timeout + retry), so the test budget must exceed it.
  test.setTimeout(120000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const cases = [
    ['#/search', '#search-input', 'sabr'],
    // Roots carries a ~1MB index behind a cold SW precache (246 files) on
    // first visit: the data lands seconds after the skeleton on slow CI
    // (observed 17s starvation vs the 15s fetch timeout + retry). The app
    // self-heals via retry — give that path room instead of flaking.
    ['#/roots', '#roots-search-input', 'ktb', 45000],
    ['#/quran', '#quran-search-input', 'raid'],
  ];
  for (const [route, sel, text, timeoutMs] of cases) {
    await page.goto(route);
    await expect(page.locator(sel)).toBeVisible({ timeout: timeoutMs || 20000 });
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
