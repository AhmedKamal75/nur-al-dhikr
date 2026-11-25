import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const mp3 = readFileSync(new URL('./fixtures/silence-120s.mp3', import.meta.url));
for (const lang of ['en', 'ar'])
  test(`one sleep timer across voices (${lang})`, async ({ page }, testInfo) => {
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
    const media = (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*' },
        body: mp3,
      });
    await page.route('https://cdn.islamic.network/quran/audio/**', media);
    await page.route('https://everyayah.com/data/**', media);
    await page.route('https://sleep-test.invalid/**', media);
    await page.goto('#/mushaf?page=2');
    const play = page.locator('[data-action="surah-play"][data-surah="2"]').first();
    await expect(play).toBeVisible({ timeout: 20000 });
    await play.click();
    await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });
    await page.locator('.player-bar--recite [data-action="recite-more-toggle"]').click();
    await page.locator('.player-bar--recite [data-action="recite-sleep-cycle"]').click();
    const chip = page.locator('.player-bar--recite [data-action="recite-sleep-cycle"]');
    await expect(chip).toHaveClass(/--on/);
    const label = await chip.textContent();
    await expect.poll(() => chip.textContent(), { timeout: 5000 }).not.toBe(label);
    await page.screenshot({ path: testInfo.outputPath(`verse-sleep-${lang}.png`) });
    await page.evaluate(async () => {
      const { claimSpeaker } = await import('/js/app/audioEngine.js');
      const v = await import('/js/services/surahPlayback.js');
      claimSpeaker('verse', { alsoKeep: ['player'] });
      if (!v.sleepSnapshot().enabled) throw new Error('same owner lost timer');
      v.pause();
      claimSpeaker('speech');
      if (v.sleepSnapshot().enabled) throw new Error('paused owner kept timer');
    });
    await expect(page.locator('[data-action="recite-sleep-cycle"]').first()).not.toHaveClass(
      /--on/
    );
    await page.evaluate(async () => {
      const p = await import('/js/services/player.js');
      const { claimSpeaker } = await import('/js/app/audioEngine.js');
      const { store, actions } = await import('/js/core/state.js');
      claimSpeaker('player');
      const verse = await import('/js/services/surahPlayback.js');
      verse.stop();
      store.dispatch(actions.setSurahPlayback(verse.snapshot()));
      await p.play('test', 1, 'https://sleep-test.invalid/silence.mp3');
      p.setVolume(0.4);
      store.dispatch(actions.setAudioPlayer({ moshafId: 'test', surah: 1, playing: true }));
      p.armSleepTimer(5);
    });
    await expect(page.locator('.player-bar:not(.player-bar--recite)')).toBeVisible();
    await page.locator('.player-bar__more summary').click();
    const fileChip = page.locator('[data-action="player-sleep-cycle"]');
    await expect(fileChip).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath(`file-sleep-${lang}.png`) });
    const result = await page.evaluate(async () => {
      const p = await import('/js/services/player.js');
      const v = await import('/js/services/surahPlayback.js');
      const { claimSpeaker } = await import('/js/app/audioEngine.js');
      await p.play('test', 2, 'https://sleep-test.invalid/silence2.mp3');
      const same = p.sleepSnapshot().enabled;
      p.pause();
      claimSpeaker('adhkar');
      const cleared = !p.sleepSnapshot().enabled;
      const base = p.userVolume();
      p.armSleepTimer(5);
      claimSpeaker('verse', { alsoKeep: ['player'] });
      const kept = p.sleepSnapshot().enabled;
      v.armSleepTimer(5);
      const one = !p.sleepSnapshot().enabled && v.sleepSnapshot().enabled;
      claimSpeaker('adhan');
      return { same, cleared, base, kept, one, off: !v.sleepSnapshot().enabled };
    });
    expect(result).toEqual({
      same: true,
      cleared: true,
      base: 0.4,
      kept: true,
      one: true,
      off: true,
    });
    await expect(fileChip).toHaveAttribute('aria-pressed', 'false');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`sleep-off-desktop-${lang}.png`) });
  });
