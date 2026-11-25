import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar'])
  test(`counter reset review (${lang})`, async ({ page }, testInfo) => {
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
    await page.goto('#/tasbih');
    const reset = page.locator('[data-action="tasbih-reset"]');
    await expect(reset).toBeVisible({ timeout: 20000 });
    const read = () =>
      page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        return store.getState().counters['tasbih:subhanallah'] || null;
      });
    await reset.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await read()).toBeNull();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.setCounter('tasbih:subhanallah', { count: 0, target: 33, completedCycles: 2 })
      );
    });
    await reset.click();
    await expect(page.locator('[data-reset-cancel]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await read()).completedCycles).toBe(2);
    await expect(reset).toBeFocused();
    for (const method of ['close', 'backdrop']) {
      await reset.click();
      if (method === 'close') await page.locator('.modal__close').click();
      else await page.locator('.modal-overlay').click({ position: { x: 3, y: 3 } });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect((await read()).completedCycles).toBe(2);
    }
    await page.locator('[data-action="view-menu"]').click();
    await page.locator('[data-action="tasbih-reset"]').last().click();
    await expect(page.locator('[data-reset-cancel]')).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`reset-cycles-${lang}.png`) });
    await page.evaluate(async () => {
      const t = await import('/js/services/tasbih.js');
      for (let i = 0; i < 10; i++) {
        t.increment('tasbih:subhanallah', 'tasbih-dhikr', 33);
        t.setTarget('tasbih:subhanallah', 99);
      }
    });
    expect((await read()).target).toBe(33);
    expect((await read()).count).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await reset.click();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.setCounter('tasbih:subhanallah', { count: 31, target: 40, completedCycles: 3 })
      );
    });
    await page.locator('[data-action="counter-reset-confirm"]').click();
    expect((await read()).count).toBe(31);
    await expect(page.locator('[data-reset-cancel]')).toBeFocused();
    await expect(page.locator('[data-counter-reset-review]')).toContainText('31 / 40');
    const reviewedToken = await page
      .locator('[data-action="counter-reset-confirm"]')
      .getAttribute('data-token');
    await page.locator('[data-action="counter-reset-confirm"]').click();
    await page.evaluate(async (token) => {
      const { confirmCounterReset } = await import('/js/app/counterReset.js');
      confirmCounterReset(token);
    }, reviewedToken);
    expect(await read()).toMatchObject({ count: 0, target: 40, completedCycles: 0 });
    await expect(reset).toBeFocused();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.tasbihCustomAdd(
          'A very long custom phrase <script>not markup</script> '.repeat(6),
          7
        )
      );
      const id = store.getState().tasbihCustom.at(-1).id;
      store.dispatch(actions.setTasbihActive(id));
      store.dispatch(
        actions.setCounter('tasbih:' + id, { count: 6, target: 7, completedCycles: 1 })
      );
    });
    await reset.click();
    await expect(page.locator('[data-counter-reset-review] script')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({ path: testInfo.outputPath(`reset-custom-${lang}.png`) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`reset-desktop-${lang}.png`) });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.tasbihCustomRemove(store.getState().tasbih.activeItemId));
    });
    await page.locator('[data-action="counter-reset-confirm"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('#/focus/morning?subId=adh-mor-001');
    await expect(page.locator('[data-action="focus-reset"]')).toBeVisible();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const { scheduleAutoAdvance } = await import('/js/app/focusRuntime.js');
      store.dispatch(
        actions.setCounter('adh-mor-001', { count: 0, target: 1, completedCycles: 1 })
      );
      scheduleAutoAdvance(600);
    });
    await page.locator('[data-action="focus-reset"]').click();
    const hash = page.url();
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    expect(page.url()).toBe(hash);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    expect(page.url()).toBe(hash);
    await page.locator('[data-action="focus-reset"]').click();
    await page.locator('[data-action="counter-reset-confirm"]').click();
    expect(
      await page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        return store.getState().counters['adh-mor-001'];
      })
    ).toMatchObject({ count: 0, completedCycles: 0, target: 1 });
    await expect(page.locator('[data-action="focus-reset"]')).toBeFocused();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.setCounter('adh-mor-001', { count: 0, target: 1, completedCycles: 1 })
      );
    });
    await page.locator('[data-action="focus-reset"]').click();
    await page.goto('#/home');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.evaluate(async () => {
      const { confirmCounterReset } = await import('/js/app/counterReset.js');
      confirmCounterReset('1');
    });
  });
