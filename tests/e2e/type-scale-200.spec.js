/**
 * e2e/type-scale-200.spec.js — WCAG 1.4.4 (Resize Text) at 200%.
 *
 * The in-app type scale used to stop at 140%, which left browser zoom as the
 * only route to 200% and stranded a low-vision reader. The ceiling is raised;
 * this spec proves the consequence: at 200% on the narrowest phone width,
 * every core surface still lays out without horizontal overflow and without a
 * console error. A scale nobody can survive is not an accessibility feature.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  'home',
  'library',
  'category/morning',
  'focus',
  'statistics',
  'settings',
  'reader',
  'tasbih', // the counter grew to 240px; it must survive 200% type too
];
const KEY = 'nurAlDhikr:v2:state';

async function bootAt200(page) {
  await page.addInitScript(
    ([key]) => {
      const seed = () => {
        try {
          const raw = window.localStorage.getItem(key);
          const state = raw ? JSON.parse(raw) : {};
          state.settings = { ...(state.settings || {}), fontScale: 2, language: 'en' };
          window.localStorage.setItem(key, JSON.stringify(state));
        } catch {
          /* the app seeds its own state; the probe is best-effort */
        }
      };
      seed();
      window.addEventListener('DOMContentLoaded', seed);
    },
    [KEY]
  );
  await page.setViewportSize({ width: 390, height: 844 });
}

test('200% type: no horizontal overflow and no errors on the core surfaces', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await bootAt200(page);

  const offenders = [];
  for (const route of ROUTES) {
    await page.goto(`#/${route}`);
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const slack = doc.scrollWidth - doc.clientWidth;
      if (slack <= 1) return 0;
      // Name the offenders, IGNORING anything inside a horizontal scroll
      // container: a chip row that scrolls is supposed to be wider than the
      // viewport. Only an element with no scrollable ancestor can actually
      // push the DOCUMENT sideways — that is the real defect.
      const inScroller = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        return false;
      };
      const worst = [];
      for (const el of document.querySelectorAll('#main *, #main')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= doc.clientWidth + 1) continue;
        if (inScroller(el)) continue;
        worst.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 48),
          right: Math.round(r.right),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
        });
      }
      return { slack, worst: worst.slice(0, 5) };
    });
    if (overflow && overflow !== 0) offenders.push({ route, ...overflow });
  }

  expect(offenders, `overflow at 200%:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('200% type: the settings slider can actually be pushed to 200%', async ({ page }) => {
  await bootAt200(page);
  await page.goto('#/settings');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // The type controls live inside a collapsed accordion panel — a person
  // opens it, so the test does too.
  const panel = page.locator('#settings-sec-appearance');
  if (!(await panel.evaluate((el) => el.open))) {
    await panel.locator('summary').click();
  }
  const slider = page.locator('input[data-bind="fontScale"]');
  await expect(slider).toHaveCount(1);
  await expect(slider).toHaveAttribute('max', '2');
  await expect(slider).toBeVisible();

  // Prove the ceiling is REACHABLE and actually takes effect: shrink to the
  // floor, confirm the chrome shrinks, then push to 200% and confirm growth.
  // The app scales type through the --font-scale token feeding the --fs-*
  // tokens, NOT through the root font-size — measure the token and a real
  // consumer of it (the settings panel's own buttons use --fs-base).
  const scale = () =>
    page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'))
    );
  const chromeType = () =>
    page.evaluate(() => {
      const el = document.querySelector('#main .btn, #main button');
      return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
    });

  await slider.fill('0.85');
  await page.waitForTimeout(250);
  const smallScale = await scale();
  const smallType = await chromeType();
  await slider.fill('2');
  await page.waitForTimeout(250);
  const largeScale = await scale();
  const largeType = await chromeType();

  expect(smallScale, 'the floor is reachable').toBeCloseTo(0.85, 2);
  expect(largeScale, '200% is reachable in-app, not just in the sanitizer').toBeCloseTo(2, 2);
  expect(
    largeType,
    `and the chrome actually grows (${smallType}px -> ${largeType}px)`
  ).toBeGreaterThan(smallType);

  // And it must persist: the clamp lives in the sanitizer, so a reload at
  // 2.0 is the real test.
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('nurAlDhikr:v2:state');
    return raw ? JSON.parse(raw).settings?.fontScale : null;
  });
  expect(persisted, '200% survives a reload — the sanitizer no longer clamps it to 1.4').toBe(2);
});
