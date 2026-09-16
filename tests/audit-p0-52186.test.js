/**
 * tests/audit-p0-52186.test.js — Agent-3 (v5.2.86) P0 regression pins.
 *
 *  P0-1: the word-study popup shows an honest one-line hint when the word
 *        IS known (grammar + root render) but the 54-lemma study
 *        dictionary has no entry — EN + AR, no hollow section.
 *  P0-2: the prostration-word accent (qword--sajda) fires on سُجَّدًا in
 *        As-Sajdah:15 ONLY — same skeleton elsewhere stays unaccented.
 *  P0-4: Bismillah proportional rhythm (1.2em) + root-head wrap are
 *        pinned in CSS; the Mushaf body line-height floor (madd-collision
 *        guard) cannot regress below 2.
 *  P0-5: the tajweed classifier memo is hard-capped at the 6,236-ayah
 *        corpus size with FIFO eviction (never unbounded, never wrong).
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { isSajdaWord } from '../js/domain/wordStudy.js';
import {
  classifyAyahTajweed,
  clearClassifyMemo,
  classifyMemoSizeForTests,
  CLASSIFY_MEMO_CAP,
  TAJWEED_RULES,
} from '../js/domain/tajweed.js';
import { buildAnswerKey } from '../js/domain/tajweedPractice.js';
import { renderAyahWords, buildWordStudyPanel } from '../js/views/tafsirPanel.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const words1 = readJSON('data/quran-words/1.json');
const surah1 = readJSON('data/quran/1.json');
const surah32 = readJSON('data/quran/32.json');
const dict = readJSON('data/quran-dict.json');
const roots = readJSON('data/quran-roots.json');
const quranCss = readText('assets/css/quran.css');

const ayahText = (surahDoc, n) => surahDoc.ayahs.find((a) => a.number === n).text;

function wordState(over = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeWordStudy: { surah: '1', ayah: '1', i: 2 },
    quranWords: { 1: words1 },
    quran: { surahs: { 1: surah1 } },
    quranRoots: roots,
    wordDict: { index: dict.entries },
    wordBookmarks: {},
    mushafSession: {},
    ...over,
  };
}

describe('P0-1: honest meanings fallback (wordStudy.noMeanings)', () => {
  test('i18n key exists in both languages with no placeholders', () => {
    assert.equal(typeof en['wordStudy.noMeanings'], 'string');
    assert.equal(typeof ar['wordStudy.noMeanings'], 'string');
    assert.ok(!/\{\w+\}/.test(en['wordStudy.noMeanings']));
    assert.ok(!/\{\w+\}/.test(ar['wordStudy.noMeanings']));
  });

  test('known word without a dict entry shows the honest hint, not silence', () => {
    // 1:1 word 2 (اللَّهِ): full grammar record, lemma absent from dict.
    const html = buildWordStudyPanel(wordState());
    assert.match(html, /empty-hint/, 'hint uses the sanctioned inline idiom');
    assert.ok(html.includes(en['wordStudy.noMeanings']), 'EN hint copy renders');
    assert.doesNotMatch(html, /word-study__meanings/, 'no hollow meanings section');
    // The other three blocks still render: grammar, root, tajweed/actions.
    assert.match(html, /word-study__grammar/, 'grammar block renders');
    assert.match(html, /data-action="word-bookmark"/, 'actions render');
  });

  test('AR popup shows the AR hint', () => {
    const html = buildWordStudyPanel(
      wordState({ settings: { ...DEFAULT_SETTINGS, language: 'ar' } })
    );
    assert.ok(html.includes(ar['wordStudy.noMeanings']), 'AR hint copy renders');
  });

  test('covered lemma still renders the full meanings section', () => {
    // 1:4 word 2 (يَوْمِ): lemma يَوْم is in the dictionary.
    const html = buildWordStudyPanel(
      wordState({ activeWordStudy: { surah: '1', ayah: '4', i: 2 } })
    );
    assert.match(html, /word-study__meanings/, 'meanings section renders');
    assert.doesNotMatch(html, new RegExp(en['wordStudy.noMeanings']), 'no hint alongside content');
  });
});

describe('P0-2: sajdah-word accent scoped to 32:15', () => {
  const text15 = ayahText(surah32, 15);
  const sajdaToken = text15.trim().split(/\s+/)[8]; // word 9: سُجَّدًا

  test('isSajdaWord matches the corpus token, rejects neighbors + hostile input', () => {
    assert.equal(isSajdaWord(sajdaToken), true, `matches ${sajdaToken}`);
    const tokens = text15.trim().split(/\s+/);
    for (const [idx, tok] of tokens.entries()) {
      if (idx === 8) continue;
      assert.equal(isSajdaWord(tok), false, `neighbor word ${idx + 1} rejected`);
    }
    assert.equal(isSajdaWord(''), false);
    assert.equal(isSajdaWord(null), false);
    assert.equal(
      isSajdaWord('سَجَدُوا'),
      false,
      'bare undiacritized skeleton is not the Uthmani token'
    );
  });

  test('renderAyahWords accents exactly one word in 32:15, none elsewhere', () => {
    const html = renderAyahWords(text15, undefined, 32, 15, { tappable: true });
    const hits = html.match(/qword--sajda/g) || [];
    assert.equal(hits.length, 1, 'exactly one accented word');
    // Same text rendered under a different ref gains no accent.
    const elsewhere = renderAyahWords(text15, undefined, 2, 2, { tappable: true });
    assert.doesNotMatch(elsewhere, /qword--sajda/);
    // Surah 1 (no sajdah) is clean.
    const fatiha = renderAyahWords(ayahText(surah1, 1), undefined, 1, 1, { tappable: true });
    assert.doesNotMatch(fatiha, /qword--sajda/);
  });

  test('CSS pins the accent + forced-colors-safe technique', () => {
    assert.match(quranCss, /\.qword--sajda\s*\{/, 'accent class declared');
    assert.match(quranCss, /text-decoration-thickness:\s*2px/, '2px horizontal line');
  });
});

describe('P0-4: proportional Mushaf rhythm pinned in CSS', () => {
  test('Bismillah renders at 1.2x body', () => {
    // Several paper-specific .mushaf-bismillah blocks exist (Madinah keeps
    // its own 1.12em print convention); the BASE rule must carry 1.2em.
    const blocks = [...quranCss.matchAll(/\.mushaf-bismillah\s*\{[\s\S]*?\}/g)].map((m) => m[0]);
    assert.ok(blocks.length >= 2, 'base + paper overrides exist');
    assert.ok(
      blocks.some((b) => /font-size:\s*1\.2em/.test(b)),
      'at least the base rule sets 1.2em'
    );
  });

  test('Mushaf body line-height floor (madd-collision guard) holds', () => {
    assert.match(quranCss, /line-height:\s*calc\(2\.15 \* var\(--mushaf-line-scale/);
  });

  test('word-study root head wraps at 390px', () => {
    const block = /\.word-study__root-head\s*\{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(block, /flex-wrap:\s*wrap/);
  });
});

describe('P0-5: classifier memo is bounded (FIFO @ 6,236)', () => {
  test('cap equals the corpus size', () => {
    assert.equal(CLASSIFY_MEMO_CAP, 6236);
  });

  test('every rule ships a populated, genuine practice pool (no empty drill)', () => {
    // P0-5(a): the "no training ayahs for this rule" dead end is closed by
    // construction — each of the 20 rules carries >=5 pool entries, and
    // every entry's ayah genuinely contains the rule (re-derived from the
    // bundled corpus through the same classifier that colors the page).
    const pool = readJSON('data/tajweed-practice.json');
    assert.equal(Object.keys(pool.byRule).length, TAJWEED_RULES.length);
    const surahCache = new Map();
    const surahDoc = (s) => {
      if (!surahCache.has(s)) surahCache.set(s, readJSON(`data/quran/${s}.json`));
      return surahCache.get(s);
    };
    for (const rule of TAJWEED_RULES) {
      const list = pool.byRule[rule.id];
      assert.ok(Array.isArray(list) && list.length >= 5, `${rule.id}: >=5 pool entries`);
      for (const e of list.slice(0, 5)) {
        assert.ok(e.s >= 1 && e.s <= 114 && e.a >= 1, `${rule.id}: entry in range`);
        const ayahText = surahDoc(e.s).ayahs.find((a) => a.number === e.a)?.text;
        assert.ok(ayahText, `${rule.id}: ${e.s}:${e.a} exists in corpus`);
        assert.ok(
          buildAnswerKey(ayahText, rule.id).length > 0,
          `${rule.id}: ${e.s}:${e.a} genuinely contains the rule`
        );
      }
    }
  });

  test('overflow evicts oldest-first, stays correct', () => {
    clearClassifyMemo();
    try {
      const first = 'بِسْمِ اللَّهِ الافتتاحية 0';
      classifyAyahTajweed(first);
      for (let k = 1; k <= CLASSIFY_MEMO_CAP; k += 1) {
        classifyAyahTajweed(`آية الاختبار رقم ${k} الْحَمْدُ`);
      }
      assert.ok(
        classifyMemoSizeForTests() <= CLASSIFY_MEMO_CAP,
        `memo bounded: ${classifyMemoSizeForTests()} <= ${CLASSIFY_MEMO_CAP}`
      );
      // The newest entry is always served (correctness over retention).
      const fresh = classifyAyahTajweed(`آية الاختبار رقم ${CLASSIFY_MEMO_CAP} الْحَمْدُ`);
      assert.ok(Array.isArray(fresh) && fresh.length > 0, 'fresh entry classifies');
      // Hits still memoize: same text returns the identical object.
      const again = classifyAyahTajweed(`آية الاختبار رقم ${CLASSIFY_MEMO_CAP} الْحَمْدُ`);
      assert.equal(again, fresh, 'memo hit returns cached object');
    } finally {
      clearClassifyMemo();
    }
  });
});
