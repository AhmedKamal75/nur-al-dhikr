import { test, expect } from '@playwright/test';

function seed(lang) {
  if (localStorage.getItem('c02-seeded')) return;
  localStorage.setItem('c02-seeded', '1');
  localStorage.setItem(
    'nurAlDhikr:v2:state',
    JSON.stringify({
      settings: {
        language: lang,
        themeMode: 'dark',
        reduceMotion: true,
        autoAdvanceFocus: true,
        contentPrefs: { hiddenItems: { 'adh-mor-003a': true } },
      },
      collections: [
        {
          id: 'session-test',
          name: { en: 'My evening collection', ar: 'مجموعتي المسائية' },
          items: ['adh-mor-001', 'adh-mor-003a', 'adh-eve-001', 'adh-mor-003b'],
          createdAt: 1,
        },
      ],
    })
  );
}

for (const lang of ['en', 'ar']) {
  test(`collection queue keeps context through auto/arrow/key/exit/reload (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript(seed, lang);
    await page.goto('./#/collection/session-test');
    const launcher = page.locator('[data-action="collection-session-start"]');
    await expect(launcher).toBeVisible({ timeout: 20000 });
    await launcher.click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-mor-001');
    await expect(page.locator('.focus__position')).toHaveText('1 / 3');
    await expect(page.locator('.focus__category')).toHaveText(
      lang === 'ar' ? 'مجموعتي المسائية' : 'My evening collection'
    );
    // One count completes the first item. Hidden morning item is skipped, and
    // auto-advance crosses category boundaries without dropping collection.
    await page.locator('.focus__counter').click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    await expect(page).toHaveURL(/collection=session-test/);
    await expect(page.locator('.focus__position')).toHaveText('2 / 3');
    await page.locator('[data-action="focus-adjacent"][data-dir="1"]').click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-mor-003b');
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/collection\/session-test$/);
    await expect(launcher).toContainText(lang === 'ar' ? 'متابعة' : 'Continue');
    await page.reload();
    await launcher.click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    await expect(page.locator('.focus__position')).toHaveText('2 / 3');
    // Reorder under an active session: identity stays put, position updates.
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.moveCollectionItem('session-test', 'adh-eve-001', -1));
      store.dispatch(actions.moveCollectionItem('session-test', 'adh-eve-001', -1));
    });
    await expect(page.locator('.focus__position')).toHaveText('1 / 3');
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    // Remove the current bookmark: fallback is still in the saved queue.
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.removeFromCollection('session-test', 'adh-eve-001'));
    });
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-mor-001');
    await expect(page.locator('.focus__position')).toHaveText('1 / 2');
    await page.screenshot({ path: testInfo.outputPath(`c02-focus-${lang}.png`), fullPage: true });
    await page.locator('[data-action="focus-exit"]').click();
    await expect(page).toHaveURL(/#\/collection\/session-test$/);
    await page.screenshot({
      path: testInfo.outputPath(`c02-collection-${lang}.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`c02-collection-desktop-${lang}.png`),
      fullPage: false,
    });
    await launcher.click();
    await expect(page.locator('.focus')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`c02-focus-desktop-${lang}.png`),
      fullPage: false,
    });
    // A deleted collection cannot silently spill into the category queue.
    await page.goto('./#/focus/morning/adh-mor-001?collection=deleted-collection');
    await expect(page.locator('.focus')).toHaveCount(0);
    await expect(page.locator('.back-link')).toHaveAttribute(
      'href',
      '#/collection/deleted-collection'
    );
    expect(errors).toEqual([]);
  });
}

for (const lang of ['en', 'ar']) {
  test(`beginning preserves progress, live eligibility and queue while searching (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(seed, lang);
    await page.goto('./#/collection/session-test');
    await expect(page.locator('[data-action="collection-session-start"]')).toBeVisible({
      timeout: 20000,
    });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const state = store.getState();
      state.collections[0].sessionItemId = 'adh-mor-003b';
      state.collections[0].items = [
        'ghost',
        'adh-mor-003a',
        'adh-mor-001',
        'adh-mor-001',
        'adh-eve-001',
        'adh-mor-003b',
      ];
      const { dateKey } = await import('/js/core/utils.js');
      const today = dateKey();
      state.counters = {
        'adh-mor-001': { count: 2, target: 5, completedCycles: 3, lastCompletedDay: today },
      };
      state.statistics.dailyHistory = {
        [today]: { recitations: 9, sessions: 2, itemIds: ['adh-mor-001'] },
      };
      state.history = [{ itemId: 'adh-eve-001', categoryId: 'evening', ts: 123 }];
      store.dispatch(actions.navigate('collection', { id: 'session-test', q: 'unmatched-query' }));
    });
    const beginning = page.locator('[data-action="collection-session-beginning"]');
    await expect(beginning).toBeVisible();
    await expect(beginning).toHaveText(lang === 'ar' ? 'البدء من البداية' : 'Start from beginning');
    const progress = () =>
      page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        const { counters, statistics, history, collections } = store.getState();
        return { counters, statistics, history, items: collections[0].items };
      });
    const before = await progress();
    await beginning.focus();
    await expect(beginning).toBeFocused();
    const geometry = await beginning.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        valid: [...range.getClientRects()].every((b) => b.left >= r.left && b.right <= r.right + 1),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry).toEqual({ valid: true, overflow: false });
    await page.screenshot({
      path: testInfo.outputPath(`beginning-${lang}.png`),
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`beginning-desktop-${lang}.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('Enter');
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-mor-001');
    await expect(page.locator('.focus__position')).toHaveText('1 / 3');
    expect(await progress()).toEqual(before);
    await page.locator('[data-action="focus-exit"]').click();
    await expect(beginning).toHaveCount(0);
    await page.locator('[data-action="collection-session-start"]').click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-mor-001');
    expect(await progress()).toEqual(before);
    // A stale DOM button must resolve current state, not the rendered first ID.
    await page.locator('[data-action="focus-exit"]').click();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.getState().collections[0].sessionItemId = 'adh-mor-003b';
      store.dispatch(actions.navigate('collection', { id: 'session-test' }));
    });
    await expect(beginning).toBeVisible();
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      store.getState().settings.contentPrefs.hiddenItems['adh-mor-001'] = true;
    });
    await beginning.click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    await page.locator('[data-action="focus-exit"]').click();
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      store.getState().settings.contentPrefs.hiddenItems['adh-eve-001'] = true;
      store.getState().settings.contentPrefs.hiddenItems['adh-mor-003b'] = true;
      const { clickHandlers } = await import('/js/app/handlers/items.js');
      clickHandlers['collection-session-beginning']({ id: 'session-test' });
      clickHandlers['collection-session-beginning']({ id: 'invalid' });
      clickHandlers['collection-session-start']({ id: 'session-test' });
      clickHandlers['collection-session-start']({ id: 'invalid' });
    });
    await expect(page).toHaveURL(/#\/collection\/session-test$/);
    expect(await progress()).toEqual(before);
    // Reload uses the app's existing fresh-session counter policy. The
    // bookmark still resumes the newly chosen first position.
    await page.reload();
    await page.locator('[data-action="collection-session-start"]').click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
  });
}
