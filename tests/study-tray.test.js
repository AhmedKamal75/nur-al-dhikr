/**
 * tests/study-tray.test.js — merged-plan item 7 (v5.17.54), permanent.
 *
 * The inline Qur'an study tray: tapping an ayah's Study control renders the
 * SAME study panel inline UNDER the tapped ayah row (classic reader cards +
 * mushaf translation-tray rows), never a modal. Word taps inside select
 * lemma/root/grammar chips in place. Every panel names its edition/source,
 * translation never shares the Uthmani styling, gaps speak through the ONE
 * missing-data pattern (item 6), the modal path keeps working, both
 * languages render, and there is no gamification anywhere.
 *
 * What it pins:
 *  1. Tray state — STUDY_TRAY_SET canonicalizes, hostile payloads no-op,
 *     identical sets return state, CLOSE clears, NAVIGATE closes.
 *  2. Tray render — under the ayah row (classic + mushaf), with the modal
 *     shortcut preserved and all three actions emitted + handled.
 *  3. Word chips — per-word lemma/root/grammar chips; selection shows the
 *     detail with the shared sources block (rule 6: wordSourcesHTML).
 *  4. Source labels — translation edition, tafsir author, word sources.
 *  5. Honest absence — missing translation/tafsir via missingDataHTML;
 *     AR stays silent (the disclosure rule).
 *  6. Visual contract — translation never shares the Uthmani classes or
 *     CSS rules; new CSS uses existing tokens + logical properties only.
 *  7. Parity — EN+AR titles/labels, no Latin leakage in AR chrome keys.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { t } from '../js/core/i18n.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { buildStudyTray, studyTrayKey, isStudyTrayOpen } from '../js/views/studyTray.js';
import { renderQuran } from '../js/views/quran.js';
import { renderMushaf, buildMushafAyahDetail } from '../js/views/mushafReader.js';
import { mergedClickHandlers } from '../js/app/events.js';

const ROOT = join(import.meta.dirname, '..');
const readJSON = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const readProject = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const quranMeta = readJSON('data/quran-meta.json');
const mushafMeta = readJSON('data/mushaf-meta.json');
const surah1 = readJSON('data/quran/1.json');
const pageDocs = { 1: readJSON('data/mushaf/1.json'), 2: readJSON('data/mushaf/2.json') };

const WORDS_1_1 = [
  {
    i: 1,
    text: 'بِسْمِ',
    lemma: 'اسْم',
    root: 'سمو',
    posEn: 'Noun',
    posAr: 'اسم',
    caseEn: 'Genitive (majrūr)',
    caseAr: 'مجرور',
    en: 'In (the) name',
    translit: "bis'mi",
    pgn: [{ ar: 'مذكر', en: 'Masculine' }],
    prefixes: [{ form: 'بِ', ar: 'حرف جر', en: 'Preposition' }],
    suffixes: [],
  },
  {
    i: 2,
    text: 'اللَّهِ',
    lemma: 'اللَّه',
    root: 'أله',
    posEn: 'Noun',
    posAr: 'اسم',
    caseEn: 'Genitive (majrūr)',
    caseAr: 'مجرور',
    en: 'of Allah',
    translit: 'allāhi',
    pgn: [],
    prefixes: [],
    suffixes: [],
  },
];

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en', ...(settingsOverride || {}) },
    activeView: 'quran',
    activeParams: { id: '1' },
    studyTray: null,
    quran: { meta: quranMeta, surahs: { 1: surah1 } },
    mushaf: { meta: mushafMeta, pages: pageDocs },
    quranWords: { 1: { 1: WORDS_1_1 } },
    quranRoots: { سمو: { count: 2, occ: [{ s: 1, a: 1, t: 'بِسْمِ' }] } },
    wordDict: {
      index: { اسْم: { ar: 'الاسم: اللفظ الدال على الذات', en: 'noun: a name', syn: [], ant: [] } },
      failed: false,
    },
    rootsMeaning: {
      index: {
        سمو: { root: 'سمو', ar: 'العلو والارتفاع', en: 'height', rootLetters: ['س', 'م', 'و'] },
      },
      failed: false,
    },
    tafsirEditions: {
      editions: [
        { id: 'muyassar', nameEn: 'M', nameAr: 'م', authorEn: 'A', authorAr: 'أ', bundled: true },
        { id: 'jalalayn', nameEn: 'J', nameAr: 'ج', authorEn: 'B', authorAr: 'ب', bundled: true },
      ],
    },
    tafsir: { muyassar: { 1: { 1: 'txt' } }, jalalayn: { 1: { 1: 'txt2' } } },
    mushafSession: { bookmarkFilter: '__all__', tafsirTab: null },
    readerWindow: { surah: '1', from: 1, to: 7, ayParam: null },
    recitingAyahKey: null,
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    ayahBookmarks: [],
    hifzSession: { mode: false, surah: null, level: 'word', revealed: {}, test: null, mcq: null },
    hifzRecords: {},
    hifzAyahRecords: {},
    readerImmersive: false,
    mushafFullscreen: false,
    ...rest,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Tray state                                                       */
/* ------------------------------------------------------------------ */

describe('study tray state: open, clamp, close', () => {
  test('STUDY_TRAY_SET canonicalizes to strings; identical sets no-op', () => {
    const s0 = { studyTray: null };
    const s1 = reduce(s0, {
      type: 'STUDY_TRAY_SET',
      surah: '1',
      ayah: '1',
      word: null,
      surface: null,
    });
    assert.deepEqual(s1.studyTray, { surah: '1', ayah: '1', word: null, surface: null });
    assert.equal(
      reduce(s1, { type: 'STUDY_TRAY_SET', surah: 1, ayah: 1, word: null, surface: null }),
      s1
    );
  });

  test('hostile payloads no-op (out-of-range, junk, bad word)', () => {
    const s0 = { studyTray: null };
    for (const a of [
      { type: 'STUDY_TRAY_SET', surah: '0', ayah: '1' },
      { type: 'STUDY_TRAY_SET', surah: '115', ayah: '1' },
      { type: 'STUDY_TRAY_SET', surah: '1', ayah: '300' },
      { type: 'STUDY_TRAY_SET', surah: '__proto__', ayah: '1' },
      { type: 'STUDY_TRAY_SET', surah: '1', ayah: '1', word: '0' },
      { type: 'STUDY_TRAY_SET', surah: '1', ayah: '1', word: 'junk' },
    ]) {
      assert.equal(reduce(s0, a), s0, `no-op: ${JSON.stringify(a)}`);
    }
  });

  test('word selection rides the tray; CLOSE clears; unknown CLOSE no-ops', () => {
    const s1 = reduce(
      { studyTray: null },
      { type: 'STUDY_TRAY_SET', surah: '2', ayah: '255', word: 3, surface: 'نُور' }
    );
    assert.deepEqual(s1.studyTray, { surah: '2', ayah: '255', word: 3, surface: 'نُور' });
    const s2 = reduce(s1, { type: 'STUDY_TRAY_CLOSE' });
    assert.equal(s2.studyTray, null);
    assert.equal(reduce(s2, { type: 'STUDY_TRAY_CLOSE' }), s2);
  });

  test('NAVIGATE closes the tray (reading-gesture hygiene)', () => {
    const s = {
      activeView: 'quran',
      activeParams: {},
      settings: { kidsMode: false },
      lastPosition: {},
      studyTray: { surah: '1', ayah: '1', word: null, surface: null },
      mushafFullscreen: false,
      readerImmersive: false,
      onboarding: null,
      ui: {},
    };
    const next = reduce(s, { type: 'NAVIGATE', view: 'mushaf', params: { page: '2' } });
    assert.equal(next.studyTray, null);
  });

  test('studyTrayKey validates; isStudyTrayOpen gates rows', () => {
    assert.equal(studyTrayKey({ studyTray: null }), null);
    assert.equal(studyTrayKey({ studyTray: { surah: '1', ayah: '1' } }), '1:1');
    assert.equal(studyTrayKey({ studyTray: { surah: '999', ayah: '1' } }), null);
    const st = { studyTray: { surah: '2', ayah: '255', word: null, surface: null } };
    assert.ok(isStudyTrayOpen(st, 2, 255));
    assert.ok(!isStudyTrayOpen(st, 2, 256));
  });
});

/* ------------------------------------------------------------------ */
/* 2. Tray render — under the row, modal shortcut kept                 */
/* ------------------------------------------------------------------ */

describe('study tray render: the same panel under the row', () => {
  test('classic card carries the tray under its own row only', () => {
    const html = renderQuran(
      baseState({ studyTray: { surah: '1', ayah: '1', word: null, surface: null } })
    );
    assert.ok(html.includes('data-action="study-tray-toggle"'), 'toggle emitted');
    assert.ok(html.includes('data-study-tray="1:1"'), 'tray renders');
    const cardAt = html.indexOf('id="ayah-1"');
    const trayAt = html.indexOf('data-study-tray="1:1"');
    assert.ok(cardAt >= 0 && trayAt > cardAt, 'tray sits under ayah-1 row');
    assert.equal((html.match(/data-study-tray="/g) || []).length, 1, 'exactly one open tray');
    assert.ok(html.includes('aria-expanded="true"'), 'open toggle pressed');
    assert.ok(html.includes('data-action="tafsir-open"'), 'modal shortcut preserved');
  });

  test('closed tray: toggles render collapsed, no panel', () => {
    const html = renderQuran(baseState());
    assert.ok(html.includes('data-action="study-tray-toggle"'), 'toggle emitted');
    assert.ok(!html.includes('data-study-tray='), 'no panel when closed');
    assert.ok(html.includes('aria-expanded="false"'), 'collapsed state honest');
  });

  test('mushaf translation-tray row carries the tray under its row', () => {
    const st = baseState({
      activeView: 'mushaf',
      activeParams: { page: '1' },
      studyTray: { surah: '1', ayah: '1', word: null, surface: null },
      settings: { mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, translationPanel: true } },
    });
    const html = renderMushaf(st);
    assert.ok(html.includes('mushaf-tray__study'), 'tray wrapper under the row');
    assert.ok(html.includes('data-study-tray="1:1"'), 'tray renders');
    assert.ok(html.includes('data-action="mushaf-ayah-tap"'), 'modal path untouched');
  });

  test('every tray action resolves to a handler (no route/handler breakage)', () => {
    for (const a of ['study-tray-toggle', 'study-tray-close', 'study-tray-word']) {
      assert.ok(mergedClickHandlers[a], `${a} has a handler`);
    }
    for (const a of ['tafsir-open', 'word-tap', 'mushaf-ayah-tap', 'tafsir-tab']) {
      assert.ok(mergedClickHandlers[a], `modal path keeps ${a}`);
    }
  });

  test('the modal builder still renders (modal path kept working)', () => {
    const st = baseState();
    const html = buildMushafAyahDetail('بِسْمِ اللَّهِ', surah1, 1, 1, st, 1);
    assert.ok(html.includes('mushaf-ayah-detail'), 'detail modal renders');
    assert.ok(html.includes('tafsir-tab-muyassar'), 'tafsir tabs render');
  });
});

/* ------------------------------------------------------------------ */
/* 3. Word chips + sources                                             */
/* ------------------------------------------------------------------ */

describe('study tray words: chips inside the tray', () => {
  test('per-word chips carry lemma/root/grammar; selection shows detail + sources', () => {
    const open = baseState({ studyTray: { surah: '1', ayah: '1', word: null, surface: null } });
    const html = buildStudyTray(open, 1, 1, null);
    assert.ok(html.includes('data-action="study-tray-word"'), 'word chips emitted');
    assert.ok(html.includes('بِسْمِ'), 'surface renders');
    assert.ok(html.includes('Noun'), 'grammar summary rides the chip');
    assert.ok(!html.includes('study-tray__word-detail'), 'no detail before selection');

    const sel = baseState({ studyTray: { surah: '1', ayah: '1', word: 1, surface: 'بِسْمِ' } });
    const detail = buildStudyTray(sel, 1, 1, null);
    assert.ok(detail.includes('study-tray__word-detail'), 'detail renders on selection');
    assert.ok(detail.includes('اسْم'), 'lemma chip renders');
    assert.ok(detail.includes('سمو'), 'root chip renders');
    assert.ok(detail.includes('occurrences in the Qur'), 'root count renders');
    assert.ok(detail.includes('word-study__sources'), 'shared sources block renders (rule 6)');
    assert.ok(
      detail.includes('Sources &amp; review') || detail.includes('Sources & review'),
      'sources labelled'
    );
  });

  test('unloaded word tier states loading honestly; hostile ref renders nothing', () => {
    const st = baseState({ quranWords: {} });
    const html = buildStudyTray(st, 1, 1, null);
    assert.ok(html.includes('Preparing meaning'), 'loading hint while the tier is in flight');
    assert.equal(buildStudyTray(st, 0, 1, null), '', 'hostile surah renders nothing');
    assert.equal(buildStudyTray(st, 1, 999, null), '', 'hostile ayah renders nothing');
  });
});

/* ------------------------------------------------------------------ */
/* 4. Source labels on every panel                                     */
/* ------------------------------------------------------------------ */

describe('study tray provenance: every panel names its source', () => {
  test('translation edition + tafsir author + word sources', () => {
    const sel = baseState({ studyTray: { surah: '1', ayah: '1', word: 1, surface: 'بِسْمِ' } });
    const html = buildStudyTray(sel, 1, 1, null);
    assert.ok(
      html.includes('Translation · English — Sahih International'),
      'translation edition labelled'
    );
    assert.ok(html.includes('tafsir-tab-muyassar'), 'tafsir tabs render');
    assert.ok(html.includes('>A<'), 'tafsir author renders');
    assert.ok(html.includes('word-study__sources'), 'word sources render');
  });
});

/* ------------------------------------------------------------------ */
/* 5. Honest absence via the ONE pattern                               */
/* ------------------------------------------------------------------ */

describe('study tray absence: the v5.17.53 pattern, not new strings', () => {
  const noTransSurah = {
    1: {
      nameEn: 'Al-Fatihah',
      nameAr: 'الفاتحة',
      ayahs: [{ number: 1, text: 'بِسْمِ اللَّهِ', translation: '' }],
    },
  };
  test('missing translation states absence in EN through missingDataHTML', () => {
    const st = baseState({ quran: { meta: quranMeta, surahs: noTransSurah } });
    const html = buildStudyTray(st, 1, 1, null);
    assert.ok(html.includes('missing-data--translation-missing'), 'one pattern, translation kind');
    assert.ok(html.includes('No translation available.'), 'honest words, no invented text');
  });

  test('AR stays silent on missing translation (strict separation)', () => {
    const st = baseState({
      quran: { meta: quranMeta, surahs: noTransSurah },
      settings: { language: 'ar' },
    });
    const html = buildStudyTray(st, 1, 1, null);
    assert.ok(
      !html.includes('missing-data--translation-missing'),
      'AR never states translation absence'
    );
    assert.ok(!html.includes('study-tray__translation'), 'AR carries no translation line at all');
  });

  test('empty tafsir ayah speaks through missingDataHTML (tafsir-missing)', () => {
    const st = baseState({ tafsir: { muyassar: { 1: {} } }, jalalayn: undefined });
    const html = buildStudyTray(
      { ...st, tafsir: { muyassar: { 1: {} }, jalalayn: { 1: {} } } },
      1,
      1,
      null
    );
    assert.ok(html.includes('missing-data--tafsir-missing'), 'one pattern, tafsir kind');
  });
});

/* ------------------------------------------------------------------ */
/* 6. Visual contract: translation never equal to Uthmani              */
/* ------------------------------------------------------------------ */

describe('study tray visual contract: translation ≠ Uthmani', () => {
  test('distinct classes, distinct CSS rules', () => {
    const html = buildStudyTray(baseState(), 1, 1, null);
    assert.ok(html.includes('class="study-tray__arabic" dir="rtl" lang="ar"'), 'Uthmani line');
    assert.ok(html.includes('class="study-tray__translation"'), 'translation line');
    const css = readProject('assets/css/quran.css');
    const rule = (sel) => new RegExp(`${sel}\\s*\\{[^}]*\\}`, 's').exec(css)?.[0] || '';
    const arabicRule = rule('\\.study-tray__arabic');
    const transRule = rule('\\.study-tray__translation');
    assert.ok(arabicRule.includes('var(--font-arabic)'), 'Uthmani rides the Arabic typeface');
    assert.ok(arabicRule.includes('var(--fs-arabic-card)'), 'Uthmani rides the large size');
    assert.ok(!transRule.includes('font-arabic'), 'translation never takes the Arabic face');
    assert.ok(transRule.includes('var(--color-text-secondary)'), 'translation is secondary');
    assert.ok(transRule.includes('var(--fs-sm)'), 'translation is small');
  });

  test('tray CSS: existing tokens only, logical properties only', () => {
    const css = readProject('assets/css/quran.css');
    const block = css.slice(css.indexOf('merged-plan item 7'));
    assert.ok(block.length > 500, 'tray styles ship in quran.css');
    const defined = [...block.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]);
    assert.deepEqual(defined, [], `no new custom properties: ${defined.join(', ')}`);
    const variables = readProject('assets/css/variables.css');
    const missing = [
      ...new Set([...block.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1])),
    ].filter((tok) => !variables.includes(tok));
    assert.deepEqual(missing, [], `unresolved tokens: ${missing.join(', ')}`);
    assert.ok(
      !/(margin-left|margin-right|padding-left|padding-right)\s*:/.test(block),
      'logical properties only'
    );
  });
});

/* ------------------------------------------------------------------ */
/* 7. Bilingual parity + no gamification                               */
/* ------------------------------------------------------------------ */

describe('study tray parity: EN+AR, calm, no games', () => {
  test('tray keys are twinned with genuine translations', () => {
    for (const k of [
      'study.trayTitle',
      'study.trayClose',
      'study.trayTranslation',
      'study.trayWords',
    ]) {
      assert.ok(en[k] && en[k] !== k, `${k} exists in EN`);
      assert.ok(ar[k] && ar[k] !== k, `${k} exists in AR`);
      assert.notEqual(ar[k], en[k], `${k}: AR is a translation, not a copy`);
    }
    assert.match(ar['study.trayTitle'], /[؀-ۿ]/u, 'AR title carries Arabic script');
  });

  test('AR tray renders Arabic chrome, EN renders English', () => {
    const enHtml = buildStudyTray(baseState(), 1, 1, null);
    const arHtml = buildStudyTray(baseState({ settings: { language: 'ar' } }), 1, 1, null);
    assert.ok(enHtml.includes('Ayah study'), 'EN title');
    assert.ok(arHtml.includes('دراسة الآية'), 'AR title');
    assert.ok(arHtml.includes('كلمة بكلمة'), 'AR words label');
    assert.ok(!arHtml.includes('study.tray'), 'no raw key leaks in AR');
  });

  test('no gamification vocabulary anywhere in the tray', () => {
    const html = buildStudyTray(
      baseState({ studyTray: { surah: '1', ayah: '1', word: 1, surface: 'بِسْمِ' } }),
      1,
      1,
      null
    );
    assert.ok(
      !/confetti|celebrat|streak|leaderboard|reward|shame|punish/i.test(html),
      'calm, never a game'
    );
  });
});
