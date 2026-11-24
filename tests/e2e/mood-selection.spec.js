import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`need selection to collections (${lang})`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      lang
    );
    await page.goto('#/mood/anxious');
    const start = page.locator('[data-action="mood-select-start"]');
    await expect(start).toBeVisible({ timeout: 20000 });
    await start.click();
    const boxes = page.locator('[data-action="mood-select-toggle"]');
    await expect(boxes.first()).toBeVisible();
    const ids = await boxes.evaluateAll((es) => es.slice(0, 3).map((e) => e.dataset.id));
    expect(ids.length).toBe(3);
    const baseline = await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      const s = store.getState();
      return JSON.stringify([
        s.history,
        s.counters,
        s.favorites,
        s.quran.bookmarks,
        s.dhikrAudioItemId,
        s.speakingItemId,
      ]);
    });
    await expect(page.locator('[data-action="mood-selection-create"]')).toBeDisabled();
    await boxes.nth(2).check();
    await boxes.nth(0).focus();
    await page.keyboard.press('Space');
    await expect(boxes.nth(0)).toBeChecked();
    expect(
      await boxes.nth(0).evaluate((e) => e.labels[0].textContent.trim().length)
    ).toBeGreaterThan(5);
    await page.locator('[data-action="mood-selection-create"]').click();
    await expect(page.locator('.prompt-dialog')).toBeVisible();
    await page.locator('[data-action="modal-close"]').first().click();
    await expect(boxes.nth(0)).toBeChecked();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.createCollection('target', { en: 'My chosen collection', ar: 'مجموعتي المختارة' })
      );
    });
    await page.locator('[data-action="mood-selection-destination"]').click();
    await expect(page.locator('[data-action="mood-selection-add"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`picker-${lang}.png`) });
    await page.locator('[data-action="modal-close"]').first().click();
    await page.locator('.mood-selection').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({ path: testInfo.outputPath(`select-phone-${lang}.png`) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`select-desktop-${lang}.png`) });
    await page.locator('[data-action="mood-selection-destination"]').click();
    await page.locator('[data-action="mood-selection-add"]').click();
    await expect(page).toHaveURL(/collection\/target/);
    expect(
      await page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        return store.getState().collections.find((c) => c.id === 'target').items;
      })
    ).toEqual([ids[0], ids[2]]);
    expect(
      await page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        const s = store.getState();
        return JSON.stringify([
          s.history,
          s.counters,
          s.favorites,
          s.quran.bookmarks,
          s.dhikrAudioItemId,
          s.speakingItemId,
        ]);
      })
    ).toBe(baseline);
    await page.goto('#/mood/anxious');
    await start.click();
    await boxes.nth(0).check();
    await page.locator('[data-action="mood-select-cancel"]').click();
    await expect(boxes).toHaveCount(0);
    await start.click();
    await boxes.nth(0).check();
    await page.reload();
    await expect(start).toBeVisible();
    await expect(boxes).toHaveCount(0);
    await start.click();
    await boxes.nth(0).check();
    await page.goto('#/mood/sleep');
    await expect(start).toBeVisible();
    await expect(boxes).toHaveCount(0);
    await start.click();
    await boxes.nth(0).check();
    await page.locator('[data-action="mood-selection-create"]').click();
    await page.locator('.prompt-dialog input').fill('New selection');
    await page.locator('.prompt-dialog button[type="submit"]').click();
    await expect(page).toHaveURL(/collection\/col/);
  });
