/**
 * tests/compare-c-5.2.78.test.js — UP-06 second compare slot.
 * Pure reducer/sanitizer/domain checks only (no DOM, no network).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeSettings } from '../js/core/config.js';
import { resolveCompareTexts, compareVisible } from '../js/domain/translationCompare.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const EDITIONS = [
  { id: 'en-sahih', native: 'Sahih', dir: 'ltr', inline: true },
  { id: 'ur-jalandhry', native: 'Jalandhry', dir: 'rtl' },
  { id: 'fr-hamidullah', native: 'Hamidullah', dir: 'ltr' },
];

function stateWith(primary, b, c, overlays = {}) {
  const s = initialState();
  s.settings.quranTranslation = primary;
  s.settings.quranTranslationB = b;
  s.settings.quranTranslationC = c;
  s.quran.translationB = overlays.b || {};
  s.quran.translationC = overlays.c || {};
  return s;
}

describe('UP-06 compare C', () => {
  test('sanitizer allowlists C, junk -> null', () => {
    assert.equal(
      sanitizeSettings({ quranTranslationC: 'ur-jalandhry' }).quranTranslationC,
      'ur-jalandhry'
    );
    assert.equal(sanitizeSettings({ quranTranslationC: 'nope' }).quranTranslationC, null);
    assert.equal(sanitizeSettings({}).quranTranslationC, null);
    assert.equal(sanitizeSettings({ tafsirCompareC: 'x'.repeat(99) }).tafsirCompareC, null);
    assert.equal(sanitizeSettings({ tafsirCompareC: '' }).tafsirCompareC, null);
  });

  test('C reducer stores per-surah overlay without touching B', () => {
    const s0 = initialState();
    const doc = { edKey: 'ur-jalandhry', byAyah: { 1: 'text' } };
    const s1 = reduce(s0, actions.setQuranTranslationCDoc(2, doc));
    assert.deepEqual(s1.quran.translationC['2'], doc);
    assert.equal(s1.quran.translationB, s0.quran.translationB);
  });

  test('resolver returns B then C, skips dupes of primary/B/inline', () => {
    const s = stateWith('en-sahih', 'ur-jalandhry', 'fr-hamidullah', {
      b: { 2: { edKey: 'ur-jalandhry', byAyah: { 5: 'b-text' } } },
      c: { 2: { edKey: 'fr-hamidullah', byAyah: { 5: 'c-text' } } },
    });
    const out = resolveCompareTexts(s, EDITIONS, 2, 5);
    assert.equal(out.length, 2);
    assert.equal(out[0].text, 'b-text');
    assert.equal(out[1].text, 'c-text');

    // C == B -> single line
    const dup = stateWith('en-sahih', 'ur-jalandhry', 'ur-jalandhry', {
      b: { 2: { edKey: 'ur-jalandhry', byAyah: { 5: 'b-text' } } },
      c: { 2: { edKey: 'ur-jalandhry', byAyah: { 5: 'c-text' } } },
    });
    assert.equal(resolveCompareTexts(dup, EDITIONS, 2, 5).length, 1);

    // C == primary -> skipped
    const prim = stateWith('ur-jalandhry', null, 'ur-jalandhry', {
      c: { 2: { edKey: 'ur-jalandhry', byAyah: { 5: 'c-text' } } },
    });
    assert.equal(compareVisible('ur-jalandhry', 'ur-jalandhry'), false);
    assert.equal(resolveCompareTexts(prim, EDITIONS, 2, 5).length, 0);
  });

  test('i18n parity for new compare keys', () => {
    for (const k of ['tafsir.compareC', 'settings.compareTranslationC', 'settings.compareHintC']) {
      assert.ok(en[k], `en ${k}`);
      assert.ok(ar[k], `ar ${k}`);
    }
  });
});
