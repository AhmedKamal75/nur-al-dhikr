import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`See all expands only its group without navigation or actions (${lang})`, async ({
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
              customReciters: Array.from({ length: 125 }, (_, i) => ({
                id: `p${i}`,
                nameEn: `PaletteTest ${i}`,
                nameAr: `اختبار خاص ${i}`,
                server: `https://example.com/${i}`,
              })),
            },
            duaJournal: Array.from({ length: 8 }, (_, i) => ({
              id: `j${i}`,
              text: `PaletteTest اختبار خاص ${i}`,
              date: '2026-11-24',
            })),
          })
        ),
      lang
    );
    await page.goto('#/home');
    await expect(page.locator('[data-action="open-palette"]')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-action="open-palette"]').click();
    const input = page.locator('#palette-input');
    await expect(input).toBeVisible();
    const query = lang === 'en' ? 'PaletteTest' : 'اختبار خاص';
    await input.fill(query);
    const expand = page.locator('[data-palette-group="reciter"]');
    await expect(expand).toContainText('125');
    const before = await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      const s = store.getState();
      return {
        audio: s.settings.audio,
        player: s.player,
        surah: s.surahPlayback,
        history: s.search.historyList,
      };
    });
    const url = page.url();
    if (lang === 'en') {
      await input.focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
      await expect(expand).toHaveClass(/palette__item--active/);
      await page.keyboard.press('Enter');
    } else {
      await expand.click();
    }
    await expect(expand).toHaveCount(0);
    await expect(input).toHaveValue(query);
    expect(page.url()).toBe(url);
    await expect(page.locator('[data-action="open-focus"]')).toHaveCount(0);
    await expect(page.locator('#palette-results [data-action="audio-pick-moshaf"]')).toHaveCount(
      125
    );
    await page.screenshot({
      path: testInfo.outputPath(`palette-expanded-${lang}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
    const after = await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      const s = store.getState();
      return {
        audio: s.settings.audio,
        player: s.player,
        surah: s.surahPlayback,
        history: s.search.historyList,
      };
    });
    expect(after).toEqual(before);
    await input.fill(query);
    await expect(expand).toHaveCount(0);
    await input.fill('zz-no-matches');
    await expect(page.locator('[data-palette-group]')).toHaveCount(0);
    await input.fill(query);
    await expect(expand).toContainText(lang === 'en' ? 'Showing 4 of 125' : 'عرض 4 من 125');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: testInfo.outputPath(`palette-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(400);
    const geometry = await page.locator('.palette').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.querySelectorAll('.palette__item,.palette__input')].map((n) => ({
        width: n.getBoundingClientRect().width,
        left: n.getBoundingClientRect().left - r.left,
        right: r.right - n.getBoundingClientRect().right,
      }));
    });
    expect(geometry.every((g) => g.left >= 0 && g.right >= 0)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`palette-desktop-${lang}.png`),
      animations: 'disabled',
    });
  });
