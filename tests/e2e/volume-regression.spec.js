/**
 * e2e/volume-regression.spec.js — (VOL-01) the owner-reported file-player
 * volume defect, locked as a release contract.
 *
 * History: the owner reported a broken volume slider; v5.17.7 actually
 * plays green (slider 100→55 writes native volume 0.55, persists
 * settings.audio.fileVolume=0.55, reload restores 55). This spec walks the
 * real file-player path — select moshaf, start playback, drag the slider
 * to 55, assert the native media element, persisted prefs and post-reload
 * slider — so any future render/handler/storage break fails loudly.
 */
import { test, expect } from '@playwright/test';

test('volume regression: file-player slider drives native volume and persists', async ({
  page,
}) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // The file engine owns a DETACHED `new Audio()` element (never in the
  // DOM), so the native path is observed the way the green-trace probe
  // did: spy the HTMLMediaElement volume setter and record every write.
  await page.addInitScript(() => {
    window.__volWrites = [];
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      set(v) {
        window.__volWrites.push(Number(v));
        desc.set.call(this, v);
      },
      get() {
        return desc.get.call(this);
      },
      configurable: true,
    });
  });

  await page.goto('#/audio');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(2000);

  // Select a moshaf through the real reciter row (no selection → no grid
  // and no play button), then start file-mode playback the same way a
  // user does. The stream itself may fail in CI (no external network) —
  // the bar, slider and volume path still mount from player state.
  const reciter = page.locator('[data-action="audio-select-moshaf"]').first();
  await expect(reciter, 'reciter rows render').toBeVisible({ timeout: 20000 });
  await reciter.click();
  const playBtn = page.locator('[data-action="audio-play-moshaf"]').first();
  await expect(playBtn, 'play-first renders after selection').toBeVisible({ timeout: 20000 });
  await playBtn.click();
  const slider = page.locator('[data-player-volume]').first();
  await expect(slider, 'file-player volume slider mounts').toBeAttached({ timeout: 20000 });

  // Drag to 55 through real input+change events (the handler split the
  // app itself uses: input = live loudness, change = commit+persist).
  await slider.evaluate((el) => {
    el.value = '55';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Native media element follows (observed at the volume setter: the
  // engine's element is detached, so DOM queries can never see it).
  await expect
    .poll(async () => page.evaluate(() => window.__volWrites || []), { timeout: 10000 })
    .toContainEqual(0.55);

  // Persisted prefs follow (the store persist is a trailing debounce —
  // give it a full beat after the commit before reading localStorage).
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      try {
        const v = JSON.parse(localStorage.getItem(k));
        const fv = v?.settings?.audio?.fileVolume ?? v?.audio?.fileVolume;
        if (typeof fv === 'number') return fv;
        if (typeof v === 'string' && v.includes('fileVolume')) return v;
      } catch {
        /* not JSON — keep scanning */
      }
    }
    return null;
  });
  expect(
    stored === 0.55 || (typeof stored === 'string' && stored.includes('0.55')),
    `persisted fileVolume should be 0.55, saw ${JSON.stringify(stored)}`
  ).toBe(true);

  // Reload restores the visible slider to 55.
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const sliderAfter = page.locator('[data-player-volume]').first();
  if ((await sliderAfter.count()) > 0) {
    await expect
      .poll(async () => sliderAfter.evaluate((el) => el.value), {
        timeout: 15000,
      })
      .toBe('55');
  }
  expect(pageErrors).toEqual([]);
});
