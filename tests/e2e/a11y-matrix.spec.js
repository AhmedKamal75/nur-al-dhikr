import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { VIEWS } from '../../js/core/config.js';

/**
 * a11y-matrix.spec.js — every route, every theme, as SEPARATE tests.
 *
 * WHY THIS FILE IS SPLIT
 *
 * The original was ONE test with a 600-second timeout looping 30 routes × 2
 * themes in a single browser page. Measured: **3.7 minutes**, and it was ~40%
 * of the entire e2e suite. Three costs, all real:
 *
 *  1. **Serial.** Playwright cannot spread 60 route visits across workers when
 *     they are one test, so the suite's parallelism was wasted on the single
 *     slowest file.
 *  2. **All-or-nothing information.** A failure on the 57th visit reported one
 *     aggregate assertion. You learned that *something* was wrong somewhere.
 *  3. **No progress.** A 3.7-minute silence tells you nothing.
 *
 * As one test per route per theme, they run across workers, each names its own
 * route, and a failure is readable without cross-referencing.
 *
 * WHAT THIS DOES NOT CHANGE
 *
 * The same axe build, the same impact filter (serious + critical), the same
 * wait for the rendered view rather than the boot skeleton, the same route
 * parameters. The scan is identical; only the scheduling and the reporting
 * differ. A faster gate that checked less would be a lie, and this one does
 * not.
 */

/** Views that need a parameter to mean anything. A paramless #/mood is a
 *  picker, not a 404 — that is a separate finding, and this reflects intent. */
const PARAMS = {
  category: 'id=tasbih',
  collection: 'id=default',
  quiz: 'deck=mushaf',
  editor: 'id=adhkar',
};

/** Overlay-style views, exercised through their own specs instead. */
const NOT_ROUTES = new Set(['certificate']);

const ROUTES = Object.entries(VIEWS)
  .filter(([, id]) => !NOT_ROUTES.has(id))
  .map(([key, id]) => ({ key, route: `#/${id}${PARAMS[key] ? `?${PARAMS[key]}` : ''}` }));

const THEMES = ['light', 'dark'];

/** Per-route budget. 20s is generous for a single view and turns a hang into
 *  a named failure rather than a swallowed 600s timeout. */
test.setTimeout(45_000);

/**
 * Seed the theme, then PROVE it resolved.
 *
 * This replaced a seed that wrote `settings.theme` — a key that does not
 * exist. The setting is `themeMode` (js/core/theme.js:25), so the old seed was
 * silently discarded and the whole "theme: dark" half of this matrix had been
 * re-scanning LIGHT mode since it was written: 33 routes audited twice, dark
 * mode never audited at all. A seed naming a key the app does not read fails
 * OPEN, which is the worst way a gate can fail.
 *
 * The assertion below is the part that actually prevents a recurrence. Naming
 * the key correctly is a fix; asserting `data-theme` came out the other side is
 * a gate, and it is what turns the next key rename into a red test instead of
 * a silent duplicate audit.
 *
 * Seeding rather than clicking the topbar toggle is deliberate: some routes
 * remove the chrome entirely (`body.is-ambient #topbar { display:none }`,
 * layout.css:586), so a toggle-driven sweep times out on a route that has no
 * topbar to press.
 */
async function assertTheme(page, want) {
  const resolved = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(
    resolved,
    `theme "${want}" did not take (data-theme="${resolved}") — the matrix would scan the ` +
      'wrong theme and report it as a pass'
  ).toBe(want);
}

for (const theme of THEMES) {
  test.describe(`theme: ${theme}`, () => {
    for (const { key, route } of ROUTES) {
      test(`${key} is free of serious and critical violations`, async ({ page }) => {
        await page.addInitScript((t) => {
          try {
            const KEY = 'nurAlDhikr:v2:state';
            const raw = localStorage.getItem(KEY);
            const state = raw ? JSON.parse(raw) : {};
            state.settings = { ...(state.settings || {}), themeMode: t, language: 'en' };
            localStorage.setItem(KEY, JSON.stringify(state));
          } catch {
            /* the default theme stands */
          }
        }, theme);

        await page.goto(route);
        // Wait for the view itself: the boot skeleton is non-empty, and
        // scanning it proves nothing.
        await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
        await assertTheme(page, theme);
        await page.waitForTimeout(1200);

        const res = await new AxeBuilder({ page }).analyze();
        const violations = res.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        const report = violations
          .map((v) => {
            const where = [...new Set(v.nodes.slice(0, 3).map((n) => n.target.join(' ')))].join(
              ' | '
            );
            return `${v.id} (${v.impact}): ${v.help} :: ${where}`;
          })
          .join('\n    ');

        expect(
          violations.length,
          `${route} [${theme}] has ${violations.length} serious/critical violation(s):\n    ${report}`
        ).toBe(0);
      });
    }
  });
}

test('the matrix still covers the whole route table', () => {
  // The split must not quietly shrink what is scanned. If a route is added to
  // VIEWS and lands in NOT_ROUTES by accident, this is the only thing that
  // would notice.
  expect(ROUTES.length).toBeGreaterThan(20);
  expect(ROUTES.length).toBe(Object.keys(VIEWS).length - NOT_ROUTES.size);
});
