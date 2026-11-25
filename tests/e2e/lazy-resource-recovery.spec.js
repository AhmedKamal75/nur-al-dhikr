import { test, expect } from '@playwright/test';
for (const language of ['en', 'ar'])
  test(`lazy resources recover and stale study stays closed (${language})`, async ({
    page,
  }, testInfo) => {
    test.slow();
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language,
              reduceMotion: true,
              themeMode: 'dark',
              compressedDownloads: false,
            },
          })
        ),
      language
    );
    let failMeta = true;
    await page.route('**/data/quran-meta.json', (r) =>
      failMeta ? r.fulfill({ status: 503, body: 'unavailable' }) : r.continue()
    );
    await page.goto('#/quran');
    const retry = page.locator('[data-action="retry-load"][data-key="quran-meta"]');
    await expect(retry).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: testInfo.outputPath(`meta-error-${language}.png`) });
    failMeta = false;
    await retry.click();
    await expect(page.locator('.surah-tile').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: testInfo.outputPath(`meta-recovered-${language}.png`) });
    // Fail both root tiers so the empty/error surface offers the real retry.
    let failRoots = true;
    await page.route('**/data/quran-roots*.json', (r) =>
      failRoots ? r.fulfill({ status: 404, body: 'missing' }) : r.continue()
    );
    await page.goto('#/roots');
    const rootsRetry = page.locator('[data-action="retry-load"][data-key="quran-roots"]');
    await expect(rootsRetry).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: testInfo.outputPath(`roots-error-${language}.png`) });
    // Preserve exact cooldown: advance wall clock, do not bypass the adapter.
    await page.clock.install();
    await page.clock.setSystemTime(Date.now() + 31000);
    failRoots = false;
    await rootsRetry.click();
    await expect(page.locator('.root-tile').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: testInfo.outputPath(`roots-recovered-${language}.png`) });
    // Deferred study meta resolves after invalidation and modal generation change.
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      const lazy = await import('/js/app/lazyData.js');
      store.dispatch(actions.setQuranMeta(null));
      lazy.invalidateLazyFetches();
    });
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route('**/data/quran-meta.json', async (r) => {
      await gate;
      await r.continue();
    });
    await page.evaluate(() => {
      window.studyPromise = import('/js/app/lazyData.js').then((m) => m.openAyahStudy(1, 1));
    });
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { rt } = await import('/js/app/rt.js');
          return rt.quranMetaFetchStarted;
        })
      )
      .toBe(true);
    await page.evaluate(async () => {
      const lazy = await import('/js/app/lazyData.js');
      lazy.invalidateLazyFetches();
      const { closeModal } = await import('/js/ui/modal.js');
      closeModal();
    });
    release();
    await page.evaluate(() => window.studyPromise);
    await expect(page.locator('#modal-title-mushaf-ayah')).toHaveCount(0);
  });
