/**
 * tajweed-words.test.js — word-tap pop-up integrity (bug 1) + engine
 * coverage for corpus-attested marks and rules (bug 2).
 *
 * Bug 1: mushaf pages, classic docs, and grammar records tokenize
 * differently (~2,700 ayahs), so a raw whitespace index tapped in one
 * view pointed at the adjacent word in another. data-i is canonical now.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  canonicalWordTokens,
  sameSurfaceWord,
  containsSurfaceWord,
  classifyWordTajweed,
  classifyAyahTajweed,
} from '../js/domain/tajweed.js';
import { getWord } from '../js/domain/wordStudy.js';
import { renderAyahWords, buildWordStudyPanel } from '../js/views/tafsirPanel.js';

const MUSHAF_9 = '۞ أَفَلَا يَعْلَمُ إِذَا بُعْثِرَ مَا فِى ٱلْقُبُورِ';

test('bug 1: ornaments never consume a word index', () => {
  const canon = canonicalWordTokens(MUSHAF_9);
  assert.deepEqual(
    canon.map((c) => c.text),
    ['أَفَلَا', 'يَعْلَمُ', 'إِذَا', 'بُعْثِرَ', 'مَا', 'فِى', 'ٱلْقُبُورِ']
  );
  const html = renderAyahWords(MUSHAF_9, [], 100, 9, { tajweed: false });
  const tapped = [...html.matchAll(/data-i="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(tapped, [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(!/data-action="word-tap"[^>]*>۞/.test(html), 'ornament untappable');
});

test('bug 1: tapping mushaf word 2 answers يَعْلَمُ, not a neighbor', () => {
  const classic = JSON.parse(readFileSync(new URL('../data/quran/100.json', import.meta.url)));
  const state = {
    settings: { language: 'en' },
    quran: { surahs: { 100: classic }, meta: null },
    quranWords: {},
    activeWordStudy: { surah: '100', ayah: '9', i: 2, surface: 'يَعْلَمُ' },
  };
  const html = buildWordStudyPanel(state);
  assert.ok(html.includes('يَعۡلَمُ'), 'popup shows the tapped word (classic spelling)');
  assert.ok(!html.includes('wordN') || html.includes('>2<') || /word 2\b/i.test(html));
});

test('bug 1: grammar lookup anchors on surface for split spellings', () => {
  const words = {
    37: { 164: [{ i: 1, text: 'وَمَامِنَّا' }] },
  };
  // Indexed hit when the surface agrees…
  assert.equal(getWord(words, 37, 164, 1, 'وَمَامِنَّا').text, 'وَمَامِنَّا');
  // …content-anchored fallback reaches the glued record from a split tap.
  assert.equal(getWord(words, 37, 164, 2, 'مِنَّا').text, 'وَمَامِنَّا');
  // Unknown surface keeps the indexed record (approximately right).
  assert.equal(getWord(words, 37, 164, 1, 'zzz').text, 'وَمَامِنَّا');
  assert.equal(getWord(words, 37, 164, 1).text, 'وَمَامِنَّا');
});

test('bug 2: silah sughra on bare small waw/yeh', () => {
  const rules = (w) => classifyWordTajweed(w).map((s) => s.rule);
  assert.ok(rules('بِهِۦ').includes('madd_silah'));
  assert.ok(rules('لِرَبِّهِۦ').includes('madd_silah'));
  assert.ok(rules('وَإِنَّهُۥ').includes('madd_silah'));
});

test('bug 2: lam shamsiyyah after a prefix particle', () => {
  const rules = (w) => classifyWordTajweed(w).map((s) => s.rule);
  assert.ok(rules('وَٱلشَّمۡسِ').includes('lam_shamsiyyah'));
  assert.ok(rules('ٱلشَّمۡسِ').includes('lam_shamsiyyah'));
});

test('bug 2: lazim via shaddah/sukun, never badal', () => {
  const rules = (w) => classifyWordTajweed(w).map((s) => s.rule);
  assert.ok(rules('ٱلضَّآلِّينَ').includes('madd_6'));
  assert.ok(!rules('ٱلضَّآلِّينَ').includes('madd_badal'));
  assert.ok(rules('ءَآلۡـَٔانَ').includes('madd_6'));
  // Untouched neighbors: muttasil, badal, muqatta'at.
  assert.ok(rules('جَآءَ').includes('madd_muttasil'));
  assert.ok(rules('آدَمَ').includes('madd_badal'));
  assert.deepEqual(
    classifyWordTajweed('الٓمٓ').map((s) => s.rule),
    ['madd_6', 'madd_6']
  );
  // A sukun on a silent alif is orthography, not jazm.
  assert.ok(!rules('وَٱسۡجُدُواْۤ').includes('madd_6'));
});

test('bug 2: variant tanween marks engage the noon family', () => {
  const rules = (w, o) => classifyWordTajweed(w, o).map((s) => s.rule);
  // No phantom qalqalah on the consonant before a variant mark…
  assert.ok(!rules('رَجُلٖ').includes('qalqalah'));
  assert.ok(!rules('جَمِيعٗا').includes('qalqalah'));
  assert.ok(!rules('شَرَابٞ').includes('qalqalah'));
  // …and the tanween rules fire through them.
  assert.ok(rules('رَجُلٖ', { nextWordFirstBase: 'ب' }).includes('iqlab'));
  assert.ok(rules('شَرَابٞ', { nextWordFirstBase: 'م' }).includes('idgham_ghunnah'));
  assert.ok(rules('نُـۨجِي').includes('ikhfa'), 'small-high noon + jeem');
  assert.ok(rules('ٱلنَّبِيِّـۧنَ').includes('madd_2'), 'small-high yeh plural');
});

test('sameSurfaceWord ignores ornaments; containment catches spelling splits', () => {
  assert.ok(sameSurfaceWord('۞أَفَلَا', 'أَفَلَا'));
  assert.ok(!sameSurfaceWord('يَعْلَمُ', 'أَفَلَا'));
  assert.ok(containsSurfaceWord('وَمَامِنَّا', 'مِنَّا'));
  assert.ok(!containsSurfaceWord('يَعْلَمُ', 'أَفَلَا'));
});

test('bug 1: full-ayah classification is per-word stable on 100:5-9', () => {
  const classic = JSON.parse(readFileSync(new URL('../data/quran/100.json', import.meta.url)));
  for (const n of [5, 6, 7, 8, 9]) {
    const text = classic.ayahs.find((a) => a.number === n).text;
    const perWord = classifyAyahTajweed(text);
    assert.equal(perWord.length, text.trim().split(/\s+/).length);
    perWord.forEach((w, k) => assert.equal(w.wordIndex, k + 1));
  }
});
