/**
 * audio-picker-timing-badge.test.js — OPEN-ISSUES #13: voices without
 * per-ayah timings must say so IN the picker, not only after selection.
 *
 * Both moshaf pickers (the in-player buildReciterPick and the Audio view's
 * renderAudio) carry a short whole-surah badge chip on every moshaf row;
 * the 16 ayah-by-ayah voices carry none. One i18n key, EN+AR.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const CUSTOMS = [
  { id: 'custom-a', nameEn: 'My Sheikh', nameAr: 'شيخي', rewaya: '', server: 'https://a/' },
  { id: 'custom-b', nameEn: 'Other Voice', nameAr: 'صوت آخر', rewaya: '', server: 'https://b/' },
];

function rowInners(html, attrPattern) {
  const re = new RegExp(`<button[^>]*${attrPattern}[^>]*>([\\s\\S]*?)</button>`, 'g');
  return [...html.matchAll(re)].map((m) => m[1]);
}

test('i18n: audio.wholeSurahBadge exists in EN+AR, no placeholders', () => {
  const key = 'audio.wholeSurahBadge';
  assert.ok(en[key] && typeof en[key] === 'string', 'EN badge ships');
  assert.ok(ar[key] && typeof ar[key] === 'string', 'AR badge ships');
  assert.match(ar[key], /[؀-ۿ]/u, 'AR badge has Arabic script');
  assert.ok(!en[key].includes('{') && !ar[key].includes('{'), 'no placeholders');
  assert.ok(!en[key].includes('audio.'), 'no raw key leak (EN)');
});

test('buildReciterPick: moshaf rows carry the badge, ayah rows do not', async () => {
  const { buildReciterPick } = await import('../js/app/handlers/quranAudio.js');
  const { initialState } = await import('../js/core/state/initial.js');
  const base = initialState();
  for (const lang of ['en', 'ar']) {
    const state = {
      ...base,
      settings: { ...base.settings, language: lang, customReciters: CUSTOMS },
    };
    const html = buildReciterPick(state);
    const badge = (lang === 'ar' ? ar : en)['audio.wholeSurahBadge'];
    const note = (lang === 'ar' ? ar : en)['audio.fileModeNote'];
    const moshaf = rowInners(html, 'data-action="recite-pick-moshaf"');
    assert.equal(moshaf.length, CUSTOMS.length, `moshaf rows (${lang})`);
    for (const inner of moshaf) {
      assert.ok(inner.includes(badge), `moshaf row carries badge (${lang})`);
      assert.ok(inner.includes('title="'), `badge explains itself (${lang})`);
    }
    assert.ok(html.includes(note.split(':')[0]), `title reuses fileModeNote (${lang})`);
    const ayahA = rowInners(html, 'data-key="reciter"');
    const ayahB = rowInners(html, 'data-action="recite-voice-b"');
    assert.equal(ayahA.length, 16, `16 voice-A rows (${lang})`);
    assert.ok(ayahB.length >= 16, `voice-B rows (${lang})`);
    for (const inner of [...ayahA, ...ayahB]) {
      assert.ok(!inner.includes(badge), `ayah row carries no badge (${lang})`);
    }
    assert.ok(!html.includes('audio.wholeSurahBadge'), `no raw key leaks (${lang})`);
  }
});

test('renderAudio: moshaf rows carry the badge, verse rows do not', async () => {
  const { renderAudio } = await import('../js/views/audioManager.js');
  for (const lang of ['en', 'ar']) {
    const state = {
      settings: {
        language: lang,
        reciter: 'ar.alafasy',
        customReciters: CUSTOMS,
        audio: { moshafId: null },
      },
      audioManager: { catalogReady: true },
      audioDownloads: {},
      audioDownloading: {},
      quran: {},
      loadErrors: {},
    };
    const html = renderAudio(state);
    const badge = (lang === 'ar' ? ar : en)['audio.wholeSurahBadge'];
    const moshaf = rowInners(html, 'data-action="audio-select-moshaf"');
    assert.ok(moshaf.length >= CUSTOMS.length, `moshaf rows render (${lang})`);
    for (const inner of moshaf) {
      assert.ok(inner.includes(badge), `moshaf row carries badge (${lang})`);
      assert.ok(inner.includes('title="'), `badge explains itself (${lang})`);
    }
    const verse = rowInners(html, 'data-key="reciter"');
    assert.equal(verse.length, 16, `16 verse rows (${lang})`);
    for (const inner of verse) {
      assert.ok(!inner.includes(badge), `verse row carries no badge (${lang})`);
    }
    assert.ok(!html.includes('audio.wholeSurahBadge'), `no raw key leaks (${lang})`);
  }
});
