import { test, expect } from '@playwright/test';

/**
 * prayer-ribbon-badges.spec.js — a badge must never eat the prayer's name.
 *
 * User report (phone portrait, Home "Today's prayers"): with a live Now/Next
 * state, the Sunrise and Dhuhr cells crushed their names into one-letter-per-
 * line vertical strips, the times overlapping — the inflexible badge pill
 * starved the name in the flex topline. The fix lets the topline wrap so the
 * badge drops to its own line when name + badge do not fit side by side.
 *
 * The pin: at a 390px phone, in the badged cells the name keeps a real width
 * (never one letter per line) and the badge sits below the name. Run in EN
 * and AR: the badge words and the name lengths differ per language.
 */

function seed() {
  return (l) => {
    localStorage.setItem(
      'nurAlDhikr:v2:state',
      JSON.stringify({
        settings: {
          language: l,
          themeMode: 'light',
          prayer: {
            method: 'MWL',
            asr: 'Standard',
            latitude: 30.0444,
            longitude: 31.2357,
            timezone: 'Africa/Cairo',
            locationName: 'Cairo',
          },
        },
      })
    );
  };
}

test.use({ viewport: { width: 390, height: 844 } });

for (const lang of ['en', 'ar']) {
  test(`prayer ribbon: Now/Next badges never crush the prayer name (${lang})`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Playwright serialises the function source — no closures; lang goes as arg.
    await page.addInitScript(seed(), lang);
    await page.goto('./#/home');
    const ribbon = page.locator('.home-prayer-ribbon__cells');
    await expect(ribbon).toBeAttached({ timeout: 20000 });
    // A live badge needs computed times; wait for at least one to render.
    await expect(ribbon.locator('.home-prayer-ribbon__badge').first()).toBeAttached({
      timeout: 20000,
    });

    const badged = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.home-prayer-ribbon__cell')];
      return cells
        .filter((c) => c.querySelector('.home-prayer-ribbon__badge'))
        .map((c) => {
          const cell = c.getBoundingClientRect();
          const name = c.querySelector('.home-prayer-ribbon__name').getBoundingClientRect();
          const badge = c.querySelector('.home-prayer-ribbon__badge').getBoundingClientRect();
          return {
            cellL: cell.left,
            cellR: cell.right,
            nameW: name.width,
            nameH: name.height,
            badgeTop: badge.top,
            nameBottom: name.bottom,
            badgeW: badge.width,
            badgeH: badge.height,
            badgeL: badge.left,
            badgeR: badge.right,
          };
        });
    });

    // Both a Now and a Next badge are on the ribbon in a live state.
    expect(badged.length).toBe(2);
    for (const m of badged) {
      // One letter per line was the defect: ~8px wide and 90px+ tall.
      expect(m.nameW).toBeGreaterThan(20);
      expect(m.nameH).toBeLessThan(60);
      // The badge wrapped below the name instead of sharing a starved row.
      expect(m.badgeTop).toBeGreaterThanOrEqual(m.nameBottom - 1);
      // The badge itself stays one readable pill: never squeezed into
      // stacked letters (the first fix's relapse, caught in review), and
      // never spilling out of its cell.
      expect(m.badgeH).toBeLessThan(30);
      expect(m.badgeW).toBeGreaterThan(15);
      expect(m.badgeR).toBeLessThanOrEqual(m.cellR + 2);
      expect(m.badgeL).toBeGreaterThanOrEqual(m.cellL - 2);
    }

    // (v5.17.145) phone-QA: the badge fix left the NAMES wrapping mid-word
    // ("Sunr ise", "Mag hrib") — the phone cell-tightening rule had been
    // silently binned by source order. Every prayer name in this corpus is
    // a single word, so a multi-line name IS the defect, badged cell or
    // not; and a time must never clip out of its cell.
    const cells = await page.evaluate(() => {
      return [...document.querySelectorAll('.home-prayer-ribbon__cell')].map((c) => {
        const name = c.querySelector('.home-prayer-ribbon__name');
        const time = c.querySelector('.home-prayer-ribbon__time');
        const range = document.createRange();
        range.selectNodeContents(name);
        const cr = c.getBoundingClientRect();
        const tr = time.getBoundingClientRect();
        return {
          text: name.textContent.trim(),
          nameLines: range.getClientRects().length,
          timeClipsRight: tr.right > cr.right + 1,
          timeClipsLeft: tr.left < cr.left - 1,
        };
      });
    });
    expect(cells.length).toBe(6);
    for (const c of cells) {
      expect(c.nameLines, `${c.text} must render on one line`).toBe(1);
      expect(
        c.timeClipsRight || c.timeClipsLeft,
        `${c.text}'s time must stay inside its cell`
      ).toBe(false);
    }
    expect(pageErrors).toEqual([]);
  });
}
