import { test, expect } from '@playwright/test';

/**
 * home-fold.spec.js — the dhikr must be the first thing on the home screen.
 *
 * MEASURED BEFORE THIS FILE EXISTED
 *
 * The first dhikr category sat at **y=1073** in a 900px viewport. Above it:
 * a shahada banner, a 216px hero of mostly empty green, a location prompt, an
 * 8-step onboarding wizard and a quick-tile row. A reader scrolled past more
 * than a full screen of chrome before the reason the app exists had said
 * anything. On the design standard in HANDOFF §5d — "the text is the
 * interface", "chrome should bow to the Qur'an" — that is the opposite of the
 * design, and it is why the page read as "sloppy" even though every tile on it
 * was correct.
 *
 * It is also now at y=299, in full-width columns, with every Read-now action on
 * one baseline.
 *
 * WHAT THIS PINS, AND WHY EACH ONE
 *
 * A home screen can drift back toward chrome-first one reorder at a time, and
 * nobody notices until someone screenshots it. These are the measurements, so
 * the next person gets a red test instead of an opinion.
 */
test.use({ serviceWorkers: 'block' });

test.describe('the home fold', () => {
  test('the dhikr grid is on the first screen, not below a screen of chrome', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const top = await page.evaluate(() => {
      const g = document.querySelector('.home-browser');
      return g ? Math.round(g.getBoundingClientRect().top) : null;
    });
    expect(top, 'the adhkar grid must start within the first viewport').not.toBeNull();
    expect(
      top,
      `the adhkar grid starts at y=${top}; a reader must not scroll past a whole screen of chrome to reach dhikr`
    ).toBeLessThan(450);
  });

  test('the grid uses the full width, so the right half is not empty', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const { grid, main } = await page.evaluate(() => {
      const g = document.querySelector('.home-browser').getBoundingClientRect();
      const m = document.querySelector('#main').getBoundingClientRect();
      return { grid: Math.round(g.width), main: Math.round(m.width) };
    });
    // The two-column dashboard used to hold the grid in a 562px column and
    // leave the rest of the canvas blank. It now spans the full width.
    expect(
      grid / main,
      `the grid is ${grid}px inside a ${main}px column — it should span the full width`
    ).toBeGreaterThan(0.9);
  });

  test('every Read-now action in a row shares one baseline', async ({ page }) => {
    // The tiles are the same height in a grid row, but the ACTION was a sibling
    // following its tile, so a title that wrapped to three lines pushed its
    // button below one that wrapped to two. The buttons landed on three
    // different baselines. Visually it read as careless; it was one missing
    // `margin-block-start: auto`.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.category-grid').first()).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const tops = await page.evaluate(() => {
      const grid = document.querySelector('.category-grid');
      if (!grid) return [];
      return [...grid.querySelectorAll('.category-tile-wrap')]
        .slice(0, 5)
        .map((w) => Math.round(w.querySelector('.browser-tile__read').getBoundingClientRect().top));
    });
    expect(tops.length, 'expected at least four tiles in the first row').toBeGreaterThanOrEqual(4);
    const distinct = [...new Set(tops)];
    expect(
      distinct.length,
      `the Read-now actions sit on ${distinct.length} different baselines (${tops.join(', ')}) — they should be one`
    ).toBe(1);
  });

  test('no tile is cut off, and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const r = await page.evaluate(() => {
      const gb = document.querySelector('.home-browser').getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.home-browser [class*="tile"]')];
      return {
        cut: tiles.filter((t) => t.getBoundingClientRect().right > gb.right + 2).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(r.cut, 'no tile may stick out past the grid').toBe(0);
    expect(r.overflow, 'the home page must not scroll sideways').toBe(0);
  });

  test('the hero is demoted below the dhikr but still present', async ({ page }) => {
    // Reordering is not removal. The greeting, the Hijri chip and the tagline
    // are all still there; they just no longer open the page.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const r = await page.evaluate(() => {
      const g = document.querySelector('.home-browser').getBoundingClientRect();
      const h = document.querySelector('.home-hero');
      return {
        hero: h ? Math.round(h.getBoundingClientRect().top) : null,
        grid: Math.round(g.top),
      };
    });
    expect(r.hero, 'the hero must still exist').not.toBeNull();
    expect(r.hero, 'the hero must come after the dhikr').toBeGreaterThan(r.grid);
  });

  test('every category still carries a live count and a Read-now action', async ({ page }) => {
    // The one thing a worship reader must never see is a category that cannot
    // be opened or cannot be sized. Both were there before; this pins that the
    // reordering did not cost either.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./#/');
    await expect(page.locator('.category-grid').first()).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    const r = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.category-tile-wrap')];
      return {
        tiles: tiles.length,
        withCount: tiles.filter((t) =>
          /\d/.test(t.querySelector('.category-tile__count')?.textContent || '')
        ).length,
        withAction: tiles.filter((t) => t.querySelector('.browser-tile__read')).length,
      };
    });
    expect(r.tiles, 'the grid should carry real categories').toBeGreaterThan(20);
    expect(r.withCount, 'every category must state how many items it holds').toBe(r.tiles);
    expect(r.withAction, 'every category must be openable').toBe(r.tiles);
  });
});
