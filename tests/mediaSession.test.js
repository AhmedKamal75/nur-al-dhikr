import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  verseMetadata,
  fullSurahMetadata,
  syncMetadata,
  clearMetadata,
  installMediaHandlers,
  _resetMediaHandlersForTests,
  SESSION_ARTWORK,
} from '../js/services/mediaSession.js';

/**
 * Lock-screen metadata: pure builders are asserted exactly; the platform
 * sync is guarded — under Node (no navigator.mediaSession) every call
 * must simply report false instead of throwing.
 */

describe('media session metadata', () => {
  test('verse titles carry surah · ayah/total with the reciter display name as artist', () => {
    assert.deepEqual(verseMetadata({ surah: 2, ayah: 255, total: 286, reciter: 'ar.alafasy' }), {
      title: 'Surah 2 · Ayah 255/286',
      artist: 'Mishary Alafasy',
      album: '',
      artwork: [...SESSION_ARTWORK],
    });
    assert.equal(
      verseMetadata({ surah: 2, ayah: 255, total: 286, reciter: 'ar.alafasy', lang: 'ar' }).artist,
      'مشاري العفاسي'
    );
    assert.equal(verseMetadata({ surah: 1, ayah: 1, total: 7, reciter: 'bogus' }).artist, 'bogus');
  });

  test('verse metadata survives hostile input', () => {
    const m = verseMetadata({ surah: 'x', ayah: null, total: 0, reciter: null });
    assert.equal(m.title, 'Qur’an recitation');
    assert.equal(m.artist, '');
    assert.deepEqual(fullSurahMetadata({ surah: 999, reciter: '' }), {
      title: 'Surah 999',
      artist: '',
      album: '',
      artwork: [...SESSION_ARTWORK],
    });
  });

  test('full-surah artist resolves reciter ids (never raw on lock screens)', () => {
    assert.equal(fullSurahMetadata({ surah: 2, reciter: 'ar.alafasy' }).artist, 'Mishary Alafasy');
    assert.equal(
      fullSurahMetadata({ surah: 2, reciter: 'ar.alafasy', lang: 'ar' }).artist,
      'مشاري العفاسي'
    );
    // Caller-provided display names pass through untouched.
    assert.equal(
      fullSurahMetadata({ surah: 2, reciter: 'Mishary Alafasy' }).artist,
      'Mishary Alafasy'
    );
  });

  test('artwork points at precached local icons only', () => {
    for (const a of SESSION_ARTWORK) {
      assert.ok(a.src.startsWith('assets/icons/'), 'bundled icon path');
      assert.ok(/^https?:/.test(a.src) === false, 'never remote');
    }
    assert.ok(
      verseMetadata({ surah: 1, ayah: 1, total: 7 }).artwork.length >= 1,
      'verse sessions carry artwork'
    );
  });

  test('platform sync is a silent no-op without the API', () => {
    assert.equal(syncMetadata(verseMetadata({ surah: 1, ayah: 1, total: 7 })), false);
    assert.equal(clearMetadata(), false);
    assert.equal(installMediaHandlers({ onPrev: () => {}, onNext: () => {} }), false);
    _resetMediaHandlersForTests();
  });
});
