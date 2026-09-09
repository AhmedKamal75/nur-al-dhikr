/**
 * offline-library.test.js — one-tap offline downloads: inventory shape,
 * progress-slice discipline, sanitizer boundary, and view rendering.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OFFLINE_GROUPS,
  OFFLINE_GROUP_IDS,
  quranUrls,
  translationUrls,
  mushafUrls,
  wordsUrls,
  hadithUrls,
  tafsirUrls,
} from '../js/domain/offline.js';
import { actions, store } from '../js/core/state.js';
import { initialState } from '../js/core/state/initial.js';
import { sanitizeSettings } from '../js/core/config.js';
import { renderOffline } from '../js/views/offline.js';

test('inventory: six groups with honest file counts', () => {
  assert.deepEqual(
    [...OFFLINE_GROUP_IDS],
    ['quran', 'translations', 'mushaf', 'hadith', 'tafsir', 'words']
  );
  assert.equal(quranUrls().length, 116);
  assert.equal(translationUrls().length, 456);
  assert.equal(mushafUrls().length, 605);
  assert.equal(wordsUrls().length, 117);
  for (const url of [...quranUrls(), ...mushafUrls(), ...wordsUrls()]) {
    assert.ok(url.startsWith('data/'), `${url} is same-origin (SW-cacheable)`);
  }
});

test('inventory: index-driven groups validate their ids', async () => {
  const fetchJSON = async (url) => {
    if (url.endsWith('index.json')) return { books: [{ id: 'bukhari' }, { id: '../evil' }, {}] };
    if (url.endsWith('tafsir-editions.json')) {
      return {
        editions: [{ id: 'muyassar', bundled: true }, { id: 'remote-x' }, { id: 'a'.repeat(50) }],
      };
    }
    throw new Error(`unexpected ${url}`);
  };
  const h = await hadithUrls(fetchJSON);
  assert.deepEqual(h.urls, ['data/hadith/bukhari.json']);
  const t = await tafsirUrls(fetchJSON);
  assert.equal(t.urls.length, 114);
  assert.ok(t.urls[0].startsWith('data/tafsir/muyassar/'));
});

test('progress slice: defaults, sanitize, no-op identity', () => {
  assert.deepEqual(initialState().offlineJobs, {
    running: false,
    group: null,
    done: 0,
    total: 0,
    failed: 0,
    quota: null,
  });
  store.dispatch(
    actions.setOfflineProgress({ running: true, group: 'hadith', done: -5, total: NaN, failed: 1 })
  );
  assert.deepEqual(store.getState().offlineJobs, {
    running: true,
    group: 'hadith',
    done: 0,
    total: 0,
    failed: 1,
    quota: null,
  });
  const s = store.getState();
  store.dispatch(actions.setOfflineProgress({ ...s.offlineJobs }));
  assert.equal(store.getState(), s);
  store.dispatch(
    actions.setOfflineProgress({ running: false, group: null, done: 0, total: 0, failed: 0 })
  );
});

test('sanitizer: offline status keeps known groups with clamped numbers', () => {
  const s = sanitizeSettings({
    offline: {
      hadith: { done: 9, total: 9, at: 123 },
      nope: { done: 1, total: 1, at: 1 },
      quran: { done: 1e9, total: -3, at: 'x' },
      words: 'junk',
    },
  });
  assert.deepEqual(s.offline.hadith, { done: 9, total: 9, at: 123 });
  assert.equal(s.offline.nope, undefined);
  assert.deepEqual(s.offline.quran, { done: 100000, total: 0, at: 0 });
  assert.equal(s.offline.words, undefined);
  assert.deepEqual(sanitizeSettings({}).offline, {});
});

function offlineState(over = {}) {
  const s = initialState();
  s.settings.language = 'en';
  return {
    ...s,
    settings: { ...s.settings, offline: {}, ...(over.settings || {}) },
    offlineJobs: {
      running: false,
      group: null,
      done: 0,
      total: 0,
      failed: 0,
      quota: null,
      ...(over.offlineJobs || {}),
    },
  };
}

test('view: idle renders the big button, groups, and back path', () => {
  const html = renderOffline(offlineState());
  assert.ok(html.includes('data-action="offline-download-all"'));
  for (const id of OFFLINE_GROUP_IDS) {
    assert.ok(html.includes(`data-group="${id}"`), `group row ${id}`);
  }
  assert.ok(html.includes('data-view="settings"'), 'back-link to settings');
  assert.ok(html.includes('data-view="audio"'), 'audio pointer row');
});

test('view: running renders progress + stop; done rows check out', () => {
  const running = renderOffline(
    offlineState({
      offlineJobs: { running: true, group: 'hadith', done: 3, total: 9, failed: 0, quota: null },
    })
  );
  assert.ok(running.includes('data-action="offline-stop"'));
  assert.ok(running.includes('role="progressbar"'));
  const done = renderOffline(
    offlineState({ settings: { offline: { hadith: { done: 9, total: 9, at: 1 } } } })
  );
  assert.ok(done.includes('offline-row__status--done'));
});
