/**
 * tests/p2-roadmap-fixes.test.js — v5.2.75 P2 regressions for
 * Nur-al-Dhikr-Agent2-Overhaul-Roadmap-v5.2.72:
 *
 * 1. BUG-08: rapid double-tap on two ayah play buttons must not toast a
 *    spurious failure nor wipe the audible ayah's highlight.
 * (More P2 suites appended below as each fix lands.)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  play,
  stop,
  currentlyPlayingKey,
  onPlaybackError,
  resetRecitationForTests,
} from '../js/services/recitation.js';
import { actions, store } from '../js/core/state.js';
import { ensureHadithSearchIndex, isHadithIndexAllConfirmed } from '../js/app/hadithData.js';
import { buildTriggerPlan } from '../js/services/alertTriggers.js';
import {
  planCacheEviction,
  enforceAudioCacheCap,
  ensurePersistentStorage,
  resetPersistForTests,
  setAudioCacheCapForTests,
  AUDIO_CACHE_DEFAULT_MAX_BYTES,
} from '../js/services/audioStore.js';
import { wipeAppDataForReset } from '../js/app/drawer.js';
import { PALETTES, DEFAULT_SETTINGS } from '../js/core/config.js';
import { updateQiblaCompassDOM, renderQibla } from '../js/views/qibla.js';
import { renderQuran } from '../js/views/quran.js';
import { hadithCardHTML } from '../js/views/hadithCard.js';
import { ayahCardMemoStats, resetAyahCardMemoForTests } from '../js/views/quran.js';
import { dueCounts } from '../js/domain/hifz.js';
import { juzPageRanges, juzReadStates } from '../js/services/mushaf.js';
import { memorizationPanel } from '../js/views/statistics.js';
import { isQuietNow, effectiveAdhanVolume } from '../js/services/prayerSound.js';
import { sanitizeSettings } from '../js/core/config.js';
import { t } from '../js/core/i18n.js';
import { SEED_MODE } from './helpers/seedMode.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

/** Minimal reader state over the real bundled corpus (mirrors p1 file). */
function quranReaderState() {
  return {
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    activeParams: { id: '1' },
    activeView: 'quran',
    quran: { meta: readJSON('data/quran-meta.json'), surahs: { 1: readJSON('data/quran/1.json') } },
    quranBookmark: {},
    quranWords: {},
    hifzSession: { mode: false },
    recitingAyahKey: null,
    player: null,
  };
}

describe('PERF-01: per-ayah card memo', () => {
  // Like the live store, one parsed corpus is shared across renders —
  // the memo keys on ayah object identity, so re-parsing per render
  // would (correctly) miss every time.
  const cardClasses = (html, n) => {
    const m = String(html).match(new RegExp(`<div class="([^"]*)" id="ayah-${n}"`));
    assert.ok(m, `ayah ${n} renders exactly once`);
    return m[1];
  };

  test('an ayah advance rebuilds only the touched cards', () => {
    const base = quranReaderState();
    resetAyahCardMemoForTests();
    const idle = renderQuran(base);
    const cards = (idle.match(/id="ayah-\d+"/g) || []).length;
    assert.ok(cards > 2, 'a multi-card window renders');
    assert.equal(ayahCardMemoStats.misses, cards, 'first render builds every card');
    resetAyahCardMemoForTests();
    const html1 = renderQuran({ ...base, recitingAyahKey: '1:1' });
    assert.equal(ayahCardMemoStats.misses, 1, 'only the newly reciting card rebuilds');
    assert.equal(ayahCardMemoStats.hits, cards - 1, 'standing cards reuse the memo');
    assert.ok(cardClasses(html1, 1).includes('ayah-card--reciting'), 'card 1 shows reciting');
    assert.ok(!cardClasses(html1, 2).includes('ayah-card--reciting'), 'card 2 does not');
    resetAyahCardMemoForTests();
    const html2 = renderQuran({ ...base, recitingAyahKey: '1:2' });
    assert.equal(ayahCardMemoStats.misses, 2, 'old + new reciting cards rebuild');
    assert.equal(ayahCardMemoStats.hits, cards - 2, 'everything else reuses the memo');
    assert.ok(cardClasses(html2, 2).includes('ayah-card--reciting'), 'card 2 shows reciting');
    assert.ok(!cardClasses(html2, 1).includes('ayah-card--reciting'), 'card 1 cleared');
  });

  test('unrelated dispatches reuse every card', () => {
    const base = quranReaderState();
    resetAyahCardMemoForTests();
    renderQuran(base);
    resetAyahCardMemoForTests();
    // Same refs, different root object: every dep is reference-equal.
    renderQuran({ ...base });
    const cards = 7; // Al-Fatiha
    assert.equal(ayahCardMemoStats.hits, cards, 'identical inputs hit the memo');
    assert.equal(ayahCardMemoStats.misses, 0, 'nothing rebuilds');
  });
});

describe('UP-05: SRS due digest + juz strip', () => {
  const tenDaysAgo = '2026-01-01';
  // Full 30-entry map (even 20-page juz): the planner refuses to invent
  // ranges from a partial map, so fixtures must be complete.
  const juzFirstPage = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [String(i + 1), 1 + i * 20])
  );

  test('dueCounts composes surah + ayah tracks, DST-safe', () => {
    assert.deepEqual(dueCounts({}, {}, tenDaysAgo), { surahs: 0, ayahs: 0 });
    assert.deepEqual(
      dueCounts(
        { 2: { level: 1, due: '2026-01-01' }, 3: { level: 0, due: '2026-02-01' } },
        { '2:255': { level: 0, due: '2025-12-31' }, bogus: { level: 0 } },
        tenDaysAgo
      ),
      { surahs: 1, ayahs: 1 },
      'only on-or-before-today counts; hostile rows degrade to not-due'
    );
    assert.deepEqual(dueCounts(null, null), { surahs: 0, ayahs: 0 });
  });

  test('juz ranges tile 1..30 honestly; hostile maps degrade to []', () => {
    assert.deepEqual(juzPageRanges(null), []);
    assert.deepEqual(juzPageRanges({ 1: 1 }), [], 'partial map refuses, never invents');
    const ranges = juzPageRanges(juzFirstPage, 604);
    assert.equal(ranges.length, 30, 'always 30 cells');
    assert.deepEqual(ranges[0], { juz: 1, from: 1, to: 20 });
    assert.deepEqual(ranges[29], { juz: 30, from: 581, to: 604 });
    const states = juzReadStates(juzFirstPage, { 1: true, 2: true, 21: true }, 604);
    assert.deepEqual(states[0], { juz: 1, read: 2, total: 20, done: false });
    assert.deepEqual(states[1], { juz: 2, read: 1, total: 20, done: false });
    assert.equal(
      juzReadStates(
        juzFirstPage,
        Object.fromEntries(Array.from({ length: 604 }, (_, i) => [String(i + 1), true])),
        604
      ).every((s) => s.done),
      true,
      'a finished khatma fills every cell'
    );
  });

  test('digest row deep-links to the first due surah; strip renders 30 cells', () => {
    const st = (over = {}) => ({
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      hifzRecords: { 2: { level: 1, due: '2020-01-01' } },
      hifzAyahRecords: {},
      mushaf: { meta: { juzFirstPage } },
      mushafPagesRead: { 1: true, 2: true },
      ...over,
    });
    const html = memorizationPanel(st(), 'en');
    assert.match(html, /Review due/, 'digest header renders');
    assert.match(html, /1 surahs · 0 ayahs/, 'counts render');
    assert.match(html, /data-view="quran" data-id="2"/, 'deep-links to the due surah reader');
    assert.equal((html.match(/class="juz-chip/g) || []).length, 30, '30 chips render');
    assert.match(html, /Part 1: 2 of 20 pages/, 'per-cell honesty label');
  });

  test('caught-up state is gentle; empty state renders nothing', () => {
    const caughtUp = memorizationPanel(
      {
        settings: { ...DEFAULT_SETTINGS, language: 'en' },
        hifzRecords: { 2: { level: 3, due: '2999-01-01' } },
        hifzAyahRecords: {},
        mushaf: { meta: null },
        mushafPagesRead: {},
      },
      'en'
    );
    assert.match(caughtUp, /All caught up/, 'no numbers, no shaming');
    assert.doesNotMatch(caughtUp, /data-view="quran"/, 'no reader link without dues');
    const empty = memorizationPanel(
      {
        settings: { ...DEFAULT_SETTINGS, language: 'en' },
        hifzRecords: {},
        hifzAyahRecords: {},
        mushaf: { meta: null },
        mushafPagesRead: {},
      },
      'en'
    );
    assert.equal(empty, '', 'brand-new users see no panel at all');
    const ar = memorizationPanel(
      {
        settings: { ...DEFAULT_SETTINGS, language: 'ar' },
        hifzRecords: {},
        hifzAyahRecords: {},
        mushaf: { meta: { juzFirstPage } },
        mushafPagesRead: { 1: true },
      },
      'ar'
    );
    assert.match(ar, /القراءة حسب الأجزاء/, 'Arabic strip title, RTL flow by document dir');
  });
});

/** Controllable <audio> stand-in: each play() returns a promise the test settles. */
class FakeAudio {
  static instances = [];
  constructor() {
    this.src = '';
    this.playCalls = [];
    this.listeners = {};
    FakeAudio.instances.push(this);
  }
  addEventListener(type, cb) {
    (this.listeners[type] ||= []).push(cb);
  }
  removeAttribute() {}
  pause() {}
  play() {
    let reject;
    const promise = new Promise((_, rej) => {
      reject = rej;
    });
    // The module attaches its own .catch synchronously inside play(); this
    // extra swallow only guards the test's held reference.
    promise.catch(() => {});
    const call = { promise, reject };
    this.playCalls.push(call);
    return promise;
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('BUG-08: superseded single-ayah plays stay silent', () => {
  test('rejecting a superseded play emits no error and keeps the new key', async () => {
    const realAudio = globalThis.Audio;
    globalThis.Audio = FakeAudio;
    FakeAudio.instances = [];
    resetRecitationForTests();
    const errors = [];
    onPlaybackError((key) => errors.push(key));
    try {
      play('https://cdn/a.mp3', '2:1');
      play('https://cdn/b.mp3', '2:2');
      assert.equal(currentlyPlayingKey(), '2:2');
      const el = FakeAudio.instances[0];
      assert.equal(el.playCalls.length, 2, 'one shared element, two plays');
      el.playCalls[0].reject(new Error('aborted by src change'));
      await tick();
      await tick();
      assert.deepEqual(errors, [], 'superseded rejection stays silent');
      assert.equal(currentlyPlayingKey(), '2:2', 'audible ayah keeps its highlight');
      el.playCalls[1].reject(new Error('network down'));
      await tick();
      await tick();
      assert.deepEqual(errors, ['2:2'], 'the live play still reports genuinely');
      assert.equal(currentlyPlayingKey(), null, 'genuine failure clears the key');
    } finally {
      globalThis.Audio = realAudio;
      resetRecitationForTests();
    }
  });

  test('stop() silences a still-pending play rejection', async () => {
    const realAudio = globalThis.Audio;
    globalThis.Audio = FakeAudio;
    resetRecitationForTests();
    const errors = [];
    onPlaybackError((key) => errors.push(key));
    try {
      play('https://cdn/a.mp3', '2:1');
      // The module owns one shared element across plays AND tests.
      const el = FakeAudio.instances[FakeAudio.instances.length - 1];
      stop();
      assert.equal(currentlyPlayingKey(), null);
      el.playCalls[el.playCalls.length - 1].reject(new Error('aborted by stop'));
      await tick();
      await tick();
      assert.deepEqual(errors, [], 'deliberate stop never toasts');
    } finally {
      globalThis.Audio = realAudio;
      resetRecitationForTests();
    }
  });
});

describe('BUG-09: cross-book search needs explicit bulk consent', () => {
  test('a grid query with missing books fetches nothing without consent', async () => {
    const realFetch = globalThis.fetch;
    const fetchedUrls = [];
    globalThis.fetch = async (url) => {
      fetchedUrls.push(String(url));
      return new Response('x', { status: 503 });
    };
    store.dispatch(
      actions.setHadithIndex({
        books: [
          { id: 'b1', count: 10 },
          { id: 'b2', count: 10 },
        ],
      })
    );
    try {
      assert.equal(isHadithIndexAllConfirmed(), false, 'no standing consent');
      const result = await ensureHadithSearchIndex();
      assert.equal(result, 'partial', 'loaded-books-only ranking');
      assert.deepEqual(
        fetchedUrls.filter((u) => u.includes('b1') || u.includes('b2')),
        [],
        'no book fetch without an explicit tap'
      );
    } finally {
      globalThis.fetch = realFetch;
      store.dispatch(actions.setHadithIndex(null));
    }
  });

  test('consent records in ephemeral state; grid + handler are wired', async () => {
    const { readFileSync } = await import('node:fs');
    assert.equal(isHadithIndexAllConfirmed(), false);
    store.dispatch(actions.confirmHadithIndexAll());
    assert.equal(isHadithIndexAllConfirmed(), true, 'tap records consent');
    const view = readFileSync(new URL('../js/views/hadith.js', import.meta.url), 'utf8');
    assert.ok(view.includes('data-action="hadith-index-all"'), 'grid offers index-all');
    assert.ok(view.includes('hadith.indexAllHint'), 'consent copy names the download');
    const handlers = readFileSync(new URL('../js/app/handlers/items.js', import.meta.url), 'utf8');
    assert.ok(handlers.includes("'hadith-index-all'"), 'tap starts the bulk build');
  });
});

describe('BUG-10: polar fallbacks never arm lock-screen triggers', () => {
  // Polar-day stub: fajr/isha unreachable (one-seventh-night fallback),
  // everything else computed.
  const polarCalc = () => ({
    fajr: 20,
    sunrise: 6,
    dhuhr: 13,
    asr: 17,
    maghrib: 22,
    isha: 23.5,
    unreachable: { fajr: true, sunrise: false, asr: false, maghrib: false, isha: true },
  });
  const allOn = {
    latitude: 70,
    longitude: 20,
    method: 'mwl',
    asr: 'standard',
    alerts: { fajr: true, sunrise: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  };

  test('unreachable entries are skipped in the trigger plan', () => {
    const plan = buildTriggerPlan({
      now: new Date(2026, 5, 15, 12, 0),
      prayerSettings: allOn,
      lang: 'en',
      calcTimes: polarCalc,
    });
    assert.ok(plan.length > 0, 'reachable prayers still arm');
    assert.deepEqual(
      plan.filter((e) => e.name === 'fajr' || e.name === 'isha'),
      [],
      'no fallback trigger for fajr/isha'
    );
    assert.ok(
      plan.some((e) => e.name === 'dhuhr'),
      'dhuhr arms'
    );
  });

  test('fully reachable days arm every enabled prayer', () => {
    const plan = buildTriggerPlan({
      now: new Date(2026, 5, 15, 12, 0),
      prayerSettings: allOn,
      lang: 'en',
      calcTimes: () => ({ ...polarCalc(), unreachable: {} }),
    });
    assert.ok(
      plan.some((e) => e.name === 'fajr'),
      'fajr arms when computed'
    );
    assert.ok(
      plan.some((e) => e.name === 'isha'),
      'isha arms when computed'
    );
  });
});

describe('PERF-02: audio-cache budget + persistence probe', () => {
  const recs = [
    { key: 'v:r:1', moshafId: '__verse__:r', bytes: 100, ts: 1 },
    { key: 'v:r:2', moshafId: '__verse__:r', bytes: 100, ts: 2 },
    { key: 'm:5', moshafId: 'm', bytes: 100, ts: 3 },
  ];

  test('under budget evicts nothing; over budget evicts oldest first', () => {
    assert.deepEqual(planCacheEviction(recs, 300), [], 'exactly at budget stays');
    assert.deepEqual(planCacheEviction(recs, 1000), [], 'under budget stays');
    assert.deepEqual(planCacheEviction(recs, 250), ['v:r:1'], 'oldest record goes first');
    assert.deepEqual(
      planCacheEviction(recs, 50),
      ['v:r:1', 'v:r:2', 'm:5'],
      'evicts until the budget fits'
    );
  });

  test('adhan recordings never evict; hostile rows are ignored, not dropped', () => {
    const rows = [
      ...recs,
      { key: '__adhan__:1', moshafId: '__adhan__', bytes: 10000, ts: 0 },
      { key: null, bytes: 100 },
      { key: 'junk', bytes: NaN },
    ];
    const drop = planCacheEviction(rows, 50);
    assert.ok(!drop.includes('__adhan__:1'), 'user recordings survive');
    assert.ok(!drop.includes(null), 'malformed rows never named');
    assert.deepEqual(drop, ['v:r:1', 'v:r:2', 'm:5'], 'only real records evict, oldest first');
  });

  test('persist probe runs once per session', async () => {
    const realNavigator = globalThis.navigator;
    let calls = 0;
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          persist: async () => {
            calls += 1;
            return true;
          },
        },
      },
      configurable: true,
      writable: true,
    });
    resetPersistForTests();
    try {
      assert.equal(await ensurePersistentStorage(), true);
      assert.equal(await ensurePersistentStorage(), false, 'second call is a no-op');
      assert.equal(calls, 1, 'browser probed exactly once');
    } finally {
      if (realNavigator === undefined) delete globalThis.navigator;
      else
        Object.defineProperty(globalThis, 'navigator', {
          value: realNavigator,
          configurable: true,
          writable: true,
        });
      resetPersistForTests();
    }
  });

  test('cap override is clamped and restorable', () => {
    setAudioCacheCapForTests(-5);
    setAudioCacheCapForTests(AUDIO_CACHE_DEFAULT_MAX_BYTES);
    assert.deepEqual(planCacheEviction(recs, AUDIO_CACHE_DEFAULT_MAX_BYTES), []);
  });

  test('enforce drops the oldest records until the live cap fits', async () => {
    const removed = [];
    setAudioCacheCapForTests(150);
    try {
      const drop = await enforceAudioCacheCap({
        list: async () => recs,
        remove: async (key) => {
          removed.push(key);
          return true;
        },
      });
      assert.deepEqual(drop, ['v:r:1', 'v:r:2'], 'evicts oldest until 100/150 fits');
      assert.deepEqual(removed, ['v:r:1', 'v:r:2'], 'removals dispatched in order');
    } finally {
      setAudioCacheCapForTests(AUDIO_CACHE_DEFAULT_MAX_BYTES);
    }
  });
});

describe('BUG-11: error-screen reset wipes every local store', () => {
  test('wipe covers state, auto-backup, dedup keys and the IDB database', async () => {
    const removed = [];
    const deletedDbs = [];
    let pendingReq = null;
    const realLS = globalThis.localStorage;
    const realIDB = globalThis.indexedDB;
    globalThis.localStorage = { removeItem: (k) => removed.push(k) };
    globalThis.indexedDB = {
      deleteDatabase: (name) => {
        deletedDbs.push(name);
        pendingReq = {};
        return pendingReq;
      },
    };
    try {
      const p = wipeAppDataForReset();
      pendingReq.onsuccess();
      const result = await p;
      assert.deepEqual(
        [...removed].sort(),
        ['nur-al-dhikr-auto-backup', 'nurAlDhikr:v2:notifDayFired', 'nurAlDhikr:v2:state'].sort(),
        'all three localStorage keys cleared'
      );
      assert.deepEqual(result.localRemoved, removed);
      assert.deepEqual(deletedDbs, ['nurAlDhikrDB'], 'custom-content IDB dropped');
      assert.deepEqual(result.idbDeleted, ['nurAlDhikrDB']);
    } finally {
      if (realLS === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = realLS;
      if (realIDB === undefined) delete globalThis.indexedDB;
      else globalThis.indexedDB = realIDB;
    }
  });

  test('wipe never throws without storage APIs', async () => {
    const result = await wipeAppDataForReset();
    assert.deepEqual(result, { localRemoved: [], idbDeleted: [] });
  });
});

describe('UX polish batch (v5.2.75)', () => {
  test('UX-02: deep-link cards are focusable landing targets', () => {
    const html = renderQuran(quranReaderState());
    assert.match(html, /id="ayah-1" tabindex="-1"/, 'ayah cards carry a focus landing slot');
    const card = hadithCardHTML({ n: 7, ar: 'نص', en: 'text' }, { lang: 'en', bookId: 'bukhari' });
    assert.match(card, /id="hadith-7" tabindex="-1"/, 'hadith cards carry one too');
    assert.ok(
      readSrc('js/app/quranSearch.js').includes('el.focus({ preventScroll: true })'),
      'ayah deep links move focus after scrolling'
    );
    assert.ok(
      readSrc('js/app/hadithData.js').includes('el.focus({ preventScroll: true })'),
      'hadith deep links move focus after scrolling'
    );
  });

  test('UX-03: tafsir tabs keep focus across the modal re-open', () => {
    const modal = readSrc('js/ui/modal.js');
    assert.ok(modal.includes('focusSelector'), 'openModal accepts a focus override');
    const handlers = readSrc('js/app/handlers/quran.js');
    assert.ok(
      handlers.includes('focusSelector: `#tafsir-tab-${ds.edition}`'),
      'tab switches re-focus the active tab'
    );
  });

  test('UX-05: modal exit animates, restores focus first, re-open safe', () => {
    const modal = readSrc('js/ui/modal.js');
    assert.ok(modal.includes('is-leaving'), 'exit ghost class applied');
    assert.ok(modal.includes('closeTimer'), 'teardown deferred + cancellable');
    const css = readSrc('assets/css/components.css');
    assert.ok(css.includes('@keyframes sheetOut'), 'sheet exit keyframes exist');
    assert.ok(css.includes('@keyframes popOut'), 'dialog exit keyframes exist');
  });

  test('UX-06: True Black palette exists and forces dark mode', () => {
    const amoled = PALETTES.find((p) => p.id === 'amoled');
    assert.ok(amoled, '11th palette registered');
    assert.equal(amoled.name.en, 'True Black');
    assert.ok(
      readSrc('js/core/theme.js').includes("settings.palette === 'amoled'"),
      'selecting it forces the dark surfaces'
    );
    assert.ok(
      readSrc('assets/css/variables.css').includes("[data-palette='amoled']"),
      'pure-black surfaces tokenized'
    );
  });

  test('UX-07: dyslexia and RTL compose instead of clobbering', () => {
    const css = readSrc('assets/css/accessibility.css');
    const block = css.match(/html\[data-dyslexia='true'\]\[dir='rtl'\] body\s*\{[^}]*\}/);
    assert.ok(block, 'RTL override block exists');
    assert.ok(block[0].includes('var(--font-arabic)'), 'Arabic face kept');
    assert.ok(block[0].includes('letter-spacing: normal'), 'joining-safe spacing');
  });

  test('UX-08: glass bars tokenized with transparency + forced-colors fallbacks', () => {
    const vars = readSrc('assets/css/variables.css');
    for (const tok of ['--fs-bar-bg', '--fs-bar-ink', '--fs-bar-gold']) {
      assert.ok(vars.includes(`${tok}:`), `token ${tok} defined`);
    }
    const quran = readSrc('assets/css/quran.css');
    assert.ok(quran.includes('var(--fs-bar-bg)'), 'bar background tokenized');
    assert.ok(quran.includes('var(--fs-bar-ink)'), 'bar ink tokenized');
    assert.ok(quran.includes('var(--fs-bar-gold)'), 'bar gold tokenized');
    assert.doesNotMatch(quran, /mushaf-fs-(controls|console|echo)[\s\S]{0,400}?#10201a/);
    const a11y = readSrc('assets/css/accessibility.css');
    assert.ok(a11y.includes('.mushaf-fs-controls'), 'reduced-transparency covers the bars');
    assert.ok(a11y.includes('.mushaf-fs-echo'), 'forced-colors covers the bars');
  });

  test('UX-09: qibla live region writes only on change', () => {
    const realDocument = globalThis.document;
    const writes = [];
    let text = 'initial';
    const hintEl = {
      get textContent() {
        return text;
      },
      set textContent(v) {
        writes.push(v);
        text = v;
      },
      title: '',
      removeAttribute() {},
    };
    const needle = { style: {}, classList: { toggle() {} } };
    globalThis.document = {
      getElementById: (id) =>
        id === 'qibla-needle' ? needle : id === 'qibla-heading-text' ? hintEl : null,
    };
    try {
      updateQiblaCompassDOM(140, 100, 'true', 'en');
      updateQiblaCompassDOM(140, 101, 'true', 'en');
      updateQiblaCompassDOM(140, 102, 'true', 'en');
      assert.equal(writes.length, 1, 'repeated sensor frames write once');
      updateQiblaCompassDOM(140, 140, 'true', 'en');
      assert.equal(writes.length, 2, 'alignment arrival announces exactly once');
    } finally {
      if (realDocument === undefined) delete globalThis.document;
      else globalThis.document = realDocument;
    }
  });
});

describe('UP-03: qibla calibration + heading-error readout', () => {
  const qiblaState = (lang) => ({
    settings: {
      ...DEFAULT_SETTINGS,
      language: lang,
      prayer: { ...DEFAULT_SETTINGS.prayer, latitude: 40.7128, longitude: -74.006 },
    },
  });

  test('calibration card renders in both languages, sensors or not', () => {
    const en = renderQibla(qiblaState('en'));
    assert.match(en, /Calibrate the compass/, 'EN walkthrough renders');
    assert.match(en, /figure-8 motion/, 'figure-8 step renders');
    const ar = renderQibla(qiblaState('ar'));
    assert.match(ar, /معايرة البوصلة/, 'AR walkthrough renders');
  });

  test('error row ships hidden; first heading frame reveals it with degrees', () => {
    const html = renderQibla(qiblaState('en'));
    assert.match(html, /id="qibla-error-row" hidden/, 'hidden with no heading stream');
    const realDocument = globalThis.document;
    let rowHidden = true;
    let value = '—';
    const writes = [];
    globalThis.document = {
      getElementById: (id) => {
        if (id === 'qibla-needle') return { style: {}, classList: { toggle() {} } };
        if (id === 'qibla-heading-text')
          return { textContent: '', title: '', removeAttribute() {} };
        if (id === 'qibla-error-row')
          return {
            get hidden() {
              return rowHidden;
            },
            set hidden(v) {
              rowHidden = v;
            },
          };
        if (id === 'qibla-error-value')
          return {
            get textContent() {
              return value;
            },
            set textContent(v) {
              writes.push(v);
              value = v;
            },
          };
        return null;
      },
    };
    try {
      updateQiblaCompassDOM(140, 100, 'true', 'en');
      assert.equal(rowHidden, false, 'row appears with the stream');
      assert.match(value, /Off by 40°/, 'degrees-off readout renders');
      assert.match(value, /[↻↺]/, 'turn direction renders');
      updateQiblaCompassDOM(140, 100.4, 'true', 'en');
      assert.equal(writes.length, 1, 'steady heading writes once');
    } finally {
      if (realDocument === undefined) delete globalThis.document;
      else globalThis.document = realDocument;
    }
  });
});

describe('UP-04: quiet-hours cancel policy', () => {
  const night = {
    quietEnabled: true,
    quietStart: '22:00',
    quietEnd: '06:00',
    adhanVolume: 80,
    quietVolume: 30,
  };
  const at = (h, m = 0) => new Date(2026, 5, 15, h, m);

  test('isQuietNow honors the window, midnight wrap and garbage', () => {
    assert.equal(isQuietNow(night, at(23)), true);
    assert.equal(isQuietNow(night, at(3)), true, 'wraps past midnight');
    assert.equal(isQuietNow(night, at(12)), false);
    assert.equal(isQuietNow(night, at(22)), true, 'start edge inclusive');
    assert.equal(isQuietNow(night, at(6)), false, 'end edge exclusive');
    assert.equal(isQuietNow({ ...night, quietEnabled: false }, at(23)), false);
    assert.equal(isQuietNow({}, at(23)), false, 'garbage never silences');
    assert.equal(isQuietNow({ ...night, quietStart: 'xx' }, at(23)), false);
  });

  test('effectiveAdhanVolume keeps the old curve (refactor parity)', () => {
    assert.equal(effectiveAdhanVolume(night, at(12)), 0.8, 'day volume');
    assert.equal(effectiveAdhanVolume(night, at(23)), 0.3, 'quiet volume inside');
    assert.equal(effectiveAdhanVolume({}, at(23)), 0.8, 'garbage falls back to day');
  });

  test('quietCancels sanitizes false by default, survives round-trip', () => {
    assert.equal(sanitizeSettings({ prayer: {} }).prayer.quietCancels, false);
    assert.equal(sanitizeSettings({ prayer: { quietCancels: true } }).prayer.quietCancels, true);
    assert.equal(
      sanitizeSettings({ prayer: { quietCancels: 'yes' } }).prayer.quietCancels,
      false,
      'hostile truthy drops to default'
    );
  });

  test('toggle + explainer are wired in the prayer view', () => {
    assert.ok(
      readSrc('js/views/prayer.js').includes('data-action="toggle-prayer-quiet-cancel"'),
      'view offers the cancel toggle'
    );
    assert.ok(
      readSrc('js/views/prayer.js').includes('prayer.quietCancelsHint'),
      'explainer line under the row'
    );
    assert.ok(
      readSrc('js/app/handlers/worship.js').includes('toggle-prayer-quiet-cancel'),
      'tap persists the preference'
    );
    assert.ok(
      readSrc('js/services/notifications.js').includes('quietCancels'),
      'tick() honors the preference'
    );
  });
});

describe('UP-11: playlist rename/reorder + compare-swap', () => {
  test('PLAYLIST_MOVE_ITEM swaps one step, no-ops at the ends and on junk', async () => {
    const { reduce } = await import('../js/core/state/reducer.js');
    const { initialState } = await import('../js/core/state/initial.js');
    const { actions } = await import('../js/core/state/actions.js');
    let s = { ...initialState(), playlists: [] };
    s = reduce(s, actions.createPlaylist('q', 'Q'));
    for (const surah of [112, 113, 114]) {
      s = reduce(s, actions.addPlaylistItem('q', { surah, from: 1 }));
    }
    const order = () => s.playlists[0].items.map((i) => i.surah);
    assert.deepEqual(order(), [112, 113, 114]);
    s = reduce(s, actions.movePlaylistItem('q', 1, 1));
    assert.deepEqual(order(), [112, 114, 113], 'moves down one step');
    s = reduce(s, actions.movePlaylistItem('q', 2, 1));
    assert.deepEqual(order(), [112, 114, 113], 'at the end: no-op');
    s = reduce(s, actions.movePlaylistItem('q', 0, -1));
    assert.deepEqual(order(), [112, 114, 113], 'at the start: no-op');
    s = reduce(s, actions.movePlaylistItem('q', 2, -1));
    assert.deepEqual(order(), [112, 113, 114], 'moves back up');
    const before = s;
    s = reduce(s, actions.movePlaylistItem('q', 9, 1));
    assert.equal(s, before, 'hostile index no-ops');
    s = reduce(s, actions.movePlaylistItem('ghost', 0, 1));
    assert.equal(s, before, 'unknown list no-ops');
  });

  test('rename + reorder + swap are wired end to end', () => {
    const mgr = readSrc('js/views/audioManager.js');
    assert.ok(mgr.includes('data-action="playlist-rename"'), 'rename button per queue');
    assert.ok(mgr.includes('data-action="playlist-move-item"'), 'up/down per range');
    const handlers = readSrc('js/app/handlers/audio.js');
    assert.ok(handlers.includes("'playlist-rename'"), 'rename opens the prompt');
    assert.ok(handlers.includes("'playlist-move-item'"), 'move dispatches the reorder');
    assert.ok(readSrc('js/app/forms.js').includes('submit-rename-playlist'), 'rename submits');
    const console = readSrc('js/ui/recitationConsole.js');
    assert.ok(console.includes('recite-compare-swap'), 'swap chip rides the console');
    assert.ok(
      readSrc('js/app/handlers/quranAudio.js').includes("'recite-compare-swap'"),
      'swap swaps'
    );
  });
});

describe('UP-12: journal/statistics/certificate/garden loop', () => {
  test('gardenState accepts {dhikr, pages}; hostile shapes still seed', async () => {
    const { gardenState } = await import('../js/domain/garden.js');
    assert.equal(gardenState(100).planted, 100, 'legacy number form kept');
    assert.equal(gardenState(100).reads, 0, 'legacy form reads zero');
    const g = gardenState({ dhikr: 100, pages: 12 });
    assert.equal(g.planted, 112, 'reading grows the garden');
    assert.equal(g.reads, 12, 'reads counted for display');
    assert.equal(gardenState({ dhikr: 100, pages: 12 }).stage.id, 'sprout');
    assert.equal(gardenState({}).planted, 0, 'empty object still seeds');
    assert.equal(gardenState({ dhikr: 'x', pages: -5 }).planted, 0, 'hostile counts degrade');
  });

  test('garden view counts pages; statistics links the certificate', async () => {
    const { renderGarden } = await import('../js/views/garden.js');
    const st = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      statistics: { totalRecitations: 0 },
      mushafPagesRead: { 1: true, 2: true, 3: true },
    };
    const html = renderGarden(st);
    assert.match(html, /3[\s\S]{0,40}pages read|pages read[\s\S]{0,40}3/, 'reads line renders');
    const stats = readSrc('js/views/statistics.js');
    assert.ok(stats.includes('VIEWS.CERTIFICATE'), 'statistics links the certificate');
    assert.ok(stats.includes('stats.viewCertificate'), 'certificate row copy exists');
  });

  test('journal footer counts this month; duaMonthStats is pure', async () => {
    const { duaMonthStats } = await import('../js/domain/duaJournal.js');
    const { journalMonthFooter } = await import('../js/views/journal.js');
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const entries = [
      { id: 'a', date: `${ym}-01`, text: 'x', answered: true },
      { id: 'b', date: `${ym}-02`, text: 'y', answered: false },
      { id: 'c', date: '2000-01-01', text: 'z', answered: true },
      null,
      { id: 'd', date: 'bogus', text: 'w' },
    ];
    assert.deepEqual(duaMonthStats(entries, now), { total: 2, answered: 1 });
    assert.deepEqual(duaMonthStats(null, now), { total: 0, answered: 0 });
    const footer = journalMonthFooter({ duaJournal: entries }, 'en');
    assert.match(footer, /2 entries · 1 answered this month/);
    const ar = journalMonthFooter({ duaJournal: entries }, 'ar');
    assert.match(ar, /2 مدخلات · 1 مُستجاب هذا الشهر/);
  });
});

describe('UP-13: zakat explainers + qada offer', () => {
  test('zakat-notes.json matches the i18n note keys exactly', () => {
    const notes = JSON.parse(readSrc('data/zakat-notes.json'));
    const ids = Object.keys(notes).filter((k) => !k.startsWith('_'));
    assert.deepEqual(
      [...ids].sort(),
      [
        'businessGoods',
        'cash',
        'fitrPer',
        'goldGrams',
        'investments',
        'liabilities',
        'otherAssets',
        'receivables',
        'silverGrams',
      ].sort(),
      'one note per calculator line'
    );
    for (const id of ids) {
      assert.equal(typeof notes[id].en, 'string', `${id} has EN`);
      assert.equal(typeof notes[id].ar, 'string', `${id} has AR`);
      assert.equal(t(`zakat.note.${id}`, 'en'), notes[id].en, `${id} EN mirrored`);
      assert.equal(t(`zakat.note.${id}`, 'ar'), notes[id].ar, `${id} AR mirrored`);
    }
  });

  test('asset rows carry info affordances; qada offer is wired', () => {
    const zakat = readSrc('js/views/zakat.js');
    assert.ok(zakat.includes('zakat-note'), 'rows render explainer affordances');
    const handlers = readSrc('js/app/handlers/worship.js');
    assert.ok(handlers.includes('qada.offerMissed'), 'un-logging offers qada');
    assert.ok(handlers.includes('actions.qadaAdd(ds.prayer, 1)'), 'one tap logs one make-up');
  });
});

describe('P3 hygiene batch (v5.2.75)', () => {
  test('BUG-12: kids reroute resolves a replacement hash, nothing else does', async () => {
    const { kidsRerouteHash } = await import('../js/app/stateSub.js');
    const kids = { settings: { kidsMode: true }, activeView: 'kids', activeParams: {} };
    assert.equal(
      kidsRerouteHash({ type: 'NAVIGATE', view: 'library', params: {} }, kids),
      '#/kids',
      'doomed entry replaced with the resolved view'
    );
    assert.equal(
      kidsRerouteHash({ type: 'NAVIGATE', view: 'kids', params: {} }, kids),
      null,
      'genuine kids navigation untouched'
    );
    assert.equal(
      kidsRerouteHash(
        { type: 'NAVIGATE', view: 'library', params: {} },
        { settings: { kidsMode: false }, activeView: 'library', activeParams: {} }
      ),
      null,
      'adults never rewritten'
    );
    assert.equal(kidsRerouteHash({ type: 'SEARCH' }, kids), null, 'non-navigations ignored');
    assert.equal(kidsRerouteHash(null, kids), null, 'hostile action ignored');
  });

  test('BUG-13: navigating to a valid surah clears a stale quran-surah flag', async () => {
    const { ensureQuranData } = await import('../js/app/lazyData.js');
    store.dispatch(actions.setLoadError('quran-surah', true));
    assert.equal(store.getState().loadErrors['quran-surah'], true, 'stale flag stands');
    await ensureQuranData({
      quran: { meta: { surahs: [] }, surahs: { 2: { ayahs: [] } } },
      quranBookmark: { surah: '2' },
      activeParams: { id: '2' },
      settings: store.getState().settings,
    });
    assert.equal(
      store.getState().loadErrors['quran-surah'],
      undefined,
      'valid navigation clears the stale flag with no fetch'
    );
  });

  test('BUG-14: the mushaf log tag was never truncated', () => {
    for (const rel of ['js/app/handlers/quran.js', 'js/app/lazyData.js']) {
      assert.doesNotMatch(readSrc(rel), /'ushaf\] failed/, `${rel} carries the full tag`);
    }
  });

  test('PERF-03: RESET_ALL drops the bounded caches', async () => {
    const { classifyAyahTajweed, classifyMemoSizeForTests } =
      await import('../js/domain/tajweed.js');
    const { resetEphemeralCaches } = await import('../js/app/stateSub.js');
    classifyAyahTajweed('بِسْمِ اللَّهِ');
    assert.ok(classifyMemoSizeForTests() > 0, 'memo populated');
    resetEphemeralCaches({ type: 'SOME_TAP' });
    assert.ok(classifyMemoSizeForTests() > 0, 'ordinary dispatches keep the memo');
    resetEphemeralCaches({ type: 'RESET_ALL' });
    assert.equal(classifyMemoSizeForTests(), 0, 'reset drops the memo');
    classifyAyahTajweed('بِسْمِ اللَّهِ');
    resetEphemeralCaches({ type: 'RESTORE_STATE' });
    assert.equal(classifyMemoSizeForTests(), 0, 'restore drops it too');
  });
});

describe('UP-06: prayer offsets + method transparency', () => {
  test('applyPrayerOffsets shifts times, ignores junk, keeps unreachable', async () => {
    const { applyPrayerOffsets, calculateTimes } = await import('../js/domain/prayer.js');
    const base = {
      fajr: 5,
      sunrise: 6,
      dhuhr: 12,
      asr: 15,
      maghrib: 18,
      isha: 19,
      unreachable: {},
    };
    assert.deepEqual(applyPrayerOffsets(base, null), base, 'no offsets: identical');
    assert.deepEqual(applyPrayerOffsets(base, {}), base, 'empty offsets: identical');
    const shifted = applyPrayerOffsets(base, { fajr: -3, isha: 60 });
    assert.equal(shifted.fajr, 5 - 3 / 60, 'fajr −3 min');
    assert.equal(shifted.isha, 20, 'isha +60 min');
    assert.equal(shifted.dhuhr, 12, 'untouched stays');
    assert.deepEqual(
      applyPrayerOffsets(base, { fajr: 999, dhuhr: 'x', asr: 0 }),
      base,
      'out-of-range and hostile entries ignored'
    );
    const live = calculateTimes({
      date: new Date(2026, 5, 15),
      latitude: 40.7,
      longitude: -74,
      timezoneOffsetHours: -4,
      offsets: { maghrib: 5 },
    });
    const plain = calculateTimes({
      date: new Date(2026, 5, 15),
      latitude: 40.7,
      longitude: -74,
      timezoneOffsetHours: -4,
    });
    assert.ok(
      Math.abs(live.maghrib - plain.maghrib - 5 / 60) < 1e-9,
      'choke point: offsets land in engine output'
    );
  });

  test('offsets sanitize tight and round-trip backups', async () => {
    const { sanitizeSettings } = await import('../js/core/config.js');
    assert.deepEqual(sanitizeSettings({ prayer: {} }).prayer.offsets, {});
    assert.deepEqual(
      sanitizeSettings({ prayer: { offsets: { fajr: -3, isha: 60 } } }).prayer.offsets,
      { fajr: -3, isha: 60 }
    );
    assert.deepEqual(
      sanitizeSettings({ prayer: { offsets: { fajr: 999, dhuhr: 0, bogus: 5 } } }).prayer.offsets,
      { fajr: 60 },
      'clamped, zeros and unknown keys dropped'
    );
  });

  test('prayer-methods.json mirrors the domain METHODS and both dictionaries', async () => {
    const methods = JSON.parse(readSrc('data/prayer-methods.json')).methods;
    const { METHODS } = await import('../js/domain/prayer.js');
    assert.deepEqual(
      methods.map((m) => m.id).sort(),
      Object.keys(METHODS).sort(),
      'one record per engine method'
    );
    for (const m of methods) {
      for (const k of ['fajr', 'isha']) {
        assert.equal(m.angles[k], METHODS[m.id][k] ?? null, `${m.id} angle ${k} matches`);
      }
      for (const lang of ['en', 'ar']) {
        assert.equal(t(`prayer.methodNote.${m.id}`, lang), m.note[lang], `${m.id} note mirrored`);
        assert.equal(
          t(`prayer.methodRegion.${m.id}`, lang),
          m.region[lang],
          `${m.id} region mirrored`
        );
        assert.notEqual(t(`prayer.method.${m.id}`, lang), `prayer.method.${m.id}`, `${m.id} named`);
      }
    }
  });

  test('calc sheet names methods locally and offers offset steppers', async () => {
    const { calcPanelHTML } = await import('../js/views/prayer.js');
    const st = {
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'ar',
        prayer: { ...DEFAULT_SETTINGS.prayer, method: 'MWL', offsets: { fajr: -3 } },
      },
    };
    const html = calcPanelHTML(st);
    assert.match(html, /رابطة العالم الإسلامي/, 'method name localized, not raw English');
    assert.doesNotMatch(html, /Muslim World League/, 'no English leak in AR UI');
    assert.match(html, /data-bind="prayer-offset" data-prayer="fajr"/, 'offset steppers render');
    assert.match(html, /الافتراضي العالمي/, 'region renders');
  });
});

describe('UP-09: roots ↔ mutashabihat cross-linking + lapse drills', () => {
  const RUN = 'alpha beta gamma delta epsilon zeta';
  const corpus = () => ({
    1: {
      ayahs: [
        { number: 1, text: `${RUN} one`, translation: '' },
        { number: 2, text: `${RUN} two`, translation: '' },
      ],
    },
    2: {
      ayahs: [
        { number: 1, text: `${RUN} three`, translation: '' },
        { number: 2, text: `${RUN} four`, translation: '' },
      ],
    },
  });

  test('pair helpers: filter by root ayahs, resolve one ayah, lapses', async () => {
    const {
      buildSimilarPairs,
      resetMutashabihatCache,
      confusablePairsFor,
      pairForAyah,
      lapsedAyahKeys,
      filterLapsedPairs,
    } = await import('../js/domain/mutashabihat.js');
    try {
      const pairs = buildSimilarPairs(corpus(), { force: true });
      assert.ok(pairs.length >= 3, 'synthetic shared runs pair up');
      const forRoot = confusablePairsFor(pairs, new Set(['1:1', '9:9']));
      assert.ok(forRoot.length > 0, 'pairs touching the root survive');
      assert.ok(
        forRoot.every((p) => [`${p.a.s}:${p.a.a}`, `${p.b.s}:${p.b.a}`].includes('1:1')),
        'nothing unrelated leaks through'
      );
      assert.deepEqual(confusablePairsFor(pairs, new Set()), []);
      assert.deepEqual(confusablePairsFor(null, new Set(['1:1'])), []);
      const hit = pairForAyah(pairs, 2, 1);
      assert.ok(hit, 'paired ayah resolves');
      assert.equal(pairForAyah(pairs, 9, 9), null, 'unpaired ayah resolves null');
      const lapses = lapsedAyahKeys({ '1:1': { lapses: 2 }, '1:2': { lapses: 0 }, junk: {} });
      assert.deepEqual([...lapses], ['1:1'], 'only lapsed ayahs weight the pool');
      assert.ok(filterLapsedPairs(pairs, lapses).length >= 3, 'lapsed pairs found');
      assert.deepEqual(filterLapsedPairs(pairs, new Set()), [], 'no lapses: honest empty');
    } finally {
      resetMutashabihatCache();
    }
  });

  test('lapsed pool drills lapses, falls back when thin', async () => {
    const { buildSimilarPairs, resetMutashabihatCache, buildDrillRound } =
      await import('../js/domain/mutashabihat.js');
    try {
      const pairs = buildSimilarPairs(corpus(), { force: true });
      const involves = (q, key) =>
        `${q.question.s}:${q.question.a}` === key || `${q.sibling.s}:${q.sibling.a}` === key;
      const lapsed = buildDrillRound(pairs, {
        seed: 5,
        pool: 'lapsed',
        lapseKeys: new Set(['1:1']),
      });
      assert.ok(lapsed, 'lapsed round builds');
      assert.ok(involves(lapsed, '1:1'), 'lapsed round drills the lapse');
      const thin = buildDrillRound(pairs, { seed: 5, pool: 'lapsed', lapseKeys: new Set(['2:2']) });
      assert.ok(thin, 'thin lapsed pool falls back instead of breaking');
      const all = buildDrillRound(pairs, { seed: 5 });
      assert.ok(all, 'default pool unaffected');
    } finally {
      resetMutashabihatCache();
    }
  });

  test('roots tab + word chip + pool switch are wired', async () => {
    const { renderRoots } = await import('../js/views/roots.js');
    const { buildWordStudyPanel } = await import('../js/views/tafsirPanel.js');
    const { resetMutashabihatCache } = await import('../js/domain/mutashabihat.js');
    const st = (over = {}) => ({
      settings: { ...DEFAULT_SETTINGS, language: 'en', showTranslation: false },
      activeParams: {},
      quran: { meta: null, surahs: corpus() },
      quranRoots: { رحم: { count: 1, occ: [{ s: 1, a: 1, i: 1, t: 'x' }] } },
      quranRootsFull: null,
      quranWords: {},
      activeWordStudy: { surah: '1', ayah: '1', i: 1 },
      ...over,
    });
    try {
      const detail = renderRoots({ ...st(), activeParams: { id: 'رحم' } });
      assert.match(detail, /data-action="roots-tab"/, 'detail carries tab switches');
      assert.match(detail, /Word forms/, 'forms tab renders');
      const conf = renderRoots({ ...st(), activeParams: { id: 'رحم', tab: 'confusables' } });
      assert.match(conf, /root-confusable/, 'confusables tab lists pairs');
      assert.match(conf, /1:1/, 'pair refs deep-link');
      const panel = buildWordStudyPanel(st());
      assert.match(panel, /Look-alike:/, 'popup chips the paired ayah');
    } finally {
      resetMutashabihatCache();
    }
    assert.ok(readSrc('js/app/handlers/quran.js').includes("'roots-tab'"), 'tab switch navigates');
    assert.ok(
      readSrc('js/app/handlers/journal.js').includes("'mutashabihat-pool'"),
      'pool switch dispatches'
    );
  });
});

describe('UP-01: word study popup 2.0 (dict + actions + bookmarks)', () => {
  test('dict file integrity: every key in the corpus, shapes clean', (t) => {
    const dict = JSON.parse(readSrc('data/quran-dict.json'));
    const ids = Object.keys(dict.entries);
    // (v5.7.0) full coverage: every corpus lemma carries an entry —
    // hand-curated senses up front, grammar-role notes for function
    // words, root-derived senses for the tail. No word taps into
    // emptiness by missing data anymore.
    assert.ok(ids.length >= 4700, 'full lemma coverage ships');
    // SEED MODE ships 4 quran-words files (seed ayahs only); the
    // 114-file corpus scan + lemma coverage run in the full tree.
    if (SEED_MODE) {
      t.skip('SEED MODE: per-word corpus not bundled — lemma-coverage gate skipped loudly');
      return;
    }
    const files = readdirSync(path.join(ROOT, 'data/quran-words')).filter((f) =>
      f.endsWith('.json')
    );
    assert.ok(files.length > 100, 'full corpus scanned');
    const lemmas = new Set();
    for (const f of files) {
      const doc = JSON.parse(readSrc(`data/quran-words/${f}`));
      for (const words of Object.values(doc)) {
        for (const w of words || []) if (w?.lemma) lemmas.add(w.lemma);
      }
    }
    for (const key of ids) {
      assert.ok(lemmas.has(key), `dict key in corpus: ${key}`);
      const e = dict.entries[key];
      assert.equal(typeof e.ar, 'string', `${key} ar gloss`);
      assert.equal(typeof e.en, 'string', `${key} en gloss`);
      assert.ok(Array.isArray(e.syn) && Array.isArray(e.ant), `${key} chips arrays`);
      assert.equal(typeof e.freq, 'number', `${key} frequency`);
    }
    for (const lemma of lemmas) {
      assert.ok(dict.entries[lemma], `corpus lemma covered: ${lemma}`);
    }
  });

  test('dictEntryFor + wordBookmarkKey: pure, hostile-safe', async () => {
    const { dictEntryFor, wordBookmarkKey } = await import('../js/domain/wordStudy.js');
    const dict = JSON.parse(readSrc('data/quran-dict.json'));
    const hit = dictEntryFor({ index: dict.entries }, 'حَقّ');
    assert.deepEqual(hit, {
      ar: dict.entries['حَقّ'].ar,
      en: dict.entries['حَقّ'].en,
      syn: ['صدق'],
      ant: ['باطل'],
    });
    assert.equal(dictEntryFor({ index: dict.entries }, 'مفقود'), null, 'unknown lemma');
    assert.equal(dictEntryFor(null, 'حَقّ'), null, 'unloaded tier');
    assert.equal(dictEntryFor({ index: null }, 'حَقّ'), null, 'failed tier');
    assert.equal(dictEntryFor({ index: { x: 42 } }, 'x'), null, 'hostile entry');
    assert.equal(wordBookmarkKey(2, 255, 3), '2:255:3');
    assert.equal(wordBookmarkKey('__proto__', 1, 1), null, 'hostile surah refused');
    assert.equal(wordBookmarkKey(999, 1, 1), null, 'out-of-range surah refused');
    assert.equal(wordBookmarkKey(2, 255, 0), null, 'zero word index refused');
  });

  test('word bookmarks toggle + survive the restore sanitizer', async () => {
    const { reduce } = await import('../js/core/state/reducer.js');
    const { initialState } = await import('../js/core/state/initial.js');
    const { actions } = await import('../js/core/state/actions.js');
    const { sanitizeRestoredPayload } = await import('../js/core/state/restore.js');
    let s = reduce(initialState(), actions.toggleWordBookmark('2:255:3'));
    assert.deepEqual(s.wordBookmarks, { '2:255:3': true }, 'toggle adds');
    s = reduce(s, actions.toggleWordBookmark('2:255:3'));
    assert.deepEqual(s.wordBookmarks, {}, 'toggle removes');
    const before = s;
    s = reduce(s, actions.toggleWordBookmark('__proto__'));
    assert.equal(s, before, 'hostile key no-ops');
    const cleaned = sanitizeRestoredPayload({
      wordBookmarks: { '2:255:3': true, '999:1:1': true, x: true, '1:1:1': 'yes' },
    });
    assert.deepEqual(cleaned.wordBookmarks, { '2:255:3': true }, 'only well-formed survive');
  });

  test('popup renders meanings + action row; silent without the tier', async () => {
    const { buildWordStudyPanel } = await import('../js/views/tafsirPanel.js');
    const dict = JSON.parse(readSrc('data/quran-dict.json'));
    const words1 = JSON.parse(readSrc('data/quran-words/1.json'));
    const surah1 = JSON.parse(readSrc('data/quran/1.json'));
    const roots = JSON.parse(readSrc('data/quran-roots.json'));
    const st = (wordDict) => ({
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      activeWordStudy: { surah: '1', ayah: '4', i: 2 },
      quranWords: { 1: words1 },
      quran: { surahs: { 1: surah1 } },
      quranRoots: roots,
      wordDict,
      wordBookmarks: {},
      mushafSession: {},
    });
    const html = buildWordStudyPanel(st({ index: dict.entries, failed: false }));
    assert.match(html, /word-study__meanings/, 'meanings section renders');
    assert.match(html, /المدّة من طلوع الفجر/, 'AR gloss renders');
    assert.match(html, /data-action="word-speak"/, 'listen action renders');
    assert.match(html, /data-action="word-copy"/, 'copy action renders');
    assert.match(html, /data-action="word-share"/, 'share action renders');
    assert.match(html, /data-action="word-bookmark"/, 'bookmark action renders');
    assert.match(html, /aria-pressed="false"/, 'unbookmarked state honest');
    const marked = buildWordStudyPanel({
      ...st({ index: dict.entries, failed: false }),
      wordBookmarks: { '1:4:2': true },
    });
    assert.match(marked, /aria-pressed="true"/, 'bookmarked state renders');
    const bare = buildWordStudyPanel(st({ index: null, failed: true }));
    assert.doesNotMatch(bare, /word-study__meanings/, 'no hollow section without the tier');
    assert.match(bare, /data-action="word-bookmark"/, 'actions survive without the tier');
  });

  test('ensureWordDict loads once and flags failure honestly', async () => {
    const realFetch = globalThis.fetch;
    const dict = JSON.parse(readSrc('data/quran-dict.json'));
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify(dict), {
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const { ensureWordDict } = await import('../js/app/lazyData.js');
    try {
      store.dispatch(actions.setWordDict(null));
      assert.equal(await ensureWordDict(), true, 'loads');
      assert.ok(store.getState().wordDict.index['حَقّ'], 'entries land in state');
      assert.equal(calls, 1, 'single fetch');
      assert.equal(await ensureWordDict(), true, 'cached second call');
      assert.equal(calls, 1, 'no second fetch');
    } finally {
      globalThis.fetch = realFetch;
      store.dispatch(actions.setWordDict(null));
    }
    globalThis.fetch = async () => new Response('x', { status: 503 });
    try {
      assert.equal(await ensureWordDict(), false, 'failure resolves false');
      assert.equal(store.getState().wordDict.failed, true, 'tier flagged');
    } finally {
      globalThis.fetch = realFetch;
      store.dispatch(actions.setWordDict(null));
    }
  });
});

describe('UP-07: hadith grades pipeline (validator + merge)', () => {
  test('validator passes enriched rows, drops unknown grades', async () => {
    const { validateHadithDoc, normalizeHadithGrade, normalizeNarrator } =
      await import('../js/services/hadith.js');
    assert.equal(normalizeHadithGrade('Sahih'), 'sahih', 'case folds in');
    assert.equal(normalizeHadithGrade('  Hasan  '), 'hasan', 'whitespace folds in');
    assert.equal(normalizeHadithGrade('authentic'), null, 'variants never mapped');
    assert.equal(normalizeHadithGrade(null), null);
    assert.equal(normalizeNarrator('Umar ibn al-Khattab'), 'Umar ibn al-Khattab');
    assert.equal(normalizeNarrator(''), null);
    assert.equal(normalizeNarrator('x'.repeat(201)), null, 'novel-length names dropped');
    const doc = validateHadithDoc({
      id: 't',
      hadiths: [
        { n: 1, b: '1', ar: 'أ', en: 'a', grade: 'Sahih', narrator: 'Umar' },
        { n: 2, b: '1', ar: 'ب', en: 'b', grade: 'Sahih-ish', narrator: '' },
        { n: 3, b: '1', ar: 'ج', en: 'c' },
      ],
      sections: [],
    });
    assert.deepEqual(doc.hadiths[0], {
      n: 1,
      b: '1',
      ar: 'أ',
      en: 'a',
      grade: 'sahih',
      narrator: 'Umar',
    });
    assert.deepEqual(
      doc.hadiths[1],
      { n: 2, b: '1', ar: 'ب', en: 'b' },
      'unknown grade + empty narrator ride nothing through'
    );
    assert.deepEqual(doc.hadiths[2], { n: 3, b: '1', ar: 'ج', en: 'c' }, 'legacy rows unchanged');
  });

  test('pipeline merges overlays and fails loudly on junk', async () => {
    const { mergeGrades, mergeChaptersAr } = await import('../scripts/build-hadith.mjs');
    const book = {
      id: 't',
      hadiths: [
        { n: 1, b: '1', ar: 'أ', en: 'a' },
        { n: 2, b: '1', ar: 'ب', en: 'b' },
      ],
      sections: [{ id: '1', name: 'One', count: 2 }],
    };
    const ok = mergeGrades(book, { 1: { grade: 'Hasan', narrator: 'Ali' } });
    assert.deepEqual(ok.errors, [], 'clean merge');
    assert.deepEqual(ok.doc.hadiths[0], {
      n: 1,
      b: '1',
      ar: 'أ',
      en: 'a',
      grade: 'hasan',
      narrator: 'Ali',
    });
    assert.deepEqual(ok.doc.hadiths[1].grade, undefined, 'uncovered rows untouched');
    const bad = mergeGrades(book, { 1: { grade: 'Sahih-ish' }, 9: { grade: 'Sahih' } });
    assert.equal(bad.errors.length, 2, 'unknown grade + dangling number both fail');
    assert.ok(
      bad.errors.some((e) => e.includes('unknown grade')),
      'grade offender named'
    );
    assert.ok(
      bad.errors.some((e) => e.includes('unknown hadith number')),
      'dangling named'
    );
    const ch = mergeChaptersAr(book, { 1: 'الأول' });
    assert.deepEqual(ch.errors, []);
    assert.equal(ch.doc.sections[0].nameAr, 'الأول', 'Arabic chapter lands');
    const chBad = mergeChaptersAr(book, { 7: 'السابع' });
    assert.equal(chBad.errors.length, 1, 'dangling section fails');
  });
});

describe('UP-10: quiz deck generalization', () => {
  const libState = (docs, prefs) => ({
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    library: { documents: docs, order: Object.keys(docs) },
    quizPrefs: { libraryId: 'asma', direction: 'ar-en', size: 10, ...(prefs || {}) },
  });
  const docOf = (id, n) => ({
    metadata: { id },
    categories: [
      {
        id: 'c',
        items: Array.from({ length: n }, (_, i) => ({
          id: `${id}-${i + 1}`,
          arabic: `كلمة${i + 1}`,
          translation: { en: `meaning ${i + 1}`, ar: `معنى ${i + 1}` },
        })),
      },
    ],
  });

  test('any loaded library builds; direction stamps; size clamps', async () => {
    const { buildQuizDeck } = await import('../js/app/quizDeck.js');
    const st = libState({ asma: docOf('asma', 8), duas: docOf('duas', 6) });
    const deck = buildQuizDeck(st);
    assert.equal(deck.length, 8, 'defaults: asma, ar-en, size 10 capped by pool');
    assert.ok(
      deck.every((q) => q.dir === 'ar-en'),
      'direction stamped per question'
    );
    for (const q of deck) {
      assert.equal(q.choices.length, 4, 'four choices');
      assert.ok(q.choices.includes(q.itemId), 'answer among choices');
    }
    const other = buildQuizDeck(st, { libraryId: 'duas' });
    assert.equal(other.length, 6, 'explicit library wins');
    assert.ok(
      other.every((q) => q.itemId.startsWith('duas-')),
      'drawn from that library'
    );
    const flip = buildQuizDeck(st, { direction: 'en-ar', size: 5 });
    assert.equal(flip.length, 5, 'size clamps the deck');
    assert.ok(
      flip.every((q) => q.dir === 'en-ar'),
      'flipped stamp'
    );
    assert.equal(
      buildQuizDeck(libState({ asma: docOf('asma', 3) })).length,
      0,
      'too-small pool refuses honestly'
    );
    assert.equal(buildQuizDeck(libState({})).length, 0, 'missing library refuses honestly');
  });

  test('quizPrefs fall back and sanitize through the reducer', async () => {
    const { reduce } = await import('../js/core/state/reducer.js');
    const { initialState } = await import('../js/core/state/initial.js');
    const { actions } = await import('../js/core/state/actions.js');
    assert.deepEqual(initialState().quizPrefs, {
      libraryId: 'asma',
      direction: 'ar-en',
      size: 10,
    });
    let s = reduce(initialState(), actions.setQuizPrefs({ libraryId: 'duas' }));
    assert.equal(s.quizPrefs.libraryId, 'duas', 'library switches');
    assert.equal(s.quizPrefs.direction, 'ar-en', 'direction kept');
    s = reduce(s, actions.setQuizPrefs({ direction: 'sideways', size: 99 }));
    assert.equal(s.quizPrefs.direction, 'ar-en', 'hostile direction degrades');
    assert.equal(s.quizPrefs.size, 50, 'size clamps to the cap');
    const before = s;
    s = reduce(s, actions.setQuizPrefs({ libraryId: '__proto__' }));
    assert.equal(s.quizPrefs.libraryId, 'duas', 'hostile id refused');
    assert.equal(s, before, 'fully hostile patch no-ops');
  });

  test('picker + direction render and resolve to handlers', async () => {
    const { renderQuiz } = await import('../js/views/quiz.js');
    const st = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      library: {
        documents: { asma: docOf('asma', 8) },
        order: ['asma'],
        itemIndex: {},
      },
      quiz: { deck: [] },
      quizPrefs: { libraryId: 'asma', direction: 'en-ar', size: 10 },
      quizStats: { bestScore: 0, totalAttempts: 0, totalCorrect: 0 },
    };
    const html = renderQuiz(st);
    assert.match(html, /data-action="quiz-library"/, 'library picker renders');
    assert.match(html, /data-action="quiz-direction"/, 'direction switch renders');
    assert.match(html, /data-action="quiz-size"/, 'size picker renders');
    assert.match(html, /Meaning prompt/, 'direction labels render');
    const handlers = readSrc('js/app/handlers/quiz.js');
    for (const a of ['quiz-library', 'quiz-direction', 'quiz-size']) {
      assert.ok(handlers.includes(`'${a}'`), `${a} dispatches`);
    }
  });
});
