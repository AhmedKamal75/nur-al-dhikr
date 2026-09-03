/**
 * tests/roots.test.js — v3.22.0 root-family browser.
 *
 * Three layers, mirroring the wordStudy split:
 *   1. pure-logic units (folding, search, form grouping, stats, sanitize)
 *      against hand-built fixtures including hostile shapes;
 *   2. a render smoke test exercising the real view templates against the
 *      real bundled data (catching undefined interpolations, unescaped
 *      sinks, missing null guards) — including the capped-vs-full
 *      progressive-load honesty hint;
 *   3. a data-integrity gate for data/quran-roots-full.json: every root's
 *      occ list is FULL (occ.length === count), the grand total matches the
 *      corpus audit (50,048), the root set is exactly the capped popover
 *      index's root set, and the capped file is a strict PREFIX of the
 *      full file so the two surfaces can never disagree.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  sanitizeRootParam,
  foldRoot,
  rootList,
  searchRoots,
  rootForms,
  rootStats,
  rootOccurrencesAll,
} from '../js/domain/roots.js';
import { renderRoots } from '../js/views/roots.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

/* ---- fixtures ------------------------------------------------------------ *
 * CAPPED mirrors data/quran-roots.json's contract: count is the TRUE total
 * while occ is capped (here at 3 of 5). FULL carries every occurrence. */

const OCC_FULL = [
  { s: 1, a: 1, i: 3, t: 'الرَّحْمَٰنِ' },
  { s: 1, a: 2, i: 3, t: 'رَحْمَةٍ' },
  { s: 2, a: 5, i: 2, t: 'رَحْمَةٍ' },
  { s: 2, a: 9, i: 1, t: 'وَرَحْمَةٌ' },
  { s: 3, a: 4, i: 7, t: 'يَرْحَمُ' },
];

const CAPPED = {
  رحم: { count: 5, occ: OCC_FULL.slice(0, 3) },
  علم: {
    count: 3,
    occ: [
      { s: 2, a: 3, i: 4, t: 'يَعْلَمُونَ' },
      { s: 2, a: 9, i: 2, t: 'يَعْلَمُونَ' },
      { s: 4, a: 1, i: 5, t: 'عَلِيمًا' },
    ],
  },
  حمد: { count: 1, occ: [{ s: 1, a: 2, i: 2, t: 'الْحَمْدُ' }] },
};
const FULL = {
  رحم: { count: 5, occ: OCC_FULL },
  علم: CAPPED.علم,
  حمد: CAPPED.حمد,
};

function baseState(overrides = {}) {
  return {
    settings: { language: 'en' },
    quranRoots: CAPPED,
    quranRootsFull: null,
    activeParams: {},
    ...overrides,
  };
}

/* ---- 1. pure logic ------------------------------------------------------ */

describe('sanitizeRootParam', () => {
  test('keeps Arabic letters, strips diacritics and tatweel', () => {
    assert.equal(sanitizeRootParam('رَحَمَ'), 'رحم');
    assert.equal(sanitizeRootParam('ـرـحـمـ'), 'رحم');
  });
  test('caps at 8 letters', () => {
    assert.equal(sanitizeRootParam('ا'.repeat(20)), 'ا'.repeat(8));
  });
  test('hostile inputs fold to empty string', () => {
    for (const bad of [
      '',
      null,
      undefined,
      42,
      {},
      '__proto__',
      '<img src=x>',
      'abc123',
      'constructor',
    ]) {
      const out = sanitizeRootParam(bad);
      assert.equal(out, '', `expected '' for ${JSON.stringify(bad)}`);
    }
  });
  test('percent-escape junk from chopped links yields empty, not a crash', () => {
    assert.equal(sanitizeRootParam('%C3'), '');
  });
  test('letters survive; non-letters never do (mixed input, cap applies)', () => {
    assert.equal(sanitizeRootParam('ريال%20ترابي'), 'ريالتراب'); // 9 letters -> capped at 8
  });
});

describe('foldRoot', () => {
  test('unifies alef variants, ya, ta-marbuta; strips harakat', () => {
    assert.equal(foldRoot('أله'), foldRoot('اله'));
    assert.equal(foldRoot('ٱتْلُ'), 'اتل');
    assert.equal(foldRoot('عِيسَىٰ'), 'عيسي');
    assert.equal(foldRoot('جَنَّةِ'), 'جنه'); // ة folds to ه
    assert.equal(foldRoot('قَالَتْ'), 'قالت'); // sukun-marked ta stays
  });
  test('non-string input folds to empty', () => {
    assert.equal(foldRoot(null), '');
    assert.equal(foldRoot(7), '');
  });
});

describe('rootList', () => {
  test('sorted by count desc; root set exact', () => {
    const list = rootList(FULL);
    assert.deepEqual(
      list.map((r) => r.root),
      ['رحم', 'علم', 'حمد']
    );
    assert.deepEqual(
      list.map((r) => r.count),
      [5, 3, 1]
    );
  });
  test('hostile index shapes degrade to empty list', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}]) {
      assert.deepEqual(rootList(bad), []);
    }
  });
});

describe('searchRoots', () => {
  test('empty query returns top roots by count, capped at limit', () => {
    const hits = searchRoots(FULL, '', 2);
    assert.deepEqual(
      hits.map((h) => h.root),
      ['رحم', 'علم']
    );
  });
  test('folded prefix match beats substring match regardless of count', () => {
    const idx = {
      رح: { count: 9, occ: [{ s: 1, a: 1, i: 1, t: 'رَحْمَةٍ' }] },
      مرح: { count: 50, occ: [{ s: 2, a: 2, i: 1, t: 'مَرَحٌ' }] },
    };
    const hits = searchRoots(idx, 'رح');
    assert.equal(hits[0].root, 'رح'); // prefix wins over higher count
    assert.equal(hits.length, 2);
  });
  test('typed query without hamza still finds hamza-bearing roots', () => {
    const idx = { أله: { count: 4, occ: [] } };
    assert.equal(searchRoots(idx, 'اله')[0]?.root, 'أله');
  });
  test('no hits -> empty list', () => {
    assert.deepEqual(searchRoots(FULL, 'زجز'), []);
  });
});

describe('rootForms', () => {
  test('groups by exact form, counts sum to occ length, sorted desc', () => {
    const groups = rootForms(FULL.رحم);
    assert.deepEqual(
      groups.map((g) => g.form),
      ['رَحْمَةٍ', 'الرَّحْمَٰنِ', 'وَرَحْمَةٌ', 'يَرْحَمُ']
    );
    assert.equal(groups[0].count, 2);
    assert.equal(
      groups.reduce((n, g) => n + g.count, 0),
      5
    );
    // partition: every occurrence lands in exactly one group
    const total = groups.reduce((n, g) => n + g.occ.length, 0);
    assert.equal(total, FULL.رحم.occ.length);
  });
  test('ties break by first appearance in mushaf order', () => {
    const groups = rootForms(FULL.علم);
    assert.deepEqual(
      groups.map((g) => g.form),
      ['يَعْلَمُونَ', 'عَلِيمًا']
    );
  });
  test('hostile entries degrade without crashing', () => {
    assert.deepEqual(rootForms(null), []);
    assert.deepEqual(rootForms({}), []);
    assert.deepEqual(rootForms({ occ: null }), []);
    const groups = rootForms({ occ: [null, { s: 1, a: 1, i: 1, t: 'قُلْ' }] });
    assert.equal(groups.length, 1);
    assert.equal(groups[0].form, 'قُلْ');
  });
});

describe('rootStats', () => {
  test('count prefers the file field; forms/surahs counted; first/last refs', () => {
    const stats = rootStats(FULL.رحم);
    assert.equal(stats.count, 5);
    assert.equal(stats.forms, 4);
    assert.equal(stats.surahs, 3);
    assert.deepEqual(stats.first, { s: 1, a: 1 });
    assert.deepEqual(stats.last, { s: 3, a: 4 });
  });
  test('missing count falls back to occ length', () => {
    assert.equal(rootStats({ occ: FULL.حمد.occ }).count, 1);
  });
  test('hostile entry -> zero stats, no crash', () => {
    const stats = rootStats(null);
    assert.deepEqual(
      {
        count: stats.count,
        forms: stats.forms,
        surahs: stats.surahs,
        first: stats.first,
        last: stats.last,
      },
      { count: 0, forms: 0, surahs: 0, first: null, last: null }
    );
  });
});

describe('rootOccurrencesAll', () => {
  test('unknown and prototype keys yield empty arrays', () => {
    assert.deepEqual(rootOccurrencesAll(FULL, 'زجز'), []);
    assert.deepEqual(rootOccurrencesAll(FULL, '__proto__'), []);
    assert.deepEqual(rootOccurrencesAll(null, 'رحم'), []);
  });
});

/* ---- 2. render smoke ----------------------------------------------------- */

describe('renderRoots', () => {
  test('loading state before the index arrives (skeleton, no undefined)', () => {
    const html = renderRoots(baseState({ quranRoots: null }));
    assert.match(html, /sk-block/);
    assert.doesNotMatch(html, /undefined/);
  });

  test('index mode: title, stats, tiles with escaped deep links', () => {
    const html = renderRoots(baseState());
    assert.match(html, /view--roots/);
    assert.match(html, /roots-search-input/);
    assert.match(html, /3 roots/);
    assert.match(html, /data-action="navigate"/);
    assert.match(html, /href="#\/roots\/%D8%B1%D8%AD%D9%85"/);
    assert.match(html, /5 occurrences/);
    assert.doesNotMatch(html, /undefined/);
  });

  test('index mode AR: no undefined, RTL tiles present', () => {
    const html = renderRoots(baseState({ settings: { language: 'ar' } }));
    assert.match(html, /dir="rtl"/);
    assert.doesNotMatch(html, /undefined/);
  });

  test('index mode search: query echoes escaped, misses render empty hint', () => {
    const miss = renderRoots(baseState({ activeParams: { q: 'زجز' } }));
    assert.match(miss, /empty-hint/);
    const xss = renderRoots(baseState({ activeParams: { q: '" onmouseover="x' } }));
    assert.doesNotMatch(xss, /onmouseover="x"/); // value must be escaped
  });

  test('detail mode with capped index only: honest partial hint', () => {
    const html = renderRoots(baseState({ activeParams: { id: 'رحم' } }));
    assert.match(html, /root-detail__name/);
    assert.match(html, /still loading/);
    assert.match(html, /data-action="roots-jump"/);
    // stats come from the entry's true count field even while occ is capped
    assert.match(html, /5 occurrences/);
    assert.match(html, /2 word forms/);
    assert.match(html, /2 surahs/);
  });

  test('detail mode with full index: no partial hint, groups complete', () => {
    const html = renderRoots(baseState({ quranRootsFull: FULL, activeParams: { id: 'رحم' } }));
    assert.doesNotMatch(html, /still loading/);
    assert.match(html, /يَرْحَمُ/u);
    assert.match(html, /×2/);
    assert.match(html, /4 word forms/);
    assert.match(html, /3 surahs/);
  });

  test('detail mode junk id (markup, latin, proto): sanitizes to index, no injection', () => {
    for (const id of ['<img src=x onerror=y>', '__proto__', 'abc123']) {
      const html = renderRoots(baseState({ activeParams: { id } }));
      // Junk ids fold to '' and land in the index view (a chopped shared
      // link should fall somewhere useful) — but must never inject.
      assert.doesNotMatch(html, /<img src=x/);
      assert.doesNotMatch(html, /undefined/);
      assert.match(html, /roots-search-input/); // index mode, not a broken detail
    }
  });

  test('detail mode unknown-but-clean root: not-found, never a crash', () => {
    const html = renderRoots(baseState({ activeParams: { id: 'زجز' } }));
    assert.match(html, /empty-hint/);
  });

  test('detail mode AR: stats chips and back link render bilingually', () => {
    const html = renderRoots(
      baseState({ quranRootsFull: FULL, settings: { language: 'ar' }, activeParams: { id: 'رحم' } })
    );
    assert.match(html, /كل الجذور/);
    assert.match(html, /المواضع: 5/);
    assert.doesNotMatch(html, /undefined/);
  });
});

/* ---- 3. data integrity gate (quran-roots-full.json) ---------------------- */

describe('quran-roots-full.json integrity', () => {
  const full = readJSON('data/quran-roots-full.json');
  const capped = readJSON('data/quran-roots.json');

  test('root set is exactly the capped index root set', () => {
    const a = Object.keys(full).sort();
    const b = Object.keys(capped).sort();
    assert.deepEqual(a, b);
  });

  test('every root is FULL: occ.length === count (no cap remnants)', () => {
    let checked = 0;
    for (const root of Object.keys(full)) {
      const f = full[root];
      assert.ok(Array.isArray(f.occ), `occ missing for ${root}`);
      assert.equal(f.occ.length, f.count, `not full for ${root}`);
      checked++;
    }
    assert.equal(checked, 1651);
  });

  test('grand total matches the corpus audit (50,048 occurrences)', () => {
    let total = 0;
    for (const root of Object.keys(full)) total += full[root].count;
    assert.equal(total, 50048);
  });

  test('per-root counts match the capped popover index exactly', () => {
    for (const root of Object.keys(capped)) {
      assert.equal(full[root].count, capped[root].count, `count drift for ${root}`);
    }
  });

  test('occurrences are (s,a,i)-ordered with valid ranges and non-empty forms', () => {
    for (const root of Object.keys(full)) {
      const occ = full[root].occ;
      let prev = 0;
      for (const o of occ) {
        assert.ok(o.s >= 1 && o.s <= 114 && o.a >= 1 && o.i >= 1, `bad ref for ${root}`);
        assert.ok(typeof o.t === 'string' && o.t.length > 0, `empty form for ${root}`);
        const k = o.s * 1000000 + o.a * 1000 + o.i;
        assert.ok(k > prev, `order violation for ${root}`);
        prev = k;
      }
    }
  });

  test('spot-check: رحم has 300+ real occurrences and الرَّحْمَٰن-style forms exist', () => {
    assert.ok(full['رحم'].count >= 300, `رحم count suspiciously low: ${full['رحم'].count}`);
    assert.equal(full['رحم'].occ[0].s, 1);
    assert.equal(full['رحم'].occ[0].a, 1);
    const forms = rootForms(full['رحم']).map((g) => g.form);
    assert.ok(
      forms.some((f) => f.includes('حْمَن') || f.includes('حْمِين')),
      'الرحمن/الرحيم forms missing from the grouping'
    );
  });

  test('capped index is a strict prefix of the full index (popover consistency)', () => {
    for (const root of Object.keys(capped)) {
      const cap = capped[root].occ;
      const head = full[root].occ.slice(0, cap.length);
      assert.deepEqual(
        cap.map((o) => [o.s, o.a, o.i, o.t]),
        head.map((o) => [o.s, o.a, o.i, o.t]),
        `capped prefix drift for ${root}`
      );
    }
  });
});
