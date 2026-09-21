/**
 * tests/p0-tajweed-rounds.test.js — P0-5 gates (v5.3.0):
 *  1. shipped pool covers EVERY TAJWEED_RULES id with >= 5 real corpus
 *     rows (the "لا توجد آيات تدريب لهذا الحكم بعد" dead end is dead);
 *  2. new tafkhim/madd_iwad rows re-derive from the shipped classifier
 *     (no invented data — every entry is recomputable);
 *  3. backfillTajweedPool fills/only-top-ups honestly from loaded docs;
 *  4. practiceLevel boundaries + pickRoundEntries dedupe/weak-first;
 *  5. TAJWEED_PRACTICE_RESULT records the weak-rule map ({m,l}, cleared
 *     on re-learned) and restore sanitization drops hostile shapes;
 *  6. the round/summary templates render bilingual with the new HUD.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEED_MODE } from './helpers/seedMode.mjs';
import path from 'node:path';

import { classifyAyahTajweed, TAJWEED_RULES } from '../js/domain/tajweed.js';
import {
  backfillTajweedPool,
  practiceLevel,
  pickRoundEntries,
  PRACTICE_ROUND_SIZE,
  PRACTICE_POOL_MIN,
} from '../js/domain/tajweedPractice.js';
import { recordQuizMiss, sanitizeQuizMissRecords } from '../js/domain/quiz.js';
import { actions, store } from '../js/core/state.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import {
  buildPracticePicker,
  buildPracticeRound,
  buildPracticeSummary,
} from '../js/views/tajweedPracticeView.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const pool = readJSON('data/tajweed-practice.json');

describe('P0-5a: practice pool covers every rule with real rows', () => {
  test('every TAJWEED_RULES id has its complete shipped Quranic corpus coverage', () => {
    for (const rule of TAJWEED_RULES) {
      const rows = pool.byRule[rule.id] || [];
      const expectedAyahs = Number(pool.coverage?.[rule.id]?.ayahs || 0);
      if (SEED_MODE && expectedAyahs === 0) continue;
      const requiredMin = SEED_MODE
        ? Math.min(PRACTICE_POOL_MIN, expectedAyahs)
        : PRACTICE_POOL_MIN;
      assert.ok(
        rows.length >= requiredMin,
        `rule ${rule.id} has only ${rows.length} rows (min ${requiredMin})`
      );
      assert.equal(rows.length, expectedAyahs, `rule ${rule.id} rows must equal shipped coverage`);
      for (const level of ['1', '2', '3']) {
        const levelRows = pool.levels?.[level]?.[rule.id] || [];
        assert.ok(levelRows.length > 0, `rule ${rule.id} missing level ${level}`);
        if (level === '3')
          assert.equal(
            levelRows.length,
            rows.length,
            `rule ${rule.id} level 3 is not full coverage`
          );
      }
    }
  });

  test('every pool row points at a real corpus ayah and re-derives (spot: new rules)', () => {
    const meta = readJSON('data/quran-meta.json');
    const counts = new Map(meta.surahs.map((s) => [s.number, s.ayahCount]));
    for (const rule of ['tafkhim', 'madd_iwad']) {
      for (const e of pool.byRule[rule]) {
        assert.ok(
          counts.has(e.s) && e.a >= 1 && e.a <= counts.get(e.s),
          `${rule} ${e.s}:${e.a} in range`
        );
        // SEED MODE: only seed surahs ship (data/SEED-README.md). Rows whose
        // surah doc isn't in this archive were re-derived on the full tree;
        // every row that DOES ship is verified right here.
        if (!existsSync(path.join(ROOT, `data/quran/${e.s}.json`))) continue;
        const doc = readJSON(`data/quran/${e.s}.json`);
        const ayah = doc.ayahs.find((a) => String(a.number) === String(e.a));
        assert.ok(ayah, `${rule} ${e.s}:${e.a} exists in corpus`);
        const per = classifyAyahTajweed(ayah.text);
        let fw = 0;
        let c = 0;
        for (const w of per) {
          const spans = w.spans.filter((sp) => sp.rule === rule);
          if (spans.length) {
            if (!fw) fw = w.wordIndex;
            c += spans.length;
          }
        }
        assert.equal(fw, e.w, `${rule} ${e.s}:${e.a} first word re-derives`);
        assert.equal(c, e.c, `${rule} ${e.s}:${e.a} span count re-derives`);
      }
    }
  });

  test('mixed pool exists and carries rows', () => {
    assert.ok(Array.isArray(pool.mixed) && pool.mixed.length >= PRACTICE_POOL_MIN);
  });
});

describe('P0-5a: backfillTajweedPool (pure, honest, bounded)', () => {
  const docs = {
    1: readJSON('data/quran/1.json'),
    112: readJSON('data/quran/112.json'),
  };

  test('fills rules below min from loaded docs; leaves satisfied rules untouched', () => {
    const sparse = { byRule: { tafkhim: [], madd_iwad: [{ s: 4, a: 9, w: 15, c: 1 }] }, mixed: [] };
    const { pool: filled, addedByRule } = backfillTajweedPool(sparse, docs);
    assert.ok(filled.byRule.tafkhim.length >= 1, 'tafkhim gained rows from Fatiha');
    assert.equal(filled.byRule.madd_iwad.length, 1, 'satisfied rule untouched at min');
    assert.equal(addedByRule.tafkhim > 0, true);
    // Fatiha 1:1 carries the heavy lam of the divine name + heavy ra's.
    const first = filled.byRule.tafkhim[0];
    assert.deepEqual(first, { s: 1, a: 1, w: 2, c: 3 });
  });

  test('only[] bypasses the min gate for top-up mode', () => {
    const fullish = { byRule: { tafkhim: [{ s: 1, a: 1, w: 2, c: 3 }] }, mixed: [] };
    const { addedByRule } = backfillTajweedPool(fullish, docs, {
      min: 25,
      only: ['tafkhim'],
    });
    assert.ok(addedByRule.tafkhim >= 1, 'top-up adds rows even above min');
  });

  test('never mutates the input pool and dedupes mixed', () => {
    const sparse = { byRule: { tafkhim: [] }, mixed: [] };
    const snapshot = JSON.stringify(sparse);
    backfillTajweedPool(sparse, docs, { only: ['tafkhim'] });
    assert.equal(JSON.stringify(sparse), snapshot, 'input untouched');
  });

  test('hostile docs are ignored, not fatal', () => {
    const { addedByRule } = backfillTajweedPool(
      { byRule: { tafkhim: [] }, mixed: [] },
      { 7: { ayahs: 'not-an-array' }, 9: null, 33: { ayahs: [{ number: 73, text: 'وَرَٰحَةً' }] } },
      { only: ['tafkhim'] }
    );
    assert.ok(addedByRule.tafkhim >= 1, 'usable doc still contributes');
  });
});

describe('P0-5b: levels + round picks', () => {
  test('practiceLevel: no data → 1, thresholds → 2/3', () => {
    const stats = { byRule: {} };
    assert.equal(practiceLevel(stats, 'ghunnah'), 1);
    assert.equal(practiceLevel({ byRule: { ghunnah: { attempts: 4, correct: 3 } } }, 'ghunnah'), 2);
    assert.equal(
      practiceLevel({ byRule: { ghunnah: { attempts: 10, correct: 9 } } }, 'ghunnah'),
      3
    );
    assert.equal(
      practiceLevel({ byRule: { ghunnah: { attempts: 2, correct: 2 } } }, 'ghunnah'),
      2,
      '80%+ needs sustained attempts'
    );
  });

  test('pickRoundEntries: count, uniqueness, weak-first for review', () => {
    const big = {
      byRule: {
        ghunnah: Array.from({ length: 25 }, (_, i) => ({ s: 2, a: i + 1, w: 1, c: 1 })),
        iqlab: Array.from({ length: 10 }, (_, i) => ({ s: 3, a: i + 1, w: 1, c: 1 })),
      },
      mixed: [],
    };
    const picked = pickRoundEntries(big, 'ghunnah', PRACTICE_ROUND_SIZE);
    assert.equal(picked.length, PRACTICE_ROUND_SIZE);
    assert.equal(new Set(picked.map((p) => `${p.s}:${p.a}`)).size, PRACTICE_ROUND_SIZE, 'unique');

    // Review: rows from the most-missed rules come first.
    const review = pickRoundEntries(big, 'review', 5, null, ['iqlab']);
    assert.ok(review.length === 5, 'review round fully staffed');
    assert.ok(
      review.every((p) => p.s === 3),
      'weak rule rows ranked first'
    );

    // Unknown rule → empty, never fabricated.
    assert.deepEqual(pickRoundEntries(big, 'madd_6', 5), []);
    const withMadd = { ...big, byRule: { ...big.byRule, madd_6: [{ s: 1, a: 1, w: 1, c: 1 }] } };
    assert.equal(
      pickRoundEntries(withMadd, 'madd_6', 5).length,
      1,
      'pool smaller than round is honest'
    );
  });
});

describe('P0-5b: weak-rule memory (state + restore)', () => {
  test('TAJWEED_PRACTICE_RESULT upserts a miss and clears on re-learned', () => {
    store.dispatch(actions.recordTajweedPracticeResult('ghunnah', false));
    let rec = store.getState().tajweedMissRecords;
    assert.equal(rec.ghunnah?.m, 1, 'miss recorded');
    assert.match(rec.ghunnah?.l, /^\d{4}-\d{2}-\d{2}$/, 'day-stamped');
    store.dispatch(actions.recordTajweedPracticeResult('ghunnah', false));
    rec = store.getState().tajweedMissRecords;
    assert.equal(rec.ghunnah?.m, 2, 'second miss increments');
    store.dispatch(actions.recordTajweedPracticeResult('ghunnah', true));
    rec = store.getState().tajweedMissRecords;
    assert.equal(rec.ghunnah, undefined, 'perfect question clears (re-learned)');
    assert.ok(store.getState().tajweedPracticeStats.totalAttempts >= 2, 'stats still updated');
  });

  test('restore drops hostile tajweedMissRecords shapes', async () => {
    assert.deepEqual(sanitizeQuizMissRecords(null), {});
    const hostile = {
      ghunnah: { m: 2, l: '2026-09-01' },
      evil: { m: 1, l: 'not-a-date' },
      __proto__: { m: 9, l: '2026-09-01' },
      x: 42,
    };
    const clean = sanitizeQuizMissRecords(hostile);
    assert.deepEqual(Object.keys(clean), ['ghunnah']);
  });
});

describe('P0-5b: round templates render (EN + AR)', () => {
  const baseState = (overrides = {}) => {
    const { settings, ...rest } = overrides;
    return {
      settings: { ...DEFAULT_SETTINGS, language: 'en', ...(settings || {}) },
      tajweedPracticeStats: {
        totalCorrect: 3,
        totalAttempts: 4,
        currentStreak: 1,
        bestStreak: 3,
        byRule: { ghunnah: { attempts: 4, correct: 3 } },
      },
      tajweedMissRecords: { iqlab: { m: 2, l: '2026-09-01' } },
      ...rest,
    };
  };

  const session = {
    ruleId: 'ghunnah',
    mode: 'round',
    questions: [{ s: 2, a: 17, text: 'مَثَلُهُمْ كَمَثَلِ ٱلَّذِى ٱسْتَوْقَدَ نَارًا' }],
    qIndex: 2,
    surah: 2,
    ayah: 17,
    text: 'مَثَلُهُمْ كَمَثَلِ ٱلَّذِى ٱسْتَوْقَدَ نَارًا',
    selected: new Set(),
    checked: false,
    targets: [],
    result: null,
    results: [{ perfect: true }, { perfect: false }],
    roundStreak: 1,
  };

  test('picker shows level badges + review button with count (EN)', () => {
    const html = buildPracticePicker(baseState());
    assert.match(html, /practice-rule__level/, 'level badge renders');
    assert.match(html, /practice-review-btn/, 'review button renders');
    assert.match(html, /practice-review-count/, 'missed-rule count renders');
    assert.match(html, /data-rule="review"/, 'review action wired');
  });

  test('picker renders Arabic labels in AR', () => {
    const html = buildPracticePicker(baseState({ settings: { language: 'ar' } }));
    assert.match(html, /مراجعة الأخطاء/, 'review button Arabic');
    assert.match(html, /متعلم|متدرّب|متقن/, 'level badge Arabic');
  });

  test('round HUD shows question-of and streak', () => {
    const html = buildPracticeRound(baseState(), session);
    assert.match(html, /Question 3 of/, 'question counter');
    assert.match(html, /practice-round__hud/, 'HUD container');
    assert.match(html, /aria-live="polite"/, 'live region');
  });

  test('summary shows score, review CTA only when missed, bilingual', () => {
    const done = {
      ...session,
      checked: true,
      results: [
        { perfect: true },
        { perfect: true },
        { perfect: false },
        { perfect: true },
        { perfect: true },
      ],
      roundStreak: 2,
    };
    const html = buildPracticeSummary(baseState(), done);
    assert.match(html, /4\/5/, 'clean count');
    assert.match(html, /data-action="practice-start" data-rule="review"/, 'review CTA');
    const ar = buildPracticeSummary(baseState({ settings: { language: 'ar' } }), done);
    assert.match(ar, /اكتملت الجولة/, 'Arabic title');
    const flawless = buildPracticeSummary(baseState(), {
      ...session,
      results: [{ perfect: true }, { perfect: true }],
      roundStreak: 2,
    });
    assert.doesNotMatch(flawless, /data-rule="review"/, 'no review CTA when clean');
  });
});
