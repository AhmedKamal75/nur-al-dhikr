import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar']) {
  test(`readable counts agree and search shows matched of total (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((language) => {
      if (localStorage.getItem('count-seeded')) return;
      localStorage.setItem('count-seeded', '1');
      localStorage.setItem(
        'nurAlDhikr:v2:state',
        JSON.stringify({
          settings: {
            language,
            themeMode: 'dark',
            reduceMotion: true,
            homeOrder: ['collections'],
            hiddenHome: {},
            contentPrefs: { hiddenItems: { 'adh-mor-003a': true } },
          },
          collections: [
            {
              id: 'count-test',
              name: { en: 'My collection', ar: 'مجموعتي' },
              items: ['adh-mor-001', 'adh-mor-001', 'adh-mor-003a', 'adh-eve-001'],
              createdAt: 1,
            },
          ],
        })
      );
    }, lang);
    await page.goto('./#/home');
    const chip = page.locator('.chip--collection[data-id="count-test"]');
    await expect(chip.locator('.chip__count')).toHaveText('2', { timeout: 20000 });
    await page.goto('./#/collections');
    await expect(
      page.locator('.collection-tile[data-id="count-test"] .collection-tile__count')
    ).toHaveText(lang === 'en' ? '2 items' : '2 عناصر');
    await page.locator('.collection-tile[data-id="count-test"]').click();
    await expect(page.locator('.view--collection .view__meta')).toHaveText(
      lang === 'en' ? '2 items' : '2 عناصر'
    );
    await expect(page.locator('.view--collection .card')).toHaveCount(2);
    await page.locator('#collection-search-input').fill('unmatched-query');
    await expect(page.locator('.view--collection .view__meta')).toHaveText(
      lang === 'en' ? '0 of 2 items' : '0 من 2 عناصر'
    );
    const meta = page.locator('.view--collection .view__meta');
    const clipped = await meta.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const r = document.createRange();
      r.selectNodeContents(el);
      return [...r.getClientRects()].some((x) => x.left < b.left || x.right > b.right + 1);
    });
    expect(clipped).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`count-search-${lang}.png`) });
    await page.locator('[data-action="collection-session-start"]').click();
    await expect(page.locator('.focus__position')).toHaveText('1 / 2');
    await page.locator('[data-action="focus-exit"]').click();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.updateSettings({ contentPrefs: {} }));
    });
    await expect(page.locator('.view--collection .view__meta')).toHaveText(
      lang === 'en' ? '3 items' : '3 عناصر'
    );
    await expect(page.locator('.view--collection .card')).toHaveCount(3);
    await page.goto('./#/home');
    await expect(chip.locator('.chip__count')).toHaveText('3');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('./#/collection/count-test?q=unmatched-query');
    await expect(meta).toHaveText(lang === 'en' ? '0 of 3 items' : '0 من 3 عناصر');
    await page.screenshot({ path: testInfo.outputPath(`count-desktop-${lang}.png`) });
  });
}
