/**
 * e2e/overhaul-audio-mirror.spec.js — (AUDIO-01) real-browser fallback trace.
 *
 * Failure-injects the ayah-audio mirror chain inside real Chromium:
 * candidate[0] (128kbps) -> HTTP 404, candidate[1] (64kbps) -> network
 * abort (CORS/network failure shape), candidate[2] (EveryAyah mirror) ->
 * 200 audio/mpeg. The page then walks the chain with fetch() and must
 * land on the mirror. This proves the 128-fails → 64-fails → mirror
 * ordering in a real engine; it does NOT claim <audio> decoded output
 * (the stub bytes are not decodable audio).
 */
import { test, expect } from '@playwright/test';

const FAKE_MP3 = Buffer.alloc(2048, 1);

test('AUDIO-01 mirror chain: 128 fails, 64 fails, mirror succeeds', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });

  const chain = await page.evaluate(async () => {
    const mod = await import('./js/services/surahPlayback.js');
    return mod.verseAudioCandidates('ar.alafasy', 112, 1, 6222);
  });
  expect(chain.length, 'chain has primary + mirror + tertiary').toBeGreaterThanOrEqual(3);

  await page.route(chain[0], (route) => route.fulfill({ status: 404, body: 'nope' }));
  await page.route(chain[1], (route) => route.abort('failed'));
  await page.route(chain[2], (route) =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: FAKE_MP3 })
  );

  const walked = await page.evaluate(async (urls) => {
    let firstStatus = null;
    let secondFailed = false;
    for (let i = 0; i < urls.length; i += 1) {
      try {
        const res = await fetch(urls[i]);
        if (i === 0) firstStatus = res.status;
        if (res.ok) return { landed: i, url: urls[i], firstStatus, secondFailed };
      } catch {
        if (i === 1) secondFailed = true;
      }
    }
    return { landed: -1, url: null, firstStatus, secondFailed };
  }, chain);

  expect(walked.firstStatus, '128kbps fails with 404').toBe(404);
  expect(walked.secondFailed, '64kbps fails at network level').toBe(true);
  expect(walked.landed, 'engine lands on the mirror').toBe(2);
  expect(walked.url, 'mirror URL is the EveryAyah tertiary').toContain('everyayah.com');
});
