import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  verseMetadata,
  fullSurahMetadata,
  syncMetadata,
  clearMetadata,
  installMediaHandlers,
  _resetMediaHandlersForTests,
} from '../js/services/mediaSession.js';

/**
 * Lock-screen metadata: pure builders are asserted exactly; the platform
 * sync is guarded — under Node (no navigator.mediaSession) every call
 * must simply report false instead of throwing.
 */

describe('media session metadata', () => {
  test('verse titles carry surah · ayah/total with the reciter as artist', () => {
    assert.deepEqual(verseMetadata({ surah: 2, ayah: 255, total: 286, reciter: 'ar.alafasy' }), {
      title: 'Surah 2 · Ayah 255/286',
      artist: 'ar.alafasy',
      album: '',
    });
  });

  test('verse metadata survives hostile input', () => {
    const m = verseMetadata({ surah: 'x', ayah: null, total: 0, reciter: null });
    assert.equal(m.title, 'Qur’an recitation');
    assert.equal(m.artist, '');
    assert.deepEqual(fullSurahMetadata({ surah: 999, reciter: '' }), {
      title: 'Surah 999',
      artist: '',
      album: '',
    });
  });

  test('platform sync is a silent no-op without the API', () => {
    assert.equal(syncMetadata(verseMetadata({ surah: 1, ayah: 1, total: 7 })), false);
    assert.equal(clearMetadata(), false);
    assert.equal(installMediaHandlers({ onPrev: () => {}, onNext: () => {} }), false);
    _resetMediaHandlersForTests();
  });
});
