/**
 * e2e/esc-order.spec.js — APP-FLOW I2 in a real browser.
 * Esc unwinds EXACTLY ONE layer, top-first: modal → drawer →
 * mushaf-fullscreen → reader-immersive. The case that matters is the
 * one the code comment warns about: a modal over immersive reading —
 * one Esc must close the modal WITHOUT stripping the reading mode
 * underneath it. node:test can assert the chain exists; only the
 * browser proves one press removes one layer.
 */
import { test, expect } from '@playwright/test';

// Cold SW precache (246 files) on a loaded box starves actionability
// checks (visible+enabled+stable) the same way it starves first data
// fetches (see typing.spec.js): strict assertions, generous budget.
test.describe.configure({ timeout: 120000 });

test.use({ viewport: { width: 390, height: 844 } });

test('esc: modal closes, immersive reading survives, next esc leaves it', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/quran?id=112');
  await expect(page.locator('.ayah-card').first()).toBeVisible({ timeout: 20000 });

  // Enter immersive reading (chrome-free column, CSS-only — no native API).
  await page.locator('[data-action="quran-toggle-immersive"]').first().click();
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(1, { timeout: 5000 });

  // Open the quick sheet over it with a real press-hold.
  const arabic = page.locator('.ayah-card__arabic').first();
  // (v5.17.42) Scroll the target into view before measuring it. The press is
  // synthetic mouse input at viewport coordinates, so an element below the
  // fold silently swallows it: `page.mouse.move` to y=786 in a 720px window
  // dispatches nowhere, and the sheet never opened. This spec went red when
  // the reader's content above the first ayah grew by ~40px and pushed the
  // Arabic just past the bottom of a 720px viewport.
  //
  // It looked exactly like a dead feature — a press-hold that never fired —
  // and it was not. The handler is `pointerdown` on `.ayah-card` with a 550ms
  // threshold and it works. TWO real things were behind it:
  //
  //  1. `scrollIntoViewIfNeeded` parks the element at the nearest viewport
  //     edge, which at 390x844 put the Arabic's centre at y=815 of 844 —
  //     underneath the fixed immersive-exit pill, whose button swallows the
  //     press. Centring it is what a reader does.
  //  2. That overlap was a genuine defect, not only a test artefact: the exit
  //     pill covered Arabic the reader was trying to read. Fixed in
  //     `layout.css` by reserving the block-end space it occupies.
  await arabic.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const box = await arabic.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.up();
  await expect(page.locator('.modal__body')).not.toBeEmpty({ timeout: 8000 });

  // First Esc: exactly the modal goes; immersive stays.
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal__body')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(1, { timeout: 5000 });
  expect(page.url().includes('#/quran'), 'still on the reader route').toBe(true);

  // Second Esc: immersive itself leaves.
  await page.keyboard.press('Escape');
  await expect(page.locator('body.is-reader-immersive')).toHaveCount(0, { timeout: 5000 });

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('esc: mobile drawer closes, route stays put', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(1500);

  await page.locator('[data-action="nav-toggle"]').first().click();
  await expect(page.locator('body.nav-drawer-open')).toHaveCount(1, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('body.nav-drawer-open')).toHaveCount(0, { timeout: 5000 });
  expect(page.url().includes('#/mushaf'), 'drawer esc keeps the route').toBe(true);

  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
});
