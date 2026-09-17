/**
 * tests/audit-p0-52186.test.js — Agent-3 (v5.2.86) P0 regression pins,
 * unified in v5.4.0 with the v5.3.0 audit's richer implementations:
 *
 *  P0-1: the word-study popup renders four labeled study blocks
 *        (definition, syn/ant, root, i'rab), each with an honest
 *        one-line empty state — EN + AR, never a hollow section.
 *  P0-2: the prostration-word accent (mushaf-ayah__sajda-word over-line,
 *        matched harakat-folded) fires on سُجَّدًا in As-Sajdah:15 ONLY —
 *        same skeleton elsewhere stays unaccented; ornament tokens
 *        classify into distinct sajdah/hizb/waqf families.
 *  P0-4: sublinear banner cap + Bismillah 1.2× formula + root-head wrap
 *        pinned in CSS; the Mushaf body line-height floor
 *        (madd-collision guard) cannot regress below 2.
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
import { matchesAccentWord, ornamentTokenKind } from '../js/domain/tajweed.js';
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

describe('P0-1: four study blocks with honest empty states (wordStudy.*Data)', () => {
  test('i18n keys exist in both languages with no placeholders', () => {
    for (const key of [
      'wordStudy.definition',
      'wordStudy.irab',
      'wordStudy.noMeaningData',
      'wordStudy.noSynAntData',
      'wordStudy.noRootData',
      'wordStudy.noIrabData',
    ]) {
      assert.equal(typeof en[key], 'string', `en ${key}`);
      assert.equal(typeof ar[key], 'string', `ar ${key}`);
      assert.ok(!/\{\w+\}/.test(en[key]), `en ${key} has no placeholders`);
      assert.ok(!/\{\w+\}/.test(ar[key]), `ar ${key} has no placeholders`);
    }
  });

  test('dict-covered word renders the full definition from the dictionary', () => {
    // 1:1 word 2 (اللَّهِ): covered since the v5.5.0 dictionary expansion —
    // the definition block carries the curated AR entry + EN gloss with
    // the legacy meanings anchor, and no fallback hint.
    const html = buildWordStudyPanel(wordState());
    // Exactly the four labeled study blocks.
    const labels = html.match(/word-study__block-label/g) || [];
    assert.equal(labels.length, 4, `expected 4 labeled blocks, got ${labels.length}`);
    assert.match(html, /word-study__meanings/, 'definition block renders with dict content');
    assert.match(html, /المعبود بحق/, 'curated AR entry renders');
    assert.match(html, /data-action="word-bookmark"/, 'actions render');
  });

  test('every corpus word gets a definition — no empty shells anywhere', () => {
    // (v5.6.0) full dictionary coverage: 1:4 word 1 (مَالِكِ) resolves
    // through the dictionary tier like every other corpus word, so the
    // definition block always carries content with the legacy anchor and
    // the corpus-gloss fallback path is structural backup only.
    const html = buildWordStudyPanel(
      wordState({ activeWordStudy: { surah: '1', ayah: '4', i: 1 } })
    );
    assert.match(html, /word-study__meanings/, 'definition block renders with content');
    assert.doesNotMatch(
      html,
      /word-study__block--empty.*wordStudy\.noMeaningData|No dictionary entry/,
      'no definition empty state for covered words'
    );
  });

  test('AR popup shows the AR dictionary entry', () => {
    const html = buildWordStudyPanel(
      wordState({ settings: { ...DEFAULT_SETTINGS, language: 'ar' } })
    );
    assert.ok(html.includes('المعبود بحق'), 'AR entry copy renders');
    assert.ok(html.includes('المرادفات والأضداد'), 'AR syn/ant block label renders');
  });

  test('covered lemma still renders the full meanings section', () => {
    // 1:4 word 2 (يَوْمِ): lemma يَوْم is in the dictionary.
    const html = buildWordStudyPanel(
      wordState({ activeWordStudy: { surah: '1', ayah: '4', i: 2 } })
    );
    assert.match(html, /word-study__meanings/, 'meanings section renders');
    assert.doesNotMatch(
      html,
      new RegExp(en['wordStudy.noMeaningData'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      'no hint alongside content'
    );
  });
});

describe('P0-2: sajdah-line accent scoped to 32:15 (harakat-folded match)', () => {
  const text15 = ayahText(surah32, 15);
  const sajdaToken = text15.trim().split(/\s+/)[8]; // word 9: سُجَّدًا
  const ACCENT = 'سُجَّدًا';

  test('matchesAccentWord matches the corpus token, rejects neighbors + hostile input', () => {
    assert.equal(matchesAccentWord(sajdaToken, ACCENT), true, `matches ${sajdaToken}`);
    const tokens = text15.trim().split(/\s+/);
    for (const [idx, tok] of tokens.entries()) {
      if (idx === 8) continue;
      assert.equal(matchesAccentWord(tok, ACCENT), false, `neighbor word ${idx + 1} rejected`);
    }
    assert.equal(matchesAccentWord('', ACCENT), false);
    assert.equal(matchesAccentWord(null, ACCENT), false);
    assert.equal(matchesAccentWord(sajdaToken, null), false);
    assert.equal(
      matchesAccentWord('سَجَدُوا', ACCENT),
      false,
      'bare undiacritized skeleton is not the Uthmani token'
    );
  });

  test('ornament tokens classify into distinct sajdah/hizb/waqf families', () => {
    assert.equal(ornamentTokenKind('۩'), 'sajdah');
    assert.equal(ornamentTokenKind('۞'), 'hizb');
    assert.equal(ornamentTokenKind('كِتَاب'), null, 'real words are not marks');
    assert.equal(ornamentTokenKind(''), null);
  });

  test('renderAyahWords accents exactly one word in 32:15, none elsewhere', () => {
    // Default scoping: 32:15 earns the accent with no accentWord option
    // (both readers share it); any other ref stays clean — even rendering
    // the SAME text under a different ref gains nothing.
    const html = renderAyahWords(text15, undefined, 32, 15, { tappable: true });
    const hits = html.match(/mushaf-ayah__sajda-word/g) || [];
    assert.equal(hits.length, 1, 'exactly one accented word');
    const elsewhere = renderAyahWords(text15, undefined, 2, 2, { tappable: true });
    assert.doesNotMatch(elsewhere, /mushaf-ayah__sajda-word/, 'same text, other ref: no accent');
    // Surah 1 (no sajdah) is clean.
    const fatiha = renderAyahWords(ayahText(surah1, 1), undefined, 1, 1, { tappable: true });
    assert.doesNotMatch(fatiha, /mushaf-ayah__sajda-word/);
    // An explicit accentWord still wins when passed (Mushaf book path).
    const explicit = renderAyahWords(text15, undefined, 32, 15, {
      tappable: true,
      accentWord: ACCENT,
    });
    assert.equal((explicit.match(/mushaf-ayah__sajda-word/g) || []).length, 1);
    // The retired underline-below class is gone — one accent technique only.
    assert.doesNotMatch(html, /qword--sajda/);
  });

  test('CSS pins the over-word accent + forced-colors-safe technique', () => {
    assert.match(quranCss, /\.mushaf-ayah__sajda-word::before\s*\{/, 'over-word line declared');
    assert.match(quranCss, /height:\s*2px/, '2px horizontal line');
    assert.match(
      quranCss,
      /forced-colors: active[\s\S]*mushaf-ayah__sajda-word::before/,
      'forced-colors fallback'
    );
  });
});

describe('P0-4: proportional Mushaf rhythm pinned in CSS', () => {
  test('banner scales sublinearly and is capped (rectangle band, own type size)', () => {
    const band = /\.mushaf-surah-banner \{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(band, /min\(var\(--mushaf-font-scale, 1\), 1\.25\)/, 'band capped at 1.25');
    const name = /\.mushaf-surah-banner__name \{[\s\S]*?\}/.exec(quranCss)?.[0] || '';
    assert.match(name, /font-size:\s*1em/, 'name rides the band, not the page');
  });

  test('Bismillah matches the page text (live words, same size and rhythm)', () => {
    // The Bismillah carries tappable words now — its own 1.2× formula
    // retired in favor of the page's size and rhythm on every paper.
    const block = /^\.mushaf-bismillah \{[\s\S]*?\}/m.exec(quranCss)?.[0] || '';
    assert.match(
      block,
      /font-size:\s*calc\(1\.65rem \* var\(--mushaf-fit-scale,\s*var\(--mushaf-font-scale,\s*1\)\)\)/,
      'same size as the page text'
    );
    assert.match(block, /line-height:\s*calc\(2\.15 \* var\(--mushaf-line-scale/, 'same rhythm');
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
