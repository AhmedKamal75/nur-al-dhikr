/**
 * e2e/races.spec.js — B1 at UI level: two rapid play taps on different
 * surahs must leave exactly one track playing and zero failure toasts.
 * Audio bytes are synthesized silence fulfilled locally, so the spec is
 * hermetic (no CDN) and deterministic in headless Chromium.
 *
 * NOTE (future work): a reload-inside-the-adhan-window e2e needs an
 * app-exposed time seam; the scheduler dedup itself is pinned at unit
 * level by tests/ramadan-dedup.test.js (reload simulation included).
 */
import { test, expect } from '@playwright/test';

function silenceWav() {
  const samples = 800;
  const buf = Buffer.alloc(44 + samples);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(8000, 24); // 8kHz
  buf.writeUInt32LE(8000, 28); // byte rate
  buf.writeUInt16LE(1, 32); // block align
  buf.writeUInt16LE(8, 34); // 8-bit
  buf.write('data', 36);
  buf.writeUInt32LE(samples, 40);
  buf.fill(128, 44); // digital silence
  return buf;
}

test('race: double-tap across surahs leaves one track, no ghost error', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.route('**/*.mp3', (route) =>
    route.fulfill({ contentType: 'audio/wav', body: silenceWav() })
  );

  await page.goto('#/quran');
  const rows = page.locator('[data-action="quran-play-surah"]');
  await expect(rows.first()).toBeVisible({ timeout: 20000 });
  const bar = page.locator('.player-bar');
  const surahLabel = page.locator('.player-bar__surah');

  await rows.nth(0).click();
  await expect(bar).toBeVisible({ timeout: 20000 });
  const first = await surahLabel.textContent();
  // Synchronous multi-tap in ONE task: every handler reaches the player's
  // IndexedDB await together, forcing the interleave that spaced-out
  // clicks only produce by luck.
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-action="quran-play-surah"]')];
    btns.slice(1, 4).forEach((b) => b.click());
  });
  // The last winner's track replaces the first in the bar…
  await expect.poll(async () => surahLabel.textContent(), { timeout: 20000 }).not.toBe(first);
  // …and the superseded calls stay silent: no failure toast either way.
  // Short window on purpose: the assertive toast auto-dismisses at 2200ms,
  // so a late assertion would miss the ghost it is meant to catch.
  await page.waitForTimeout(1200);
  await expect(page.locator('#toast-root [role="alert"]')).toHaveCount(0);
  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  expect(pageErrors, `uncaught exceptions: ${pageErrors.join('\n')}`).toEqual([]);
});
