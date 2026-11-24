import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar']) {
  test.setTimeout(60000);
  test(`catalog expands without changing filter, selection, scroll or playback (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language,
              themeMode: 'dark',
              reduceMotion: true,
              audio: { moshafId: 'catalog-124' },
              customReciters: Array.from({ length: 125 }, (_, i) => ({
                id: `catalog-${i}`,
                nameEn: `AAA Catalog Voice ${String(i).padStart(3, '0')}`,
                nameAr: `أَحْمَد تجريبي خاص ${i}`,
                server: `https://example.com/${i}/`,
              })),
            },
          })
        ),
      lang
    );
    await page.goto('#/audio');
    const filter = page.locator('#audio-search-input');
    await expect(filter).toBeVisible({ timeout: 20000 });
    await filter.fill(lang === 'en' ? 'AAA Catalog' : 'احمد تجريبي خاص');
    const count = page.locator('.audio-catalog-count');
    await expect(count).toHaveText(lang === 'en' ? 'Showing 60 of 125' : 'عرض 60 من 125');
    await expect(page.locator('.reciter-list--selected .reciter-row--active')).toHaveCount(1);
    await expect(
      page.locator('[data-action="audio-select-moshaf"][data-id="catalog-124"]')
    ).toHaveCount(1);
    const state = () =>
      page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        const s = store.getState();
        return { selected: s.settings.audio.moshafId, player: s.player, surah: s.surahPlayback };
      });
    const before = await state();
    const more = page.locator('[data-action="audio-catalog-more"]');
    await more.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`catalog-controls-${lang}.png`),
      animations: 'disabled',
    });
    const y = await page.evaluate(() => scrollY);
    await more.click();
    await expect(count).toHaveText(lang === 'en' ? 'Showing 120 of 125' : 'عرض 120 من 125');
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(3);
    expect(await state()).toEqual(before);
    await expect(filter).toHaveValue(lang === 'en' ? 'AAA Catalog' : 'احمد تجريبي خاص');
    await page.locator('[data-action="audio-catalog-all"]').click();
    await expect(count).toHaveText(lang === 'en' ? 'Showing 125 of 125' : 'عرض 125 من 125');
    await expect(page.locator('.reciter-list--selected')).toHaveCount(0);
    await expect(
      page.locator('[data-action="audio-select-moshaf"][data-id="catalog-124"]')
    ).toHaveCount(1);
    expect(await state()).toEqual(before);
    await filter.fill('zzzz-no-voice');
    await expect(count).toHaveText(lang === 'en' ? 'Showing 0 of 0' : 'عرض 0 من 0');
    await expect(more).toHaveCount(0);
    await expect(page.locator('.reciter-list--selected')).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`catalog-zero-${lang}.png`),
      animations: 'disabled',
    });
    await filter.fill(lang === 'en' ? 'AAA Catalog' : 'احمد تجريبي خاص');
    await expect(count).toHaveText(lang === 'en' ? 'Showing 60 of 125' : 'عرض 60 من 125');
    await page.screenshot({
      path: testInfo.outputPath(`catalog-phone-${lang}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`catalog-desktop-${lang}.png`),
      animations: 'disabled',
    });
  });
}
