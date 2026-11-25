import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const mp3 = readFileSync(new URL('./fixtures/silence-120s.mp3', import.meta.url));
for (const language of ['en', 'ar']) {
  test(`pending verse pause and fresh resume stay owned (${language})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      language
    );
    const media = (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*' },
        body: mp3,
      });
    await page.route('https://cdn.islamic.network/quran/audio/**', media);
    await page.route('https://everyayah.com/data/**', media);
    await page.goto('#/mushaf?page=2');
    await page.locator('[data-action="surah-play"][data-surah="2"]').first().click();
    const pause = page.locator('.player-bar--recite [data-action="recite-pause-toggle"]').first();
    await expect(pause).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const v = await import('/js/services/surahPlayback.js');
      window.sourceRequests = [];
      v.setVerseAudioFetcherForTests(
        () => new Promise((resolve) => window.sourceRequests.push(resolve))
      );
      v.skip(1);
    });
    await pause.click();
    await expect(pause).toHaveAttribute('aria-label', /Play|تشغيل/);
    await page.evaluate(() => window.sourceRequests[0](null));
    await expect
      .poll(() =>
        page.evaluate(async () => (await import('/js/services/surahPlayback.js')).snapshot().paused)
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`pending-paused-${language}.png`) });
    await pause.click();
    await expect.poll(() => page.evaluate(() => window.sourceRequests.length)).toBe(2);
    await page.evaluate(() => window.sourceRequests[1](null));
    await expect(pause).toHaveAttribute('aria-label', /Pause|إيقاف مؤقت/);
    await expect
      .poll(() =>
        page.evaluate(async () => (await import('/js/services/recitation.js')).isPlaying('2:2'))
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`fresh-resumed-${language}.png`) });
  });
}
