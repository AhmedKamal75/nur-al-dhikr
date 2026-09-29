import { test, expect } from '@playwright/test';

/**
 * sw-update.spec.js — the app must be able to TELL the reader it updated.
 *
 * THE FAILURE THIS PINS
 *
 * `sw.js` deliberately has no `skipWaiting()`: a freshly installed worker goes
 * to `waiting` and the old one keeps serving cached bytes until every tab
 * closes. That is correct for a worship app — nobody should have the shell
 * swap mid-verse — but it means a reader can sit on an old build for a long
 * time and see an app that looks like it went backwards.
 *
 * The remedy already exists in `js/app/triggers.js` (`offerUpdate`): a
 * persistent toast with a Refresh action that posts `SKIP_WAITING` and reloads
 * on `controllerchange`. **Nothing tested it.** A flow with no test is a flow
 * that rots silently, and the one place it can rot is precisely the moment a
 * reader is most confused.
 *
 * This does not rebuild the flow. It proves the pieces exist, are wired
 * together, and exist in both languages.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test.describe('the update path is wired and proven', () => {
  test('a waiting worker is offered, and taking it reloads the app', async ({ page }) => {
    // Stand in for a service worker that has installed and is waiting. We do
    // not need a real one: what is under test is the app's response to
    // `registration.waiting` plus a controller, which is the exact condition
    // `offerUpdate` guards on.
    await page.addInitScript(() => {
      const listeners = {};
      const worker = {
        postMessage(msg) {
          (listeners.__posted ||= []).push(msg);
        },
        state: 'installed',
      };
      const registration = {
        waiting: worker,
        installing: null,
        addEventListener: (t, fn) => {
          listeners[t] = fn;
        },
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: {},
          addEventListener: (t, fn) => {
            listeners[t] = fn;
          },
          register: () => Promise.resolve(registration),
          getRegistration: () => Promise.resolve(registration),
          getRegistrations: () => Promise.resolve([registration]),
        },
      });
      window.__swListeners = listeners;
    });

    await page.goto('./#/');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 25000 });

    // The notice must PERSIST: an update that auto-dismisses is an update
    // nobody ever sees.
    const toast = page.locator('#toast-root >> text=/new version|إصدار جديد/i');
    await expect(toast).toBeVisible({ timeout: 20000 });

    // And taking it must actually hand over.
    await page.locator('#toast-root button').last().click();
    const posted = await page.evaluate(() => window.__swListeners.__posted || []);
    expect(posted, 'the refresh must hand the worker SKIP_WAITING').toContain('SKIP_WAITING');
  });

  test('the deferral itself is still deliberate', () => {
    // If someone "fixes" the staleness by adding skipWaiting() to the install
    // handler, a reader mid-recitation gets the shell swapped under them. That
    // trade is the entire reason the toast exists.
    //
    // Asserted as a RULE rather than by pattern-matching the install block:
    // comments are stripped (sw.js:304 literally reads "No skipWaiting() here,
    // deliberately", and a grep matches its own explanation of the absence),
    // and the claim is that skipWaiting is reachable ONLY on explicit request.
    const code = read('sw.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const calls = code.match(/self\.skipWaiting\(\)/g) || [];
    expect(calls.length, 'skipWaiting must be callable from exactly one place').toBe(1);
    // That one place is the message handler, not install or activate.
    const msgIdx = code.indexOf("event.data === 'SKIP_WAITING'");
    const callIdx = code.indexOf('self.skipWaiting()');
    expect(msgIdx, 'the SKIP_WAITING branch should exist').toBeGreaterThan(-1);
    expect(
      callIdx - msgIdx,
      'the only skipWaiting call must be the SKIP_WAITING branch'
    ).toBeLessThan(80);
  });

  test('the message the worker answers is the message the app sends', () => {
    // Two halves of a contract, in two files, with no test between them until
    // now. A rename on one side would leave the app silently unable to update.
    const sw = read('sw.js');
    const app = read('js/app/triggers.js');
    expect(sw).toContain("event.data === 'SKIP_WAITING'");
    expect(app).toContain("postMessage('SKIP_WAITING')");
  });

  test('the notice and its action exist in both languages', () => {
    const en = read('js/core/i18n/en.js');
    const ar = read('js/core/i18n/ar.js');
    for (const key of ['update.available', 'update.refresh']) {
      expect(en, `${key} missing in EN`).toContain(`'${key}'`);
      expect(ar, `${key} missing in AR`).toContain(`'${key}'`);
    }
    // The Arabic action said "update now" while the behaviour is a reload of
    // the waiting worker; both are defensible, but they must not be empty.
    expect(ar).toMatch(/'update\.refresh':\s*'[^']+'/);
  });

  test('the offer is guarded on a controller, so a first install is silent', () => {
    // A brand-new reader has nothing to update to. Offering them a refresh
    // would be noise on the very first run.
    const app = read('js/app/triggers.js');
    expect(app).toMatch(/if \(!navigator\.serviceWorker\.controller\) return;/);
  });
});
