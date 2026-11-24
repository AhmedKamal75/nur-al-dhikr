import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`Focus size sheet preserves session (${lang})`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      lang
    );
    await page.goto('#/focus/morning?subId=adh-mor-001');
    const opener = page.locator('[data-action="focus-size-open"]');
    await expect(opener).toBeVisible({ timeout: 20000 });
    const snapshot = () =>
      page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        const s = store.getState();
        return JSON.stringify([
          location.hash,
          s.activeParams,
          s.counters,
          s.history,
          s.lastPosition,
          s.focusWake,
          s.settings.mushafFontScale,
          s.quran.bookmarks,
        ]);
      });
    const baseline = await snapshot();
    const scroll = page.locator('.focus__scroll');
    await scroll.evaluate((e) => (e.scrollTop = 40));
    const top = await scroll.evaluate((e) => e.scrollTop);
    const originalSize = await page
      .locator('.focus__arabic')
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName(lang === 'en' ? 'Reading size' : 'حجم القراءة');
    const smaller = page.locator('[data-action="focus-size-step"][data-dir="-1"]'),
      larger = page.locator('[data-action="focus-size-step"][data-dir="1"]');
    await larger.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-focus-size-value]')).toHaveText('105%');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-focus-size-value]')).toHaveText('110%');
    await page.keyboard.press('ArrowRight');
    expect(await snapshot()).toBe(baseline);
    for (let i = 0; i < 10; i++) await larger.click();
    await expect(larger).toBeDisabled();
    await expect(page.locator('[data-focus-size-value]')).toHaveText('160%');
    expect(await scroll.evaluate((e) => e.scrollTop)).toBe(top);
    expect(await snapshot()).toBe(baseline);
    expect(
      await page.locator('.focus__arabic').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
    ).toBeCloseTo(originalSize * 1.6, 1);
    await page.screenshot({ path: testInfo.outputPath(`size-max-${lang}.png`) });
    for (let i = 0; i < 15; i++) await smaller.click();
    await expect(smaller).toBeDisabled();
    await expect(page.locator('[data-focus-size-value]')).toHaveText('85%');
    expect(
      await page.locator('.focus__arabic').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
    ).toBeCloseTo(originalSize * 0.85, 1);
    await page.screenshot({ path: testInfo.outputPath(`size-min-${lang}.png`) });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(
      true
    );
    // Synthetic background swipe must not move the Focus queue while the sheet is open.
    await scroll.evaluate((el) => {
      el.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: 280, clientY: 200 })],
        })
      );
      el.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 1, target: el, clientX: 20, clientY: 200 })],
        })
      );
    });
    expect(await snapshot()).toBe(baseline);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await snapshot()).toBe(baseline);
    expect(await scroll.evaluate((e) => e.scrollTop)).toBe(top);
    await opener.click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`size-desktop-${lang}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.goto('#/home');
    await expect(dialog).toHaveCount(0);
  });
