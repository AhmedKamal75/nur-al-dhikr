/**
 * e2e/overhaul-routes.spec.js — (E2E-01) full route matrix, cold load.
 *
 * Visits every route from evidence/overhaul-e2e/route-census.json in a
 * fresh context per language (en/ar): #main must render, zero console
 * errors, zero uncaught exceptions. Writes evidence/overhaul-e2e/route-matrix.json.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const census = JSON.parse(
  readFileSync(path.join(process.cwd(), 'evidence/overhaul-e2e/route-census.json'), 'utf8')
);

test('E2E-01 route matrix: all census routes render clean (en + ar)', async ({ browser }) => {
  const results = [];
  for (const lang of ['en', 'ar']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.goto('#/home');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
    // Enter the language through the real settings control (same path a user takes).
    await page.goto('#/settings');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
    await page.locator(`[data-action="set-setting"][data-key="language"][data-value="${lang}"]`).click();
    if (lang === 'ar') {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 10000 });
    } else {
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr', { timeout: 10000 });
    }
    for (const r of census.routes) {
      await page.goto(r.path);
      await expect(page.locator('#main'), `${lang} ${r.path} renders`).not.toBeEmpty({
        timeout: 30000,
      });
      const html = await page.locator('#main').innerHTML();
      results.push({ lang, route: r.view, path: r.path, empty: html.trim().length === 0 });
    }
    expect(pageErrors, `${lang} uncaught: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `${lang} console: ${consoleErrors.join('\n')}`).toEqual([]);
    await context.close();
  }
  writeFileSync(
    path.join(process.cwd(), 'evidence/overhaul-e2e/route-matrix.json'),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), routeCount: census.routeCount, results },
      null,
      2
    )
  );
});
