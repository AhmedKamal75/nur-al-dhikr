import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`recovery and gift windows preserve data and filters (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: { language, themeMode: 'dark', reduceMotion: true },
            sadaqahLog: Array.from({ length: 65 }, (_, i) => ({
              id: `g${i}`,
              ts: Date.UTC(2026, 10, 24) - i * 86400000,
              note: `GiftNote code${i}`,
              amount: i + 1,
            })),
          })
        ),
      lang
    );
    await page.goto('#/home');
    await expect(page.locator('[data-action="open-palette"]')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { clickHandlers } = await import('/js/app/handlers/worship.js');
      await clickHandlers['sadaqah-open-editor']();
    });
    const gifts = page.locator('[data-gift-list]');
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(20);
    await page.locator('[name="note"]').fill('Unsaved draft');
    await page.locator('[data-action="sadaqah-history-more"]').click();
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(40);
    await expect(page.locator('[name="note"]')).toHaveValue('Unsaved draft');
    const filter = page.locator('[data-bind="sadaqah-history-filter"]');
    await filter.fill('code6');
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(6);
    await filter.fill('zznone');
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(0);
    await filter.fill('code64');
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`gifts-phone-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`gifts-desktop-${lang}.png`),
      animations: 'disabled',
    });
    await gifts.locator('[data-action="sadaqah-remove"]').click();
    await expect(gifts.locator('[data-action="sadaqah-remove"]')).toHaveCount(0);
    await expect(filter).toHaveValue('code64');
    await expect(page.locator('[name="note"]')).toHaveValue('Unsaved draft');
    await page.locator('form[data-form="sadaqah-entry"] [type="submit"]').click();
    await expect(filter).toHaveValue('code64');
    await expect(page.locator('[name="note"]')).toHaveValue('');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-action="modal-close"]').first().click();
    await page.goto('#/hadith/nawawi');
    await expect(page.locator('[data-bind="hadith-query"]')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const s = store.getState();
      s.hadith.docs.nawawi.hadiths = Array.from({ length: 85 }, (_, i) => ({
        n: i + 1,
        b: 1,
        ar: `نص خاص ${i + 1}`,
        en: `HiddenNeedle ${i + 1}`,
      }));
      s.ui.contentManage = true;
      s.settings.contentPrefs = {
        ...s.contentPrefs,
        hadithPrefs: {
          hiddenHadiths: Object.fromEntries(
            Array.from({ length: 85 }, (_, i) => [`nawawi:${i + 1}`, true])
          ),
        },
      };
      store.dispatch(actions.setHadithView({ query: '', page: 1 }));
    });
    const chips = page.locator('[data-action="hadith-unhide-item"]');
    await expect(chips).toHaveCount(40);
    await page.locator('[data-action="hadith-recovery-more"]').click();
    await expect(chips).toHaveCount(80);
    await page.locator('[data-action="hadith-recovery-more"]').click();
    await expect(chips).toHaveCount(85);
    const hf = page.locator('#hadith-recovery-filter');
    await hf.fill('85');
    await expect(chips).toHaveCount(1);
    await expect(chips).toHaveAttribute('data-key', 'nawawi:85');
    await hf.scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -100));
    await page.screenshot({
      path: testInfo.outputPath(`recovery-phone-${lang}.png`),
      animations: 'disabled',
    });
    await chips.click();
    await expect(chips).toHaveCount(0);
    await hf.fill('');
    await expect(chips).toHaveCount(40);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.unhide-bar').last().scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -100));
    const geometry = await page
      .locator('.unhide-bar')
      .last()
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [...el.querySelectorAll('input,button')].map((n) => {
          const b = n.getBoundingClientRect();
          return b.left >= r.left && b.right <= r.right;
        });
      });
    expect(geometry.every(Boolean)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`recovery-desktop-${lang}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
  });
