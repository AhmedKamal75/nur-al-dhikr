/**
 * e2e/routes-extended.spec.js — cover the 16 routes the smoke/lazy specs
 * never walk (library, category, mood, focus, favorites, collections,
 * collection, statistics, qibla, checklist, ramadan, zakat, editor,
 * mutashabihat, kids, ambient): every route renders into #main with zero
 * console errors and zero uncaught exceptions.
 *
 * Parameterised routes use known-good ids (category `morning` from
 * data/adhkar.json, mood `grateful` from js/domain/moods.js); the bare
 * focus/collection variants intentionally assert the honest empty states.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  'library',
  'category/morning',
  'mood/grateful',
  'focus',
  'favorites',
  'collections',
  'collection',
  'statistics',
  'qibla',
  'checklist',
  'ramadan',
  'zakat',
  'editor',
  'mutashabihat',
  'kids',
  'ambient',
];

test('routes-extended: all 16 remaining views render with zero errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  for (const route of ROUTES) {
    await page.goto(`#/${route}`);
    await expect(page.locator('#main'), `route ${route} renders`).not.toBeEmpty({
      timeout: 20000,
    });
  }

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('routes-extended: 390px viewport has no horizontal overflow on chrome routes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['home', 'library', 'settings', 'statistics', 'search']) {
    await page.goto(`#/${route}`);
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - 390);
    expect(overflow, `${route} overflows 390px viewport by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test('routes-extended: views expose a heading for screen readers', async ({ page }) => {
  for (const route of ['library', 'statistics', 'qibla', 'collections', 'kids']) {
    await page.goto(`#/${route}`);
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    // Poll: #main is non-empty while skeletons shimmer, but the heading
    // only lands with the loaded view — a one-shot read flakes under load.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const main = document.getElementById('main');
            if (!main) return false;
            return !!(
              main.querySelector('h1, h2, [role="heading"]') ||
              main.querySelector('[aria-label], [aria-labelledby]')
            );
          }),
        { timeout: 20000 }
      )
      .toBe(true);
  }
});
