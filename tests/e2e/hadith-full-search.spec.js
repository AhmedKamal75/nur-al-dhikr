import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`cross-book search reaches match237 without fetching missing books (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      lang
    );
    const fetched = [];
    page.on('request', (r) => {
      if (/data\/hadith\/(bukhari|muslim)\.json/.test(r.url())) fetched.push(r.url());
    });
    await page.goto('#/hadith');
    await expect(page.locator('#hadith-grid-search-input')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const { buildHadithIndex } = await import('/js/domain/hadithSearch.js');
      const doc = {
        id: 'fixture',
        name: { en: 'Test loaded book', ar: 'كتاب اختبار محمل' },
        sections: [{ id: 1, name: 'Test chapter' }],
        hadiths: Array.from({ length: 237 }, (_, i) => ({
          n: i + 1,
          b: 1,
          ar: `اختبار خاص رقم ${i + 1}`,
          en: `needle fixture number ${i + 1}`,
        })),
      };
      store.dispatch(
        actions.setHadithIndex({
          books: [
            { id: 'fixture', name: doc.name, count: 237, sectionCount: 1, bundled: true },
            { id: 'bukhari', name: { en: 'Bukhari', ar: 'البخاري' }, count: 100, sectionCount: 1 },
          ],
        })
      );
      store.dispatch(actions.setHadithBook('fixture', doc));
      buildHadithIndex(store.getState().hadith.docs);
    });
    const query = lang === 'en' ? 'needle fixture' : 'اختبار خاص';
    await page.locator('#hadith-grid-search-input').fill(query);
    await expect(page.locator('.hadith-hit')).toHaveCount(10);
    await expect(page.locator('.hadith-pager__status')).toContainText('237');
    await page.evaluate((q) => {
      location.hash = `#/hadith?q=${encodeURIComponent(q)}&page=24`;
    }, query);
    await expect(page.locator('.hadith-hit')).toHaveCount(7);
    await expect(page.locator('[data-action="hadith-grid-next"]')).toBeDisabled();
    await expect(page.locator('.hadith-hit__meta').last()).toContainText('#237');
    await page.locator('[data-action="hadith-grid-prev"]').click();
    await expect(page.locator('.hadith-hit')).toHaveCount(10);
    await expect(page.locator('.hadith-pager__status')).toContainText('23/24');
    expect(fetched).toEqual([]);
    const pagerGeometry = await page.locator('.hadith-pager').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.children].map((n) => {
        const b = n.getBoundingClientRect();
        return { left: b.left - r.left, right: r.right - b.right, height: b.height };
      });
    });
    expect(pagerGeometry.every((g) => g.left >= 0 && g.right >= 0 && g.height > 0)).toBe(true);
    await expect(page.locator('#hadith-grid-search-input')).toHaveValue(query);
    await page.locator('.hadith-pager').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: testInfo.outputPath(`hadith-pager-${lang}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`hadith-desktop-${lang}.png`),
      animations: 'disabled',
    });
  });
