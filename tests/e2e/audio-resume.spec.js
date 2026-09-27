/**
 * e2e/audio-resume.spec.js — (NF03-RESUME) the interrupted batch comes
 * back after a reload: start Download All with stubbed MP3 bytes, reload
 * mid-batch, and the manager must offer an honest Resume (N left) instead
 * of amnesia. Resuming finishes the batch; the banner clears.
 */
import { test, expect } from '@playwright/test';

const FAKE_MP3 = Buffer.alloc(1024, 1);

test('audio resume: reload mid-batch offers resume, resume finishes', async ({ page }) => {
  // (v5.17.16) This spec drives a REAL 114-file batch through IndexedDB.
  // In isolation it finishes in ~25s; under four parallel e2e workers on a
  // shared python server it can take minutes. test.slow() only triples the
  // 30s default to 90s, which is not enough for the batch and made this the
  // suite's one recurring red — a timeout artefact, not a product failure.
  // The budget is stated here rather than hidden in a retry.
  test.setTimeout(600_000);
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
  //
  // The completion signal is the app's OWN: while a batch runs the actions
  // row shows a Stop button instead of Download All, and the panel header
  // prints `done / 114`. Waiting on those is both stronger and steadier
  // than polling a raw cell count against a wall-clock budget.
  //
  // Two wrong signals were tried and removed, and the reason is worth
  // keeping: (a) `.dl-cell` is NOT the surah total — the view renders TWO
  // 114-cell grids by design, 228 cells in total; (b) the resume banner
  // clears when the batch STARTS (it is suppressed by `batchRunning`), not
  // when it finishes, so waiting on it proved nothing and produced a
  // "52 / 114" false failure under parallel load.
  const surahTotal = 114;
  await banner.locator('[data-action="audio-download-all"]').click();
  await expect
    .poll(async () => page.locator('.dl-cell--done').count(), { timeout: 30000 })
    .toBeGreaterThan(2);
  await expect(
    page.locator('[data-action="audio-batch-stop"]'),
    'the running batch offers a way to stop it'
  ).toHaveCount(1, { timeout: 20000 });
  await expect(
    page.locator('[data-action="audio-batch-stop"]'),
    'the batch finished: Stop is gone'
  ).toHaveCount(0, { timeout: 300000 });
  // The app's own counter is the final word.
  // The app's own counter is the final word — scoped to the SURAH download
  // panel. The page has two `.panel--dl` sections by design (surah files, then
  // verse packs), so an unscoped `.chip__count` is ambiguous; the download
  // panel is the one carrying the batch actions.
  const dlPanel = page
    .locator('.panel--dl')
    .filter({ has: page.locator('[data-action="audio-download-all"]') });
  await expect(dlPanel.locator('.chip__count').first()).toHaveText(
    new RegExp(`${surahTotal}\\s*/\\s*${surahTotal}`),
    { timeout: 30000 }
  );
  await expect(page.locator('.dl-resume')).toHaveCount(0, { timeout: 20000 });
  expect(pageErrors).toEqual([]);
});
