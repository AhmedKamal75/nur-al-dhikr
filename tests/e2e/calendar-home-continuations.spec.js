import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`calendar and recent continuation (${lang})`, async ({ page }, testInfo) => {
    await page.clock.install({ time: new Date('2026-01-02T12:00:00+02:00') });
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
              homeOrder: ['recent'],
              hiddenHome: { recent: false },
            },
          })
        ),
      lang
    );
    await page.goto('#/calendar?month=2026-02');
    await expect(page.locator('[data-calendar-event-count]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.event-list .event-row')).toHaveCount(5);
    await page.locator('[data-action="calendar-events-more"]').click();
    await expect(page.locator('.event-list .event-row')).toHaveCount(9);
    await expect(page).toHaveURL(/month=2026-02/);
    await expect(page.locator('[data-action="calendar-events-more"]')).toHaveCount(0);
    await page.locator('[data-calendar-event-count]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`calendar-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('[data-calendar-event-count]').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -95));
    await page.screenshot({
      path: testInfo.outputPath(`calendar-desktop-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('#/home');
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const s = store.getState();
      s.history = Object.keys(s.library.itemIndex)
        .slice(0, 20)
        .map((itemId) => ({ itemId, ts: Date.now() }));
      store.dispatch(actions.setHadithView({}));
    });
    const panel = page.locator('[data-home-recents]');
    await expect(panel).toBeVisible();
    await expect(panel.locator('article')).toHaveCount(3);
    await panel.locator('[data-action="home-recents-more"]').click();
    await expect(panel.locator('article')).toHaveCount(6);
    await panel.locator('h2').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -95));
    const geometry = await panel.evaluate((el) =>
      [...el.querySelectorAll('h2,.panel__subtext,button')].every((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      })
    );
    expect(geometry).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`recents-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await panel.locator('h2').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -95));
    await page.screenshot({
      path: testInfo.outputPath(`recents-desktop-${lang}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
  });
