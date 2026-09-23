/**
 * e2e/route-css.spec.js — (PERF-02-ARCH) route-lazy book stylesheet.
 *
 * quran.css (~100KB) matches nothing outside the mushaf/reader/roots
 * routes, so it must NOT load on a cold Home visit, and MUST load on
 * first entry to a route that needs it (once per session; the SW
 * precache keeps it offline-capable).
 */
import { test, expect } from '@playwright/test';

const QURAN_LINK = 'link[data-route-css="quran"]';
const STATIC_QURAN_LINK = 'link[rel="stylesheet"][href*="quran.css"]:not([data-route-css])';

test('route css: cold home ships no book stylesheet; book routes pull it once', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // No static quran.css link anywhere (index.html must not carry it).
  expect(await page.locator(STATIC_QURAN_LINK).count()).toBe(0);
  expect(await page.locator(QURAN_LINK).count()).toBe(0);

  // First book-route entry injects it exactly once.
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator(QURAN_LINK)).toHaveCount(1, { timeout: 15000 });
  const matched = await page.evaluate(() => {
    let n = 0;
    for (const sheet of document.styleSheets) {
      let href = '';
      try {
        href = sheet.href || '';
      } catch {
        continue;
      }
      if (!href.includes('quran.css')) continue;
      let rules = [];
      try {
        rules = [...sheet.cssRules];
      } catch {
        continue;
      }
      for (const r of rules) {
        if (!r.selectorText) continue;
        for (const sel of r.selectorText.split(',')) {
          const s = sel.trim();
          if (!s || /::?(before|after|hover|focus|active)/.test(s)) continue;
          try {
            if (document.querySelector(s)) {
              n += 1;
              break;
            }
          } catch {}
        }
      }
    }
    return n;
  });
  expect(matched, 'quran.css must actually style the mushaf route').toBeGreaterThan(0);

  // Other book routes reuse the single injection; home never adds one.
  await page.goto('#/quran?id=112');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator(QURAN_LINK)).toHaveCount(1);
  expect(pageErrors).toEqual([]);
});

test('route css: desktop layer is media-gated off small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const media = await page.locator('link[href*="desktop.css"]').getAttribute('media');
  expect(media).toBe('(min-width: 960px)');
  expect(await page.evaluate(() => window.matchMedia('(min-width: 960px)').matches)).toBe(false);
});
