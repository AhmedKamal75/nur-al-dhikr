import { test, expect } from '@playwright/test';

/**
 * search-saved-scope.spec.js — the Saved chip in global search (C01).
 *
 * Saved mode searches only the local saved subset (favorites + collection
 * items) with the same ranking as All; the Quran/tafsir corpora stay out,
 * the scope survives navigation (settings.searchScope), and a library with
 * nothing saved gets its own honest empty state.
 *
 * The pin: seeded with one favorite (Surah Al-Ikhlas x3, adh-mor-003a),
 * "ikhlas" in Saved mode shows exactly that card and NO quran panel; the
 * chip is still active after leaving Search and returning; "patience"
 * (no saved match) names the Saved scope in its empty state. Run EN + AR.
 */

function seed({ lang: l, saved }) {
  localStorage.setItem(
    'nurAlDhikr:v2:state',
    JSON.stringify({
      settings: { language: l, themeMode: 'light' },
      ...(saved
        ? {
            favorites: ['adh-mor-003a'],
            collections: [
              { id: 'col-1', name: { en: 'Mine', ar: 'مجموعتي' }, items: [], createdAt: 1 },
            ],
          }
        : {}),
    })
  );
}

test.use({ viewport: { width: 390, height: 844 } });

for (const lang of ['en', 'ar']) {
  test(`saved scope: only saved items, no Quran tier, scope survives navigation (${lang})`, async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Playwright serialises the function source — no closures; lang goes as arg.
    await page.addInitScript(seed, { lang, saved: true });
    await page.goto('./#/search?q=ikhlas');

    const allChip = page.locator('.search-scope .chip', {
      hasText: lang === 'ar' ? 'الكل' : 'All',
    });
    const savedChip = page.locator('.search-scope .chip', {
      hasText: lang === 'ar' ? 'المحفوظ' : 'Saved',
    });
    await expect(allChip).toBeAttached({ timeout: 20000 });
    await expect(allChip).toHaveAttribute('aria-pressed', 'true');
    // All mode: the Quran section renders (skeleton or results).
    await expect(page.locator('.quran-search-panel').first()).toBeAttached({ timeout: 20000 });

    await savedChip.click();
    await expect(savedChip).toHaveAttribute('aria-pressed', 'true');
    // Saved mode: the saved card shows, the Quran tier is gone entirely.
    await expect(page.locator('.card-list')).toContainText(lang === 'ar' ? 'الإخلاص' : 'Ikhlas', {
      timeout: 20000,
    });
    await expect(page.locator('.quran-search-panel')).toHaveCount(0);

    // Scope survives navigation away and back.
    await page.goto('./#/home');
    await page.goto('./#/search?q=ikhlas');
    await expect(page.locator('.search-scope .chip[aria-pressed="true"]')).toContainText(
      lang === 'ar' ? 'المحفوظ' : 'Saved',
      { timeout: 20000 }
    );
    await expect(page.locator('.card-list')).toContainText(lang === 'ar' ? 'الإخلاص' : 'Ikhlas', {
      timeout: 20000,
    });

    // A query with no saved match names the Saved scope in its empty state.
    await page.goto('./#/search?q=patience');
    await expect(page.locator('.empty-state')).toContainText(lang === 'ar' ? 'المحفوظ' : 'Saved', {
      timeout: 20000,
    });
    await expect(page.locator('.card-list')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test(`saved scope with nothing saved gets its own empty state (${lang})`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.addInitScript(seed, { lang, saved: false });
    await page.goto('./#/search?q=ikhlas');
    const savedChip = page.locator('.search-scope .chip', {
      hasText: lang === 'ar' ? 'المحفوظ' : 'Saved',
    });
    await savedChip.click();
    await expect(page.locator('.empty-state')).toContainText(
      lang === 'ar' ? 'لا يوجد محفوظ بعد' : 'Nothing saved yet',
      { timeout: 20000 }
    );
    await expect(page.locator('.quran-search-panel')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}
