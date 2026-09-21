/**
 * tests/p1-roadmap-fixes.test.js — v5.2.74 P1 regressions for
 * Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72:
 *
 * 1. BUG-05: Arabic scripture runs carry lang="ar" (WCAG 3.1.2).
 * 2. BUG-06: classic-reader words use roving tabindex (one tab stop per
 *    ayah) with a named word-study action + arrow-key movement.
 * (BUG-07 is covered by the fixed test itself; BUG-03/BUG-04/UX-01/UP-08
 * below.)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { renderAyahWords } from '../js/views/tafsirPanel.js';
import { renderQuran } from '../js/views/quran.js';
import { renderKids } from '../js/views/kids.js';
import { renderSearch } from '../js/views/search.js';
import { buildTafsirPanel } from '../js/views/tafsirPanel.js';
import { buildMushafAyahDetail } from '../js/views/ayahStudy.js';
import { khatmPanel } from '../js/views/ramadan.js';
import { isSwipeGuardTarget } from '../js/domain/gestures.js';
import {
  buildTafsirIndex,
  resetTafsirIndex,
  isTafsirSearchReady,
} from '../js/domain/tafsirSearch.js';
import { resolveCompareText } from '../js/domain/translationCompare.js';
import { APP_VERSION, DEFAULT_SETTINGS, SCHEMA_VERSION } from '../js/core/config.js';
import { actions, store } from '../js/core/state.js';
import {
  isFuturePayload,
  persistedSnapshot,
  sanitizeRestoredPayload,
} from '../js/core/state/restore.js';
import { saveState } from '../js/core/storage.js';
import { parseBackup } from '../js/services/backup.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');
const surah2 = surah1;
const words1 = readJSON('data/quran-words/1.json');

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en', ...(settingsOverride || {}) },
    activeParams: {},
    activeView: 'quran',
    quran: { meta: quranMeta, surahs: { 1: surah1, 2: surah2 } },
    quranBookmark: {},
    quranWords: { 1: words1 },
    hifzSession: { mode: false },
    recitingAyahKey: null,
    player: null,
    ...rest,
  };
}

const wordTapSpans = (html) => [...html.matchAll(/<span class="qword[^>]*>/g)].map((m) => m[0]);

describe('BUG-05: lang="ar" on Arabic scripture', () => {
  test('classic reader: ayah Arabic, surah name, bismillah carry lang="ar"', () => {
    const html = renderQuran(baseState({ activeParams: { id: '1' } }));
    assert.match(html, /<p class="ayah-card__arabic" dir="rtl" lang="ar">/);
    assert.match(html, /<h1 class="quran-reader__name-ar" dir="rtl" lang="ar">/);
    const list = renderQuran(baseState({ activeParams: {} }));
    assert.match(list, /surah-tile__name-ar" dir="rtl" lang="ar"/);
    const s2 = renderQuran(baseState({ activeParams: { id: '2' } }));
    assert.match(s2, /<p class="quran-bismillah[^>]*dir="rtl" lang="ar">/);
  });

  test('every tappable word span carries lang="ar"', () => {
    const html = renderAyahWords(surah1.ayahs[0].text, words1['1'], 1, 1, { tappable: true });
    const spans = wordTapSpans(html);
    assert.ok(spans.length > 1, 'several tappable words render');
    for (const s of spans) assert.match(s, /lang="ar"/, `word span is Arabic-tagged: ${s}`);
  });
});

describe('BUG-06: roving tabindex on .qword', () => {
  test('exactly one tab stop per ayah card, rest tabindex -1', () => {
    const html = renderAyahWords(surah1.ayahs[0].text, words1['1'], 1, 1, { tappable: true });
    const spans = wordTapSpans(html);
    assert.equal(
      spans.filter((s) => s.includes('tabindex="0"')).length,
      1,
      'first word is the only tab stop'
    );
    assert.equal(
      spans.filter((s) => s.includes('tabindex="-1"')).length,
      spans.length - 1,
      'every later word is reachable by arrows, not Tab'
    );
    assert.ok(spans[0].includes('tabindex="0"'), 'the single stop is the first word');
  });

  test('word spans name the word-study action for screen readers', () => {
    const html = renderAyahWords(surah1.ayahs[0].text, words1['1'], 1, 1, {
      tappable: true,
      lang: 'en',
    });
    const spans = wordTapSpans(html);
    for (const s of spans) assert.match(s, /aria-label="[^"]+ — Open word study"/);
    const ar = renderAyahWords(surah1.ayahs[0].text, words1['1'], 1, 1, {
      tappable: true,
      lang: 'ar',
    });
    assert.match(ar, /aria-label="[^"]+ — فتح دراسة الكلمة"/);
  });

  test('untappable mode renders no word buttons at all', () => {
    assert.doesNotMatch(
      renderAyahWords(surah1.ayahs[0].text, words1['1'], 1, 1, { tappable: false }),
      /data-action="word-tap"/
    );
  });

  test('events.js moves the single tab stop on Left/Right between sibling words', () => {
    const src = readFileSync(new URL('../js/app/events.js', import.meta.url), 'utf8');
    assert.ok(
      src.includes('.qword[data-action="word-tap"]'),
      'keydown handler walks .qword siblings'
    );
  });
});

describe('BUG-03: future-version gate + snapshot stamp', () => {
  const minimalData = () => ({
    settings: {},
    favorites: [],
    collections: [],
    counters: {},
    statistics: {},
  });

  test('snapshots carry the writer schema + app version', () => {
    const snap = persistedSnapshot(store.getState());
    assert.equal(snap.schemaVersion, SCHEMA_VERSION, 'snapshot stamped');
    assert.equal(snap.appVersion, APP_VERSION, 'app version stamped');
    // The stamp rides OUTSIDE the allowlist: restores stay clean.
    const cleaned = sanitizeRestoredPayload(snap);
    assert.equal(cleaned.schemaVersion, undefined, 'stamp never enters live state');
  });

  test('isFuturePayload: only provably-future stamps refuse', () => {
    assert.equal(isFuturePayload({ schemaVersion: SCHEMA_VERSION + 1 }), true);
    assert.equal(isFuturePayload({ schemaVersion: 99 }), true);
    assert.equal(isFuturePayload({ schemaVersion: SCHEMA_VERSION }), false);
    assert.equal(isFuturePayload({}), false, 'versionless legacy accepted');
    assert.equal(isFuturePayload(null), false);
    assert.equal(isFuturePayload({ schemaVersion: 'bogus' }), false, 'hostile stamp accepted');
  });

  test('parseBackup refuses future backups, accepts current + legacy', () => {
    const future = JSON.stringify({
      kind: 'nur-al-dhikr-backup',
      appVersion: '9.9.9',
      schemaVersion: 99,
      data: { ...minimalData(), favorites: ['x'] },
    });
    const refused = parseBackup(future);
    assert.equal(refused.success, false, 'future wrapped backup refused');
    assert.match(refused.error, /newer version/);
    const futureBare = JSON.stringify({ ...minimalData(), schemaVersion: 99 });
    assert.equal(parseBackup(futureBare).success, false, 'future bare snapshot refused');
    const current = JSON.stringify({
      kind: 'nur-al-dhikr-backup',
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      data: minimalData(),
    });
    assert.equal(parseBackup(current).success, true, 'current backup accepted');
    assert.equal(
      parseBackup(JSON.stringify(minimalData())).success,
      true,
      'versionless legacy blob accepted'
    );
  });

  test('hydrate ignores a future on-disk snapshot, still loads legacy', () => {
    saveState({ ...minimalData(), favorites: ['legacy-001'] });
    store.hydrate();
    assert.ok(
      store.getState().favorites.includes('legacy-001'),
      'versionless legacy blob hydrates'
    );
    saveState({ ...minimalData(), schemaVersion: SCHEMA_VERSION + 1, favorites: ['future-001'] });
    store.hydrate();
    const favs = store.getState().favorites;
    assert.ok(favs.includes('legacy-001'), 'current data kept');
    assert.ok(!favs.includes('future-001'), 'future blob never mangled in');
    // Cleanup: leave storage + store as found.
    store.dispatch(actions.toggleFavorite('legacy-001'));
    saveState(null);
  });
});

describe('BUG-04: quran-meta failure renders error + Retry', () => {
  const noMeta = (loadErrors) =>
    baseState({ activeParams: {}, loadErrors, quran: { meta: null, surahs: {} } });

  test('surah list: flag set + meta null renders retry, not a skeleton', () => {
    const html = renderQuran(noMeta({ 'quran-meta': true }));
    assert.match(html, /data-action="retry-load"/, 'retry action renders');
    assert.match(html, /data-key="quran-meta"/, 'retry targets the meta tier');
    assert.doesNotMatch(html, /boot-skeleton/, 'no infinite skeleton');
  });

  test('surah list: no flag still skeletons (fetch in flight)', () => {
    const html = renderQuran(noMeta({}));
    assert.doesNotMatch(html, /data-action="retry-load"/);
  });

  test('kids home: flag set + meta null renders retry, not a skeleton', () => {
    const st = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      quran: { meta: null },
      surahPlayback: null,
      kidsStars: { total: 0, days: {} },
      loadErrors: { 'quran-meta': true },
    };
    const html = renderKids(st);
    assert.match(html, /data-action="retry-load"/, 'retry action renders');
    assert.match(html, /data-key="quran-meta"/, 'retry targets the meta tier');
    assert.doesNotMatch(html, /boot-skeleton/, 'no infinite skeleton');
  });
});

describe('UX-01: mushaf swipe starts on the text column', () => {
  // Selector-aware closest stub: hits list the single selectors the
  // (real) ancestors match, exactly like Element.closest over a path.
  const stub = (hits) => ({
    closest: (sel) =>
      String(sel)
        .split(',')
        .map((s) => s.trim())
        .some((s) => hits.includes(s))
        ? {}
        : null,
  });

  test('touches on ayah/word spans arm the swipe (tap still clicks)', () => {
    assert.equal(isSwipeGuardTarget(stub(['.mushaf-ayah'])), false);
    assert.equal(
      isSwipeGuardTarget(stub(['.mushaf-ayah', '[data-action]'])),
      false,
      'data-action on a text span no longer vetoes the swipe'
    );
    assert.equal(isSwipeGuardTarget(stub(['.qword', '[data-action]'])), false);
  });

  test('true controls and overlays still own their gesture', () => {
    assert.equal(isSwipeGuardTarget(stub(['button', '.mushaf-ayah'])), true);
    assert.equal(isSwipeGuardTarget(stub(['a', '[data-action]'])), true);
    assert.equal(isSwipeGuardTarget(stub(['input'])), true);
    assert.equal(
      isSwipeGuardTarget(stub(['.qword', '[data-action]', '.modal'])),
      true,
      'a word span inside a modal never turns the page behind it'
    );
    assert.equal(isSwipeGuardTarget(stub(['[data-action]'])), true, 'plain actions stay guarded');
    assert.equal(isSwipeGuardTarget(stub([])), false);
  });
});

describe('UP-08a: tafsir group in the Search view', () => {
  const searchState = (q) => ({
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeParams: { q },
    search: { historyList: [] },
    quran: { meta: null, surahs: {} },
    mushaf: { meta: null },
    library: { itemIndex: {} },
    favorites: [],
    counters: {},
    speakingItemId: null,
    tafsir: { muyassar: { 1: { 1: 'commentary on mercy and guidance for readers' } } },
    tafsirEditions: {
      editions: [{ id: 'muyassar', bundled: true, nameEn: 'Al-Muyassar', nameAr: 'الميسر' }],
    },
    loadErrors: {},
  });

  test('tafsir hits render once the index is ready, absent before', () => {
    resetTafsirIndex();
    try {
      const before = renderSearch(searchState('mercy'));
      assert.doesNotMatch(before, /search\.tafsirResults|From the tafsir/);
      buildTafsirIndex('muyassar', { 1: { 1: 'commentary on mercy and guidance for readers' } });
      assert.equal(isTafsirSearchReady(), true);
      const after = renderSearch(searchState('mercy'));
      assert.match(after, /From the tafsir/, 'tafsir group renders');
      assert.match(after, /#\/quran\/1\?ay=1|quran\/1/, 'hit deep-links to the reader');
    } finally {
      resetTafsirIndex();
    }
  });
});

describe('UP-08b: compare-second-tafsir download', () => {
  const editions = {
    editions: [
      {
        id: 'muyassar',
        bundled: true,
        nameEn: 'Al-Muyassar',
        nameAr: 'الميسر',
        authorEn: 'Panel',
        authorAr: 'نخبة',
      },
      {
        id: 'ibn-kathir',
        bundled: false,
        nameEn: 'Ibn Kathir',
        nameAr: 'ابن كثير',
        authorEn: 'Hafiz Ibn Kathir',
        authorAr: 'الحافظ ابن كثير',
      },
    ],
  };
  const panelState = (compareB) => ({
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'en',
      mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, defaultTafsir: 'muyassar' },
      tafsirCompareB: compareB,
    },
    tafsirEditions: editions,
    tafsir: { muyassar: { 1: { 1: 'primary commentary text' } } },
    mushafSession: {},
    loadErrors: {},
  });

  test('uncached remote compare-B offers an explicit download', () => {
    const html = buildTafsirPanel(panelState('ibn-kathir'), 1, 1, 'muyassar');
    assert.match(html, /data-action="tafsir-compare-download"/, 'compare download renders');
    assert.match(html, /data-edition="ibn-kathir"/, 'download targets the picked edition');
  });

  test('cached compare-B still renders text, unknown ids stay silent', () => {
    const cached = panelState('muyassar');
    cached.tafsir = {
      ...cached.tafsir,
      'ibn-kathir': { 1: { 1: 'second commentary text' } },
    };
    const html = buildTafsirPanel(
      { ...cached, settings: { ...cached.settings } },
      1,
      1,
      'muyassar'
    );
    assert.doesNotMatch(html, /tafsir-compare-download/, 'no download when cached');
    const ghost = buildTafsirPanel(panelState('ghost-edition'), 1, 1, 'muyassar');
    assert.doesNotMatch(ghost, /tafsir-compare-download/, 'unknown id never errors');
  });

  test('the new handler is wired in the quran handlers', () => {
    const src = readFileSync(new URL('../js/app/handlers/quran.js', import.meta.url), 'utf8');
    assert.ok(src.includes("'tafsir-compare-download'"), 'handler registered');
  });
});

describe('UP-08c: translation compare in the study modal', () => {
  const modalState = (compareB, overlay) => ({
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'en',
      showTranslation: true,
      quranTranslation: 'en-sahih',
      quranTranslationB: compareB,
    },
    quran: { meta: null, surahs: {}, translationB: overlay },
    ayahBookmarks: [],
    mushafSession: {},
  });
  const overlay = { 1: { edKey: 'ur-jalandhry', byAyah: { 1: 'اردو ترجمہ' } } };

  test('resolveCompareText: only on + landed overlays resolve', () => {
    const eds = [
      { id: 'en-sahih', native: 'English', dir: 'ltr' },
      { id: 'ur-jalandhry', native: 'اردو', dir: 'rtl' },
    ];
    const st = modalState('ur-jalandhry', overlay);
    const hit = resolveCompareText(st, eds, 1, 1);
    assert.deepEqual(hit, { edition: eds[1], lang: 'ur', text: 'اردو ترجمہ' });
    assert.equal(resolveCompareText(modalState(null, overlay), eds, 1, 1), null, 'compare off');
    assert.equal(
      resolveCompareText(modalState('en-sahih', overlay), eds, 1, 1),
      null,
      'inline edition never compares'
    );
    assert.equal(resolveCompareText(modalState('ur-jalandhry', {}), eds, 1, 1), null, 'not landed');
    assert.equal(
      resolveCompareText(modalState('ghost', overlay), eds, 1, 1),
      null,
      'unknown edition'
    );
  });

  test('study modal renders the compare line with its own lang + dir', () => {
    const html = buildMushafAyahDetail(
      surah1.ayahs[0].text,
      surah1,
      1,
      1,
      modalState('ur-jalandhry', overlay),
      null
    );
    assert.match(html, /mushaf-ayah-detail__translation--compare/);
    assert.match(html, /lang="ur"/);
    assert.match(html, /dir="rtl"/);
    const off = buildMushafAyahDetail(
      surah1.ayahs[0].text,
      surah1,
      1,
      1,
      modalState(null, {}),
      null
    );
    assert.doesNotMatch(off, /translation--compare/, 'compare off renders one translation');
  });
});

describe('UP-08d: ramadan khatm pace panel', () => {
  const ramadanHijri = { year: 1447, month: 9, day: 10 };
  const khatmState = (pages) => ({
    mushafPagesRead: Object.fromEntries(pages.map((p) => [String(p), true])),
  });

  test('in-Ramadan renders pace: read count + pages-per-day', () => {
    const html = khatmPanel(khatmState([1, 2, 3]), 'en', ramadanHijri, 30);
    assert.match(html, /3 \/ 604/, 'read count renders');
    assert.match(html, /601|20|21/, 'per-day need renders');
    assert.match(html, /On pace for khatm|A page at a time/, 'track verdict renders');
  });

  test('outside Ramadan renders nothing', () => {
    assert.equal(khatmPanel(khatmState([1]), 'en', { year: 1447, month: 8, day: 29 }, 30), '');
    assert.equal(khatmPanel(khatmState([1]), 'en', null, 30), '');
  });

  test('both languages carry the new strings', () => {
    const ar = khatmPanel(khatmState([]), 'ar', ramadanHijri, 30);
    assert.match(ar, /إيقاع ختم القرآن/);
    assert.doesNotMatch(ar, /khatmTitle/, 'no raw i18n key leaks');
  });
});
