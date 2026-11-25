import { test, expect } from '@playwright/test';

for (const language of ['en', 'ar']) {
  test(`file More settings stays inside narrow viewport (${language})`, async ({
    page,
  }, testInfo) => {
    test.slow();
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, reduceMotion: true, themeMode: 'dark' } })
        ),
      language
    );
    await page.goto('#/quran');
    await expect(page.locator('#main')).not.toBeEmpty();
    // No network/media dependency: this is a file-console positioning test.
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.setAudioPlayer({
          moshafId: 'test',
          surah: 1,
          playing: false,
          sleepEnabled: true,
          sleepLabel: '04:59',
        })
      );
    });
    await page.locator('.player-bar__more summary').click();
    for (const width of [320, 360, 390, 700, 701, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const panel = page.locator('.player-bar__more .player-bar__secondary');
      await expect(panel).toBeVisible();
      const boxes = await panel.evaluate((el) =>
        [el, ...el.querySelectorAll('button,label,input')].map((node) => ({
          tag: node.tagName,
          rect: node.getBoundingClientRect().toJSON(),
        }))
      );
      const panelRect = boxes[0].rect;
      for (const { tag, rect } of boxes) {
        expect(rect.x, `${width}px ${tag} inside panel left`).toBeGreaterThanOrEqual(panelRect.x);
        expect(rect.right, `${width}px ${tag} inside panel right`).toBeLessThanOrEqual(
          panelRect.right
        );
        expect(rect.x, `${width}px ${tag} left`).toBeGreaterThanOrEqual(0);
        expect(rect.right, `${width}px ${tag} right`).toBeLessThanOrEqual(width);
        expect(rect.y, `${width}px ${tag} top`).toBeGreaterThanOrEqual(0);
        expect(rect.bottom, `${width}px ${tag} bottom`).toBeLessThanOrEqual(900);
        expect(rect.width).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width
      );
      await page.screenshot({ path: testInfo.outputPath(`popover-${language}-${width}.png`) });
    }
    // Native disclosure still opens/closes; CSS only must not change it.
    await page.locator('.player-bar__more summary').click();
    await expect(page.locator('.player-bar__more')).not.toHaveAttribute('open', '');
  });
}

for (const language of ['en', 'ar']) {
  test(`file More settings scrolls within short landscape (${language})`, async ({
    page,
  }, testInfo) => {
    test.slow();
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, reduceMotion: true, themeMode: 'dark' } })
        ),
      language
    );
    await page.goto('#/quran');
    await expect(page.locator('#main')).not.toBeEmpty();
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(
        actions.setAudioPlayer({
          moshafId: 'test',
          surah: 1,
          playing: false,
          sleepEnabled: true,
          sleepLabel: '04:59',
        })
      );
    });
    for (const [width, height] of [
      [568, 320],
      [667, 375],
      [844, 390],
      [1280, 500],
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator('.player-bar__more').evaluate((el) => (el.open = true));
      const panel = page.locator('.player-bar__more .player-bar__secondary');
      const box = await panel.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      for (const control of await panel.locator('button,input').all()) {
        await control.scrollIntoViewIfNeeded();
        const r = await control.boundingBox();
        expect(r.y).toBeGreaterThanOrEqual(box.y);
        expect(r.y + r.height).toBeLessThanOrEqual(box.y + box.height);
      }
      await page.screenshot({ path: testInfo.outputPath(`landscape-${language}-${width}.png`) });
      await panel.evaluate((el) => (el.scrollTop = 0));
      await page.screenshot({
        path: testInfo.outputPath(`landscape-top-${language}-${width}.png`),
      });
    }
  });
}
