/**
 * tests/home-design-c4.test.js — C4 home design pass (HANDOFF §5d, B2.4).
 *
 * The review correction stands: home is 9 sections / 80 category tiles,
 * not 560 items — so this pass ranks sections and tiles instead of
 * re-chunking them. What it pins:
 *  1. Sections rank by the reader's reality — the section left off, then
 *     most-opened, then the sun-based adhkar window, then live corpus
 *     size — never catalog order (rule 6: counts from data, not pinned
 *     order). An explicit user order still wins (it is the user's data).
 *  2. Tiles rank the same way inside each section (window id first at
 *     its hour, then most-opened, then live count).
 *  3. The hero is one quiet line below the dhikr (h1 + tagline +
 *     greeting + Hijri chip kept, nothing removed).
 *  4. The 8-step wizard collapses to one summary line ("N of 8 ·
 *     current step · dismiss") with the full step body, Back/Next and
 *     every deep link intact inside a native <details>.
 *  5. "How am I doing" rides one slim strip near the top (same sources
 *     and doors as the worship panel, navigate-only).
 *
 * Constraints pinned alongside: no data/route loss (deep-link hashes
 * unchanged), no new data-action, no new static view import, bilingual
 * EN+AR with no English leaking into Arabic chrome, no shame copy.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processDocument } from '../js/core/schema.js';
import { buildHash } from '../js/core/router.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import {
  adhkarBrowserHTML,
  renderHome,
  rankBrowserDocuments,
  rankBrowserCategories,
  docCorpusCount,
  homeTodayStripHTML,
} from '../js/views/home.js';
import { onboardingPanelHTML } from '../js/views/onboardingPanel.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const loadDoc = (file) =>
  processDocument(JSON.parse(readFileSync(join(ROOT, `data/${file}`), 'utf8'))).value;

const DOCS = {
  adhkar: loadDoc('adhkar.json'),
  duas: loadDoc('duas.json'),
  quranic: loadDoc('quranic.json'),
  'prophet-duas': loadDoc('prophet-duas.json'),
  asma: loadDoc('asma.json'),
  reflections: loadDoc('reflections.json'),
  'pdf-duas': loadDoc('pdf-duas.json'),
  'daily-sunnah': loadDoc('daily-sunnah.json'),
  'special-days': loadDoc('special-days.json'),
};
// Catalog order (data/catalog.json): adhkar first, duas second.
const CATALOG_ORDER = [
  'adhkar',
  'duas',
  'quranic',
  'prophet-duas',
  'asma',
  'reflections',
  'pdf-duas',
  'daily-sunnah',
  'special-days',
];

/** Boot-shaped state over the REAL corpus (never invented). */
function homeState({ lang = 'en', prefs = {}, history = [] } = {}) {
  const base = initialState();
  const documents = { ...DOCS };
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
    library: { ...base.library, documents, order: CATALOG_ORDER, itemIndex: index },
    customContent: {},
    history,
  };
}

const sectionIdsOf = (html) => [...html.matchAll(/id="home-section-([^"]+)"/g)].map((m) => m[1]);

const actionsOf = (html) => new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));

describe('C4 rank: sections follow corpus reality, not catalog order', () => {
  test('fresh readers meet the largest corpus first (duas, 527 items — not catalog-first adhkar)', () => {
    const state = homeState();
    assert.ok(
      docCorpusCount(state, DOCS.duas) > docCorpusCount(state, DOCS.adhkar),
      'the ranking reads live counts: duas outweighs adhkar'
    );
    const ranked = rankBrowserDocuments(state, Object.values(DOCS));
    const daily = ranked.map((d) => d.metadata.id).filter((id) => id !== 'asma');
    assert.equal(daily[0], 'duas', `largest corpus leads, saw ${daily[0]}`);
    const html = adhkarBrowserHTML(state);
    assert.deepEqual(sectionIdsOf(html), daily, 'the grid renders the ranked order');
  });

  test('the section left off jumps first, most-opened next', () => {
    // Heavy use of prophet-duas, but the last tap was special-days.
    const prophetCat = DOCS['prophet-duas'].categories[0];
    const specialCat = DOCS['special-days'].categories[0];
    const prophetItem = prophetCat.items[0].id;
    const specialItem = specialCat.items[0].id;
    const history = [
      { itemId: specialItem, categoryId: specialCat.id, ts: 300 },
      ...Array.from({ length: 6 }, (_, i) => ({
        itemId: prophetItem,
        categoryId: prophetCat.id,
        ts: 200 - i,
      })),
    ];
    const ranked = rankBrowserDocuments(homeState({ history }), Object.values(DOCS)).map(
      (d) => d.metadata.id
    );
    assert.equal(ranked[0], 'special-days', `recency leads, saw ${ranked[0]}`);
    assert.equal(ranked[1], 'prophet-duas', `heaviest use follows, saw ${ranked[1]}`);
  });

  test('at the morning hour the adhkar library leads (today’s dhikr first)', () => {
    const html = adhkarBrowserHTML(homeState(), 'morning');
    assert.equal(sectionIdsOf(html)[0], 'adhkar', 'the sun-based window leads');
    const evening = adhkarBrowserHTML(homeState(), 'evening');
    assert.equal(sectionIdsOf(evening)[0], 'adhkar', 'evening window leads too');
  });

  test('an explicit user order still wins (it is the user’s own data)', () => {
    const state = homeState({ prefs: { libraryOrderOverrides: ['special-days', 'adhkar'] } });
    const html = adhkarBrowserHTML(state);
    const ids = sectionIdsOf(html);
    assert.equal(ids[0], 'special-days', 'user order beats corpus size');
    assert.equal(ids[1], 'adhkar', 'user order beats corpus size');
  });
});

describe('C4 rank: tiles inside each section', () => {
  test('most-opened tile leads; otherwise the largest count; morning first at its hour', () => {
    const state = homeState();
    const cats = DOCS.duas.categories;
    const ranked = rankBrowserCategories(state, cats);
    const biggest = [...cats].sort((a, b) => b.items.length - a.items.length)[0];
    assert.equal(ranked[0].id, biggest.id, 'no history → largest live count leads');

    const small = [...cats].sort((a, b) => a.items.length - b.items.length)[0];
    const used = homeState({
      history: [
        { itemId: small.items[0].id, categoryId: small.id, ts: 2 },
        { itemId: small.items[0].id, categoryId: small.id, ts: 1 },
      ],
    });
    assert.equal(
      rankBrowserCategories(used, cats)[0].id,
      small.id,
      'an opened tile beats a larger unopened one'
    );

    const adhkarRanked = rankBrowserCategories(homeState(), DOCS.adhkar.categories, 'morning');
    assert.equal(adhkarRanked[0].id, 'morning', 'morning tile first in the morning window');
    const eveningRanked = rankBrowserCategories(homeState(), DOCS.adhkar.categories, 'evening');
    assert.equal(eveningRanked[0].id, 'evening', 'evening tile first in the evening window');
  });
});

describe('C4 chrome: one slim today-strip near the top', () => {
  test('three cells, navigate-only, same doors as the worship panel', () => {
    const html = homeTodayStripHTML(homeState());
    assert.ok(html.includes('home-today'), 'strip renders');
    assert.ok(html.includes(`data-view="${VIEWS.PRAYER}"`), 'prayers door kept');
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'reading door kept');
    assert.ok(html.includes(`data-view="${VIEWS.TASBIH}"`), 'dhikr door kept');
    assert.equal(buildHash(VIEWS.PRAYER), '#/prayer', 'deep-link hashes unchanged');
    assert.deepEqual([...actionsOf(html)], ['navigate'], 'no new data-action');
    assert.ok(html.includes(en['worship.row.prayers']), 'EN labels');
    const arHtml = homeTodayStripHTML(homeState({ lang: 'ar' }));
    assert.ok(arHtml.includes(ar['worship.row.prayers']), 'AR labels');
    assert.ok(!arHtml.includes('>Prayers<'), 'no English leaks into Arabic chrome');
    assert.ok(!/streak|leaderboard|متصدر/i.test(html), 'no shame copy');
  });

  test('the strip rides above the browser, the slim hero and wizard below it', () => {
    const html = renderHome(homeState());
    const order = ['home-today', 'home-browser', 'panel--onboarding--line', 'home-hero--line'].map(
      (cls) => html.indexOf(cls)
    );
    assert.ok(
      order.every((i) => i >= 0),
      'all four regions render'
    );
    assert.ok(
      order[0] < order[1] && order[1] < order[2] && order[2] < order[3],
      'today → dhikr → setup line → brand line'
    );
  });
});

describe('C4 chrome: the hero is one line, the wizard is one line', () => {
  test('hero keeps every content, loses the banner (h1 intact for a11y)', () => {
    const html = renderHome(homeState());
    assert.ok(html.includes('home-hero--line'), 'line variant renders');
    assert.ok(!html.includes('home-hero--secondary'), 'the 131px band is gone');
    assert.ok(html.includes('<h1 class="home-hero__title">'), 'the page keeps its h1');
    assert.ok(html.includes(en['app.name']), 'brand name kept');
    assert.ok(html.includes(en['app.tagline']), 'tagline kept, inline');
    assert.ok(html.includes('home-hero__hijri'), 'Hijri chip kept');
    assert.ok(html.includes('shahada-banner'), 'the shahada stays first');
  });

  test('wizard renders one summary line; the full step survives inside <details>', () => {
    const base = initialState();
    const s = {
      ...base,
      settings: {
        ...base.settings,
        language: 'en',
        dailyGoal: 100,
        prayer: { latitude: null, longitude: null, method: 'MWL', asr: 'Standard' },
      },
      onboarding: { dismissed: false, settingsVisited: false, stepsSeen: {} },
      statistics: { ...base.statistics, totalRecitations: 0 },
      install: { promptReady: false, installed: false },
      ui: { contentManage: false, onboardingStep: null },
    };
    const html = onboardingPanelHTML(s, 'en');
    assert.ok(html.includes('panel--onboarding--line'), 'line variant renders');
    assert.ok(html.includes('<details'), 'collapsed by default');
    assert.ok(html.includes('<summary'), 'the summary is the native continue control');
    assert.ok(html.includes('0 of 3 steps done'), 'progress survives on the line');
    assert.ok(html.includes('data-action="onboarding-dismiss"'), 'dismiss survives on the line');
    // The whole wizard, untouched, one tap away:
    assert.ok(html.includes('data-action="onboarding-language"'), 'language actions intact');
    assert.ok(html.includes('data-action="onboarding-step"'), 'Back/Next intact');
    assert.ok(html.includes('1 / 3'), 'position intact');
    const ar = onboardingPanelHTML({ ...s, settings: { ...s.settings, language: 'ar' } }, 'ar');
    assert.ok(ar.includes('أُنجزت'), 'AR progress on the line');
    assert.doesNotMatch(ar, /undefined/);
  });
});

describe('C4 contracts that must not move', () => {
  test('the browser emits navigate + the invitations calm dismiss; home still imports no view', () => {
    const html = adhkarBrowserHTML(homeState());
    // (v5.17.56, merged-plan item 9) the below-fold invitations add exactly
    // one action: home-invite-dismiss (persisted calm dismissal). Same
    // intentional addition as tests/adhkar-browser.test.js.
    assert.deepEqual(
      [...actionsOf(html)].sort(),
      ['home-invite-dismiss', 'navigate'],
      'every browser tap is an existing action or the allowlisted dismiss'
    );
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(!src.includes("from '../views/"), 'the 19/19 static budget stays untouched');
    const panelSrc = readFileSync(join(ROOT, 'js/views/onboardingPanel.js'), 'utf8');
    assert.ok(!panelSrc.includes("from '../views/"), 'no new static view import smuggled in');
  });

  test('no new custom property, no hardcoded color in the C4 styles', () => {
    const css = [
      readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8'),
      readFileSync(join(ROOT, 'assets/css/desktop.css'), 'utf8'),
    ].join('\n');
    for (const sel of ['.home-hero--line', '.home-today', '.onboarding-line']) {
      assert.ok(css.includes(sel), `${sel} styled`);
    }
    // Only the C4 rule bodies: a block whose selector mentions a C4 stem.
    const bodies = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => /home-hero--line|home-today|onboarding-line/.test(m[1]))
      .map((m) => m[2]);
    assert.ok(bodies.length >= 10, `C4 owns real rules (saw ${bodies.length} blocks)`);
    for (const body of bodies) {
      assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b/, `hardcoded hex: ${body.slice(0, 80)}`);
      assert.doesNotMatch(body, /--[\w-]+\s*:/, `new custom property: ${body.slice(0, 80)}`);
    }
  });

  test('every tile keeps a live count and a Read-now action after ranking', () => {
    const html = adhkarBrowserHTML(homeState());
    const tiles = [...html.matchAll(/category-tile-wrap/g)].length;
    assert.ok(tiles >= 70, `the full depth survives ranking (saw ${tiles} tiles)`);
    const reads = html.split('browser-tile__read').length - 1;
    assert.equal(reads, tiles, 'one Read-now per tile, still');
  });
});
