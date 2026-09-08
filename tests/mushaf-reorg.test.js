/**
 * tests/mushaf-reorg.test.js — regroup guards for the Mushaf reorganization:
 * navigation stays pure navigation, progress lives in its own TRACK panel,
 * study owns memorize/hifz, and the two historic losses can never recur
 * (translationPanel ONLY in the ⋯ sheet; follow-along always visible).
 *
 * Also pins the zero-feature-loss inventory: every data-action + pref
 * toggle the pre-reorg surfaces emitted must still be emitted somewhere,
 * with the one intentional addition (mushaf-open-track, the new TRACK
 * panel's entry point) explicitly allowlisted.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  renderMushaf,
  buildMushafAyahDetail,
  buildMushafSheet,
  buildMushafJump,
  buildMushafTrack,
  buildMushafBookmarks,
  buildMushafPlayPick,
  buildKhatmaPlanForm,
} from '../js/views/mushafReader.js';
import {
  buildMushafSettingsPanel,
  buildTafsirPanel,
  buildWordStudyPanel,
} from '../js/views/tafsirPanel.js';
import { buildTajweedSettingsPanel } from '../js/views/tajweedSettings.js';
import { buildPracticePicker, buildPracticeRound } from '../js/views/tajweedPracticeView.js';
import { renderPlayerBar } from '../js/views/playerBar.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { mergedClickHandlers } from '../js/app/events.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const mushafMeta = readJSON('data/mushaf-meta.json');
const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');
const surah2 = readJSON('data/quran/2.json');
const pageDocs = {};
for (const n of [1, 2]) {
  pageDocs[n] = readJSON(`data/mushaf/${n}.json`);
}

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'en',
      audio: { ayahFollow: true },
      ...(settingsOverride || {}),
    },
    activeParams: { page: 1 },
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: { 1: surah1, 2: surah2 } },
    mushaf: { meta: mushafMeta, pages: pageDocs },
    mushafBookmark: { page: 1 },
    ayahBookmarks: [{ key: '1:1', surah: 1, ayah: 1, page: 1, ts: 1, note: '', folderId: null }],
    ayahBookmarkFolders: [{ id: 'f1', name: 'F1', createdAt: 1 }],
    quranWords: {},
    quranRoots: null,
    tafsirEditions: {
      editions: [
        { id: 'muyassar', nameEn: 'M', nameAr: 'م', authorEn: 'A', authorAr: 'أ', bundled: true },
        { id: 'jalalayn', nameEn: 'J', nameAr: 'ج', authorEn: 'B', authorAr: 'ب', bundled: true },
      ],
    },
    tafsir: { muyassar: { 1: { 1: 'txt' } }, jalalayn: { 1: { 1: 'txt2' } } },
    activeWordStudy: { surah: 1, ayah: 1, i: 1 },
    tajweedPool: null,
    tajweedPracticeStats: { totalAttempts: 0, currentStreak: 0, bestStreak: 0 },
    hifzRecords: {},
    mushafPagesRead: { 1: true },
    khatmaPlan: { startDate: '2026-01-01', targetDate: '2026-02-01', dailyTarget: 20 },
    khatmaHistory: [{ id: 'h1', completedAt: '2026-01-01', days: 30, pages: 604 }],
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    mushafFullscreen: false,
    recitingAyahKey: null,
    player: null,
    ...rest,
  };
}

const actionsOf = (html) => new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));
const keysOf = (html) => new Set([...html.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]));

/* ------------------------------------------------------------------ */
/* Navigation purity: the Jump drawer carries no progress              */
/* ------------------------------------------------------------------ */

describe('mushaf regroup: Jump drawer is pure navigation', () => {
  test('jump has page form + surah/juz jumps and zero khatma UI', () => {
    const html = buildMushafJump(baseState());
    assert.ok(html.includes('data-form="mushaf-jump-page"'), 'page form stays in Go');
    assert.ok(html.includes('data-action="mushaf-jump-page"'), 'surah/juz jumps stay in Go');
    for (const a of ['khatma-open-plan', 'khatma-clear-plan', 'mushaf-reset-progress']) {
      assert.ok(!html.includes(`data-action="${a}"`), `jump must not emit ${a}`);
    }
    assert.ok(!html.includes('mushaf-khatma'), 'no khatma block inside the Go drawer');
  });

  test('track panel carries the full khatma surface the drawer used to hold', () => {
    const html = buildMushafTrack(baseState());
    for (const a of ['khatma-open-plan', 'khatma-clear-plan', 'mushaf-reset-progress']) {
      assert.ok(html.includes(`data-action="${a}"`), `track panel emits ${a}`);
    }
    assert.ok(html.includes('progressbar'), 'reading progress bar lives in Track');
    assert.ok(html.includes('modal-title-mushaf-track'), 'track panel has its own title');
  });

  test('every track action resolves to a registered click handler', () => {
    for (const a of [
      'mushaf-open-track',
      'khatma-open-plan',
      'khatma-clear-plan',
      'mushaf-reset-progress',
    ]) {
      assert.ok(mergedClickHandlers[a], `${a} has a handler in the single delegation table`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* The two historic losses                                             */
/* ------------------------------------------------------------------ */

describe('mushaf regroup: the two historic losses stay fixed', () => {
  test('translationPanel toggle exists ONLY in the sheet, never in display settings', () => {
    const sheetKeys = keysOf(buildMushafSheet(baseState()));
    const settingsKeys = keysOf(
      buildMushafSettingsPanel(
        baseState({
          settings: {
            mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, tajweedColoring: true },
          },
        })
      )
    );
    assert.ok(sheetKeys.has('translationPanel'), 'sheet keeps the translation toggle');
    assert.ok(!settingsKeys.has('translationPanel'), 'display settings must not gain it');
  });

  test('follow-along toggle stays visible even when not reciting', () => {
    const on = buildMushafSheet(baseState());
    const off = buildMushafSheet(baseState({ settings: { audio: { ayahFollow: false } } }));
    assert.ok(on.includes('data-action="recite-follow-toggle"'), 'follow toggle when following');
    assert.ok(
      off.includes('data-action="recite-follow-toggle"'),
      'follow toggle when not following'
    );
  });
});

/* ------------------------------------------------------------------ */
/* Correct categorization                                              */
/* ------------------------------------------------------------------ */

describe('mushaf regroup: study owns memorize, track owns khatma', () => {
  test('sheet study section holds memorize + practice + roots siblings', () => {
    const html = buildMushafSheet(baseState());
    // Section headings render the translated labels, not the key names.
    const headings = [...html.matchAll(/mushaf-jump__heading">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(headings, ['Go', 'Display', 'Study', 'Listen', 'Progress']);
    const studyStart = html.indexOf('>Study<');
    const listenStart = html.indexOf('>Listen<');
    const study = html.slice(studyStart, listenStart);
    assert.ok(study.includes('mem=1'), 'memorize link is STUDY');
    assert.ok(study.includes('data-action="practice-open"'), 'practice is STUDY');
  });

  test('ayah detail keeps the hifz row in both record states', () => {
    const fresh = buildMushafAyahDetail('نص', surah1, 1, 1, baseState(), 1);
    const recorded = buildMushafAyahDetail(
      'نص',
      surah1,
      1,
      1,
      baseState({ hifzRecords: { 1: {} } }),
      1
    );
    assert.ok(fresh.includes('data-action="hifz-mark"'), 'fresh surah offers hifz-mark');
    assert.ok(recorded.includes('data-action="hifz-review"'), 'recorded surah offers hifz-review');
  });

  test('sheet track section links the progress panel (khatma is TRACK)', () => {
    const html = buildMushafSheet(baseState());
    const trackStart = html.indexOf('>Progress<');
    assert.ok(trackStart > 0, 'labeled Progress section exists');
    assert.ok(
      html.slice(trackStart).includes('data-action="mushaf-open-track"'),
      'sheet links the Track panel'
    );
  });
});

/* ------------------------------------------------------------------ */
/* Display settings: grouped toggles, nested sub-option, study links  */
/* ------------------------------------------------------------------ */

describe('mushaf regroup: display settings stay complete and grouped', () => {
  const settingsHTML = () =>
    buildMushafSettingsPanel(
      baseState({
        settings: { mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, tajweedColoring: true } },
      })
    );

  test('all six pref toggles still emitted, translationPanel still absent', () => {
    const keys = keysOf(settingsHTML());
    for (const k of [
      'spread',
      'pageFlipAnimation',
      'wordByWordStudy',
      'wordUnderline',
      'tajweedColoring',
      'tajweedInspector',
    ]) {
      assert.ok(keys.has(k), `settings keep ${k}`);
    }
    assert.ok(!keys.has('translationPanel'), 'translationPanel stays sheet-only');
  });

  test('reading toggles and study aids render under separate headings', () => {
    const html = settingsHTML();
    const headings = [...html.matchAll(/mushaf-jump__heading">([^<]+)</g)].map((m) => m[1]);
    const readingAt = headings.indexOf('Reading');
    const studyAt = headings.indexOf('Study aids');
    assert.ok(
      readingAt >= 0 && studyAt > readingAt,
      `headings order sane: ${headings.join(' / ')}`
    );
    const reading = html.slice(html.indexOf('>Reading<'), html.indexOf('>Study aids<'));
    const study = html.slice(html.indexOf('>Study aids<'));
    assert.ok(reading.includes('data-key="spread"'), 'spread is Reading');
    assert.ok(reading.includes('data-key="pageFlipAnimation"'), 'flip animation is Reading');
    assert.ok(!reading.includes('data-key="tajweedColoring"'), 'tajweed is not Reading');
    for (const k of ['wordByWordStudy', 'wordUnderline', 'tajweedColoring', 'tajweedInspector']) {
      assert.ok(study.includes(`data-key="${k}"`), `${k} is Study aids`);
    }
  });

  test('underline nests under word study; study links pair practice with rules', () => {
    const html = settingsHTML();
    assert.ok(
      html.includes('toggle-row--sub') && html.includes('data-key="wordUnderline"'),
      'underline renders as a nested sub-option'
    );
    assert.ok(html.includes('data-action="practice-open"'), 'practice entry stays');
    assert.ok(html.includes('data-action="tajweed-open-settings"'), 'rules entry added');
    assert.ok(html.includes('mushaf-settings__study-links'), 'entries share one group');
  });
});

/* ------------------------------------------------------------------ */
/* Zero feature loss across every Mushaf surface                       */
/* ------------------------------------------------------------------ */

describe('mushaf regroup: zero feature loss', () => {
  // Every (action) the pre-reorg tree emitted, harvested by rendering all
  // surfaces in Node. The single intentional addition is allowlisted.
  const BASELINE_ACTIONS = [
    'ayah-share',
    'bookmark-delete-folder',
    'bookmark-filter-folder',
    'bookmark-new-folder',
    'hifz-mark',
    'hifz-review',
    'khatma-clear-plan',
    'khatma-open-plan',
    'khatma-ramadan-preset',
    'mushaf-ayah-tap',
    'mushaf-copy-ayah',
    'mushaf-jump-page',
    'mushaf-more',
    'mushaf-next',
    'mushaf-open-bookmarks',
    'mushaf-open-in-study',
    'mushaf-open-jump',
    'mushaf-open-settings',
    'mushaf-prev',
    'mushaf-remove-bookmark',
    'mushaf-reset-progress',
    'mushaf-set-bismillah',
    'mushaf-set-font',
    'mushaf-set-paper',
    'mushaf-toggle-bookmark',
    'mushaf-toggle-fullscreen',
    'navigate',
    'play-ayah',
    'player-close',
    'player-next',
    'player-prev',
    'player-rate',
    'player-repeat',
    'player-toggle',
    'practice-check',
    'practice-open',
    'practice-start',
    'practice-tap',
    'practice-this-ayah',
    'quran-range-open',
    'recite-ayah-next',
    'recite-ayah-prev',
    'recite-compare-toggle',
    'recite-echo-toggle',
    'recite-follow-toggle',
    'recite-listen-toggle',
    'recite-loop-toggle',
    'recite-pause-toggle',
    'recite-repeat-toggle',
    'recite-sleep-cycle',
    'recite-speed-cycle',
    'recite-stop',
    'recite-voice-open',
    'surah-play',
    'tafsir-compare',
    'tafsir-download',
    'tafsir-open',
    'tafsir-tab',
    'tajweed-open-settings',
    'tajweed-reset',
    'tajweed-set-color',
    'tajweed-toggle-rule',
    'toggle-mushaf-pref',
    'word-tap',
  ];
  const BASELINE_KEYS = [
    'pageFlipAnimation',
    'spread',
    'tajweedColoring',
    'tajweedInspector',
    'translationPanel',
    'wordByWordStudy',
    'wordUnderline',
  ];
  // Intentional additions only: the new TRACK panel entry point.
  const ALLOWED_ADDITIONS = new Set(['mushaf-open-track']);

  function currentUnion() {
    const s = baseState();
    const tray = baseState({
      settings: {
        mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, translationPanel: true },
      },
    });
    const colored = baseState({
      settings: { mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, tajweedColoring: true } },
    });
    const comparing = baseState({
      settings: { tafsirCompareB: 'jalalayn' },
    });
    const remote = baseState({
      settings: {
        mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, defaultTafsir: 'remote1' },
      },
      tafsirEditions: {
        editions: [
          { id: 'muyassar', nameEn: 'M', nameAr: 'م', authorEn: 'A', authorAr: 'أ', bundled: true },
          { id: 'jalalayn', nameEn: 'J', nameAr: 'ج', authorEn: 'B', authorAr: 'ب', bundled: true },
          { id: 'remote1', nameEn: 'R', nameAr: 'ر', authorEn: 'C', authorAr: 'ج', bundled: false },
        ],
      },
    });
    const reciting = baseState({
      surahPlayback: {
        active: true,
        surah: 1,
        ayah: 1,
        total: 7,
        queue: [1],
        qIndex: 0,
        repeat: 1,
        continuous: false,
        listenRepeat: false,
        compare: false,
        loop: 1,
        speed: 1,
        paused: false,
        waiting: false,
        reciterId: 'ar.alafasy',
      },
    });
    const surfaces = [
      renderMushaf(s),
      renderMushaf({ ...s, mushafFullscreen: true }),
      renderMushaf(tray),
      buildMushafJump(s),
      buildMushafTrack(s),
      buildMushafSheet(s),
      buildMushafSheet(baseState({ settings: { audio: { ayahFollow: false } } })),
      buildMushafSettingsPanel(colored),
      buildTajweedSettingsPanel(s),
      buildMushafAyahDetail('نص', surah1, 1, 1, s, 1),
      buildMushafAyahDetail('نص', surah1, 1, 1, baseState({ hifzRecords: { 1: {} } }), 1),
      buildWordStudyPanel(s),
      buildTafsirPanel(comparing, 1, 1, null),
      buildTafsirPanel(remote, 1, 1, null),
      buildMushafPlayPick(s),
      buildMushafBookmarks(s),
      buildKhatmaPlanForm(s),
      buildPracticePicker(s),
      buildPracticeRound(s, {
        ruleId: 'mixed',
        text: 'بسم الله الرحمن',
        surah: 1,
        ayah: 1,
        selected: new Set(),
        checked: false,
      }),
      renderPlayerBar(reciting),
      renderPlayerBar(
        baseState({
          player: { moshafId: 'x', surah: 1, playing: true, offline: false },
          settings: { customReciters: [] },
        })
      ),
    ];
    const actions = new Set();
    const keys = new Set();
    for (const html of surfaces) {
      for (const a of actionsOf(html)) actions.add(a);
      for (const k of keysOf(html)) {
        if (!/^\d+:\d+$/.test(k)) keys.add(k);
      }
    }
    return { actions, keys };
  }

  test('no baseline action lost; only the allowlisted entry point added', () => {
    const { actions } = currentUnion();
    const missing = BASELINE_ACTIONS.filter((a) => !actions.has(a));
    const added = [...actions].filter(
      (a) => !BASELINE_ACTIONS.includes(a) && !ALLOWED_ADDITIONS.has(a)
    );
    assert.deepEqual(missing, [], `lost actions: ${missing.join(', ')}`);
    assert.deepEqual(added, [], `unplanned new actions: ${added.join(', ')}`);
  });

  test('no baseline pref toggle lost', () => {
    const { keys } = currentUnion();
    const missing = BASELINE_KEYS.filter((k) => !keys.has(k));
    assert.deepEqual(missing, [], `lost pref toggles: ${missing.join(', ')}`);
  });
});
