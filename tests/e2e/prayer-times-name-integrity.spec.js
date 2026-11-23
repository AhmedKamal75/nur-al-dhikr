import { test, expect } from '@playwright/test';

/**
 * prayer-times-name-integrity.spec.js — a prayer name never wraps mid-word
 * in the Prayer page's times list.
 *
 * Phone-QA follow-up (v5.17.145): the times list broke "Maghrib" into
 * "Maghri h" at 390px — 16px flex gaps starved the 700-weight name by a
 * pixel. The fix moved phone rows to an 8px gap. The ribbon twin of this
 * pin lives in prayer-ribbon-badges.spec.js; this spec pins the list.
 *
 * The pin: at a 390px phone, every row's name renders on ONE line with a
 * real width (never one letter per line, never a mid-word split) and the
 * time never clips out of the row. Run in EN and AR: glyph widths and row
 * direction both change.
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
  test(`prayer times list: every name stays on one line (${lang})`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Playwright serialises the function source — no closures; lang goes as arg.
    await page.addInitScript(seed(), lang);
    await page.goto('./#/prayer');
    const rows = page.locator('.prayer-row');
    await expect(rows.first()).toBeAttached({ timeout: 20000 });
    await expect(rows.first().locator('.prayer-row__time')).not.toBeEmpty({ timeout: 20000 });

    const measured = await page.evaluate(() => {
      return [...document.querySelectorAll('.prayer-row')].map((row) => {
        const name = row.querySelector('.prayer-row__name');
        const time = row.querySelector('.prayer-row__time');
        const range = document.createRange();
        range.selectNodeContents(name);
        const nr = name.getBoundingClientRect();
        const rr = row.getBoundingClientRect();
        const tr = time.getBoundingClientRect();
        return {
          text: name.textContent.trim(),
          nameLines: range.getClientRects().length,
          nameW: nr.width,
          nameClips: name.scrollWidth > name.clientWidth + 1,
          timeClipsRight: tr.right > rr.right + 1,
          timeClipsLeft: tr.left < rr.left - 1,
        };
      });
    });

    expect(measured.length).toBe(6);
    for (const m of measured) {
      expect(m.nameLines, `${m.text} must render on one line`).toBe(1);
      // One letter per line was the ribbon defect shape; a mid-word split
      // shows as a multi-line name above. A real name also has real width.
      expect(m.nameW, `${m.text} must keep a real width`).toBeGreaterThan(20);
      expect(m.nameClips, `${m.text} must never clip`).toBe(false);
      expect(m.timeClipsRight || m.timeClipsLeft, `${m.text}'s time must stay inside its row`).toBe(
        false
      );
    }
    expect(pageErrors).toEqual([]);
  });
}
