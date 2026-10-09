import { test, expect } from '@playwright/test';

/**
 * mushaf-deep-link.spec.js — "open the mushaf at 2:255", proven end to end.
 *
 * The feature shipped twice broken and neither break was visible in a
 * screenshot of the mushaf itself:
 *
 *  1. The route never resolved the page from s/ay, so a reader asking for
 *     2:255 was silently shown Al-Fatihah. A silent wrong answer about
 *     scripture position — the one failure class this product forbids.
 *  2. The only CSS rule for `.mushaf-ayah--target` was in
 *     tajweed-course.css, which is injected on the tajweed course route
 *     ALONE. The target ayah was in the DOM with a transparent background:
 *     the reader was told to open a verse and shown a page with nothing
 *     marked.
 *  3. The reveal token was consumed on the SKELETON render, so by the time
 *     the real page existed there was nothing left to scroll to or focus.
 */

test.describe('mushaf deep link to a verse', () => {
  test('opens the right page, marks the verse visibly, and scrolls to it', async ({ page }) => {
    const page42 = 42; // ayahPages['2:255']
    await page.goto(`./#/mushaf?s=2&ay=255`);
    await expect(page.locator('.mushaf-page').first()).toBeVisible({ timeout: 20000 });

    // 1. The right PAGE. Not Al-Fatihah: the resolved page must contain 2:255.
    const target = page.locator('.mushaf-ayah--target[data-surah="2"][data-ayah="255"]');
    await expect(target, 'the requested ayah must be marked').toHaveCount(1, { timeout: 20000 });

    // 2. The mark must be VISIBLE, not merely present in the DOM. This is the
    //    assertion that was missing while the rule lived in a sheet the
    //    mushaf never loads: the element existed with a transparent
    //    background and the reader saw nothing.
    const painted = await target.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        shadow: cs.boxShadow,
        animation: cs.animationName,
      };
    });
    const transparent =
      /^rgba\(0,\s*0,\s*0,\s*0\)$/.test(painted.bg) || painted.bg === 'transparent';
    expect(
      transparent && (painted.shadow === 'none' || !painted.shadow),
      `the marked verse must be visibly marked, got background=${painted.bg} shadow=${painted.shadow}`
    ).toBe(false);

    // 3. It must be brought into view, not left below the fold.
    await expect
      .poll(
        async () => {
          const box = await target.boundingBox();
          if (!box) return { inView: false, top: 9999 };
          const vh = page.viewportSize().height;
          return { inView: box.y < vh && box.y + box.height > 0, top: Math.round(box.y) };
        },
        { timeout: 10000, message: 'the marked verse must be scrolled into view' }
      )
      .toMatchObject({ inView: true });

    // 4. And it must be the real corpus page, carrying the verse itself.
    const text = await target.innerText();
    expect(text.replace(/\s+/g, '').length, 'the marked verse must carry its text').toBeGreaterThan(
      20
    );
  });

  test('the page number the reader lands on is the ayah page, not page 1', async ({ page }) => {
    await page.goto('./#/mushaf?s=2&ay=255');
    await expect(page.locator('.mushaf-ayah--target').first()).toBeVisible({ timeout: 20000 });
    // The printed colophon is the mushaf's own page number, always Eastern.
    // On a wide viewport this is a SPREAD, and a printed spread puts the odd
    // page on the right — so 42 faces 41 and the right-hand footer reads 41.
    // What matters is that the verse's page is one of the two, and that
    // neither of them is page 1.
    const toInt = (t) =>
      Number(t.replace(/[^٠-٩0-9]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const footers = await page.locator('.mushaf-page__number').allInnerTexts();
    const nums = footers.map(toInt);
    expect(nums.length, 'a page must print its own number').toBeGreaterThan(0);
    expect(nums, `the footers must not still say page 1: ${nums.join(',')}`).not.toContain(1);
    expect(
      nums.some((n) => n === 41 || n === 42),
      `the spread must contain the ayah's page: ${nums.join(',')}`
    ).toBe(true);
  });

  test('a bare page link is untouched, and an unknown ayah is not marked', async ({ page }) => {
    await page.goto('./#/mushaf?page=42');
    await expect(page.locator('.mushaf-page').first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(800);
    expect(
      await page.locator('.mushaf-ayah--target').count(),
      'a plain page link must not invent a target'
    ).toBe(0);

    await page.goto('./#/mushaf?s=2&ay=9999');
    await expect(page.locator('.mushaf-page').first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(800);
    expect(
      await page.locator('.mushaf-ayah--target').count(),
      'an ayah the corpus cannot place must not be marked'
    ).toBe(0);
  });

  test('turning the page drops the mark, because the verse is no longer there', async ({
    page,
  }) => {
    // This is the one finding in the review that is NOT a defect. Carrying
    // s/ay through a page turn would re-mark a verse that is off-screen, and
    // putting the mark back on the way home would fight a reader who moved
    // on deliberately. The URL is the signal, and the URL is rewritten.
    await page.goto('./#/mushaf?s=2&ay=255');
    await expect(page.locator('.mushaf-ayah--target').first()).toBeVisible({ timeout: 20000 });
    await page.locator('[data-action="mushaf-next"]').first().click();
    await page.waitForTimeout(900);
    const hash = await page.evaluate(() => location.hash);
    expect(hash).not.toContain('ay=');
    expect(await page.locator('.mushaf-ayah--target').count()).toBe(0);
  });
});

/**
 * The Basmala is a header for every surah that opens with one — and that is
 * not every surah. The guard excluded only At-Tawbah, so Al-Fatiha printed
 * its opening Basmala twice: once in the gilt header band, again as the
 * numbered verse 1. Correct data, corrupted by the renderer, on the most-read
 * page in the mushaf.
 *
 * Counted in the DOM rather than asserted on a source string, because the
 * defect was only ever visible in a rendered page.
 */
test.describe('mushaf Basmala', () => {
  // Scoped to the SURAH, not to the page or the word.
  //
  // Two things bit this assertion while it was being written, and both are
  // worth keeping in mind: the desktop mushaf renders a two-page spread, so
  // "?page=1" legitimately also shows Al-Baqarah's opening page with its own
  // correct header Basmala; and a single printed Basmala renders one tappable
  // span per word, each carrying its own data-surah. So: one entry per
  // printed header, de-duplicated by surah.
  const headerSurahs = async (page) =>
    page.evaluate(() =>
      [
        ...new Set(
          [...document.querySelectorAll('.mushaf-bismillah')]
            .map((b) => b.querySelector('[data-surah]'))
            .filter(Boolean)
            .map((el) => Number(el.dataset.surah))
        ),
      ].sort((a, b) => a - b)
    );

  test('Al-Fatiha prints the Basmala as ayah 1 only, never as a header', async ({ page }) => {
    await page.goto('./#/mushaf?page=1');
    await expect(page.locator('.mushaf-ayah[data-surah="1"][data-ayah="1"]')).toBeVisible({
      timeout: 25000,
    });
    await page.waitForTimeout(500);

    // The defect: Al-Fatiha's Basmala IS ayah 1, so the gilt header printed
    // the same words a second time, unnumbered, above the numbered verse.
    const surahs = await headerSurahs(page);
    expect(
      surahs,
      `Al-Fatiha must not render a header Basmala (headers on this spread: ${JSON.stringify(surahs)})`
    ).not.toContain(1);

    // On mobile page 1 is rendered alone, so there may be no other surah
    // header in the DOM. The dedicated page-2 test below owns Al-Baqarah's
    // positive header contract.
    expect(surahs).not.toContain(1);
  });

  test('Al-Baqarah still opens with its header Basmala', async ({ page }) => {
    // The guard for Al-Fatiha must not have been widened by accident. If the
    // exclusion became "any surah starting with the phrase", this catches it.
    await page.goto('./#/mushaf?page=2');
    await expect(page.locator('.mushaf-bismillah')).toBeVisible({ timeout: 25000 });
    expect(await headerSurahs(page)).toContain(2);
  });
});
