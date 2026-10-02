import { test, expect } from '@playwright/test';

/**
 * onboarding.spec.js (v5.17.48) — the 3-step introduction subset:
 * language → location-or-offset → reciter, then done, with an instant
 * skip; the five deferred doors wait passively in Settings and never pop
 * up on their own.
 *
 * Each test gets a fresh browser context (empty storage = a fresh
 * reader), so "first run" needs no manual reset. The wizard rides
 * collapsed in a native <details>: the summary line is always visible,
 * the step body needs one click on the summary first.
 */
test.use({ serviceWorkers: 'block' });

async function ready(page) {
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
}

async function expandWizard(page) {
  const summary = page.locator('.onboarding-line__summary').first();
  await expect(summary).toBeVisible({ timeout: 20000 });
  const body = page.locator('.panel--onboarding .onboarding-step__body').first();
  if (!(await body.isVisible())) await summary.click();
  await expect(body).toBeVisible({ timeout: 10000 });
}

test('fresh readers meet three decisions: language, location, reciter', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto('./#/home');
  await ready(page);

  // 1 of 3 on the collapsed line, no scrolling past chrome to find it.
  await expect(page.locator('.onboarding-line__summary').first()).toContainText(
    '0 of 3 steps done',
    { timeout: 20000 }
  );

  // Language: pick English, the wizard advances.
  await expandWizard(page);
  await expect(page.locator('.panel--onboarding').first()).toContainText('Choose your language');
  await page
    .locator('.panel--onboarding [data-action="onboarding-language"][data-lang="en"]')
    .click();
  await expect(page.locator('.onboarding-line__summary').first()).toContainText(
    'Set your location'
  );

  // Location: continue with defaults (no GPS in a test browser).
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-confirm"][data-step="location"]')
    .click();
  await expect(page.locator('.onboarding-line__summary').first()).toContainText(
    'Choose your reciter'
  );

  // Reciter: pick a voice, then Done — the wizard leaves on its own.
  await expandWizard(page);
  const voice = page.locator('.panel--onboarding .reciter-row', { hasText: 'Mahmoud Al-Husary' });
  await expect(voice).toBeVisible({ timeout: 10000 });
  await voice.click();
  // Any tap re-renders Home, which collapses the native <details> again —
  // re-open it before finishing (same gesture a reader makes).
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-confirm"][data-step="reciter"]')
    .click();
  await expect(page.locator('.panel--onboarding')).toHaveCount(0, { timeout: 10000 });

  // Home is complete with the answers. Since IA-7 the adhkar grid is no longer
  // ON Home, so asserting `.home-browser` here was asserting a surface that had
  // moved (it was one of the eight tests IA-7 left red). What "complete" means
  // now is asserted instead: the Today landing renders its own surface, and the
  // reciter this wizard just chose actually stuck — which is the thing the old
  // proxy was standing in for.
  await expect(page.locator('.home-hero')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.home-prayer-ribbon')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.home-today')).toBeVisible({ timeout: 10000 });
  const keptReciter = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('nurAlDhikr:v2:state') || '{}').settings?.reciter;
    } catch {
      return null;
    }
  });
  expect(
    keptReciter,
    "the wizard let the reader pick a voice and then lost it — 'Home is complete with the answers' is the claim under test"
  ).toBeTruthy();

  // A reload does not bring the wizard back.
  await page.reload();
  await ready(page);
  await expect(page.locator('.panel--onboarding')).toHaveCount(0, { timeout: 10000 });
  expect(errors, `uncaught exceptions: ${errors.join('\n')}`).toEqual([]);
});

test('an instant skip leaves a complete home behind', async ({ page }) => {
  await page.goto('./#/home');
  await ready(page);
  await expect(page.locator('.onboarding-line__summary').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Maybe later' }).click();
  await expect(page.locator('.panel--onboarding')).toHaveCount(0, { timeout: 10000 });
  // Same correction as above: `.home-browser` moved to the AZKAR section in
  // IA-7. Skipping must still leave a usable Today landing, not a blank page.
  await expect(page.locator('.home-hero')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.home-today')).toBeVisible({ timeout: 10000 });
  await page.reload();
  await ready(page);
  await expect(page.locator('.panel--onboarding')).toHaveCount(0, { timeout: 10000 });
});

test('picking Arabic re-languages the wizard itself', async ({ page }) => {
  await page.goto('./#/home');
  await ready(page);
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-language"][data-lang="ar"]')
    .click();
  // The whole session follows from the first tap — step 2 in Arabic.
  await expect(page.locator('.onboarding-line__summary').first()).toContainText('حدّد موقعك', {
    timeout: 10000,
  });
  await expandWizard(page);
  await expect(page.locator('.panel--onboarding').first()).toContainText(
    'المتابعة بالإعدادات الافتراضية'
  );
});

test('deferred doors wait in Settings and the introduction re-opens', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto('./#/settings');
  await ready(page);

  // The passive block: six doors, no popups, no progress bar.
  const block = page.locator('.panel--deferred').first();
  await expect(block).toBeVisible({ timeout: 20000 });
  await expect(block).toContainText('Finish setup when ready');
  for (const label of [
    'Comfortable to read?',
    'Prayer alerts',
    'Calculation method',
    'Daily Dhikr Goal',
    'Install the app',
    'Read your first adhkar',
  ]) {
    await expect(block).toContainText(label);
  }

  // Re-open the introduction, meet it on Home again.
  await page.locator('.panel--deferred [data-action="onboarding-reshow"]').click();
  await page.goto('./#/home');
  await ready(page);
  await expect(page.locator('.onboarding-line__summary').first()).toContainText(
    '0 of 3 steps done',
    {
      timeout: 20000,
    }
  );
  expect(errors, `uncaught exceptions: ${errors.join('\n')}`).toEqual([]);
});
