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

/**
 * (v5.17.136) v5.17.122 collapsed the optional first-run doors behind one
 * native <details> (`settings-setup-disclosure`). Opening it IS the user
 * path now, so the specs open it rather than reaching through it. Without
 * this the "deferred doors wait passively in Settings" claim was untestable.
 */
async function openSetupDisclosure(page) {
  const disclosure = page.locator('#main details.settings-setup-disclosure').first();
  await expect(disclosure, 'the Setup disclosure is present in Settings').toHaveCount(1);
  if (!(await disclosure.evaluate((el) => el.open))) {
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');
  }
  return disclosure;
}

test('fresh readers keep Home clean and find deferred setup in Settings', async ({ page }) => {
  await page.goto('./#/home');
  await ready(page);
  await expect(page.locator('.panel--onboarding')).toHaveCount(0);
  await page.goto('./#/settings');
  await ready(page);
  const setup = await openSetupDisclosure(page);
  await expect(setup).toContainText('Finish setup when ready');
});

test('the deferred introduction reopens inside Settings, never on Home', async ({ page }) => {
  await page.goto('./#/settings');
  await ready(page);
  await openSetupDisclosure(page);
  await page.locator('.panel--deferred [data-action="onboarding-reshow"]').click();
  // (v5.17.136) The section is addressed as a PATH segment now
  // (`#/settings/onboarding`), not the old `?id=onboarding` query. Both still
  // resolve — the deep-link specs prove the query form — but the app emits the
  // path form, so that is what the re-show action must produce.
  await expect(page).toHaveURL(/#\/settings\/onboarding$/);
  await expandWizard(page);
  await expect(page.locator('.panel--onboarding').first()).toContainText('Choose your language');
});

test('the re-opened wizard keeps Arabic inside the Settings surface', async ({ page }) => {
  await page.goto('./#/settings?id=onboarding');
  await ready(page);
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-language"][data-lang="ar"]')
    .click();
  await expect(page.locator('.onboarding-line__summary').first()).toContainText('حدّد موقعك', {
    timeout: 10000,
  });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('completed setup removes the replay wizard but never alters Home composition', async ({
  page,
}) => {
  await page.goto('./#/settings?id=onboarding');
  await ready(page);
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-language"][data-lang="en"]')
    .click();
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-confirm"][data-step="location"]')
    .click();
  await expandWizard(page);
  const voice = page.locator('.panel--onboarding .reciter-row').first();
  await voice.click();
  await expandWizard(page);
  await page
    .locator('.panel--onboarding [data-action="onboarding-confirm"][data-step="reciter"]')
    .click();
  await expect(page.locator('.panel--onboarding')).toHaveCount(0, { timeout: 10000 });
  await page.goto('./#/home');
  await ready(page);
  await expect(page.locator('.panel--onboarding')).toHaveCount(0);
});
