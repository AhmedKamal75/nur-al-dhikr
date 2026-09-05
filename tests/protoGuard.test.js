/**
 * tests/protoGuard.test.js — prototype-pollution regression tests (S3).
 *
 * A crafted backup / hand-edited localStorage passes through
 * sanitizeRestoredPayload, sanitizeSettings (contentPrefs) and
 * normalizeCustomContentMap. Every map key copied with `out[k] = …` is a
 * pollution sink for `__proto__`/`constructor`/`prototype` — the charset
 * allowlists (SAFE_ID_RE et al.) all still match `__proto__`, so the
 * dedicated isSafeKey() guard must drop those keys. These tests pin that.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { isSafeKey, cleanObject } from '../js/core/utils.js';
import { sanitizeSettings } from '../js/core/config.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { normalizeCustomContentMap } from '../js/core/schema.js';
import { buildItemIndex } from '../js/app/net.js';
import { lensLibrary } from '../js/domain/contentLens.js';

/** The pollution oracle: no own `__proto__` key anywhere, prototype intact. */
function assertUnpolluted(obj) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(obj, '__proto__'),
    false,
    'no __proto__ own key may survive sanitizing'
  );
  assert.equal({}.polluted, undefined, 'Object.prototype must not be polluted');
}

describe('isSafeKey / cleanObject primitives', () => {
  test('isSafeKey rejects prototype keys, accepts normal ids', () => {
    assert.equal(isSafeKey('__proto__'), false);
    assert.equal(isSafeKey('constructor'), false);
    assert.equal(isSafeKey('prototype'), false);
    assert.equal(isSafeKey('morning'), true);
    assert.equal(isSafeKey('adh-mor-010'), true);
    assert.equal(isSafeKey(42), false);
  });

  test('cleanObject drops hostile keys and copies the rest', () => {
    const out = cleanObject(JSON.parse('{"__proto__":{"x":1},"a":1}'));
    assert.deepEqual(out, { a: 1 });
    assertUnpolluted(out);
  });
});

describe('S3: restore path drops prototype keys', () => {
  test('sanitizeRestoredPayload: counters / favoriteCategories / hifzProfileStore', () => {
    const out = sanitizeRestoredPayload({
      counters: JSON.parse('{"__proto__":{"count":999},"c1":{"count":5,"target":10}}'),
      statistics: {
        favoriteCategories: JSON.parse('{"__proto__":7,"morning":3}'),
      },
      hifzProfileStore: JSON.parse('{"__proto__":{},"second":{}}'),
    });
    assert.equal(out.counters.c1.count, 5);
    assert.deepEqual(out.statistics.favoriteCategories, { morning: 3 });
    assert.deepEqual(Object.keys(out.hifzProfileStore), ['second']);
    assertUnpolluted(out.counters);
    assertUnpolluted(out.statistics.favoriteCategories);
    assertUnpolluted(out.hifzProfileStore);
  });

  test('sanitizeRestoredPayload: passthrough slices carry no __proto__', () => {
    const out = sanitizeRestoredPayload({
      quranWords: JSON.parse('{"__proto__":1,"1":[]}'),
      tasbih: JSON.parse('{"__proto__":1}'),
      ramadanLog: JSON.parse('{"__proto__":1}'),
      dailyChecklist: JSON.parse('{"__proto__":1}'),
    });
    for (const slice of [out.quranWords, out.tasbih, out.ramadanLog, out.dailyChecklist]) {
      assertUnpolluted(slice);
    }
  });

  test('sanitizeSettings: contentPrefs cleaners drop prototype keys', () => {
    const s = sanitizeSettings({
      contentPrefs: {
        hiddenItems: JSON.parse('{"__proto__":true,"ok":true}'),
        targetOverrides: JSON.parse('{"__proto__":5,"goal":5}'),
        orderOverrides: JSON.parse('{"__proto__":["x"],"cat":["a"]}'),
        itemOverrides: JSON.parse('{"__proto__":{"arabic":"x"}}'),
        libraryOrderOverrides: ['__proto__', 'lib-a'],
        addedItems: JSON.parse('{"__proto__":[]}'),
        hadithPrefs: {
          hiddenBooks: JSON.parse('{"__proto__":true,"bukhari":true}'),
          orderBooks: ['__proto__', 'bukhari'],
        },
      },
    });
    const cp = s.contentPrefs;
    assert.deepEqual(cp.hiddenItems, { ok: true });
    assert.deepEqual(cp.targetOverrides, { goal: 5 });
    assert.deepEqual(cp.orderOverrides, { cat: ['a'] });
    assert.deepEqual(cp.itemOverrides, {});
    assert.deepEqual(cp.libraryOrderOverrides, ['lib-a']);
    assert.deepEqual(cp.addedItems, {});
    assert.deepEqual(cp.hadithPrefs.hiddenBooks, { bukhari: true });
    assert.deepEqual(cp.hadithPrefs.orderBooks, ['bukhari']);
    for (const slice of [
      cp.hiddenItems,
      cp.targetOverrides,
      cp.orderOverrides,
      cp.itemOverrides,
      cp.addedItems,
      cp.hadithPrefs.hiddenBooks,
    ]) {
      assertUnpolluted(slice);
    }
  });

  test('normalizeCustomContentMap drops libraries with hostile ids', () => {
    const map = normalizeCustomContentMap(
      JSON.parse(
        '{"__proto__":{"metadata":{"id":"__proto__"},"categories":[]},"lib-a":{"metadata":{"id":"lib-a"},"categories":[]}}'
      )
    );
    assert.deepEqual(Object.keys(map), ['lib-a']);
    assertUnpolluted(map);
  });

  test('buildItemIndex and lensLibrary skip hostile ids', () => {
    const good = { id: 'lib-a', categories: [{ items: [{ id: '__proto__' }, { id: 'it-1' }] }] };
    const index = buildItemIndex({}, { goodLib: good });
    assert.ok(index['it-1']);
    assertUnpolluted(index);
    const lensed = lensLibrary(
      {
        'lib-a': { metadata: { id: 'lib-a' }, categories: [] },
      },
      [],
      {}
    );
    assert.deepEqual(Object.keys(lensed.documents), ['lib-a']);
  });
});
