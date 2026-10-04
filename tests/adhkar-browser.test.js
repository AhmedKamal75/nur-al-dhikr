/**
 * tests/adhkar-browser.test.js — the Azkar section browser (IA-7).
 *
 * The AZKAR section (#/library) IS the adhkar browser: named category
 * tiles with live counts and a Read-now action per tile; the 12 moods ride
 * a filter row below the grid (v5.17.56: the dhikr owns the fold); the 99
 * Names / Zakat / Certificates row outside the daily grid; the
 * section-level completion counter kept. Home is a Today landing now — the
 * grid moved here, reusing the same browser component (one component, one
 * grid, its own door).
 *
 * Constraints pinned here: no data/corpus change (routes move, data/
 * does not), all deep links keep working, no new data-action (navigate
 * only), no new static view import (library reuses the home browser
 * builder — the 19/19 renderer budget stays untouched), bilingual EN+AR
 * throughout, no gamification copy.
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
import { renderLibrary } from '../js/views/library.js';
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
  test('all 12 moods ride chips below the grid, each with a live count', () => {
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
    assert.ok(
      html.includes(ar['moods.title']),
      'AR mood chrome renders without English CTA leakage'
    );
    assert.ok(!html.includes('>Read now<'), 'no English CTA leaks into Arabic chrome');
  });
});

describe('Phase 3: named tiles with live counts + one action per tile', () => {
  test('every daily category is itself one navigable tile with a live count', () => {
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
    assert.equal(html.split('browser-tile__read').length - 1, 0, 'no detached Read-now action');
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
  test('the browser emits navigate + the invitations calm dismiss — nothing else', () => {
    const html = adhkarBrowserHTML(browserState());
    // (v5.17.56, merged-plan item 9) the below-fold invitations add exactly
    // one action: home-invite-dismiss (persisted calm dismissal, handler in
    // app/handlers/worship.js). No interstitial, no push arming.
    assert.deepEqual(
      [...actionsOf(html)].sort(),
      ['home-invite-dismiss', 'navigate'],
      'every browser tap is an existing action or the allowlisted dismiss'
    );
  });

  test('home.js imports no view — the 19/19 static budget stays untouched', () => {
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(!src.includes("from '../views/"), 'home reuses domain/service helpers, not views');
  });

  test('every active Home browser/reference key is bilingual', () => {
    for (const key of [
      'home.browserTitle',
      'home.browserSub',
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

  test('the Azkar section carries the browser; Home is a landing (spot-check)', () => {
    const libHtml = renderLibrary(browserState());
    assert.ok(libHtml.includes('home-browser'), 'browser section rides the Azkar view');
    assert.ok(libHtml.includes(en['home.browserTitle']), 'browser title renders on Azkar');
    assert.ok(libHtml.includes('azkar-mode-switch'), 'the Azkar switch rides the section');
    assert.ok(
      libHtml.includes(`data-view="${VIEWS.LIBRARY}"`),
      'the grid is offered through the LIBRARY door (IA-7: the Azkar section entry)'
    );
    const homeHtml = renderHome(browserState());
    assert.ok(!homeHtml.includes('home-browser'), 'Home carries no browser grid');
    assert.ok(homeHtml.includes('home-prayer-ribbon'), 'Home keeps the ribbon');
    assert.ok(
      homeHtml.includes(`data-view="${VIEWS.TASBIH}"`),
      'Home keeps an explicit tasbih entry'
    );
    assert.ok(homeHtml.includes('topbar__lang') === false, 'no chrome duplication from the view');
  });

  test('DEFAULT_SETTINGS untouched: no new settings key, no new panel id', () => {
    assert.ok(!('adhkar' in DEFAULT_SETTINGS), 'no settings key smuggled in with Phase 3');
  });
});
