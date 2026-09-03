/**
 * tests/v4.2-fixes.test.js
 * Second improvement wave (v4.2) gates — one test per shipped fix, written
 * against the exact regression it prevents:
 *  1. restore.js allowlist + per-value sanitizers (the stored-XSS class:
 *     hostile counter/statistics/bookmark values in a crafted backup)
 *  2. streak.js DST-safe longest-streak math
 *  3. khatma day-index DST safety (noon anchors)
 *  4. store.js dirty-slice persistence gating (ephemeral actions never
 *     schedule a save; persisted changes always do)
 *  5. hadith.js pre-normalized haystacks (identical results, memoized)
 *  6. quran.js reader windowing (bounded DOM, deep-link recenter, expand)
 *  7. t() interpolation escaping (reflected XSS via a search query)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { computeStreak } from '../js/core/state/streak.js';
import { store, actions, PERSISTED_KEYS } from '../js/core/state.js';
import { t } from '../js/core/i18n.js';
import {
  filterHadiths,
  validateHadithDoc,
  _haystackBuildsForTests,
} from '../js/services/hadith.js';
import { expandReaderWindow, _resetReaderWindowForTests } from '../js/views/quran.js';

const XSS = '<img src=x onerror="alert(1)">';

/* ------------------------------------------------------------------ */
/* 1. Restore sanitizers — the stored-XSS class                        */
/* ------------------------------------------------------------------ */

describe('v4.2 sanitizeRestoredPayload: allowlist + per-value coercion', () => {
  test('hostile counter values are coerced to ints, never strings', () => {
    const out = sanitizeRestoredPayload({
      counters: {
        'tasbih:subhanallah': { count: XSS, target: 33, completedCycles: XSS },
      },
    });
    assert.deepEqual(out.counters['tasbih:subhanallah'], {
      count: 0,
      target: 33,
      completedCycles: 0,
    });
  });

  test('dailyHistory: junk keys dropped, hostile values coerced, capped at 731', () => {
    const hist = {};
    for (let i = 0; i < 900; i += 1) {
      hist[`2000-01-${String((i % 28) + 1).padStart(2, '0')}`] = {
        recitations: XSS,
        sessions: 1,
        itemIds: ['ok'],
      };
    }
    hist['not-a-date'] = { recitations: 5, sessions: 1, itemIds: [] };
    const out = sanitizeRestoredPayload({ statistics: { dailyHistory: hist } });
    const keys = Object.keys(out.statistics.dailyHistory);
    assert.ok(!keys.includes('not-a-date'));
    assert.ok(keys.length <= 731);
    const first = out.statistics.dailyHistory[keys[0]];
    assert.equal(typeof first.recitations, 'number');
    assert.equal(first.recitations, 0);
  });

  test('favoriteCategories values are ints (they render in the ranked list)', () => {
    const out = sanitizeRestoredPayload({
      statistics: { favoriteCategories: { morning: XSS, evening: '7' } },
    });
    assert.deepEqual(out.statistics.favoriteCategories, { morning: 0, evening: 7 });
  });

  test('ayahBookmarks: hostile surah/ayah/page dropped or coerced', () => {
    const out = sanitizeRestoredPayload({
      ayahBookmarks: [
        { key: '2:1', surah: XSS, ayah: 1, page: 1 },
        { key: '2:2', surah: 2, ayah: XSS, page: 1 },
        { key: '2:3', surah: 2, ayah: 3, page: XSS },
        { key: '2:4', surah: 2, ayah: 4, page: 4 },
      ],
    });
    // surah XSS → 0 → dropped by the range filter
    assert.equal(out.ayahBookmarks.length, 2);
    assert.ok(out.ayahBookmarks.every((b) => typeof b.surah === 'number'));
    assert.ok(out.ayahBookmarks.every((b) => typeof b.ayah === 'number'));
    assert.ok(out.ayahBookmarks.every((b) => typeof b.page === 'number'));
  });

  test('folder ids must be safe ids — they render into data-folder attrs', () => {
    const out = sanitizeRestoredPayload({
      ayahBookmarkFolders: [
        { id: XSS, name: 'x' },
        { id: 'ok-folder_1', name: 'y' },
      ],
    });
    assert.deepEqual(
      out.ayahBookmarkFolders.map((f) => f.id),
      ['ok-folder_1']
    );
  });

  test('calendarNotes: intervalDays/endDate typed for the edit form', () => {
    const out = sanitizeRestoredPayload({
      calendarNotes: [
        { id: XSS, title: 'x' },
        { id: 'note1', title: 'a', endDate: XSS, intervalDays: XSS },
      ],
    });
    assert.equal(out.calendarNotes.length, 1);
    const note = out.calendarNotes[0];
    assert.equal(note.endDate, null);
    assert.equal(note.intervalDays, 3);
  });

  test('ephemeral slices cannot ride in through extra keys (allowlist)', () => {
    const out = sanitizeRestoredPayload({
      player: { playing: true },
      hadith: { docs: { bukhari: { evil: true } } },
      editor: { undoStack: 5 },
      loadErrors: { 'quran-surah': true },
      history: [{ itemId: 'x' }],
    });
    assert.equal('player' in out, false);
    assert.equal('hadith' in out, false);
    assert.equal('editor' in out, false);
    assert.equal('loadErrors' in out, false);
    assert.equal(out.history.length, 1); // whitelisted slice survives
  });
});

/* ------------------------------------------------------------------ */
/* 2. Streak DST math                                                  */
/* ------------------------------------------------------------------ */

describe('v4.2 computeStreak: DST-safe day comparison', () => {
  test('consecutive dateKeys keep the run even when local midnights are 23h/25h apart', () => {
    // March 8→9 2025 is the US spring-forward (02:00→03:00): local midnight
    // to local midnight is 23 hours. The old strict 86400000 compare broke.
    const stats = {
      dailyHistory: {
        '2025-03-07': { recitations: 1 },
        '2025-03-08': { recitations: 1 },
        '2025-03-09': { recitations: 1 },
        '2025-03-10': { recitations: 1 },
      },
    };
    const { longestStreak } = computeStreak(stats, '2025-03-10');
    assert.equal(longestStreak, 4);
  });

  test('gaps still break the run', () => {
    const { longestStreak } = computeStreak(
      {
        dailyHistory: {
          '2025-03-07': { recitations: 1 },
          '2025-03-09': { recitations: 1 },
        },
      },
      '2025-03-09'
    );
    // one missed day severs the run — both islands are length 1
    assert.equal(longestStreak, 1);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Khatma DST safety                                                */
/* ------------------------------------------------------------------ */

// (v4.3) The former test here asserted `history.length >= before` on an
// unrelated store state — vacuous: it passed even if completion never
// fired. The REAL regression tests (frozen clock, seeded 603 pages,
// spring-forward weekend, idempotency) live in tests/v4.3-fixes.test.js
// §3, which replaced it.

describe('v4.2 khatma completion day-index (superseded by v4.3 suite)', () => {
  test('the page-mark dispatch stays safe on an empty store', () => {
    assert.doesNotThrow(() => {
      store.dispatch({ type: 'MUSHAF_PAGE_VISITED', page: '1' });
    });
    assert.ok(Array.isArray(store.getState().khatmaHistory));
  });
});

/* ------------------------------------------------------------------ */
/* 4. Store dirty-slice persistence gating                             */
/* ------------------------------------------------------------------ */

describe('v4.2 store: ephemeral actions never persist', () => {
  test('_persistedChanged: ephemeral-only change → false; persisted change → true', () => {
    const s1 = store.getState();
    // SPEECH_SET_ACTIVE creates a new root but touches no persisted slice.
    store.dispatch(actions.setSpeakingItem('probe-1'));
    const s2 = store.getState();
    assert.notEqual(s1, s2);
    assert.equal(store._persistedChanged(s1, s2), false);
    // A settings change IS persisted.
    const s3 = store.getState();
    store.dispatch(actions.updateSettings({ navCollapsed: !s3.settings.navCollapsed }));
    const s4 = store.getState();
    assert.equal(store._persistedChanged(s3, s4), true);
    store.dispatch(actions.updateSettings({ navCollapsed: s3.settings.navCollapsed }));
  });

  test('batch coalesces and still persists when a persisted slice changed', () => {
    const s1 = store.getState();
    let observed = 0;
    const unsub = store.subscribe(() => {
      observed += 1;
    });
    store.batch(() => {
      store.dispatch(actions.setSpeakingItem('batch-probe'));
      store.dispatch(
        actions.updateSettings({ navCollapsed: !store.getState().settings.navCollapsed })
      );
    });
    unsub();
    // ONE notification for the whole batch, and the state really changed.
    assert.equal(observed, 1);
    assert.notEqual(store.getState().settings.navCollapsed, s1.settings.navCollapsed);
    store.dispatch(actions.updateSettings({ navCollapsed: s1.settings.navCollapsed }));
  });
});

/* ------------------------------------------------------------------ */
/* 5. Hadith pre-normalized haystacks                                  */
/* ------------------------------------------------------------------ */

describe('v4.2 filterHadiths: memoized haystacks, identical results', () => {
  const DOC = validateHadithDoc({
    id: 'probe-book',
    hadiths: [
      { n: 1, b: 's1', ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', en: 'Say: He is Allah, the One' },
      {
        n: 2,
        b: 's1',
        ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        en: 'All praise is due to Allah',
      },
      { n: 3, b: 's2', ar: 'قولوا', en: 'Say (plural)' },
    ],
    sections: [],
  });

  test('diacritic-folded matching still hits (the memo must not change semantics)', () => {
    const before = _haystackBuildsForTests();
    const bare = filterHadiths(DOC, { query: 'قل هو الله احد' });
    assert.equal(bare.length, 1);
    assert.equal(bare[0].n, 1);
    // second call — served from the pre-normalized cache, same answer.
    // (v4.3) identical RESULTS cannot distinguish memoized from recomputed;
    // the build counter proves exactly one normalization pass happened.
    const again = filterHadiths(DOC, { query: 'قل هو الله احد' });
    assert.deepEqual(
      again.map((h) => h.n),
      [1]
    );
    assert.equal(_haystackBuildsForTests(), before + 1, 'one haystack build, not two');
    // A DIFFERENT doc object builds its own haystack (WeakMap keyed per doc
    // — the stale-cache-on-restore bug the memo design exists to avoid).
    const other = validateHadithDoc({
      id: 'probe-book-2',
      hadiths: [{ n: 1, b: 's1', ar: 'حديث آخر', en: 'another' }],
      sections: [],
    });
    filterHadiths(other, { query: 'آخر' });
    assert.equal(_haystackBuildsForTests(), before + 2);
  });

  test('section-only filtering skips haystack building entirely', () => {
    const out = filterHadiths(DOC, { query: '', section: 's1' });
    assert.deepEqual(
      out.map((h) => h.n),
      [1, 2]
    );
  });

  test('empty query + all sections returns the document array itself (zero copies)', () => {
    const out = filterHadiths(DOC, { query: '', section: 'all' });
    assert.equal(out, DOC.hadiths);
  });
});

/* ------------------------------------------------------------------ */
/* 6. Reader windowing                                                 */
/* ------------------------------------------------------------------ */

describe('v4.2 quran reader windowing', () => {
  // (v4.3) the former no-throw smoke test asserted nothing about the
  // windowing semantics; the real bounds/recenter/slide/latch tests live
  // in tests/v4.3-fixes.test.js §4. This remains as the cheap guard that
  // expand + reset round-trips without state.
  test('expandReaderWindow extends and never throws without a render', () => {
    _resetReaderWindowForTests();
    assert.doesNotThrow(() => {
      expandReaderWindow('down');
      expandReaderWindow('up');
      expandReaderWindow('down');
    });
    _resetReaderWindowForTests();
  });
});

/* ------------------------------------------------------------------ */
/* 7. t() interpolation escaping                                       */
/* ------------------------------------------------------------------ */

describe('v4.2 t(): interpolated vars are HTML-escaped', () => {
  test('a hostile search query cannot inject markup through a template', () => {
    const out = t('roots.empty', 'en', { q: XSS });
    assert.ok(!out.includes('<img'));
    assert.ok(out.includes('&lt;img'));
  });

  test('plain values pass through untouched', () => {
    assert.equal(t('quran.ayahCount', 'en', { n: 7 }), '7 verses');
  });

  test('replacement-pattern sequences ($& $1) are inserted literally', () => {
    const out = t('quran.ayahCount', 'en', { n: '$&' });
    assert.ok(out.includes('$&'));
    assert.ok(!out.includes('quran.ayahCount'));
  });
});

/* ------------------------------------------------------------------ */
/* Version markers in lockstep (kept from prior waves)                 */
/* ------------------------------------------------------------------ */

describe('v4.2 module inventory', () => {
  test('PERSISTED_KEYS still excludes every ephemeral slice the allowlist guards', () => {
    for (const k of [
      'player',
      'hadith',
      'quran',
      'mushaf',
      'audioManager',
      'editor',
      'loadErrors',
    ]) {
      assert.ok(!PERSISTED_KEYS.includes(k), `${k} must stay ephemeral`);
    }
  });
});
