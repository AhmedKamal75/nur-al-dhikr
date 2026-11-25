import { test, expect } from '@playwright/test';
for (const language of ['en', 'ar'])
  test(`timetable context settings refresh and print (${language})`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language,
              themeMode: 'dark',
              reduceMotion: true,
              prayer: {
                latitude: 40.71,
                longitude: -74,
                timezone: 'America/New_York',
                method: 'MWL',
                asr: 'Hanafi',
                locationName: '<img src=x onerror=alert(1)>' + 'A very long city name '.repeat(40),
                offsets: { fajr: 5, asr: -3 },
              },
            },
          })
        ),
      language
    );
    await page.goto('#/prayer');
    await expect(page.locator('[data-action="view-menu"][data-menu="prayer"]')).toBeVisible({
      timeout: 20000,
    });
    await page.evaluate(async () => {
      const { openMonthTimetable } = await import('/js/app/handlers/viewMenus.js');
      window.monthListenerBaseline = (await import('/js/core/state.js')).store._listeners.size;
      openMonthTimetable(2026, 3);
    });
    const month = page.locator('.prayer-month');
    await expect(month).toHaveAttribute('data-month', '3');
    await expect(month.locator('tbody tr')).toHaveCount(31);
    expect(
      await page.evaluate(async () => (await import('/js/core/state.js')).store._listeners.size)
    ).toBe(await page.evaluate(() => window.monthListenerBaseline + 1));
    await expect(month.locator('.prayer-month__context')).toContainText('America/New_York');
    expect(
      await page
        .locator('.prayer-month__context')
        .evaluate((el) => el.scrollWidth <= el.clientWidth)
    ).toBe(true);
    expect(
      await page.locator('.modal').evaluate((el) => el.getBoundingClientRect().right <= innerWidth)
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`timetable-screen-${language}.png`) });
    const rowsBeforeSettings = await month.locator('tbody').innerText();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.updatePrayerSettings({
          timezone: 'Africa/Cairo',
          method: 'Egyptian',
          offsets: { isha: 7 },
        })
      );
    });
    await expect(month.locator('.prayer-month__context')).toContainText('Africa/Cairo');
    expect(await month.locator('tbody').innerText()).not.toBe(rowsBeforeSettings);
    await expect(month).toHaveAttribute('data-month', '3');
    await expect(month.locator('tbody tr')).toHaveCount(31);
    await page.locator('[data-action="prayer-month-nav"][data-m="4"]').click();
    await expect(month).toHaveAttribute('data-month', '4');
    await expect(month.locator('tbody tr')).toHaveCount(30);
    await page.evaluate(() => {
      window.print = () => {
        window.didPrint = true;
      };
    });
    await page.locator('[data-action="prayer-month-print"]').click();
    expect(await page.evaluate(() => window.didPrint)).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(month.locator('.editor-form__actions').first()).toBeHidden();
    await expect(month.locator('h2')).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(month.locator('tbody tr').last()).toBeVisible();
    expect(await month.locator('tbody tr').last().locator('th').textContent()).toBe('30');
    if (browserName === 'chromium')
      await page.pdf({
        path: testInfo.outputPath(`timetable-print-${language}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.evaluate(async () => {
      const { CITY_PRESETS } = await import('/js/domain/locations.js');
      const { store, actions } = await import('/js/core/state.js');
      const lang = store.getState().settings.language;
      const city = [...CITY_PRESETS].sort((a, b) =>
        lang === 'ar' ? b.ar.length - a.ar.length : b.en.length - a.en.length
      )[0];
      store.dispatch(
        actions.updatePrayerSettings({
          cityId: city.id,
          latitude: city.lat,
          longitude: city.lng,
          timezone: city.timezone,
        })
      );
    });
    await page.screenshot({ path: testInfo.outputPath(`timetable-long-place-${language}.png`) });
    await page.evaluate(() => document.body.classList.add('print-timetable'));
    await page.emulateMedia({ media: 'print' });
    if (browserName === 'chromium')
      await page.pdf({
        path: testInfo.outputPath(`timetable-long-place-${language}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

    // Language changes while open rebuild the same selected month.
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const other = store.getState().settings.language === 'ar' ? 'en' : 'ar';
      store.dispatch(actions.updateSettings({ language: other }));
    });
    await expect(month).toHaveAttribute('lang', language === 'ar' ? 'en' : 'ar');
    await expect(month).toHaveAttribute('data-month', '4');
    await page.locator('[data-action="modal-close"]').click();
    await expect(month).toHaveCount(0);
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.updatePrayerSettings({ method: 'MWL' }));
    });
    await expect(month).toHaveCount(0);
    await page.evaluate(async () => {
      const { openMonthTimetable } = await import('/js/app/handlers/viewMenus.js');
      const { openModal } = await import('/js/ui/modal.js');
      const { store, actions } = await import('/js/core/state.js');
      openMonthTimetable(2026, 11);
      openModal('<h2 id="replacement">Replacement</h2>');
      store.dispatch(actions.updatePrayerSettings({ method: 'Egyptian' }));
    });
    await expect(page.locator('#replacement')).toBeVisible();
    expect(
      await page.evaluate(async () => (await import('/js/core/state.js')).store._listeners.size)
    ).toBe(await page.evaluate(() => window.monthListenerBaseline));
    await expect(month).toHaveCount(0);
  });
