import { test, expect } from '@playwright/test';

/**
 * azkar-fold.spec.js — the dhikr must be the first thing on the AZKAR screen.
 *
 * RENAMED from home-fold.spec.js (IA-7, v5.17.61).
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
 * WHY THE ROUTE MOVED
 *
 * This file used to run against `./#/`. IA-7 split the chrome into seven
 * sections and moved the adhkar grid OFF the home screen entirely: Home became
 * a Today landing (ribbon, moment, resume, tasbih entry) and the grid moved to
 * the AZKAR section, whose entry route is `#/library` and whose title is
 * "Azkar". The owner ruling was that home should be home, not a full azkar.
 *
 * The MEASUREMENTS below are unchanged and still load-bearing — a section
 * landing can drift back toward chrome-first one reorder at a time. Only the
 * route moved. These six tests were left red by that move (they still looked
 * for `.home-browser` on Home, where it no longer renders); they are re-pointed
 * here rather than deleted, because deleting a guard because the thing it
 * guarded moved is how a real defect becomes invisible.
 *
 * Note the class is `.home-browser` even on the Azkar screen: `adhkarBrowserHTML`
 * in js/views/home.js is one component with two callers (home no longer calls
 * it; library does), so it kept its name. That is a naming wart, not a bug —
 * do not "fix" it by renaming here without renaming the component too.
 */
test.use({ serviceWorkers: 'block' });

const AZKAR = './#/library';
const HOME = './#/';

/** Wait for a patch-layer render to settle before measuring geometry. */
async function settled(page) {
  await page.waitForTimeout(1200);
}

test.describe('the azkar section fold', () => {
  test('the dhikr grid is on the first screen, not below a screen of chrome', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(AZKAR);
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await settled(page);

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
    await page.goto(AZKAR);
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await settled(page);

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
    await page.goto(AZKAR);
    await expect(page.locator('.category-grid').first()).toBeVisible({ timeout: 25000 });
    await settled(page);

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
    await page.goto(AZKAR);
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
    await settled(page);

    const r = await page.evaluate(() => {
      const gb = document.querySelector('.home-browser').getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.home-browser [class*="tile"]')];
      return {
        cut: tiles.filter((t) => t.getBoundingClientRect().right > gb.right + 2).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(r.cut, 'no tile may stick out past the grid').toBe(0);
    expect(r.overflow, 'the azkar page must not scroll sideways').toBe(0);
  });

  test('every category still carries a live count and a Read-now action', async ({ page }) => {
    // The one thing a worship reader must never see is a category that cannot
    // be opened or cannot be sized. Both were there before; this pins that the
    // reordering did not cost either.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(AZKAR);
    await expect(page.locator('.category-grid').first()).toBeVisible({ timeout: 25000 });
    await settled(page);

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

test.describe('home is home, not a full azkar (IA-7)', () => {
  // This is the decision the six red tests above were left behind by, written
  // down so it cannot be undone quietly. Before IA-7 the grid rendered on Home
  // and this file could not have existed: Home WAS the grid.
  test('home renders its Today surface, not the adhkar grid', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME);
    await expect(page.locator('#main h1')).toBeVisible({ timeout: 25000 });
    await settled(page);

    const r = await page.evaluate(() => ({
      hero: document.querySelectorAll('.home-hero').length,
      shahada: document.querySelectorAll('.shahada-banner').length,
      ribbon: document.querySelectorAll('.home-prayer-ribbon').length,
      today: document.querySelectorAll('.home-today').length,
      quick: document.querySelectorAll('.quick-actions').length,
      // The thing that must NOT be here any more.
      browser: document.querySelectorAll('.home-browser').length,
      grid: document.querySelectorAll('.category-grid').length,
      tiles: document.querySelectorAll('.category-tile-wrap').length,
    }));

    // Home keeps its own surface — reordering is not removal. The greeting,
    // the prayer ribbon and the Today strip are what "home" means now.
    expect(r.hero, 'the greeting/hero must still exist on home').toBe(1);
    expect(r.ribbon, 'home opens on the prayer ribbon, not a category grid').toBe(1);
    expect(r.today, "home opens on today's state, not a catalogue").toBe(1);
    // And it must not have quietly become the azkar screen again.
    expect(
      r.browser,
      'the adhkar grid is back on Home. The owner ruling (IA-7) is that home should be home, ' +
        'not a full azkar — if this is deliberate, it is an IA change, not a regression to absorb silently.'
    ).toBe(0);
    expect(r.grid, 'no category grid on Home').toBe(0);
    expect(r.tiles, 'no category tiles on Home').toBe(0);
  });

  test('the azkar grid is one tap from home, not a scroll away', async ({ page }) => {
    // Home is allowed to be a landing only if the thing it replaced is still
    // cheap to reach. "One tap" is the whole claim: a reader who wants the grid
    // must not have to know it is called Azkar or that it lives at #/library.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME);
    await expect(page.locator('#main h1')).toBeVisible({ timeout: 25000 });

    const link = page
      .locator(`#bottomnav a[href="#/library"], #bottomnav [href="#/library"]`)
      .first();
    await expect(
      link,
      'the AZKAR section must be in the chrome, or home is a dead end for the grid'
    ).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
  });
});
