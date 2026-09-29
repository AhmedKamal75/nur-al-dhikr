/**
 * tests/adhkar-browser.test.js — REORGANISATION-PLAN.md Phase 3.
 *
 * Home IS the adhkar browser: named category tiles with live counts and a
 * Read-now action per tile; the 12 moods promoted to a filter row above
 * the grid; the 99 Names / Zakat / Certificates re-homed into a Reference
 * row outside the daily grid; the section-level completion counter kept.
 *
 * Constraints pinned here: no data/corpus change (routes move, data/
 * does not), all deep links keep working, no new data-action (navigate
 * only), no new static view import (home reuses domain/service helpers),
 * bilingual EN+AR throughout, no gamification copy.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processDocument } from '../js/core/schema.js';
import { buildHash } from '../js/core/router.js';
import { VIEWS, DEFAULT_SETTINGS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { MOODS } from '../js/domain/moods.js';
import { dateKey } from '../js/core/utils.js';
import { adhkarBrowserHTML, renderHome } from '../js/views/home.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const loadDoc = (file) =>
  processDocument(JSON.parse(readFileSync(join(ROOT, `data/${file}`), 'utf8'))).value;

const adhkarDoc = loadDoc('adhkar.json');
const duasDoc = loadDoc('duas.json');
const asmaDoc = loadDoc('asma.json');

/** Real corpus docs (never invented) wired into a boot-shaped state. */
function browserState({ lang = 'en', prefs = {}, counters = {} } = {}) {
  const base = initialState();
  const documents = { adhkar: adhkarDoc, duas: duasDoc, asma: asmaDoc };
  const index = {};
  for (const doc of Object.values(documents)) {
    for (const cat of doc.categories || []) {
      for (const item of cat.items || []) {
        index[item.id] = { item, category: cat, document: doc };
      }
    }
  }
  return {
    ...base,
    settings: { ...base.settings, language: lang, contentPrefs: prefs },
    library: { ...base.library, documents, order: ['adhkar', 'duas', 'asma'], itemIndex: index },
    customContent: {},
    counters,
  };
}

const actionsOf = (html) => new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));

describe('Phase 3: the mood filter row (same feature, front door)', () => {
  test('all 12 moods ride chips above the grid, each with a live count', () => {
    const html = adhkarBrowserHTML(browserState());
    for (const mood of MOODS) {
      assert.ok(
        html.includes(`data-view="${VIEWS.MOOD}" data-id="${mood.id}"`),
        `mood chip missing: ${mood.id}`
      );
    }
    assert.equal(MOODS.length, 12, 'the plan promotes exactly 12 moods');
    assert.ok(html.includes(en['moods.title']), 'filter row keeps the moods title');
  });

  test('filter row is bilingual (AR renders translated names, no English CTA)', () => {
    const html = adhkarBrowserHTML(browserState({ lang: 'ar' }));
    assert.ok(html.includes(ar['moods.title']), 'AR moods title renders');
    assert.ok(html.includes(ar['home.readNow']), 'AR Read-now renders');
    assert.ok(!html.includes('>Read now<'), 'no English CTA leaks into Arabic chrome');
  });
});

describe('Phase 3: named tiles with live counts + Read-now per tile', () => {
  test('every daily category gets a tile with its live count and a Read-now action', () => {
    const state = browserState();
    const html = adhkarBrowserHTML(state);
    const dailyCats = [...adhkarDoc.categories, ...duasDoc.categories];
    assert.ok(dailyCats.length > 40, `expected the full depth, saw ${dailyCats.length}`);
    for (const cat of dailyCats) {
      assert.ok(
        html.includes(`data-view="${VIEWS.CATEGORY}" data-id="${cat.id}"`),
        `tile missing for category: ${cat.id}`
      );
    }
    const reads = html.split('browser-tile__read').length - 1;
    assert.equal(
      reads,
      dailyCats.length,
      `one Read-now per tile (${reads} vs ${dailyCats.length})`
    );
    // Live count, not a hard-coded number: the morning section's real size.
    const morning = adhkarDoc.categories.find((c) => c.id === 'morning');
    assert.ok(
      html.includes(en['collections.itemCount'].replace('{n}', String(morning.items.length))),
      'morning tile carries its live item count'
    );
  });

  test('tile links keep the existing deep-link hashes (routes move, hashes do not)', () => {
    const html = adhkarBrowserHTML(browserState());
    assert.equal(buildHash(VIEWS.CATEGORY, { id: 'morning' }), '#/category/morning');
    assert.equal(buildHash(VIEWS.MOOD, { id: 'anxious' }), '#/mood/anxious');
    assert.ok(html.includes('#/category/morning'), 'tile href is the unchanged deep link');
    assert.ok(html.includes('#/mood/anxious'), 'mood href is the unchanged deep link');
  });

  test('hidden categories and libraries stay out of the browser (lens respected)', () => {
    const hidden = adhkarBrowserHTML(
      browserState({ prefs: { hiddenCategories: { morning: true } } })
    );
    assert.ok(!hidden.includes('data-id="morning"'), 'a hidden section leaves the grid');
    const noAsma = adhkarBrowserHTML(browserState({ prefs: { hiddenLibraries: { asma: true } } }));
    assert.ok(!noAsma.includes('asma-all-99'), 'a hidden reference library leaves the page');
    assert.ok(
      noAsma.includes(`data-view="${VIEWS.ZAKAT}"`),
      'Zakat stays even when the Names are hidden'
    );
  });
});

describe('Phase 3: reference re-homed out of the daily grid', () => {
  test('the 99 Names, Zakat and Certificates sit outside the grid, never in it', () => {
    const html = adhkarBrowserHTML(browserState());
    assert.ok(!html.includes('home-section-asma'), 'no daily-grid section for the Names');
    assert.ok(
      html.includes(`data-view="${VIEWS.CATEGORY}" data-id="asma-all-99"`),
      'the Names keep a direct row into their (unchanged) category route'
    );
    assert.ok(html.includes(`data-view="${VIEWS.ZAKAT}"`), 'Zakat row present');
    assert.ok(html.includes(`data-view="${VIEWS.CERTIFICATE}"`), 'Certificates row present');
    assert.ok(html.includes(en['home.referenceTitle']), 'reference row is labelled as reference');
    assert.ok(html.includes(en['zakat.title']), 'Zakat row uses its own bilingual label');
    assert.ok(html.includes(en['certificate.title']), 'Certificates row uses its own label');
  });
});

describe('Phase 3: the kept completion counter, honestly', () => {
  test('silent until the first item is done today; achieved at 100%', () => {
    const fresh = adhkarBrowserHTML(browserState());
    assert.ok(!fresh.includes('done today'), 'no wall of 0% — absence is not counted');
    const morning = adhkarDoc.categories.find((c) => c.id === 'morning');
    const today = dateKey(new Date());
    const counters = Object.fromEntries(
      morning.items.map((it) => [it.id, { count: 1, lastCompletedDay: today }])
    );
    const done = adhkarBrowserHTML(browserState({ counters }));
    const expect = en['category.progressToday']
      .replace('{done}', String(morning.items.length))
      .replace('{total}', String(morning.items.length))
      .replace('{pct}', '100');
    assert.ok(done.includes(expect), `full completion reads as achieved (${expect})`);
  });
});

describe('Phase 3: contracts that must not move', () => {
  test('the browser emits navigate only — no new data-action, no interstitial', () => {
    const html = adhkarBrowserHTML(browserState());
    assert.deepEqual([...actionsOf(html)], ['navigate'], 'every browser tap is an existing action');
  });

  test('home.js imports no view — the 19/19 static budget stays untouched', () => {
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(!src.includes("from '../views/"), 'home reuses domain/service helpers, not views');
  });

  test('every new home.browser*/home.readNow/home.reference*/home.openLibrary key is bilingual', () => {
    for (const key of [
      'home.browserTitle',
      'home.browserSub',
      'home.readNow',
      'home.referenceTitle',
      'home.referenceSub',
      'home.openLibrary',
    ]) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('no shame copy anywhere in the browser (both languages)', () => {
    for (const lang of ['en', 'ar']) {
      const html = adhkarBrowserHTML(browserState({ lang }));
      assert.ok(!/streak/i.test(html), `no streak vocabulary (${lang})`);
      assert.ok(!/leaderboard/i.test(html), `no leaderboard (${lang})`);
      assert.ok(!/متصدر/i.test(html), `no leaderboard (${lang})`);
    }
  });

  test('renderHome carries the browser for a real boot state (spot-check)', () => {
    const html = renderHome(browserState());
    assert.ok(html.includes('home-browser'), 'browser section rides the home view');
    assert.ok(html.includes(en['home.browserTitle']), 'browser title renders on home');
    assert.ok(html.includes(`data-view="${VIEWS.LIBRARY}"`), 'full-library door still offered');
    assert.ok(html.includes('topbar__lang') === false, 'no chrome duplication from the view');
  });

  test('DEFAULT_SETTINGS untouched: no new settings key, no new panel id', () => {
    assert.ok(!('adhkar' in DEFAULT_SETTINGS), 'no settings key smuggled in with Phase 3');
  });
});
