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

  test('every category tile is one visual action, not a tile-plus-button sandwich', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(AZKAR);
    await expect(page.locator('.category-grid').first()).toBeVisible({ timeout: 25000 });
    await settled(page);

    const result = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('.category-tile-wrap')];
      return {
        wrappers: tiles.length,
        directLinks: tiles.filter((w) => w.querySelector('.category-tile[href]')).length,
        detachedButtons: tiles.filter((w) => w.querySelector('.browser-tile__read')).length,
      };
    });
    expect(result.wrappers).toBeGreaterThanOrEqual(4);
    expect(result.directLinks).toBe(result.wrappers);
    expect(result.detachedButtons).toBe(0);
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

  test('every category still carries a live count and is directly openable', async ({ page }) => {
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
        withAction: tiles.filter((t) => t.querySelector('.category-tile[href]')).length,
        detached: tiles.filter((t) => t.querySelector('.browser-tile__read')).length,
      };
    });
    expect(r.tiles, 'the grid should carry real categories').toBeGreaterThan(20);
    expect(r.withCount, 'every category must state how many items it holds').toBe(r.tiles);
    expect(r.withAction, 'every category must be openable').toBe(r.tiles);
    expect(r.detached, 'no category may ship a duplicate detached action').toBe(0);
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
    expect(r.shahada, 'Home must not use the Shahada as decorative chrome').toBe(0);
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

    // (v5.17.137) The seven-door chrome now makes each door an actionable
    // link beside its own chevron disclosure, so the Azkar grid is genuinely
    // ONE tap from Home: tap the door, land on the grid. Under the previous
    // arrangement the door was a <details> summary and the link hid inside it,
    // so this test had to open the section first -- which was exactly the
    // "dead end" the assertion was written to catch.
    const azkarDoor = page.locator('#bottomnav a.nav__section-link[href="#/library"]').first();
    await expect(
      azkarDoor,
      'the AZKAR door must be an actionable link in the chrome, or home is a dead end for the grid'
    ).toBeVisible({ timeout: 10000 });
    await azkarDoor.click();
    await expect(page.locator('.home-browser')).toBeVisible({ timeout: 25000 });
  });
});

test.describe('Azkar reading surface and counter separation', () => {
  test('Details is independent from counting and contains the supplementary content', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('./#/category/morning');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 25000 });
    await settled(page);

    const card = page.locator('.card').first();
    const summary = card.locator('details.card__disclosure > summary.disclosure__summary');
    const counterLabel = card.locator('.counter-pill__label');

    await expect(summary).toHaveText(/Details/);
    const before = await counterLabel.textContent();
    await summary.click();
    await expect(card.locator('details.card__disclosure')).toHaveAttribute('open', '');
    await expect(counterLabel).toHaveText(before);

    const detailsText = await card.locator('details.card__disclosure').textContent();
    expect(detailsText).toMatch(/Translation|Reference|Repetitions/i);

    // (v5.17.136) Count on a pill whose target is greater than 1. The first
    // card's target is 1, and a tap that reaches the target COMPLETES the
    // cycle and re-points the pill at the next dhikr — so on that card the
    // label legitimately goes "0 / 1" -> "0 / 3" and a naive +1 read of it
    // reports a counter that is in fact working. Verified in Chromium: the
    // tap moved completedCycles 0 -> 1 and advanced adh-mor-001 -> adh-mor-003a.
    // Counting is only observable as +1 where the target leaves room.
    const countable = page.locator('.card .counter-pill[data-target]').filter({
      has: page.locator(':scope'),
    });
    const target = Number(await countable.first().getAttribute('data-target'));
    const countingCard = target > 1 ? countable.first() : page.locator('.card').nth(1);
    const countingPill = countingCard.locator('.counter-pill');
    await countingPill.scrollIntoViewIfNeeded();
    const pillTarget = Number(await countingPill.getAttribute('data-target'));
    expect(pillTarget, 'found a counter with room to count into').toBeGreaterThan(1);

    const beforeCount = await countingPill.locator('.counter-pill__label').textContent();
    await countingPill.locator('.counter-pill__label').click();
    await page.waitForTimeout(400);
    const afterCount = await countingPill.locator('.counter-pill__label').textContent();
    const parseCount = (value) =>
      Number.parseInt(
        String(value)
          .trim()
          .split(/\s*\/\s*/)[0],
        10
      );
    expect(parseCount(afterCount), `counter read "${beforeCount}" -> "${afterCount}"`).toBe(
      parseCount(beforeCount) + 1
    );
  });

  test('Details keyboard activation also never increments the counter', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('./#/category/morning');
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 25000 });
    await settled(page);

    const card = page.locator('.card').first();
    const summary = card.locator('details.card__disclosure > summary.disclosure__summary');
    const counterLabel = card.locator('.counter-pill__label');
    const before = await counterLabel.textContent();

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(card.locator('details.card__disclosure')).toHaveAttribute('open', '');
    await expect(counterLabel).toHaveText(before);
  });
});
