import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`root pages and study continuation (${lang})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      lang
    );
    await page.goto('#/home');
    await expect(page.locator('[data-action="open-palette"]')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const { resetMutashabihatCache } = await import('/js/domain/mutashabihat.js');
      const s = store.getState();
      const text = 'الأعمال بالنيات وإنما لكل امرئ ما نوى دائما';
      s.quran.surahs = {
        1: { number: 1, ayahs: Array.from({ length: 8 }, (_, i) => ({ number: i + 1, text })) },
      };
      s.quranRootsFull = {
        رحم: {
          count: 8,
          occ: Array.from({ length: 8 }, (_, i) => ({ s: 1, a: i + 1, i: 1, t: 'ألف' })),
        },
      };
      s.quranRoots = s.quranRootsFull;
      resetMutashabihatCache();
      store.dispatch(actions.setHadithView({}));
      location.hash = '#/roots/رحم?tab=confusables';
    });
    await expect(page.locator('.root-confusable')).toHaveCount(12);
    await page.locator('[data-action="roots-confusables-page"]').last().click();
    await expect(page.locator('.root-confusable')).toHaveCount(12);
    await page.locator('[data-action="roots-confusables-page"]').last().click();
    await expect(page.locator('.root-confusable')).toHaveCount(4);
    await page.locator('[data-root-pager]').scrollIntoViewIfNeeded();
    const bounds = await page.locator('[data-root-pager]').evaluate((el) =>
      [...el.children].every((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      })
    );
    expect(bounds).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`roots-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`roots-desktop-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      const { buildHadithIndex } = await import('/js/domain/hadithSearch.js');
      const { buildStudyHadithSection } = await import('/js/views/ayahStudy.js');
      const { openModal } = await import('/js/ui/modal.js');
      const text = 'الأعمال بالنيات وإنما لكل امرئ ما نوى دائما';
      const s = store.getState();
      s.hadith.docs.test = {
        id: 'test',
        sections: [],
        hadiths: Array.from({ length: 17 }, (_, i) => ({
          n: i + 1,
          b: 1,
          ar: text,
          en: 'Test fixture',
        })),
      };
      buildHadithIndex({ test: s.hadith.docs.test });
      openModal(buildStudyHadithSection(s, 1, 1, text, s.settings.language));
    });
    await expect(page.locator('[data-study-hadith-count]')).toContainText('17');
    await page.locator('[data-study-hadith-all]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`study-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`study-desktop-${lang}.png`),
      animations: 'disabled',
    });
    await page.locator('[data-study-hadith-all]').click();
    await expect(page).toHaveURL(/hadith\?q=/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
  });
