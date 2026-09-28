/**
 * a11y-all-routes.spec.js — the whole app, not four corners of it.
 *
 * tests/e2e/a11y-axe.spec.js proved four routes clean. That is not a claim
 * about the app; it is a claim about four routes. An independent audit
 * widened the scan and found four serious violations on pages nobody had
 * checked, which is exactly what a narrow gate cannot see.
 *
 * So this scans every view, in both themes, and fails on serious and critical
 * violations anywhere. The route list is derived from VIEWS rather than
 * hand-copied, so a new view cannot silently escape the gate.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Views that need a parameter to mean anything, and the ones that are
 * overlays/dialogs rather than pages. A paramless #/mood is a picker, not a
 * 404 — that is a separate finding, and this list reflects intent, not a
 * workaround.
 */
const PARAMS = {
  category: 'id=tasbih',
  collection: 'id=default',
  quiz: 'deck=mushaf',
  editor: 'id=adhkar',
};

/** Overlay-style views, exercised through their own specs instead. */
const NOT_ROUTES = new Set(['certificate']);

function routesFor(VIEWS) {
  return Object.entries(VIEWS)
    .filter(([, id]) => !NOT_ROUTES.has(id))
    .map(([key, id]) => `#/${id}${PARAMS[key] ? `?${PARAMS[key]}` : ''}`);
}

async function violationsFor(page, route) {
  await page.goto(route);
  // Wait for the view itself, not just a non-empty #main — the boot skeleton
  // is non-empty, and scanning it proves nothing.
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(1200);
  const res = await new AxeBuilder({ page }).analyze();
  return res.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

test.describe('a11y across every route', () => {
  test('no serious or critical violation on any view, in either theme', async ({ page }) => {
    test.setTimeout(600_000);
    const { VIEWS } = await import('../../js/core/config.js');
    const routes = routesFor(VIEWS);
    expect(routes.length).toBeGreaterThan(20);

    const failures = [];
    for (const theme of ['light', 'dark']) {
      await page.addInitScript((t) => {
        try {
          const KEY = 'nurAlDhikr:v2:state';
          const raw = localStorage.getItem(KEY);
          const state = raw ? JSON.parse(raw) : {};
          state.settings = { ...(state.settings || {}), theme: t, language: 'en' };
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch {
          /* the default theme stands */
        }
      }, theme);

      for (const route of routes) {
        const found = await violationsFor(page, route);
        for (const v of found) {
          const where = [...new Set(v.nodes.slice(0, 3).map((n) => n.target.join(' ')))].join(
            ' | '
          );
          failures.push(`[${theme}] ${route} — ${v.id} (${v.impact}): ${v.help} :: ${where}`);
        }
      }
    }
    assertNoFailures(failures);
  });
});

function assertNoFailures(failures) {
  // Grouped and counted, because a raw list of 40 nodes is unreadable and
  // gets skimmed past.
  const byRule = new Map();
  for (const f of failures) {
    const key = f.split(' — ')[1]?.split(' (')[0] || f;
    if (!byRule.has(key)) byRule.set(key, []);
    byRule.get(key).push(f);
  }
  const summary = [...byRule.entries()]
    .map(([rule, list]) => `${rule} × ${list.length}\n    ${list.slice(0, 4).join('\n    ')}`)
    .join('\n  ');
  expect(failures, `serious/critical a11y violations:\n  ${summary}`).toEqual([]);
}
