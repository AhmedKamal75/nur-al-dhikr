import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIFZ_INTERVALS,
  plusDays,
  diffDays,
  sanitizeHifzRecords,
  markMemorized,
  logReview,
  dueSurahs,
  countMemorized,
  surahPageRange,
  suggestFromKhatma,
  clozeWords,
  clozeAyahHTML,
  normalizeHifzLevel,
} from '../js/domain/hifz.js';

/**
 * The hifz spaced-repetition scheduler + memorize-mode cloze renderer,
 * both pure: dates go in as ISO day strings, HTML comes out escaped, and
 * hostile shapes degrade to no-ops instead of exceptions.
 */

const TODAY = '2026-08-29';

describe('date helpers', () => {
  test('plusDays walks the calendar and refuses junk', () => {
    assert.equal(plusDays('2026-08-29', 1), '2026-08-30');
    assert.equal(plusDays('2026-08-31', 1), '2026-09-01', 'month rollover');
    assert.equal(plusDays('2026-12-31', 1), '2027-01-01', 'year rollover');
    assert.equal(plusDays('2026-02-28', 1), '2026-03-01', 'non-leap February');
    assert.equal(plusDays('garbage', 3), null);
    assert.equal(plusDays(null, 3), null);
  });

  test('diffDays is non-negative and tolerant', () => {
    assert.equal(diffDays('2026-08-25', TODAY), 4);
    assert.equal(diffDays(TODAY, '2026-08-25'), 0, 'never negative');
    assert.equal(diffDays('x', TODAY), 0);
  });
});

describe('record lifecycle', () => {
  test('markMemorized creates a level-0 record due tomorrow', () => {
    const recs = markMemorized({}, 112, TODAY);
    assert.deepEqual(recs['112'], {
      level: 0,
      since: TODAY,
      lastReviewed: TODAY,
      due: '2026-08-30',
      reviews: 0,
      lapses: 0,
    });
    assert.equal(countMemorized(recs), 1);
  });

  test('markMemorized refuses invalid surahs and dates', () => {
    assert.deepEqual(markMemorized({}, 115, TODAY), {});
    assert.deepEqual(markMemorized({}, 0, TODAY), {});
    assert.deepEqual(markMemorized({}, 'al-Fatihah', TODAY), {});
    assert.deepEqual(markMemorized({}, 1, 'not-a-date'), {});
  });

  test('easy reviews climb the growing interval ladder', () => {
    let recs = markMemorized({}, 1, TODAY);
    let day = TODAY;
    const seenIntervals = [];
    for (let i = 0; i < 8; i++) {
      const before = recs['1'];
      recs = logReview(recs, 1, 'easy', day);
      const after = recs['1'];
      seenIntervals.push(diffDays(day, after.due));
      assert.equal(after.reviews, before.reviews + 1);
      day = after.due;
    }
    // each easy review promotes a level, so the intervals walk the ladder
    // from index 1; the 1-day interval is the lapse (again) destination
    assert.deepEqual(seenIntervals, [3, 7, 14, 30, 60, 120, 120, 120]);
    assert.equal(recs['1'].level, HIFZ_INTERVALS.length - 1, 'level caps at the ladder top');
  });

  test('a struggled review drops back to a 1-day interval and counts a lapse', () => {
    let recs = markMemorized({}, 2, TODAY);
    recs = logReview(recs, 2, 'easy', TODAY);
    recs = logReview(recs, 2, 'easy', recs['2'].due);
    const level = recs['2'].level;
    recs = logReview(recs, 2, 'again', recs['2'].due);
    assert.equal(recs['2'].level, 0, 'back to the bottom of the ladder');
    assert.equal(diffDays(recs['2'].lastReviewed, recs['2'].due), 1);
    assert.equal(recs['2'].lapses, 1);
    assert.ok(recs['2'].reviews >= 3);
    assert.ok(level >= 2);
  });

  test('logReview is a safe no-op on junk input', () => {
    const recs = markMemorized({}, 1, TODAY);
    assert.deepEqual(logReview(null, 1, 'easy', TODAY), {}, 'no records yet');
    assert.deepEqual(logReview(recs, 999, 'easy', TODAY), recs, 'unknown surah');
    assert.deepEqual(logReview(recs, 1, 'perfect', TODAY), recs, 'unknown grade');
    assert.deepEqual(logReview(recs, 1, 'easy', 'junk'), recs, 'bad date');
  });
});

describe('due queue', () => {
  test('dueSurahs filters and sorts by due date then surah', () => {
    const recs = {
      110: {
        level: 0,
        due: '2026-08-28',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 1,
        lapses: 0,
      },
      109: {
        level: 2,
        due: '2026-08-28',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 3,
        lapses: 0,
      },
      111: {
        level: 1,
        due: '2026-08-30',
        since: TODAY,
        lastReviewed: TODAY,
        reviews: 2,
        lapses: 0,
      },
      112: { level: 0, due: TODAY, since: TODAY, lastReviewed: TODAY, reviews: 1, lapses: 0 },
    };
    const due = dueSurahs(recs, TODAY);
    assert.deepEqual(
      due.map((d) => d.surah),
      [109, 110, 112],
      'oldest due first; 111 is tomorrow (not due)'
    );
    assert.equal(due[0].overdue, 1);
    assert.equal(due.find((d) => d.surah === 112).overdue, 0, 'due today is not overdue');
  });

  test('dueSurahs survives a hostile map', () => {
    assert.deepEqual(dueSurahs(null, TODAY), []);
    assert.deepEqual(dueSurahs('x', TODAY), []);
    assert.deepEqual(dueSurahs({ 1: null, 2: 'junk' }, TODAY), []);
  });
});

describe('sanitizeHifzRecords (restore path)', () => {
  test('keeps well-formed entries, drops everything hostile', () => {
    // built via JSON.parse so "__proto__" is a REAL own key, the way a
    // poisoned backup would carry it (an object literal would set a
    // prototype instead of creating the key)
    const input = JSON.parse(
      JSON.stringify({
        1: {
          level: 2,
          due: '2026-09-01',
          since: '2026-08-01',
          lastReviewed: '2026-08-02',
          reviews: 3,
          lapses: 1,
        },
        2: { level: -7, due: '2026-09-01' }, // clamped level
        3: { level: 99, due: '2026-09-01' }, // clamped level
        4: { level: 0 }, // no usable date
        5: 'junk',
        6: null,
        '../etc': { level: 0, due: '2026-09-01' },
        999: { level: 0, due: '2026-09-01' }, // out of surah range
      })
    );
    Object.defineProperty(input, '__proto__', {
      value: { level: 0, due: '2026-09-01' },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    const clean = sanitizeHifzRecords(input);
    assert.deepEqual(
      Object.keys(clean).sort(),
      ['1', '2', '3'],
      'only the three well-formed surah entries survive'
    );
    assert.equal(clean['1'].level, 2);
    assert.equal(clean['2'].level, 0, 'negative clamps to 0');
    assert.equal(clean['3'].level, HIFZ_INTERVALS.length - 1, 'clamps to ladder top');
    assert.ok(!Object.hasOwn(clean, '__proto__'), 'proto key is dropped, never adopted');
    assert.ok(!Object.hasOwn(clean, '../etc'));
  });

  test('non-object input degrades to an empty map', () => {
    assert.deepEqual(sanitizeHifzRecords(null), {});
    assert.deepEqual(sanitizeHifzRecords([1, 2]), {});
    assert.deepEqual(sanitizeHifzRecords('x'), {});
  });
});

describe('khatma reuse (page-tracking suggestions)', () => {
  // surah 112 is 4 ayahs on page 604; surah 113 is 5 ayahs on page 604 too.
  const ayahPages = {
    '112:1': 604,
    '112:2': 604,
    '112:3': 604,
    '112:4': 604,
    '113:1': 604,
    '113:2': 604,
    '113:3': 604,
    '113:4': 604,
    '113:5': 604,
    '114:1': 601,
    '114:2': 601,
  };
  const metas = [
    { number: 112, ayahCount: 4 },
    { number: 113, ayahCount: 5 },
    { number: 114, ayahCount: 2 },
  ];

  test('surahPageRange bounds a surah from the ayah→page index', () => {
    assert.deepEqual(surahPageRange(ayahPages, 112, 4), [604, 604]);
    assert.deepEqual(surahPageRange(ayahPages, 114, 2), [601, 601]);
    assert.equal(surahPageRange(null, 112, 4), null);
    assert.equal(surahPageRange({}, 112, 4), null);
    assert.equal(surahPageRange(ayahPages, 112, 0), null);
  });

  test('fully-read, unmemorized surahs are suggested; partial reads are not', () => {
    const recs = {
      112: { level: 0, due: TODAY, since: TODAY, lastReviewed: TODAY, reviews: 1, lapses: 0 },
    };
    const allRead = { 604: true };
    let out = suggestFromKhatma(recs, allRead, ayahPages, metas);
    assert.deepEqual(out, [{ surah: 113, startPage: 604, endPage: 604 }], '112 already memorized');
    out = suggestFromKhatma({}, { 601: true }, ayahPages, metas);
    assert.deepEqual(out, [{ surah: 114, startPage: 601, endPage: 601 }]);
  });

  test('a surah with any unread page in range is never suggested', () => {
    // only page 601 was read: surah 114 qualifies, but 112/113 sit on the
    // unread page 604 and are excluded
    const partial = { 601: true };
    const out = suggestFromKhatma({}, partial, ayahPages, metas);
    assert.deepEqual(out, [{ surah: 114, startPage: 601, endPage: 601 }]);
    assert.deepEqual(
      suggestFromKhatma({}, {}, ayahPages, metas),
      [],
      'nothing read — nothing suggested'
    );
  });

  test('suggestFromKhatma survives hostile inputs', () => {
    assert.deepEqual(suggestFromKhatma(null, null, null, null), []);
    assert.deepEqual(suggestFromKhatma({}, 'x', ayahPages, 'y'), []);
  });
});

describe('cloze renderer', () => {
  const ARABIC = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';

  test('clozeWords splits on whitespace and drops empties', () => {
    assert.deepEqual(clozeWords('a  b\tc'), ['a', 'b', 'c']);
    assert.deepEqual(clozeWords('   '), []);
    assert.deepEqual(clozeWords(null), []);
    assert.deepEqual(clozeWords(ARABIC).length, 4);
  });

  test('word level renders one sized blank per unrevealed word', () => {
    const html = clozeAyahHTML({
      text: ARABIC,
      level: 'word',
      ayah: 2,
      revealed: undefined,
      labels: { reveal: 'Reveal' },
    });
    assert.equal((html.match(/hifz-word-blank/g) || []).length, 4);
    assert.ok(html.includes('--hifz-w:'), 'blanks carry their word-length hint');
    assert.ok(!html.includes('الْحَمْدُ'), 'no revealed text leaks');
  });

  test('revealed words render escaped; reveal-all shows the whole ayah', () => {
    const one = clozeAyahHTML({
      text: ARABIC,
      level: 'word',
      ayah: 2,
      revealed: { words: { 0: true } },
      labels: { reveal: 'Reveal' },
    });
    assert.ok(one.includes('الْحَمْدُ'), 'word 0 revealed');
    assert.equal((one.match(/hifz-word-blank/g) || []).length, 3);
    const all = clozeAyahHTML({
      text: ARABIC,
      level: 'word',
      ayah: 2,
      revealed: { all: true },
      labels: { reveal: 'Reveal' },
    });
    assert.ok(all.includes('الْعَالَمِينَ') && !all.includes('hifz-word-blank'));
  });

  test('ayah level hides everything behind one reveal button; revealed shows text', () => {
    const hidden = clozeAyahHTML({
      text: ARABIC,
      level: 'ayah',
      ayah: 7,
      revealed: undefined,
      labels: { reveal: 'Reveal' },
    });
    assert.equal((hidden.match(/class="hifz-ayah-blank"/g) || []).length, 1, 'one blank block');
    assert.ok(hidden.includes('>4</span>'), 'word count is the only hint');
    assert.ok(!hidden.includes('الْحَمْدُ'));
    const shown = clozeAyahHTML({
      text: ARABIC,
      level: 'ayah',
      ayah: 7,
      revealed: { all: true },
      labels: { reveal: 'Reveal' },
    });
    assert.ok(shown.includes('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'));
  });

  test('corpus text can never become markup, even if poisoned upstream', () => {
    const hostile = '<img src=x onerror=alert(1)> بسم الله';
    const html = clozeAyahHTML({
      text: hostile,
      level: 'ayah',
      ayah: 1,
      revealed: { all: true },
      labels: { reveal: 'Reveal' },
    });
    assert.ok(!html.includes('<img'), 'escaped');
    assert.ok(html.includes('&lt;img'), 'entity-encoded text renders inert');
  });

  test('normalizeHifzLevel falls back to word level', () => {
    assert.equal(normalizeHifzLevel('ayah'), 'ayah');
    assert.equal(normalizeHifzLevel('word'), 'word');
    assert.equal(
      normalizeHifzLevel('line'),
      'word',
      'hide-line is a deliberate residual, not a level'
    );
    assert.equal(normalizeHifzLevel(undefined), 'word');
  });
});
