import { test, expect } from '@playwright/test';

/**
 * tajweed-course.spec.js — the course, as a reader meets it.
 *
 * The unit suite proves the spine's arithmetic and its citations. This
 * proves the two things only a browser can: that the ladder actually moves
 * when a session is marked studied, and that switching to open access
 * unlocks everything without losing that progress.
 */

/**
 * Wait for the course itself, not just a non-empty #main.
 *
 * #main is already full during the boot skeleton, so `not.toBeEmpty()` passes
 * before the lazy view has loaded — which made one assertion a false pass and
 * another read zero locked sessions that had not rendered yet. Course-specific
 * element or it did not happen.
 */
async function courseReady(page) {
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator('.taj-course__session').first()).toBeVisible({ timeout: 20000 });
}

test.describe('tajweed course', () => {
  test('guided mode walks the ladder, and progress survives a reload', async ({ page }) => {
    await page.goto('./#/tajweed-course');
    await courseReady(page);

    // The course opens on madd, as the sourced shape requires.
    await expect(page.locator('#main')).toContainText('Madd', { timeout: 15000 });

    // Guided: exactly one session is open on a first visit.
    const locked = page.locator('.taj-course__session--locked');
    const total = page.locator('.taj-course__session');
    const lockedAtStart = await locked.count();
    const totalCount = await total.count();
    expect(totalCount).toBeGreaterThan(10);
    expect(lockedAtStart).toBe(totalCount - 1);

    // The first session offers a drill, and the rule chips cite a source.
    await expect(page.locator('[data-action="tajweed-course-drill-rule"]').first()).toBeVisible();
    await expect(page.locator('#main')).toContainText('Tuhfat al-Atfal');

    // Mark it studied: the ladder must advance, not just relabel.
    await page.locator('[data-action="tajweed-course-toggle-done"]').first().click();
    await expect(page.locator('#main')).toContainText('Studied', { timeout: 10000 });
    await page.waitForTimeout(400);
    expect(await locked.count()).toBe(lockedAtStart - 1);

    // And it must survive a reload — otherwise the plan is decorative.
    await page.reload();
    await courseReady(page);
    expect(await locked.count()).toBe(lockedAtStart - 1);
  });

  test('open access unlocks every session and keeps progress', async ({ page }) => {
    await page.goto('./#/tajweed-course');
    await courseReady(page);
    await page.locator('[data-action="tajweed-course-toggle-done"]').first().click();
    await expect(page.locator('#main')).toContainText('Studied', { timeout: 10000 });

    const studiedBefore = await page.locator('.taj-course__session--done').count();
    expect(studiedBefore).toBe(1);

    // Switch to open access via the real control.
    await page
      .locator('input[data-action="tajweed-course-mode"][value="open"]')
      .check({ force: true });
    await page.waitForTimeout(600);
    await expect(page.locator('#main')).toContainText('Open access', { timeout: 10000 });

    expect(await page.locator('.taj-course__session--locked').count()).toBe(0);
    // The whole point: switching modes must not throw away what was done.
    expect(await page.locator('.taj-course__session--done').count()).toBe(studiedBefore);

    // And it persists.
    await page.reload();
    await courseReady(page);
    expect(await page.locator('.taj-course__session--locked').count()).toBe(0);
    expect(await page.locator('.taj-course__session--done').count()).toBe(studiedBefore);
  });

  test('search finds a rule and says so when it finds nothing', async ({ page }) => {
    await page.goto('./#/tajweed-course');
    await courseReady(page);

    const box = page.locator('#tajweed-course-search-input');
    await expect(box).toBeVisible();

    await box.fill('ikhfa');
    await page.waitForTimeout(700);
    // A search result is a flat list, and it found something.
    await expect(page.locator('.taj-course__session').first()).toBeVisible();
    const hits = await page.locator('.taj-course__session').count();
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(14);

    await box.fill('zzzznotathing');
    await page.waitForTimeout(700);
    await expect(page.locator('#main')).toContainText('No session matches', { timeout: 10000 });
  });

  test('the course is bilingual', async ({ page }) => {
    await page.goto('./#/tajweed-course');
    await courseReady(page);
    await expect(page.locator('#main')).toContainText('Tajweed course');

    await page.evaluate(() => {
      const KEY = 'nurAlDhikr:v2:state';
      const raw = localStorage.getItem(KEY);
      const state = raw ? JSON.parse(raw) : {};
      state.settings = { ...(state.settings || {}), language: 'ar' };
      localStorage.setItem(KEY, JSON.stringify(state));
    });
    await page.reload();
    await courseReady(page);
    await expect(page.locator('#main')).toContainText('دورة التجويد');
  });
});
