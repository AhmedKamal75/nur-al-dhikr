/**
 * e2e/player-chrome.spec.js — (v5.12.0) one player, every side: minimize /
 * restore keeps the session, Space / arrows / M drive it, and the bar
 * fades after 5s idle and returns on activity.
 */
import { test, expect } from '@playwright/test';

test('player chrome: minimize, keys, idle fade keep one session', async ({ page }) => {
  // (v5.17.2, matrix) fixed sleeps alone total ~9s plus long polls; triple
  // the budget for loaded matrix workers. Assertions unchanged.
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  // Remote reciter availability is not the subject of this chrome test.
  // Exercise the real HTML media pipeline with deterministic, long WAV audio.
  const sampleRate = 8000;
  const sampleCount = sampleRate * 30;
  const silentWav = Buffer.alloc(44 + sampleCount * 2);
  silentWav.write('RIFF', 0);
  silentWav.writeUInt32LE(36 + sampleCount * 2, 4);
  silentWav.write('WAVE', 8);
  silentWav.write('fmt ', 12);
  silentWav.writeUInt32LE(16, 16);
  silentWav.writeUInt16LE(1, 20);
  silentWav.writeUInt16LE(1, 22);
  silentWav.writeUInt32LE(sampleRate, 24);
  silentWav.writeUInt32LE(sampleRate * 2, 28);
  silentWav.writeUInt16LE(2, 32);
  silentWav.writeUInt16LE(16, 34);
  silentWav.write('data', 36);
  silentWav.writeUInt32LE(sampleCount * 2, 40);
  await page.route('**/*.mp3', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav })
  );
  await page.addInitScript(() => {
    const mediaElements = [];
    Object.defineProperty(window, '__nurAlDhikrMediaElements', { value: mediaElements });
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this.__key && !mediaElements.includes(this)) mediaElements.push(this);
      return nativePlay.apply(this, args);
    };
  });
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const surahTwoPlay = page.locator('[data-action="surah-play"][data-surah="2"]:visible');
  const playButton = (await surahTwoPlay.count())
    ? surahTwoPlay.first()
    : page.locator('[data-action="surah-play"]:visible').first();
  await expect(playButton).toBeVisible({ timeout: 20000 });
  await playButton.click();
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () =>
      window.__nurAlDhikrMediaElements?.some(
        (audio) => audio.__key && !audio.paused && !audio.ended && audio.currentTime >= 0.25
      ),
    null,
    { timeout: 20000 }
  );

  // Minimize → slim pill, session untouched.
  await page.locator('.player-bar--recite [data-action="player-min-toggle"]').first().click();
  await expect(page.locator('.player-bar--min')).toBeVisible({ timeout: 10000 });
  // Restore → full console back.
  await page.locator('.player-bar--min [data-action="player-min-toggle"]').click();
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 10000 });

  // Drop focus to the page body so Space reaches the player drills, not
  // a focused control (which keeps its native activate, by design).
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const counter = page.locator('.player-bar__ayah-counter').first();
  const before = await counter.textContent();
  // Space pauses and resumes.
  await page.keyboard.press(' ');
  await expect(
    page.locator('.player-bar--recite [data-action="recite-pause-toggle"]').first()
  ).toHaveAttribute('aria-label', /Play|تشغيل/, { timeout: 10000 });
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () =>
      window.__nurAlDhikrMediaElements?.some(
        (audio) => audio.__key && !audio.paused && !audio.ended && audio.currentTime >= 0.25
      ),
    null,
    { timeout: 20000 }
  );
  // ArrowLeft steps to the next ayah (mushaf order).
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => counter.textContent(), { timeout: 15000 }).not.toBe(before);
  // M mutes (chip presses in).
  await page.keyboard.press('m');
  await expect(page.locator('[data-action="audio-mute-toggle"]').first()).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 10000 }
  );
  await page.keyboard.press('m');

  // Explicitly start a fresh idle interval after the final keyboard activity.
  await page.mouse.move(300, 300);
  await expect(page.locator('body.player-idle')).toBeAttached({ timeout: 8000 });
  await page.mouse.move(300, 300);
  await expect(page.locator('body.player-idle')).toHaveCount(0, { timeout: 5000 });
  expect(pageErrors).toEqual([]);
});
