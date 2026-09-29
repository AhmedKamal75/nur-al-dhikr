import { test, expect } from '@playwright/test';
// (v5.17.45) This spec genuinely exercises the service worker, so it opts
// back in to the suite-wide block in playwright.config.js. Everything else
// runs with the worker off, so a test always sees the working tree.
test.use({ serviceWorkers: 'allow' });

/**
 * offline-essentials.spec.js — the "works offline" promise, executed.
 *
 * Unit tests pin the guard logic; this pins the reader's actual
 * experience: open the app with a wiped cache, let the essentials batch
 * run, then cut the network and read the Qur'an and the mushaf.
 *
 * This is the claim the About screen makes, so the test asserts the claim
 * rather than the mechanism.
 */
const KEY = 'nurAlDhikr:v2:state';

/**
 * The harness turns the background prefetch OFF for every spec (see
 * playwright.config.js) because ~1,400 requests per context starves the one
 * static server these tests share. This spec is where the prefetch must
 * actually run, so it opts back in.
 *
 * Once per TAB, not per navigation: addInitScript re-runs on every reload,
 * and re-seeding would silently undo the switch test, which turns the pref
 * off and then reloads to prove it stayed off. sessionStorage is the honest
 * place for that "already done" flag — it is per-tab and survives reloads.
 */
async function optIntoPrefetch(context) {
  await context.addInitScript((key) => {
    try {
      if (sessionStorage.getItem('prefetch-opt-in')) return;
      sessionStorage.setItem('prefetch-opt-in', '1');
      const raw = localStorage.getItem(key);
      const state = raw ? JSON.parse(raw) : {};
      state.settings = { ...(state.settings || {}), offlineEssentialsAuto: true };
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* the app default is already on */
    }
  }, KEY);
}

test.describe('offline essentials', () => {
  // Serial: both tests drive the real ~1,400-file batch. Run concurrently
  // they contend for one static server and each one's completion wait blows
  // its own budget — a contention artefact, not a product failure.
  test.describe.configure({ mode: 'serial' });

  test('Qur’an and mushaf open with no network after the first run', async ({ page, context }) => {
    await optIntoPrefetch(context);

    // The batch is ~1,400 real file fetches. The default 30s (and even
    // test.slow()'s 90s) is a budget for a page transition, not for a
    // cold install of the corpus.
    test.setTimeout(420_000);

    // Start from nothing: no corpus in any cache, so the first visit has to
    // earn the data the way a real reader's phone does.
    await page.goto('./#/home');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
    await page.waitForTimeout(1500);

    // The Offline screen is the only place a reader can see what is stored,
    // so assert the batch actually recorded completion there.
    await page.goto('./#/offline');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await expect(page.locator('#main')).toContainText(/offline|connection|download/i, {
      timeout: 30000,
    });

    // Wait for the essentials rows to report done. The batch is ~1,400
    // small files; give it room on a loaded box.
    const stored = await page
      .waitForFunction(
        () => {
          // Literal, not the Node-scope KEY: this body runs inside the page,
          // where KEY does not exist. A ReferenceError here is swallowed by
          // the .catch below and reads as "the batch never finished".
          const raw = localStorage.getItem('nurAlDhikr:v2:state');
          if (!raw) return false;
          const s = JSON.parse(raw);
          const off = s?.settings?.offline || {};
          const q = off.quran;
          const m = off.mushaf;
          return q && m && Number(q.total) > 0 && q.done === q.total && m.done === m.total;
        },
        null,
        { timeout: 300000, polling: 1000 }
      )
      .then(() => true)
      .catch(() => false);
    expect(stored, 'the essentials batch must record both groups as complete').toBe(true);

    // Now the real assertion: cut the network entirely and read.
    await context.setOffline(true);
    // A concrete surah, not the bare index route: #/quran with no id is a
    // picker, so "did the text load" is unanswerable there.
    await page.goto('./#/quran?id=112');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
    // No "couldn't load" state may be on screen.
    await expect(page.locator('#main')).not.toContainText(
      /couldn['’]?t load|check your connection/i,
      {
        timeout: 20000,
      }
    );
    // Proof of real text, not a shell: every word in the verse is an
    // interactive node built from cached scripture, so their presence means
    // the payload was served from disk with no network at all.
    await expect(page.locator('[data-action="word-tap"]').first()).toBeVisible({ timeout: 20000 });
    const words = await page.locator('[data-action="word-tap"]').count();
    expect(words, 'the offline reader must render real verse text').toBeGreaterThan(0);

    await page.goto('./#/mushaf?page=2');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
    await expect(page.locator('#main')).not.toContainText(
      /couldn['’]?t load|check your connection/i,
      {
        timeout: 20000,
      }
    );
    await context.setOffline(false);
  });

  test('the switch is present, on by default, and bilingual', async ({ page, context }) => {
    // This test is ABOUT the default being on, so it cannot run under the
    // harness opt-out — it has to start from what a real reader gets.
    await optIntoPrefetch(context);
    await page.goto('./#/offline');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    const sw = page.locator('[data-action="offline-toggle-essentials-auto"]');
    await expect(sw).toHaveCount(1);
    await expect(sw).toBeChecked();

    // The label must be readable in the language the reader is actually
    // using — a switch only the developer can find is not discoverable.
    await expect(page.locator('#main')).toContainText('Keep the Qur’an ready offline');
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('nurAlDhikr:v2:state') || '{}');
      raw.settings = { ...raw.settings, language: 'ar' };
      localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify(raw));
    });
    await page.reload();
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await expect(page.locator('#main')).toContainText('إبقاء القرآن جاهزًا للعمل دون اتصال');

    // Flip it and prove the preference survives a reload. The switch input is
    // opacity:0 by design, so it needs force — the same call every other
    // switch in this suite makes.
    await sw.uncheck({ force: true });
    await expect(sw).not.toBeChecked({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await expect(page.locator('[data-action="offline-toggle-essentials-auto"]')).not.toBeChecked();
  });
});
