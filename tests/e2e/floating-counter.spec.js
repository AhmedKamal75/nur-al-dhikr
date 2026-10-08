/**
 * e2e/floating-counter.spec.js — the floating counter in a real browser.
 *
 * The unit test proves the document and the gates; this proves the plumbing
 * that only a browser can: a genuine second window opens, it carries the
 * current count, and it follows the count as the reader taps.
 *
 * Document Picture-in-Picture is Chromium-only today, so the spec asserts
 * BOTH branches honestly: where the API exists the window must work, and
 * where it does not the affordance must be absent rather than dead.
 */
import { test, expect } from '@playwright/test';

test('floating counter: opens a second window that follows the count', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('#/tasbih');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // (v5.17.136) The float control lives inside the "Tasbih options"
  // disclosure. That is the intended user path, so open it rather than
  // reaching past it — the assertion below is still "offered exactly once,
  // not yet pressed, and opens a window".
  const options = page.locator('#main details.tasbih-options');
  await expect(options, 'the options disclosure is present').toHaveCount(1);
  if (!(await options.evaluate((el) => el.open))) {
    await options.locator('summary').click();
    await expect(options).toHaveAttribute('open', '');
  }
  const button = page.locator('[data-action="tasbih-float"]');

  // Probe AFTER navigation: the API only means anything on a real document,
  // and `about:blank` is not where a reader ever counts. Probing first made
  // this spec take the unsupported branch and then fail on a control that was
  // correctly present.
  const supported = await page.evaluate(
    () =>
      !!window.documentPictureInPicture &&
      typeof window.documentPictureInPicture.requestWindow === 'function'
  );

  if (!supported) {
    // Honest degradation: no control at all, rather than a button that
    // silently does nothing on this browser.
    await expect(button, 'no affordance where the API is missing').toHaveCount(0);
    return;
  }

  await expect(button, 'the affordance is offered where it works').toHaveCount(1);
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();

  // The PiP window is a real second document. Read it through the same
  // object the browser handed us.
  const opened = await page.evaluate(async () => {
    const win = window.documentPictureInPicture.window;
    if (!win) return { ok: false };
    return {
      ok: true,
      count: win.document.getElementById('nur-float-count')?.textContent ?? null,
      hasLabel: !!win.document.getElementById('nur-float-label'),
      dir: win.document.documentElement.dir,
    };
  });
  expect(opened.ok, 'a picture-in-picture window opened').toBe(true);
  expect(opened.hasLabel, 'it shows the phrase name').toBe(true);
  expect(opened.count, 'it shows count over target from the start').toMatch(/^\d+ \/ \d+$/);
  await expect(button).toHaveAttribute('aria-pressed', 'true');

  // Tap the dial, then read the floating window again: it must have moved.
  const before = opened.count;
  await page.locator('.tasbih-stage').first().click();
  await page.locator('.tasbih-stage').first().click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const win = window.documentPictureInPicture.window;
    return win?.document.getElementById('nur-float-count')?.textContent ?? null;
  });
  expect(after, 'the floating window is not a second, stale source of truth').not.toBe(before);
  expect(after).toMatch(/^\d+ \/ \d+$/);

  // A second tap closes it, so no orphan window is left floating.
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  const closed = await page.evaluate(() => !!window.documentPictureInPicture.window);
  expect(closed, 'the window is closed again').toBe(false);
  expect(errors).toEqual([]);
});
