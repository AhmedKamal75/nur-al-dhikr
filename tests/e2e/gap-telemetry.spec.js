/**
 * e2e/gap-telemetry.spec.js — (v5.11.0 C) the Statistics gap panel:
 * toggle renders, opt-in persists, and the empty state shows without
 * console errors (no recitation needed — recording itself is unit-pinned).
 */
import { test, expect } from '@playwright/test';

test('gap panel: toggle opts in and persists', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/statistics');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const toggle = page.locator('[data-key="gapTelemetry"]');
  await expect(toggle).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#gap-panel-title')).toContainText(/telemetry|قياس/);
  // Opt in, reload, still on (persisted pref).
  await toggle.check({ force: true });
  await expect(toggle).toBeChecked();
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator('[data-key="gapTelemetry"]')).toBeChecked({ timeout: 10000 });
  // Empty state with zero samples — honest absence, no crash.
  await expect(page.locator('.view--statistics')).toContainText(/No samples|لا عيّنات/);
  // Opt back out (leave no footprint for other specs).
  await page.locator('[data-key="gapTelemetry"]').uncheck({ force: true });
  expect(pageErrors).toEqual([]);
});
