/**
 * tests/hifzAyah.test.js — item 21 (ayah-level hifz SRS) gates:
 *  1. four grades share one step math (again resets+lapses, hard holds,
 *     good climbs one, easy climbs two capped);
 *  2. ayah keys validate ranges; mark/review/due/sanitize behave;
 *  3. the reducer routes ayah reviews to the ayah map (surah map
 *     untouched) and records ayah marks;
 *  4. toolbars render four grades, the ayah detail marks/reviews single
 *     ayahs, and the mistake heatmap buckets lapses per ayah;
 *  5. handlers + strings are wired.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HIFZ_GRADES,
  gradeStep,
  normalizeHifzGrade,
  logReview,
  logAyahReview,
  markAyahMemorized,
  dueAyahs,
  sanitizeAyahRecords,
  ayahMistakes,
  normalizeAyahKey,
} from '../js/domain/hifz.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { hifzHeatmapHTML } from '../js/views/quran.js';
import { buildMushafAyahDetail } from '../js/views/ayahStudy.js';

const TODAY = '2026-08-29';

describe('grades: one shared step math', () => {
  test('gradeStep maps all four grades', () => {
    assert.deepEqual(gradeStep(3, 'again'), { level: 0, lapse: 1 });
    assert.deepEqual(gradeStep(3, 'hard'), { level: 3, lapse: 0 });
    assert.deepEqual(gradeStep(3, 'good'), { level: 4, lapse: 0 });
    assert.deepEqual(gradeStep(3, 'easy'), { level: 5, lapse: 0 });
    assert.deepEqual(gradeStep(6, 'easy'), { level: 6, lapse: 0 }, 'capped at the top rung');
    assert.deepEqual(gradeStep(0, 'hard'), { level: 0, lapse: 0 });
    assert.deepEqual(HIFZ_GRADES, ['again', 'hard', 'good', 'easy']);
  });

  test('normalizeHifzGrade admits four, rejects the rest', () => {
    for (const g of HIFZ_GRADES) assert.equal(normalizeHifzGrade(g), g);
    assert.equal(normalizeHifzGrade('perfect'), null);
    assert.equal(normalizeHifzGrade('EASY'), null);
    assert.equal(normalizeHifzGrade(null), null);
  });

  test('surah logReview honors hard/easy (good keeps old easy semantics)', () => {
    const base = {
      1: { level: 2, since: TODAY, lastReviewed: TODAY, due: TODAY, reviews: 0, lapses: 0 },
    };
    assert.equal(logReview(base, 1, 'hard', TODAY)[1].level, 2, 'hard holds the rung');
    assert.equal(logReview(base, 1, 'hard', TODAY)[1].lapses, 0, 'hard counts no lapse');
    assert.equal(logReview(base, 1, 'good', TODAY)[1].level, 3, 'good climbs one');
    assert.equal(logReview(base, 1, 'easy', TODAY)[1].level, 4, 'easy climbs two');
    assert.equal(logReview(base, 1, 'again', TODAY)[1].level, 0, 'again restarts');
  });
});

describe('ayah track: keys, mark, review, due, sanitize', () => {
  test('normalizeAyahKey validates ranges', () => {
    assert.equal(normalizeAyahKey(2, 255), '2:255');
    assert.equal(normalizeAyahKey('2', '255'), '2:255');
    assert.equal(normalizeAyahKey(0, 1), null);
    assert.equal(normalizeAyahKey(115, 1), null);
    assert.equal(normalizeAyahKey(2, 0), null);
    assert.equal(normalizeAyahKey(2, 287), null);
    assert.equal(normalizeAyahKey('x', 1), null);
  });

  test('mark + review walk the ladder per ayah', () => {
    let recs = markAyahMemorized({}, 2, 255, TODAY);
    assert.deepEqual(Object.keys(recs), ['2:255']);
    assert.equal(recs['2:255'].level, 0);
    recs = logAyahReview(recs, 2, 255, 'good', TODAY);
    assert.equal(recs['2:255'].level, 1);
    recs = logAyahReview(recs, 2, 255, 'easy', recs['2:255'].due);
    assert.equal(recs['2:255'].level, 3, 'easy jumps two rungs');
    recs = logAyahReview(recs, 2, 255, 'again', recs['2:255'].due);
    assert.deepEqual([recs['2:255'].level, recs['2:255'].lapses], [0, 1]);
  });

  test('unknown ayahs and grades no-op', () => {
    const recs = markAyahMemorized({}, 2, 255, TODAY);
    assert.equal(logAyahReview(recs, 2, 999, 'good', TODAY), recs);
    assert.equal(logAyahReview(recs, 2, 255, 'perfect', TODAY), recs);
    assert.equal(logAyahReview(recs, 2, 255, 'good', 'junk'), recs);
    assert.deepEqual(markAyahMemorized({}, 2, 999, TODAY), {});
  });

  test('dueAyahs orders oldest-first, mushaf order on ties', () => {
    const recs = {
      '2:255': {
        level: 1,
        due: '2026-08-20',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 1,
        lapses: 0,
      },
      '2:256': {
        level: 1,
        due: '2026-08-20',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 1,
        lapses: 2,
      },
      '3:1': {
        level: 0,
        due: '2026-08-29',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 0,
        lapses: 0,
      },
      '3:2': {
        level: 0,
        due: '2026-09-01',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 0,
        lapses: 0,
      },
    };
    assert.deepEqual(
      dueAyahs(recs, TODAY).map((r) => r.key),
      ['2:255', '2:256', '3:1']
    );
  });

  test('sanitize keeps well-formed ayah records only', () => {
    const out = sanitizeAyahRecords({
      '2:255': { level: 2, since: TODAY, due: TODAY, lastReviewed: TODAY, reviews: 3, lapses: 1 },
      '2:999': { level: 0, since: TODAY, due: TODAY },
      99: { level: 0, since: TODAY, due: TODAY },
      __proto__: { level: 0, since: TODAY, due: TODAY },
      junk: null,
    });
    assert.deepEqual(Object.keys(out), ['2:255']);
    assert.deepEqual(sanitizeAyahRecords(null), {});
    assert.deepEqual(sanitizeAyahRecords([]), {});
  });
});

describe('ayahMistakes: per-ayah lapse heat', () => {
  test('seeds zeros and counts lapses per ayah', () => {
    const heat = ayahMistakes(
      { '2:255': { lapses: 3 }, '2:256': { lapses: 0 }, '3:1': { lapses: 9 } },
      2,
      286
    );
    assert.equal(Object.keys(heat).length, 286, 'every cell renders');
    assert.equal(heat[255], 3);
    assert.equal(heat[256], 0);
    assert.equal(heat[1], 0);
  });

  test('hostile shapes degrade honestly', () => {
    const seeded = ayahMistakes(null, 2, 286);
    assert.equal(Object.keys(seeded).length, 286, 'valid surah seeds zeros without records');
    assert.deepEqual(ayahMistakes({}, 999, 286), {});
    assert.deepEqual(ayahMistakes({}, 2, 0), {});
  });
});

describe('reducer routes ayah traffic to the ayah map', () => {
  test('HIFZ_AYAH_MARK and graded HIFZ_REVIEW land per ayah', () => {
    const s0 = initialState();
    assert.deepEqual(s0.hifzAyahRecords, {});
    const marked = reduce(s0, actions.hifzMarkAyah({ surah: 2, ayah: 255 }));
    assert.ok(marked.hifzAyahRecords['2:255'], 'ayah marked');
    assert.deepEqual(marked.hifzRecords, {}, 'surah map untouched');
    const reviewed = reduce(marked, actions.hifzReview({ surah: 2, ayah: 255, grade: 'hard' }));
    assert.equal(reviewed.hifzAyahRecords['2:255'].level, 0, 'hard holds rung 0');
    assert.equal(reviewed.hifzAyahRecords['2:255'].reviews, 1);
    const bad = reduce(marked, actions.hifzReview({ surah: 2, ayah: 255, grade: 'perfect' }));
    assert.equal(bad, marked, 'hostile grade no-ops');
  });

  test('surah reviews still land per surah (default null ayah)', () => {
    const s0 = initialState();
    const marked = reduce(s0, { type: 'HIFZ_MARK_MEMORIZED', surah: 2 });
    const reviewed = reduce(marked, actions.hifzReview({ surah: 2, grade: 'good' }));
    assert.equal(reviewed.hifzRecords['2'].level, 1);
    assert.deepEqual(reviewed.hifzAyahRecords, {}, 'ayah map untouched');
  });
});

describe('views: four grades, ayah rows, heatmap strip', () => {
  function quranState(over = {}) {
    return {
      settings: { language: 'en' },
      hifzSession: { mode: false, surah: null, level: 'word', revealed: {} },
      hifzRecords: {
        2: { level: 1, since: TODAY, lastReviewed: TODAY, due: TODAY, reviews: 1, lapses: 0 },
      },
      hifzAyahRecords: {},
      quran: { meta: { surahs: [{ number: 2, ayahCount: 3 }] } },
      ...over,
    };
  }

  test('toolbar renders Again/Hard/Good/Easy with data grades', async () => {
    const { hifzToolbarHTML } = await import('../js/views/quran.js');
    const html = hifzToolbarHTML(
      quranState({
        quran: { meta: { surahs: [{ number: 2, ayahCount: 3 }] } },
      }),
      2,
      'en'
    );
    for (const g of ['again', 'hard', 'good', 'easy']) {
      assert.ok(html.includes(`data-grade="${g}"`), `grade button: ${g}`);
    }
  });

  test('ayah detail marks and reviews single ayahs', () => {
    const base = {
      settings: { language: 'en' },
      ayahBookmarks: [],
      quran: { meta: null, surahs: {} },
      mushafSession: {},
      hifzRecords: {},
      hifzAyahRecords: {},
    };
    const fresh = buildMushafAyahDetail('نص', { ayahs: [{ number: 5 }] }, 2, 5, base);
    assert.ok(fresh.includes('data-action="hifz-ayah-mark"'), 'ayah mark control');
    assert.ok(fresh.includes('data-ayah="5"'), 'ayah id rides along');
    const tracked = buildMushafAyahDetail('نص', { ayahs: [{ number: 5 }] }, 2, 5, {
      ...base,
      hifzAyahRecords: {
        '2:5': { level: 1, since: TODAY, lastReviewed: TODAY, due: TODAY, reviews: 1, lapses: 0 },
      },
    });
    assert.ok(
      tracked.includes('data-action="hifz-review" data-surah="2" data-ayah="5"'),
      'ayah review carries both ids'
    );
  });

  test('heatmap strip buckets lapses, absent when clean', () => {
    assert.equal(hifzHeatmapHTML(quranState(), 2, 'en'), '', 'no mistakes, no strip');
    const hot = hifzHeatmapHTML(
      quranState({ hifzAyahRecords: { '2:1': { lapses: 4 }, '2:3': { lapses: 1 } } }),
      2,
      'en'
    );
    assert.ok(hot.includes('hifz-heatmap'), 'strip renders');
    assert.ok(hot.includes('heatmap__cell--4'), 'hottest bucket');
    assert.ok(hot.includes('heatmap__cell--0'), 'clean cells render');
    assert.ok(hot.includes('Mistakes by ayah'), 'labeled group');
  });
});

describe('hifz wiring: handlers and strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/hifz.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('review accepts four grades plus ayah marks', () => {
    assert.ok(handlers.includes("'hifz-ayah-mark'"), 'ayah mark handler missing');
    assert.ok(handlers.includes('normalizeHifzGrade'), 'grade whitelist missing');
    assert.ok(handlers.includes('data-ayah') || handlers.includes('ds.ayah'), 'ayah id flows');
  });

  test('grade + heatmap strings ship EN + AR', () => {
    for (const key of ['hifz.again', 'hifz.hard', 'hifz.good', 'hifz.easy', 'hifz.mistakes']) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
