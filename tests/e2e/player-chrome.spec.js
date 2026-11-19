/**
 * e2e/player-chrome.spec.js — (v5.12.0) one player, every side: minimize /
 * restore keeps the session, Space / arrows / M drive it, and the bar
 * fades after 5s idle and returns on activity.
 */
import { test, expect } from '@playwright/test';

/**
 * A valid, silent WAV keeps this chrome test independent of third-party CDN
 * uptime. It exercises the real media element and state machine without
 * embedding or playing Qur'an audio as test data.
 */
function silentWav(durationSeconds = 120) {
  const channels = 1;
  const sampleRate = 8000;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = sampleRate * blockAlign * durationSeconds;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * blockAlign, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  return wav;
}

test('player chrome: minimize, keys, idle fade keep one session', async ({ page }) => {
  // (v5.17.2, matrix) fixed sleeps alone total ~9s plus long polls; triple
  // the budget for loaded matrix workers. Assertions unchanged.
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // The chrome contract should not fail because a public streaming mirror
  // is down, CORS changes, or a CI browser cannot reach the CDN. Fulfill only
  // the known verse-audio hosts with silence; all app/data requests are real.
  const mediaFixture = silentWav();
  const fulfillSilentMedia = (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: mediaFixture,
    });
  await page.route('https://cdn.islamic.network/quran/audio/**', fulfillSilentMedia);
  await page.route('https://everyayah.com/data/**', fulfillSilentMedia);

  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);
  const play = page.locator('[data-action="surah-play"][data-surah="2"]').first();
  await expect(play, 'the intended surah-play control is present').toBeVisible({
    timeout: 20000,
  });
  // Use real browser input: element.click() from page.evaluate() does not
  // grant transient user activation in Firefox/WebKit and media.play() may
  // be rejected, causing the correctly-failed session UI to disappear.
  await play.click();
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });

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

  // Idle fade: 5s of quiet dims the bar; motion wakes it.
  await page.waitForTimeout(5600);
  await expect(page.locator('body.player-idle')).toBeAttached({ timeout: 5000 });
  await page.mouse.move(300, 300);
  await expect(page.locator('body.player-idle')).toHaveCount(0, { timeout: 5000 });
  expect(pageErrors).toEqual([]);
});
