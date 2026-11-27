/**
 * e2e/mushaf-memorize-layout.spec.js — (v5.17.187) memorize hide must never
 * move a word.
 *
 * The C17 word-slice premise is "the word stays in place, same line
 * breaks": hiding paints a blank over the word's own span and changes NO
 * layout. The first uniform-blank attempt (display:inline-block on the
 * hidden span) broke that premise — the planner measured words jumping
 * lines on Al-Fatiha p1 (max 282px shift, 9→8 lines at 320px). The fix
 * keeps the span display:inline and paints the uniform blank on an
 * absolutely positioned ::after (out of flow).
 *
 * This spec is the regression lock: at 390 / 320 / 195 CSS px it measures
 * every .qword rect before and after the memorize toggle and requires
 * byte-identical geometry (sub-pixel tolerance only).
 */
import { test, expect } from '@playwright/test';

const TOL = 0.75; // px — absorbs sub-pixel rounding only, never a re-wrap

async function wordRects(page) {
  // Positions RELATIVE to the text column: the memorize bar is chrome
  // under the topbar and legitimately pushes the whole sheet down; what
  // must never change is where a word sits inside its column (x, y, w,
  // h — i.e. the line breaks).
  return page.evaluate(() => {
    const col = document.querySelector('.mushaf-page__text').getBoundingClientRect();
    return [...document.querySelectorAll('.mushaf-page .qword')].map((w) => {
      const r = w.getBoundingClientRect();
      return [r.x - col.x, r.y - col.y, r.width, r.height].map((v) => Math.round(v * 100) / 100);
    });
  });
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 320, height: 700 },
  { width: 195, height: 700 },
]) {
  test(`memorize hide leaves every word rect unchanged at ${vp.width}px`, async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.setViewportSize(vp);
    await page.goto('#/mushaf?page=1');
    await expect(page.locator('.mushaf-page .qword').first()).toBeVisible({ timeout: 30000 });

    const before = await wordRects(page);
    expect(before.length).toBeGreaterThan(20);

    // Turn memorize on through the real UI: action sheet → Memorize row.
    await page.locator('[data-action="mushaf-more"]').click();
    const toggle = page.locator('[data-action="mushaf-hifz-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await toggle.click();
    await expect(page.locator('.qword--hifz-hidden').first()).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Al-Fatiha's 29 words hide; ayah-end markers stay visible.
    expect(await page.locator('.qword--hifz-hidden').count()).toBe(29);

    const after = await wordRects(page);
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      for (let k = 0; k < 4; k++) {
        expect(
          Math.abs(after[i][k] - before[i][k]),
          `word ${i} rect component ${k} moved by ${Math.abs(after[i][k] - before[i][k])}px at ${vp.width}px`
        ).toBeLessThanOrEqual(TOL);
      }
    }
    expect(pageErrors).toEqual([]);
  });
}
