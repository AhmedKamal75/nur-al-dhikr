/**
 * e2e/a11y-axe.spec.js — (v5.17.3) audit ACCESS follow-up, step 2.
 * axe-core over the four heaviest routes in BOTH themes: zero
 * critical/serious violations (the audit acceptance), with total-zero
 * locked so the fixed moderates (landmark-unique, region) can't regress.
 * No rule is disabled and there is no exclusion list — a new violation
 * means a new fix. Plus keyboard traversal: skip link, player-bar
 * reachability, and focus-into-modal.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['#/home', '#/quran?id=112', '#/mushaf?page=2', '#/settings'];

async function expectAxeClean(page, route) {
  await page.goto(route);
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(2000);
  const res = await new AxeBuilder({ page }).analyze();
  const severe = res.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(
    severe,
    `critical/serious: ${severe.map((v) => `${v.id}(${v.nodes.length})`).join(', ')}`
  ).toEqual([]);
  expect(
    res.violations,
    `any-level: ${res.violations.map((v) => `${v.id}[${v.impact}]`).join(', ')}`
  ).toEqual([]);
}

async function ensureTheme(page, want) {
  const cur = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (cur !== want) {
    await page.locator('[data-action="quick-theme-toggle"]').first().click();
    await expect(page.locator(`html[data-theme="${want}"]`)).toBeAttached({ timeout: 8000 });
    await page.waitForTimeout(800);
  }
}

test('axe: light theme is clean on hub, reader, mushaf and settings', async ({ page }) => {
  test.slow();
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await ensureTheme(page, 'light');
  for (const route of ROUTES) await expectAxeClean(page, route);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'light'
  );
});

test('axe: dark theme is clean on hub, reader, mushaf and settings', async ({ page }) => {
  test.slow();
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await ensureTheme(page, 'dark');
  for (const route of ROUTES) await expectAxeClean(page, route);
});

test('keyboard: skip link, player controls and modal focus', async ({ page }) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/quran?id=112');
  await expect(page.locator('.ayah-card').first()).toBeVisible({ timeout: 20000 });

  // Skip link drops focus straight into the main landmark.
  await page.locator('.skip-link').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main:focus')).toBeAttached({ timeout: 5000 });

  // Every VISIBLE player-bar control is keyboard-focusable once audio
  // starts (the rest live behind the "more" toggle — open it first so the
  // check covers the whole console, not just the collapsed row).
  await page.locator('[data-action="surah-play"]').first().click();
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });
  const more = page.locator('.player-bar--recite [data-action="recite-more-toggle"]');
  if ((await more.count()) > 0) {
    const panel = page.locator('.player-bar--recite .rec-console-more--open');
    if ((await panel.count()) === 0) await more.click();
  }
  const unfocusable = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('.player-bar button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // still collapsed away: not keyboard-reachable by design
      b.focus({ preventScroll: true });
      if (document.activeElement !== b)
        bad.push(b.getAttribute('data-action') || b.textContent.trim().slice(0, 30));
    }
    return bad;
  });
  expect(unfocusable, `unfocusable player controls: ${unfocusable.join(', ')}`).toEqual([]);

  // Opening a sheet moves focus inside the dialog.
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.locator('#main [data-action="mushaf-more"]').first().click();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });
  const focusInModal = await page.evaluate(() => !!document.activeElement?.closest?.('.modal'));
  expect(focusInModal, 'focus must move inside the opened sheet').toBe(true);

  expect(pageErrors).toEqual([]);
});
