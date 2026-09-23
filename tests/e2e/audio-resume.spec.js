/**
 * e2e/audio-resume.spec.js — (NF03-RESUME) the interrupted batch comes
 * back after a reload: start Download All with stubbed MP3 bytes, reload
 * mid-batch, and the manager must offer an honest Resume (N left) instead
 * of amnesia. Resuming finishes the batch; the banner clears.
 */
import { test, expect } from '@playwright/test';

const FAKE_MP3 = Buffer.alloc(1024, 1);

test('audio resume: reload mid-batch offers resume, resume finishes', async ({ page }) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Every surah stream is 1KB of tagged MP3 bytes — downloadOne saves
  // anything non-empty with an audio MIME, so the batch runs at full
  // speed without network or disk pain.
  await page.route('**/*.mp3', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: FAKE_MP3 })
  );

  await page.goto('#/audio');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const reciter = page.locator('[data-action="audio-select-moshaf"]').first();
  await expect(reciter, 'reciter rows render').toBeVisible({ timeout: 20000 });
  await reciter.click();
  const playAll = page.locator('[data-action="audio-download-all"]').first();
  await expect(playAll, 'download-all renders after selection').toBeVisible({ timeout: 20000 });
  await playAll.click();

  // Let a few files land, then kill the page mid-batch.
  await expect
    .poll(async () => page.locator('.dl-cell--done').count(), { timeout: 30000 })
    .toBeGreaterThan(2);
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  // The resume banner names a positive remainder for the same moshaf.
  const banner = page.locator('.dl-resume').first();
  await expect(banner, 'resume banner rehydrates after reload').toBeVisible({ timeout: 20000 });
  const text = await banner.innerText();
  expect(text, `banner must name a remainder, saw: ${text}`).toMatch(/\d+/);

  // Resume runs the same Download All path to completion.
  await banner.locator('[data-action="audio-download-all"]').click();
  await expect
    .poll(async () => page.locator('.dl-cell--done').count(), { timeout: 120000 })
    .toBe(114);
  await expect(page.locator('.dl-resume')).toHaveCount(0, { timeout: 20000 });
  expect(pageErrors).toEqual([]);
});
