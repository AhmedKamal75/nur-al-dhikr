/**
 * e2e/mushaf-drag.spec.js — (v5.17.4) finger-following paper drag.
 * While a page-turn swipe is in flight the book tracks the finger
 * (inline translateX + lift); release past the threshold turns the page,
 * a short pull snaps back without turning. Synthetic TouchEvents: the
 * matrix is Chromium-only, where the constructors exist — this pins the
 * wiring (arm → follow → commit/cancel), while tests/gestures.test.js
 * pins the pure mapping.
 */
import { test, expect } from '@playwright/test';

async function dragBook(page, startDx, steps, endDx, identifier = 7) {
  return page.evaluate(
    ({ startDx, steps, endDx, identifier }) => {
      const out = {};
      const book = document.querySelector('.mushaf-book');
      const r = book.getBoundingClientRect();
      const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || book;
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const mk = (x) => new Touch({ identifier, target, clientX: x, clientY: cy });
      const fire = (type, opts) =>
        target.dispatchEvent(
          new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, ...opts })
        );
      fire('touchstart', { touches: [mk(cx)] });
      for (let i = 1; i <= steps; i += 1) {
        fire('touchmove', { touches: [mk(cx + (startDx * i) / steps)] });
      }
      out.mid = book.style.transform || '(none)';
      out.dragging = book.classList.contains('mushaf-book--drag');
      fire('touchend', { touches: [], changedTouches: [mk(cx + endDx)] });
      out.after = book.style.transform || '(none)';
      return out;
    },
    { startDx, steps, endDx, identifier }
  );
}

test('paper drag: book follows the finger, release turns the page', async ({ page }) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => location.hash);
  const r = await dragBook(page, -120, 6, -150);
  expect(r.dragging, 'book carries the drag state mid-pull').toBe(true);
  expect(r.mid).toMatch(/translateX\(-\d+(\.\d+)?px\)/, `book tracks finger, got: ${r.mid}`);
  expect(r.after).toBe('(none)', 'commit clears the drag transform');
  await expect
    .poll(async () => page.evaluate(() => location.hash), { timeout: 10000 })
    .not.toBe(before);
  expect(pageErrors).toEqual([]);
});

test('paper drag: a short pull snaps back without turning', async ({ page }) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=4');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => location.hash);
  const r = await dragBook(page, -30, 3, -30, 9);
  expect(r.dragging, 'even a short pull engages the drag').toBe(true);
  expect(r.mid).toMatch(/translateX\(/, `book tracks finger, got: ${r.mid}`);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => location.hash)).toBe(before);
  expect(
    await page.evaluate(() => document.querySelector('.mushaf-book')?.style.transform || '(none)')
  ).toBe('(none)');
  expect(pageErrors).toEqual([]);
});
