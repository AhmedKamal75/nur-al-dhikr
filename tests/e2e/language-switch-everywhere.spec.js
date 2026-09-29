import { test, expect } from '@playwright/test';

/**
 * language-switch-everywhere.spec.js
 *
 * The rule: **a surface that hides the shell still owes the reader the
 * language switch.**
 *
 * Immersive focus, mushaf fullscreen and the ambient nightstand each set
 * `display: none !important` on `#topbar`, and the switch went with it. An
 * Arabic-only reader who reached one of those modes had no way back to
 * English — in the very screens that are easiest to get lost in. For the
 * 70-year-old Arabic-only reader who is the release gate, that is the
 * difference between a feature and a wall.
 *
 * The earlier repair for the bare `#/focus` picker was a special case: it
 * stopped engaging immersive mode. One surface fixed, two left. This is the
 * generalised form — one floating control outside every hidden container, one
 * derived CSS rule.
 *
 * Kids Mode is the second half. The switch RENDERED there and did nothing,
 * because it passed through the kids scope guard, which exists to stop a
 * child navigating outside an allowlist of VIEWS. A language preference is not
 * navigation. The stated rule now: the guard governs WHERE YOU MAY GO, never
 * WHAT YOU MAY CONFIGURE.
 *
 * EVERY MODE IS ENTERED THE WAY THE APP ENTERS IT. An earlier version of this
 * file did `document.body.classList.add('is-ambient')` and it failed for a
 * reason worth recording: `renderer.js` OWNS those body classes and re-derives
 * them from state on every render, so an externally added class is wiped
 * within 300ms. Driving the real route is both the honest test and the one
 * that would have caught a mode the switch rule had missed.
 */

/** Enter each chrome-hiding mode through the app, not by poking the DOM. */
const MODES = [
  {
    name: 'ambient nightstand',
    enter: async (page) => {
      await page.goto('./#/ambient');
      // The renderer owns body classes; wait for it to derive this one rather
      // than racing it.
      await expect(page.locator('body.is-ambient')).toHaveCount(1, { timeout: 15000 });
    },
  },
  {
    name: 'mushaf fullscreen',
    enter: async (page) => {
      await page.goto('./#/mushaf?page=1');
      await expect(page.locator('.mushaf-page').first()).toBeVisible({ timeout: 25000 });
      await page.evaluate(() => {
        // The same dispatch the quran handler makes; there is no DOM affordance
        // for fullscreen in a headless run.
        window.__store?.dispatch?.({ type: 'setMushafFullscreen', payload: { on: true } });
      });
      // Fall back to clicking the real control if the store is not exposed.
      if (!(await page.evaluate(() => document.body.classList.contains('is-mushaf-fullscreen')))) {
        const fs = page.locator('[data-action*="fullscreen"]').first();
        if (await fs.count()) await fs.click();
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'immersive classic reader',
    enter: async (page) => {
      await page.goto('./#/quran?id=112');
      await expect(page.locator('.ayah-card').first()).toBeVisible({ timeout: 25000 });
      await page.locator('[data-action="quran-toggle-immersive"]').first().click();
      await expect(page.locator('body.is-reader-immersive')).toHaveCount(1, { timeout: 8000 });
    },
  },
  {
    name: 'immersive focus',
    enter: async (page) => {
      await page.goto('./#/focus');
      await expect(page.locator('#main')).not.toBeEmpty({ timeout: 25000 });
      // Focus needs a target to go full-bleed; pick the first dhikr offered.
      const target = page.locator('.focus-picker__link').first().click();
      await expect(page.locator('body.is-focus-mode')).toHaveCount(1, { timeout: 15000 });
    },
  },
];
for (const mode of MODES) {
  test(`the language switch is reachable in ${mode.name}`, async ({ page }) => {
    await mode.enter(page);

    // Sanity: we really are in a chrome-hiding mode. Without this the test
    // would pass trivially in normal chrome.
    const hiding = await page.evaluate(() => {
      const topbar = document.getElementById('topbar');
      return {
        topbarHidden: getComputedStyle(topbar).display === 'none',
        classes: document.body.className,
      };
    });
    expect(hiding.topbarHidden, `${mode.name} should hide the topbar`).toBe(true);

    const sw = page.locator('#immersive-chrome .topbar__lang');
    await expect(sw).toBeVisible({ timeout: 8000 });

    // A real target, not a decorative dot: 24px is the WCAG 2.2 SC 2.5.8
    // floor and 44px is what the rest of the chrome uses.
    const box = await sw.boundingBox();
    expect(box.width, `switch width in ${mode.name}`).toBeGreaterThanOrEqual(24);
    expect(box.height, `switch height in ${mode.name}`).toBeGreaterThanOrEqual(24);

    // And it must WORK. Presence without function is the defect this file
    // exists to prevent — that is exactly what Kids Mode did.
    const before = await page.evaluate(() => document.documentElement.lang);
    await sw.click();
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.documentElement.lang);
    expect(after, `the switch must change the language in ${mode.name}`).not.toBe(before);
    expect(after).toMatch(/^(en|ar)$/);
  });
}

test('in normal chrome the floating copy stays out of the way', async ({ page }) => {
  await page.goto('./#/');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 25000 });
  // The topbar carries the switch; the floating one is display:none until a
  // chrome-hiding mode engages. Two visible copies would put a duplicate
  // control in the tab order.
  await expect(page.locator('#immersive-chrome')).toBeHidden();
  await expect(page.locator('.topbar__lang').first()).toBeVisible();
});

test('Kids Mode: the switch works, not merely renders', async ({ page }) => {
  await page.goto('./#/');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 25000 });
  await page.evaluate(() => {
    const key = 'nurAlDhikr:v2:state';
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    state.settings = { ...(state.settings || {}), kidsMode: true };
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto('./#/kids');
  await page.waitForTimeout(1500);

  const before = await page.evaluate(() => document.documentElement.lang);
  await page.locator('.topbar__lang').first().click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => document.documentElement.lang);

  expect(after, 'the kids scope must not block a language preference').not.toBe(before);
  expect(after).toMatch(/^(en|ar)$/);
  // And the reader must still be in Kids Mode: configuring is allowed,
  // navigating is not. That distinction is what the guard is actually for.
  expect(page.url()).toContain('#/kids');
});
