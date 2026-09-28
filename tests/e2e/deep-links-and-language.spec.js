import { test, expect } from '@playwright/test';

/**
 * deep-links-and-language.spec.js — nothing is a dead end, and you can always
 * change language.
 *
 * Two findings from an independent audit, both verified by execution here:
 * a bare #/mood and a bare #/focus rendered "not found" — and #/focus is
 * launched with no parameters from the app's own palette, so tapping it in
 * the launcher was a dead end. And the language switch existed only at first
 * run and in Settings, so a reader who mis-picked at onboarding had no
 * in-context way back.
 */

/**
 * A view has painted, not merely a non-empty boot skeleton.
 *
 * Deliberately not `.view`: the Mushaf and the tajweed course do not use
 * that wrapper, and a helper that demands one shape makes the spec lie about
 * half the app. Every test below asserts on the thing it actually cares
 * about, and those assertions retry on their own.
 */
async function ready(page) {
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
}

const DEAD_END_TEXT = /may be old|incomplete|not found/i;

test.describe('deep links', () => {
  for (const route of ['#/mood', '#/focus']) {
    test(`${route} without a parameter offers a choice, not an error`, async ({ page }) => {
      await page.goto(`./${route}`);
      await ready(page);
      // The library index may still be in flight on a cold boot, and the view
      // shows a loading state for that. It must never show an ERROR for it.
      await expect(page.locator('#main')).not.toContainText(DEAD_END_TEXT, { timeout: 20000 });
      // It must offer real destinations, not just a "go home" apology.
      const links = page.locator('#main a[href*="mood"], #main a[href*="focus"]');
      await expect(links.first()).toBeVisible({ timeout: 20000 });
    });
  }

  test('a typed id that does not exist is still honestly not-found', async ({ page }) => {
    // The picker must not become a way to fake content. A stale or mistyped
    // id has no picker to fall back to, and should say so.
    await page.goto('./#/mood?id=definitely-not-a-mood');
    await ready(page);
    await expect(page.locator('#main')).toContainText(DEAD_END_TEXT, { timeout: 10000 });
  });

  test('the palette entry for Focus no longer dead-ends', async ({ page }) => {
    await page.goto('./#/home');
    await ready(page);
    await page.locator('[data-action="open-palette"]').first().click();
    const focusEntry = page.locator('[data-action="navigate"][data-view="focus"]').first();
    await expect(focusEntry, 'the palette must offer Focus').toBeVisible({ timeout: 10000 });
    await focusEntry.click();
    await ready(page);
    await expect(page.locator('#main')).not.toContainText(DEAD_END_TEXT, { timeout: 10000 });
  });
});

test.describe('language switch', () => {
  test('every view carries a language control', async ({ page }) => {
    const routes = [
      '#/home',
      '#/quran?id=112',
      '#/mushaf?page=2',
      '#/library',
      '#/hadith',
      '#/prayer',
      '#/tasbih',
      '#/tajweed-course',
    ];
    for (const route of routes) {
      await page.goto(`./${route}`);
      await ready(page);
      const toggles = page.locator('[data-action="quick-language-toggle"]');
      await expect(toggles, `${route} has no language control`).toHaveCount(1, { timeout: 10000 });
    }
  });

  test('pressing it flips the interface, the dir, and the html lang', async ({ page }) => {
    await page.goto('./#/home');
    await ready(page);
    const before = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    expect(before).toBe('en');

    await page.locator('[data-action="quick-language-toggle"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar', { timeout: 10000 });

    // And back again, because a one-way switch is not a switch.
    await page.locator('[data-action="quick-language-toggle"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr', { timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10000 });
  });

  test('the button announces the language it switches TO', async ({ page }) => {
    await page.goto('./#/home');
    await ready(page);
    const btn = page.locator('[data-action="quick-language-toggle"]');
    // While the app is English, the control is labelled for Arabic.
    await expect(btn).toHaveAttribute('lang', 'ar');
    await expect(btn).toHaveAttribute('hreflang', 'ar');
    const label = await btn.getAttribute('aria-label');
    expect(label && label.length).toBeGreaterThan(0);
  });
});
