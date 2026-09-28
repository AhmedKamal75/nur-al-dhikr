import { test, expect } from '@playwright/test';

/**
 * heading-clipping.spec.js — a heading that reads "The …" is not a heading.
 *
 * An 18-route clipping census at 390px found the Quran view's H1 — the
 * page's accessible name — rendering as "The …" in a 98px box: scrollWidth
 * 229, clientWidth 98. Sighted readers and screen-reader users got the same
 * truncated name, and a screenshot looked fine.
 */

const ROUTES = [
  '#/home',
  '#/library',
  '#/quran?id=112',
  '#/mushaf?page=2',
  '#/hadith',
  '#/tasbih',
  '#/prayer',
  '#/tajweed-course',
  '#/mood',
  '#/quran?id=1',
];

test.describe('headings are not clipped on a phone', () => {
  // (v5.17.24) The same sweep checks ORDER. A card title is an <h3> by
  // design — it is meant to sit under an <h2> — and three list views put an
  // <h1> and then the cards with nothing between, so the sequence was h1 -> h3.
  // A skipped level is a real defect however the scanner tags it, and the
  // list was simply missing the heading it always needed.
  test('no heading level is skipped on a list view', async ({ page }) => {
    const out = [];
    for (const route of [
      '#/category/morning',
      '#/library',
      '#/kids',
      '#/search?q=Allah',
      '#/favorites',
    ]) {
      await page.goto(`./${route}`);
      await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
      await page.waitForTimeout(900);
      const seq = await page.evaluate(() =>
        [...document.querySelectorAll('#main h1, #main h2, #main h3, #main h4, #main h5, #main h6')]
          .filter((h) => h.textContent.trim())
          .map((h) => Number(h.tagName.slice(1)))
      );
      for (let i = 1; i < seq.length; i += 1) {
        if (seq[i] > seq[i - 1] + 1) {
          out.push(`${route}: h${seq[i - 1]} -> h${seq[i]} skips a level`);
          break;
        }
      }
    }
    expect(out, `skipped heading levels:\n  ${out.join('\n  ')}`).toEqual([]);
  });

  test('no visible heading is truncated at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders = [];
    for (const route of ROUTES) {
      await page.goto(`./${route}`);
      await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
      await page.waitForTimeout(900);
      const clipped = await page.evaluate(() => {
        const out = [];
        for (const h of document.querySelectorAll('#main h1, #main h2, #main h3')) {
          const text = h.textContent.trim();
          if (!text) continue;
          // An sr-only heading is an accessible NAME, not visible text: the
          // clip pattern gives it clientWidth 1 by design, so measuring it
          // would report a defect that is not one.
          if (h.closest('.sr-only') || h.classList.contains('sr-only')) continue;
          if (h.offsetParent === null) continue; // not rendered
          if (h.scrollWidth > h.clientWidth + 1) {
            out.push({
              tag: h.tagName,
              text: text.slice(0, 34),
              sw: h.scrollWidth,
              cw: h.clientWidth,
            });
          }
        }
        return out;
      });
      for (const c of clipped)
        offenders.push(`${route} — ${c.tag} "${c.text}" ${c.sw}px in ${c.cw}px`);
    }
    expect(offenders, `clipped headings at 390px:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });
});
