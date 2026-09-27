/**
 * tests/floating-counter.test.js — the floating counter (v5.17.15).
 *
 * The feature exists because azkar.me ships an Android overlay and we cannot:
 * "no build step, no app store" is a standing constraint (ADR 0002). The web
 * equivalent is Document Picture-in-Picture — arbitrary HTML, always on top,
 * no permission prompt, no native code.
 *
 * What is pinned here:
 *  1. The floating document renders standalone (it has no access to the app's
 *     stylesheet), escapes its label, and flips direction for Arabic.
 *  2. The feature gate is honest: no `documentPictureInPicture` means the
 *     affordance is hidden, never offered-and-broken.
 *  3. Failure is surfaced, never swallowed — a refused request returns a
 *     reason the caller can show, and never leaves a stale window behind.
 *  4. The control is wired end to end: emitted, handled, allowlisted.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  floatingCounterHTML,
  isSupported,
  isOpen,
  openFloatingCounter,
  updateFloatingCounter,
  closeFloatingCounter,
} from '../js/services/floatingCounter.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const hadWindow = 'window' in globalThis;
const prevWindow = globalThis.window;

const withWindow = (fake, fn) => {
  globalThis.window = fake;
  try {
    return fn();
  } finally {
    if (hadWindow) globalThis.window = prevWindow;
    else delete globalThis.window;
  }
};

describe('the floating document is standalone and safe', () => {
  test('it carries its own stylesheet — the app CSS is not in scope there', () => {
    const html = floatingCounterHTML({ label: 'SubhanAllah', count: 3, target: 33, lang: 'en' });
    assert.match(html, /<style>/, 'inline styles present');
    assert.match(html, /prefers-color-scheme: dark/, 'and they answer the OS theme');
    assert.doesNotMatch(html, /var\(--/, 'no design tokens, which do not exist in that document');
  });

  test('it shows count over target and the phrase name', () => {
    const html = floatingCounterHTML({ label: 'Alhamdulillah', count: 7, target: 33, lang: 'en' });
    assert.match(html, /7 \/ 33/, 'count over target');
    assert.match(html, /Alhamdulillah/, 'phrase name');
  });

  test('a hostile phrase name cannot inject markup', () => {
    const html = floatingCounterHTML({
      label: '<img src=x onerror=alert(1)>',
      count: 1,
      target: 2,
      lang: 'en',
    });
    assert.doesNotMatch(html, /<img/, 'no live element is created');
    assert.match(html, /&lt;img/, 'the text is escaped, not executed');
  });

  test('direction follows the app language, never the document', () => {
    const en = floatingCounterHTML({ label: 'X', count: 0, target: 1, lang: 'en' });
    const arb = floatingCounterHTML({ label: 'س', count: 0, target: 1, lang: 'ar' });
    assert.match(en, /dir="ltr"/);
    assert.match(arb, /dir="rtl"/);
    assert.match(arb, /nur-float--rtl/, 'and the Arabic class rides along');
  });

  test('the count is tabular so digits do not jitter as it climbs', () => {
    const html = floatingCounterHTML({ label: 'X', count: 8, target: 33, lang: 'en' });
    assert.match(html, /tabular-nums/, 'tabular figures');
  });
});

describe('the feature gate is honest', () => {
  test('no API means not supported', () => {
    assert.equal(
      withWindow({}, () => isSupported()),
      false
    );
    assert.equal(
      withWindow({ documentPictureInPicture: {} }, () => isSupported()),
      false
    );
  });

  test('a real API means supported', () => {
    const ok = withWindow({ documentPictureInPicture: { requestWindow: () => {} } }, () =>
      isSupported()
    );
    assert.equal(ok, true);
  });

  test('the view hides the affordance rather than offering a dead control', () => {
    const src = readFileSync(join(ROOT, 'js/views/tasbih.js'), 'utf8');
    assert.match(
      src,
      /floatingCounterSupported\(\)\s*\?/,
      'the button is gated on the feature check'
    );
  });
});

describe('opening, updating and closing never lie', () => {
  test('an unsupported browser returns a reason instead of throwing', async () => {
    const result = await withWindow({}, () =>
      openFloatingCounter({ label: 'X', count: 0, target: 33, lang: 'en' })
    );
    assert.deepEqual(result, { ok: false, reason: 'unsupported' });
  });

  test('a refused request is reported, and leaves no window behind', async () => {
    globalThis.window = {
      documentPictureInPicture: {
        requestWindow: async () => {
          throw new Error('denied');
        },
      },
    };
    try {
      const result = await openFloatingCounter({ label: 'X', count: 0, target: 33, lang: 'en' });
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'refused');
      assert.equal(isOpen(), false, 'no orphan window is left open');
    } finally {
      if (hadWindow) globalThis.window = prevWindow;
      else delete globalThis.window;
    }
  });

  test('updating a closed window is a no-op, not an error', () => {
    assert.equal(updateFloatingCounter({ label: 'X', count: 1, target: 2, lang: 'en' }), false);
    assert.equal(closeFloatingCounter(), false, 'closing nothing is not a failure');
  });
});

describe('the control is wired end to end', () => {
  test('emitted by the view and handled', () => {
    const view = readFileSync(join(ROOT, 'js/views/tasbih.js'), 'utf8');
    const handlers = readFileSync(join(ROOT, 'js/app/handlers/tasbih.js'), 'utf8');
    assert.match(view, /data-action="tasbih-float"/, 'the view emits it');
    assert.match(handlers, /'tasbih-float':/, 'a handler exists');
  });

  test('it is in the dead-action allowlist', () => {
    const reorg = readFileSync(join(ROOT, 'tests/mushaf-reorg.test.js'), 'utf8');
    assert.match(reorg, /'tasbih-float'/, 'allowlisted, so the orphan gate knows about it');
  });

  test('the module is precached — an offline session still gets a floating counter', () => {
    const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
    assert.match(sw, /js\/services\/floatingCounter\.js/, 'in APP_SHELL');
  });

  test('pressed state is ephemeral UI state, never persisted', () => {
    const initial = readFileSync(join(ROOT, 'js/core/state/initial.js'), 'utf8');
    assert.match(initial, /tasbihFloat: false/, 'defaults off');
    const actions = readFileSync(join(ROOT, 'js/core/state/actions.js'), 'utf8');
    assert.match(actions, /tasbihFloatSet/, 'and has an action');
  });

  test('the button state follows state, not the service, so the view stays pure', () => {
    const view = readFileSync(join(ROOT, 'js/views/tasbih.js'), 'utf8');
    assert.match(
      view,
      /aria-pressed="\$\{state\.ui\?\.tasbihFloat === true\}"/,
      'pressed is read from state'
    );
  });

  test('every user-facing string exists in both languages', () => {
    for (const key of ['tasbih.float', 'tasbih.floatUnsupported', 'tasbih.floatFailed']) {
      assert.ok(en[key], `EN: ${key}`);
      assert.ok(ar[key], `AR: ${key}`);
    }
    assert.notEqual(en['tasbih.floatFailed'], ar['tasbih.floatFailed']);
  });

  test('the label comes from the same presets the view uses', () => {
    const subs = readFileSync(join(ROOT, 'js/app/stateSub.js'), 'utf8');
    assert.match(subs, /TASBIH_PRESETS/, 'one source of truth for phrase names');
  });
});
