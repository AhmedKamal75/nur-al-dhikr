import { test, expect } from '@playwright/test';

/**
 * home-resume-squeeze.spec.js — a long resume value must never eat the
 * section name.
 *
 * User report (phone portrait, Home "Continue where you left off"): with a
 * long adhkar resume value ("Morning Adhkar · Surah Al-Ikhlas (×3)"), the
 * nowrap value claimed the whole row — the "Adhkar" name collapsed to 0px
 * and rendered one letter per line while the value overflowed the card.
 * The name keeps a readable floor; the value wraps inside the row.
 *
 * The pin: at a 390px phone, seeded with the exact reported state, the
 * Adhkar name renders on ONE line with real width and the value stays
 * inside the row. Run in EN and AR.
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
        mushafBookmark: { page: 561 },
        history: [{ itemId: 'adh-mor-003a', categoryId: 'morning', ts: Date.now() }],
      })
    );
  };
}

test.use({ viewport: { width: 390, height: 844 } });

for (const lang of ['en', 'ar']) {
  test(`resume card: a long value never stacks the section name (${lang})`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.addInitScript(seed(), lang);
    await page.goto('./#/home');
    const panel = page.locator('.panel--resume');
    await expect(panel).toBeAttached({ timeout: 20000 });
    await expect(panel.locator('.worship-row').nth(1)).toBeAttached({ timeout: 20000 });

    const rows = await panel.evaluate((p) => {
      return [...p.querySelectorAll('.worship-row')].map((row) => {
        const name = row.querySelector('.worship-row__name');
        const value = row.querySelector('.worship-row__value');
        const range = document.createRange();
        range.selectNodeContents(name);
        const rr = row.getBoundingClientRect();
        const nr = name.getBoundingClientRect();
        const vr = value.getBoundingClientRect();
        return {
          name: name.textContent.trim(),
          nameW: nr.width,
          nameLines: range.getClientRects().length,
          valueOverflows: vr.right > rr.right + 1 || vr.left < rr.left - 1,
        };
      });
    });

    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      // Stacked single letters was the defect: 0px wide, one line per letter.
      expect(r.nameW, `${r.name} keeps a real width`).toBeGreaterThan(30);
      expect(r.nameLines, `${r.name} renders on one line`).toBe(1);
      expect(r.valueOverflows, `${r.name}'s value stays inside the row`).toBe(false);
    }
    expect(pageErrors).toEqual([]);
  });
}
