/**
 * e2e/recovered.spec.js (v5.2.27–29) — the buried-feature recovery waves
 * in a real browser: first-class reminder toggles flip and persist,
 * plan share buttons are present, and the sadaqah editor logs an
 * amount+note gift into visible history. Permanent spec (the temporary
 * probe pattern ends at v5.2.21 — these stay).
 */
import { test, expect } from '@playwright/test';

test('recovered: reminder toggles flip, plan buttons present, all persist', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/settings');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.locator('#settings-sec-notifications summary').click();

  const jumuah = page.locator('[data-action="toggle-jumuah-reminder"]');
  const verse = page.locator('[data-action="toggle-dailyverse-reminder"]');
  const fitr = page.locator('[data-action="toggle-zakatfitr-reminder"]');
  await expect(jumuah).toBeVisible({ timeout: 10000 });
  await expect(verse).toBeVisible();
  await expect(fitr).toBeVisible();
  await expect(page.locator('[data-bind="jumuah-reminder-time"]')).toBeVisible();
  await expect(page.locator('[data-bind="dailyverse-reminder-time"]')).toBeVisible();

  // Flip Jumu'ah on: the toggle reflects the store, and a reload keeps it
  // (settings are persisted — a toggle that forgets is the B-2 bug class).
  await expect(jumuah).toHaveAttribute('aria-pressed', 'false');
  await jumuah.click();
  await expect(jumuah).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.locator('#settings-sec-notifications summary').click();
  await expect(page.locator('[data-action="toggle-jumuah-reminder"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  // Restore off so the spec never leaks state into later runs.
  await page.locator('[data-action="toggle-jumuah-reminder"]').click();
  await expect(page.locator('[data-action="toggle-jumuah-reminder"]')).toHaveAttribute(
    'aria-pressed',
    'false'
  );

  // Plan sharing entry points live in Settings → Data.
  await page.locator('#settings-sec-data summary').click();
  await expect(page.locator('[data-action="export-plan"]')).toBeVisible();
  await expect(page.locator('[data-action="import-plan"]')).toBeVisible();

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('recovered: sadaqah editor logs an amount+note gift into history', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // Fresh installs cap Home to five panels (UX-1) — the worship card opts
  // in through Settings → Content, exactly like a real first-run user.
  await page.goto('#/settings');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.locator('#settings-sec-content summary').click();
  const worshipToggle = page.locator('input[data-action="home-panel-toggle"][data-id="worship"]');
  await expect(worshipToggle).toBeVisible({ timeout: 10000 });
  if (!(await worshipToggle.isChecked())) await worshipToggle.check({ force: true });
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.locator('[data-action="sadaqah-open-editor"]').first().click();
  const form = page.locator('form[data-form="sadaqah-entry"]');
  await expect(form).toBeVisible({ timeout: 10000 });
  await form.locator('input[name="amount"]').fill('12.5');
  await form.locator('input[name="note"]').fill('e2e neighbor meal');
  await form.locator('button[type="submit"]').click();
  // The modal rebuilds in place: the gift joins the history list.
  await expect(page.locator('.sadaqah-editor')).toContainText('e2e neighbor meal');
  await expect(page.locator('.sadaqah-editor')).toContainText('12.5');

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('recovered: verse theme chips narrow the daily card and persist', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // The verse panel ships in the fresh-install default set (UX-1), so no
  // opt-in dance is needed here — unlike the worship card above.
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const mercy = page.locator('[data-key="dailyAyahTheme"][data-value="mercy"]');
  await expect(mercy).toBeVisible({ timeout: 10000 });
  await mercy.click();
  await expect(mercy).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator('[data-key="dailyAyahTheme"][data-value="mercy"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  // Restore the default so later runs start unfiltered.
  await page.locator('[data-key="dailyAyahTheme"][data-value="any"]').click();
  await expect(page.locator('[data-key="dailyAyahTheme"][data-value="any"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
