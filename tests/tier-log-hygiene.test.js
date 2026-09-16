/**
 * tests/tier-log-hygiene.test.js — (v5.2.87, P1-1) missing optional tiers
 * (seed/slim bundle, pruned install) warn instead of erroring, so the e2e
 * zero-console-error hygiene keeps catching real defects. Genuine failures
 * (timeouts, 5xx, offline stub, malformed documents) still error.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { isMissingResourceError, isTimeoutError } from '../js/app/net.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('tier log hygiene: 404 warns, real failures error', () => {
  test('isMissingResourceError classifies fetchJSON-shaped errors', () => {
    assert.equal(isMissingResourceError(new Error('Failed to fetch data/x.json: 404')), true);
    assert.equal(
      isMissingResourceError(new Error('Failed to fetch data/x.json: 404 ')),
      false,
      'trailing space is not the fetchJSON shape'
    );
    assert.equal(
      isMissingResourceError(new Error('Failed to fetch data/x.json: 500')),
      false,
      '5xx stays an error'
    );
    assert.equal(
      isMissingResourceError(new Error('Failed to fetch data/x.json: offline stub')),
      false,
      'offline stub stays an error'
    );
    assert.equal(isMissingResourceError(new Error('timeout of 15000ms exceeded')), false);
    assert.equal(isMissingResourceError(null), false);
    assert.equal(isMissingResourceError('Failed to fetch data/x.json: 404'), false);
    assert.equal(isMissingResourceError({ message: 'Failed to fetch data/x.json: 404' }), false);
  });

  test('isTimeoutError matches the fetch-guard abort shape only', () => {
    assert.equal(isTimeoutError(new Error('Timed out after 15000ms')), true);
    assert.equal(isTimeoutError(new Error('Timed out after 30000ms')), true);
    assert.equal(isTimeoutError(new Error('Failed to fetch data/x.json: 404')), false);
    assert.equal(isTimeoutError(new Error('timeout of 15000ms exceeded')), false);
    assert.equal(isTimeoutError(null), false);
  });

  test('isBulkAbortError matches intentional cancels only', async () => {
    const { isBulkAbortError } = await import('../js/app/net.js');
    const abort = new DOMException('The operation was aborted', 'AbortError');
    assert.equal(isBulkAbortError(abort), true);
    assert.equal(isBulkAbortError(new Error('Timed out after 15000ms')), false);
    assert.equal(isBulkAbortError(new Error('Failed to fetch data/x.json: 404')), false);
    assert.equal(isBulkAbortError(null), false);
    assert.equal(isBulkAbortError({ name: 'AbortError' }), true);
  });

  test('aborted signals reject fast with AbortError (bulk-cancel transport)', async () => {
    // The bulk builders pass AbortSignals into fetchJSON: a pre-aborted
    // signal must reject WITHOUT touching the network (no 15s timeout
    // hang) so a SEARCH exit releases in-flight chunks immediately. An
    // absolute URL proves no connection is attempted — rejection precedes
    // DNS/dial. loadSurahDoc's own threading is pinned by source below.
    const { fetchJSON } = await import('../js/app/net.js');
    const ctl = new AbortController();
    ctl.abort();
    const t0 = Date.now();
    await assert.rejects(
      fetchJSON('http://127.0.0.1:9/unused.json', { signal: ctl.signal }),
      (err) => {
        assert.equal(err?.name, 'AbortError');
        return true;
      }
    );
    assert.ok(Date.now() - t0 < 5000, 'rejects fast, never waits out the timeout');
  });

  test('bulk builders thread the abort signal and swallow cancels silently', () => {
    for (const [file, needs] of [
      ['js/app/quranSearch.js', ['quranBulkAbort', 'loadSurahDoc(n, signal)', 'isBulkAbortError']],
      [
        'js/app/tafsirSearch.js',
        ['tafsirBulkAbort', 'fetchJSON(TAFSIR_TEXT_URL(edition.id, n), { signal })'],
      ],
      ['js/app/stateSub.js', ['bulkViewWasSearch', 'quranBulkAbort', 'tafsirBulkAbort']],
    ]) {
      const src = readSrc(file);
      for (const m of needs) assert.ok(src.includes(m), `${file}: contains "${m}"`);
    }
  });

  test('every prunable lazy-tier catch demotes 404 to warn', () => {
    // Call sites that MUST branch on isMissingResourceError (core boot
    // tiers — quran meta/surah, mushaf meta/page — are never pruned, so a
    // 404 there still means a corrupt install and stays an error).
    for (const [file, markers] of [
      ['js/app/hadithData.js', ['index not bundled', 'book not bundled']],
      [
        'js/app/lazyData.js',
        [
          'word data not bundled',
          'dict not bundled',
          'root index not bundled',
          'full root index not bundled',
          'editions catalog not bundled',
          'practice pool not bundled',
          'text not bundled',
        ],
      ],
    ]) {
      const src = readSrc(file);
      assert.ok(src.includes('isMissingResourceError'), `${file}: uses the classifier`);
      for (const m of markers) {
        assert.ok(src.includes(m), `${file}: warns "${m}"`);
      }
    }
  });

  test('core boot tiers still error (never demoted)', () => {
    const src = readSrc('js/app/lazyData.js');
    assert.match(src, /console\.error\('\[quran\] failed to load meta'/);
    assert.match(src, /console\.error\('\[mushaf\] failed to load page index'/);
  });

  test('roots-full retry cools down instead of spamming per dispatch', async () => {
    const { ensureQuranRootsFull, ensureQuranRoots, ensureTafsirEditions, ensureTajweedPool } =
      await import('../js/app/lazyData.js');
    const { rt } = await import('../js/app/rt.js');
    const errors = [];
    const warns = [];
    const origErr = console.error;
    const origWarn = console.warn;
    console.error = (...a) => errors.push(a);
    console.warn = (...a) => warns.push(a);
    try {
      rt.quranRootsFullFetchStarted = false;
      rt.quranRootsFullCooldownUntil = Date.now() + 60_000;
      await ensureQuranRootsFull({ quranRootsFull: null });
      rt.quranRootsFetchStarted = false;
      rt.quranRootsCooldownUntil = Date.now() + 60_000;
      await ensureQuranRoots({ quranRoots: null });
      rt.tafsirEditionsFetchStarted = false;
      rt.tafsirEditionsCooldownUntil = Date.now() + 60_000;
      await ensureTafsirEditions({ tafsirEditions: null });
      rt.tajweedPoolFetchStarted = false;
      rt.tajweedPoolCooldownUntil = Date.now() + 60_000;
      await ensureTajweedPool({ tajweedPool: null });
      assert.equal(errors.length, 0, 'cooldown: no error logged');
      assert.equal(warns.length, 0, 'cooldown: no warn logged either');
      assert.equal(rt.quranRootsFullFetchStarted, false, 'cooldown: no full fetch started');
      assert.equal(rt.quranRootsFetchStarted, false, 'cooldown: no capped fetch started');
      assert.equal(rt.tafsirEditionsFetchStarted, false, 'cooldown: no editions fetch started');
      assert.equal(rt.tajweedPoolFetchStarted, false, 'cooldown: no pool fetch started');
    } finally {
      console.error = origErr;
      console.warn = origWarn;
      rt.quranRootsFullFetchStarted = false;
      rt.quranRootsFullCooldownUntil = 0;
      rt.quranRootsFetchStarted = false;
      rt.quranRootsCooldownUntil = 0;
      rt.tafsirEditionsFetchStarted = false;
      rt.tafsirEditionsCooldownUntil = 0;
      rt.tajweedPoolFetchStarted = false;
      rt.tajweedPoolCooldownUntil = 0;
    }
  });
});
