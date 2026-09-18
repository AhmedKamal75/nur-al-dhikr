/**
 * tests/verseAudio.test.js — item 18 (verse audio offline) gates:
 *  1. verseKey shapes IDs; the verse layer degrades silently without
 *     IndexedDB (no-idb / null / false / []);
 *  2. save/get/list/delete round-trip through a minimal fake IDB, and
 *     downloadVerseFile validates (404/audio-mime/network) into it;
 *  3. the allowlist holds the 16 verified voices (unsupported ids stay
 *     out) and sanitize keeps them;
 *  4. the engine plays stored Blobs (blob: URLs) with CDN fallback;
 *  5. VERSE_PACK_STATUS caches single/bulk/reset shapes, hostile-safe;
 *  6. the audio view renders 16 voices + the 114-cell packs grid with
 *     counts; handlers + strings are wired.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { QURAN_RECITERS, QURAN_RECITER_IDS } from '../js/core/config/quran.js';
import { sanitizeSettings } from '../js/core/config.js';
import {
  _resetAudioStoreForTests,
  deleteVerseAudio,
  downloadVerseFile,
  getVerseAudio,
  listVerseAyahs,
  saveVerseAudio,
  verseKey,
} from '../js/services/audioStore.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderAudio } from '../js/views/audioManager.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

/* Minimal fake IndexedDB: key-value tables with async request callbacks
 * (deferred so onsuccess attachment always wins the race, like real IDB). */
function installFakeIDB() {
  const tables = new Map();
  const getTable = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  const fakeDB = {
    // NOTE: transaction() returns the tx object itself (like real IDB —
    // txDone attaches oncomplete to it), not a wrapper.
    transaction(storeName) {
      const t = getTable(storeName);
      const tx = {};
      const complete = () => queueMicrotask(() => tx.oncomplete?.());
      tx.objectStore = () => ({
        put(rec) {
          const req = {};
          queueMicrotask(() => {
            t.set(rec.key, rec);
            req.result = rec.key;
            req.onsuccess?.();
            complete();
          });
          return req;
        },
        get(key) {
          const req = {};
          queueMicrotask(() => {
            req.result = t.has(key) ? t.get(key) : undefined;
            req.onsuccess?.();
            complete();
          });
          return req;
        },
        getAllKeys() {
          const req = {};
          queueMicrotask(() => {
            req.result = [...t.keys()];
            req.onsuccess?.();
            complete();
          });
          return req;
        },
        delete(key) {
          const req = {};
          queueMicrotask(() => {
            t.delete(key);
            req.onsuccess?.();
            complete();
          });
          return req;
        },
      });
      return tx;
    },
  };
  const fakeIDB = {
    open() {
      const req = {};
      queueMicrotask(() => {
        req.result = {
          transaction: fakeDB.transaction,
          objectStoreNames: { contains: () => true },
          createObjectStore: () => ({}),
        };
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
  globalThis.window = { indexedDB: fakeIDB };
  globalThis.indexedDB = fakeIDB;
  // The degradation suite above memoized the null connection — reset so
  // the fake globals take effect (same reason production never swaps IDB).
  _resetAudioStoreForTests();
}

describe('verseKey shapes storage ids', () => {
  test('reciter + global ayah namespacing', () => {
    assert.equal(verseKey('ar.alafasy', 1), 'v:ar.alafasy:1');
    assert.equal(verseKey('ar.alafasy', 6236), 'v:ar.alafasy:6236');
    assert.ok(
      !verseKey('ar.alafasy', 5).startsWith('ar.alafasy:'),
      'never collides with full-surah keys'
    );
  });
});

describe('verse layer degrades silently without IndexedDB', () => {
  test('no-idb paths never throw', async () => {
    assert.deepEqual(await saveVerseAudio('ar.alafasy', 1, new Blob(['x'])), {
      ok: false,
      error: 'no-idb',
    });
    assert.equal(await getVerseAudio('ar.alafasy', 1), null);
    assert.equal(await deleteVerseAudio('ar.alafasy', 1), false);
    assert.deepEqual(await listVerseAyahs('ar.alafasy'), []);
  });
});

describe('verse round-trip through fake IDB', () => {
  test('save/get/list/delete', async () => {
    installFakeIDB();
    const blob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
    assert.deepEqual(await saveVerseAudio('ar.alafasy', 1, blob), { ok: true, bytes: 11 });
    assert.deepEqual(await saveVerseAudio('ar.alafasy', 8, blob), { ok: true, bytes: 11 });
    const got = await getVerseAudio('ar.alafasy', 1);
    assert.equal(got?.size, 11);
    assert.deepEqual(await listVerseAyahs('ar.alafasy'), [1, 8]);
    assert.deepEqual(await listVerseAyahs('ar.husary'), []);
    assert.equal(await deleteVerseAudio('ar.alafasy', 1), true);
    assert.equal(await getVerseAudio('ar.alafasy', 1), null);
    assert.deepEqual(await listVerseAyahs('ar.alafasy'), [8]);
    assert.deepEqual(await saveVerseAudio('ar.alafasy', 2, null), { ok: false, error: 'empty' });
  });

  test('downloadVerseFile validates into the store', async () => {
    const realFetch = globalThis.fetch;
    const audioBlob = () => new Blob(['y'.repeat(50)], { type: 'audio/mpeg' });
    try {
      globalThis.fetch = async (url) => {
        if (String(url).includes('/404.mp3')) return { status: 404, ok: false };
        if (String(url).includes('/html.mp3'))
          return {
            status: 200,
            ok: true,
            blob: async () => new Blob(['<html>'], { type: 'text/html' }),
          };
        return { status: 200, ok: true, blob: audioBlob };
      };
      assert.deepEqual(await downloadVerseFile('ar.alafasy', 100, 'https://x/404.mp3'), {
        ok: false,
        error: 'missing',
      });
      assert.deepEqual(await downloadVerseFile('ar.alafasy', 100, 'https://x/html.mp3'), {
        ok: false,
        error: 'not-audio',
      });
      const saved = await downloadVerseFile('ar.alafasy', 100, 'https://x/1.mp3');
      assert.equal(saved.ok, true);
      assert.equal((await getVerseAudio('ar.alafasy', 100))?.size, 50);
      globalThis.fetch = async () => {
        throw new Error('down');
      };
      assert.deepEqual(await downloadVerseFile('ar.alafasy', 101, 'https://x/1.mp3'), {
        ok: false,
        error: 'network',
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('downloadVerseFile walks a candidate list: first success wins (v5.10.2)', async () => {
    const realFetch = globalThis.fetch;
    const seen = [];
    const audioBlob = () => new Blob(['z'.repeat(60)], { type: 'audio/mpeg' });
    try {
      globalThis.fetch = async (url) => {
        seen.push(String(url));
        if (String(url).includes('no-cors-here')) throw new Error('CORS fail');
        return { status: 200, ok: true, blob: audioBlob };
      };
      // Primary (no CORS) throws, mirror saves — the verse-pack rescue.
      const res = await downloadVerseFile('ar.alafasy', 102, [
        'https://no-cors-here/1.mp3',
        'https://everyayah-mirror/001001.mp3',
      ]);
      assert.equal(res.ok, true);
      assert.deepEqual(seen, ['https://no-cors-here/1.mp3', 'https://everyayah-mirror/001001.mp3']);
      assert.equal((await getVerseAudio('ar.alafasy', 102))?.size, 60);
      // All 404 → learned missing, not a network error.
      globalThis.fetch = async () => ({ status: 404, ok: false });
      assert.deepEqual(
        await downloadVerseFile('ar.alafasy', 103, ['https://a/1.mp3', 'https://b/1.mp3']),
        { ok: false, error: 'missing' }
      );
      // Empty list degrades to network, never throws.
      assert.deepEqual(await downloadVerseFile('ar.alafasy', 104, []), {
        ok: false,
        error: 'network',
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('allowlist: sixteen verified voices', () => {
  test('exactly the probed-live ids, 403s excluded', () => {
    const ids = QURAN_RECITERS.map((r) => r.id);
    assert.equal(ids.length, 16);
    for (const id of [
      'ar.alafasy',
      'ar.husary',
      'ar.abdulbasitmurattal',
      'ar.abdurrahmaansudais',
      'ar.mahermuaiqly',
      'ar.husarymujawwad',
      'ar.muhammadayyoub',
      'ar.muhammadjibreel',
      'ar.hudhaify',
      'ar.ahmedajamy',
      // (v5.10.8) six CDN-census additions — every ladder rung + every
      // EveryAyah tertiary HEAD-probed live before allowlisting.
      'ar.minshawi',
      'ar.shaatree',
      'ar.saoodshuraym',
      'ar.hanirifai',
      'ar.aymanswoaid',
      'ar.abdullahbasfar',
    ]) {
      assert.ok(ids.includes(id), `allowlisted: ${id}`);
    }
    for (const id of ['ar.parhizgar', 'ar.minshawimujawwad']) {
      assert.ok(!ids.includes(id), `excluded: ${id}`);
    }
    assert.deepEqual([...QURAN_RECITER_IDS].sort(), [...ids].sort(), 'set mirrors the list');
    for (const r of QURAN_RECITERS) {
      assert.ok(r.nameEn && r.nameAr, `bilingual names: ${r.id}`);
    }
  });

  test('sanitize keeps the new voices', () => {
    assert.equal(sanitizeSettings({ reciter: 'ar.hudhaify' }).reciter, 'ar.hudhaify');
    assert.equal(sanitizeSettings({ reciter: 'ar.minshawi' }).reciter, 'ar.minshawi');
    assert.equal(sanitizeSettings({ reciter: 'ar.saoodshuraym' }).reciter, 'ar.saoodshuraym');
    assert.equal(sanitizeSettings({ reciter: 'bogus' }).reciter, 'ar.alafasy');
    assert.equal(sanitizeSettings({ reciter: 'ar.parhizgar' }).reciter, 'ar.alafasy');
  });
});

describe('engine plays stored Blobs with CDN fallback', () => {
  test('offline Blob wins; missing streams', async () => {
    const engine = await import('../js/services/surahPlayback.js');
    const played = [];
    const { configureDriver } = await import('../js/services/recitation.js');
    configureDriver({
      play: (url, key) => played.push({ url, key }),
      stop: () => {},
      onEnded: () => {},
      onError: () => {},
      offEnded: () => {},
      offError: () => {},
    });
    try {
      const blob = new Blob(['verse'], { type: 'audio/mpeg' });
      assert.ok((await saveVerseAudio('ar.husary', 1, blob)).ok, 'seed reads back');
      const SURAHS = [{ number: 1, ayahCount: 2 }];
      engine.start({ surah: 1, total: 2, reciterId: 'ar.husary', surahsMeta: SURAHS });
      await tick();
      assert.equal(played.length, 1);
      assert.ok(played[0].url.startsWith('blob:'), 'stored verse plays from memory');
      assert.equal(played[0].key, '1:1');
      engine.stop();
      // Unseeded voice streams the CDN URL unchanged.
      engine.start({ surah: 1, total: 2, reciterId: 'ar.alafasy', surahsMeta: SURAHS });
      await tick();
      assert.ok(played.at(-1).url.startsWith('https://'), 'missing verse streams');
      assert.ok(played.at(-1).url.includes('ar.alafasy/1.mp3'), 'CDN shape intact');
      engine.stop();
    } finally {
      configureDriver(null);
    }
  });
});

describe('VERSE_PACK_STATUS: ephemeral per-voice cache', () => {
  test('single, bulk, reset and hostile shapes', () => {
    const s0 = initialState();
    assert.deepEqual(s0.audioVerse, {});
    const s = reduce(
      s0,
      actions.setVersePackStatus({ voice: 'ar.alafasy', surah: 1, done: 3, total: 7 })
    );
    assert.deepEqual(s.audioVerse, { 'ar.alafasy': { 1: { done: 3, total: 7 } } });
    const bulk = reduce(
      s,
      actions.setVersePackStatus({
        voice: 'ar.alafasy',
        packs: { 1: { done: 7, total: 7 }, 2: { done: 0, total: 286 }, x: { done: 1 } },
      })
    );
    assert.deepEqual(bulk.audioVerse['ar.alafasy'][1], { done: 7, total: 7 });
    assert.deepEqual(bulk.audioVerse['ar.alafasy'][2], { done: 0, total: 286 });
    assert.ok(!('x' in bulk.audioVerse['ar.alafasy']), 'junk surahs drop');
    const reset = reduce(bulk, actions.setVersePackStatus({ voice: 'ar.alafasy', reset: true }));
    assert.deepEqual(reset.audioVerse, {});
    assert.equal(reduce(s0, actions.setVersePackStatus({ voice: '' })), s0);
    assert.equal(reduce(s0, actions.setVersePackStatus({ voice: 'ar.alafasy', surah: 999 })), s0);
  });
});

describe('audio view: sixteen voices plus packs grid', () => {
  function audioState(over = {}) {
    return {
      settings: {
        language: 'en',
        reciter: 'ar.alafasy',
        audio: { moshafId: null },
        customReciters: [],
      },
      audioManager: { query: '', catalogReady: true },
      audioDownloads: {},
      audioDownloading: {},
      audioVerse: {},
      quran: {
        meta: {
          surahs: [
            { number: 1, ayahCount: 7, nameTransliteration: 'Al-Fatiha', nameAr: 'الفاتحة' },
            { number: 2, ayahCount: 286, nameTransliteration: 'Al-Baqarah', nameAr: 'البقرة' },
          ],
        },
      },
      loadErrors: {},
      playlists: [],
      ...over,
    };
  }

  test('voices list all sixteen; packs grid renders 114 cells', async () => {
    const { renderAudio } = await import('../js/views/audioManager.js');
    const html = renderAudio(audioState());
    assert.equal((html.match(/data-key="reciter"/g) || []).length, 16, 'sixteen voice rows');
    assert.equal(
      (html.match(/data-action="verse-pack-download"/g) || []).length,
      114,
      'full surah grid'
    );
    assert.ok(html.includes('Offline verse packs'), 'section heading');
    assert.ok(
      !html.includes('data-action="verse-pack-delete"'),
      'nothing stored, nothing to delete'
    );
  });

  test('stored packs show counts with delete affordance', async () => {
    const { renderAudio } = await import('../js/views/audioManager.js');
    const html = renderAudio(
      audioState({
        audioVerse: { 'ar.alafasy': { 1: { done: 7, total: 7 }, 2: { done: 3, total: 286 } } },
      })
    );
    assert.ok(html.includes('data-action="verse-pack-delete"'), 'complete packs delete');
    assert.ok(html.includes('7/7'), 'full count renders');
    assert.ok(html.includes('3/286'), 'partial count renders');
    assert.ok(html.includes('10 / 293'), 'header totals the voice');
  });

  test('AR renders without undefined', async () => {
    const { renderAudio } = await import('../js/views/audioManager.js');
    const html = renderAudio(
      audioState({
        settings: { language: 'ar', reciter: 'ar.alafasy', audio: {}, customReciters: [] },
      })
    );
    assert.doesNotMatch(html, /undefined/);
  });
});

describe('verse audio wiring: handlers and strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/audio.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('pack download/delete keys are registered', () => {
    assert.ok(handlers.includes("'verse-pack-download'"), 'download handler missing');
    assert.ok(handlers.includes("'verse-pack-delete'"), 'delete handler missing');
  });

  test('pack strings ship EN + AR', () => {
    for (const key of ['audio.versePacks', 'audio.versePacksHint', 'audio.versePackDone']) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});

after(() => {
  delete globalThis.window;
  delete globalThis.indexedDB;
});
