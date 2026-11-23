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
