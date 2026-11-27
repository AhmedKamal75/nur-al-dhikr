/**
 * tests/tasbihMeaning.test.js — C15 "Meaning at the counter" (v5.17.183):
 *  1. the three CEO-granted exact matches (astaghfirullah → glm-gt-009,
 *     lahawla → adh-tas-005, salawat → adh-tas-006) resolve as `match`
 *     with virtue + reference from the real adhkar.json entry;
 *  2. the three glorifications resolve as `gloss` (translation /
 *     transliteration only) from their exact-text post-prayer entries;
 *  3. resolution reads the EFFECTIVE library: a lens-deleted card drops
 *     the phrase to the honest link state, a field override is what the
 *     card shows;
 *  4. a custom phrase gets the "your own words" state and nothing is
 *     invented for it;
 *  5. the open flag is ephemeral ui state with a hostile-safe reducer;
 *  6. the view wires the affordance outside the tap-to-count stage, the
 *     card carries no counting action, strings ship EN + AR, and no
 *     religious text is authored in code (every quoted byte traces to
 *     data/adhkar.json).
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { store, actions } from '../js/core/state.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { processDocument } from '../js/core/schema.js';
import { lensLibrary } from '../js/domain/contentLens.js';
import {
  resolveMeaning,
  findLibraryItem,
  MATCH_ITEM_IDS,
  GLOSS_ITEM_IDS,
  MORE_CATEGORY_ID,
} from '../js/domain/tasbihMeaning.js';
import { renderTasbih, PRESETS } from '../js/views/tasbih.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const rawAdhkar = processDocument(
  JSON.parse(readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8'))
).value;

/** Boot-shaped state whose library is the REAL corpus through the lens. */
function meaningState({
  lang = 'en',
  prefs = {},
  meaningOpen = false,
  activeItemId,
  customs,
} = {}) {
  const base = initialState();
  const raw = { documents: { adhkar: rawAdhkar }, order: ['adhkar'] };
  const lensed = lensLibrary(raw.documents, raw.order, prefs);
  return {
    ...base,
    settings: { ...base.settings, language: lang, contentPrefs: prefs },
    library: { raw, ...lensed, itemIndex: {} },
    customContent: {},
    tasbih: { activeItemId: activeItemId || 'subhanallah', activePhrase: null },
    tasbihCustom: customs || [],
    ui: { ...base.ui, tasbihMeaningOpen: meaningOpen },
  };
}

const KEYS = [
  'tasbih.meaning',
  'tasbih.meaningClose',
  'tasbih.meaningVirtue',
  'tasbih.meaningSource',
  'tasbih.meaningMore',
  'tasbih.meaningOwnWords',
  'tasbih.meaningUnavailable',
];

describe('C15 meaning resolution', () => {
  test('granted exact matches resolve with virtue + reference from the corpus', () => {
    const state = meaningState();
    for (const [phraseId, itemId] of Object.entries(MATCH_ITEM_IDS)) {
      const m = resolveMeaning(state, phraseId, false);
      assert.equal(m.kind, 'match', phraseId);
      assert.equal(m.item.id, itemId, phraseId);
      assert.ok(String(m.item.virtues?.en || '').length > 0, `${phraseId} virtue`);
      const ref = m.item.reference || {};
      assert.ok(
        String(ref.collection || '').length > 0 || String(ref.hadith || '').length > 0,
        `${phraseId} reference`
      );
    }
    // The granted pairs are exactly the C15 scope — no fourth preset match.
    assert.deepEqual(Object.keys(MATCH_ITEM_IDS).sort(), ['astaghfirullah', 'lahawla', 'salawat']);
  });

  test('glorifications resolve as gloss from the exact-text post-prayer entries', () => {
    const state = meaningState();
    assert.deepEqual(Object.keys(GLOSS_ITEM_IDS).sort(), [
      'alhamdulillah',
      'allahuakbar',
      'subhanallah',
    ]);
    for (const [phraseId, itemId] of Object.entries(GLOSS_ITEM_IDS)) {
      const m = resolveMeaning(state, phraseId, false);
      assert.equal(m.kind, 'gloss', phraseId);
      assert.equal(m.item.id, itemId, phraseId);
      assert.ok(String(m.item.translation?.en || '').length > 0, `${phraseId} translation`);
      assert.ok(String(m.item.transliteration || '').length > 0, `${phraseId} transliteration`);
    }
  });

  test('a lens-deleted granted card drops the phrase to the honest link state', () => {
    const state = meaningState({ prefs: { deletedItems: { 'adh-tas-005': true } } });
    assert.equal(findLibraryItem(state, 'adh-tas-005'), null);
    const m = resolveMeaning(state, 'lahawla', false);
    assert.equal(m.kind, 'link');
    assert.ok(!('item' in m), 'no item leaks past the lens delete');
  });

  test('a field override is what the card resolves (the lens owns the text)', () => {
    const edited = { en: 'Edited by the user', ar: '' };
    const state = meaningState({
      prefs: { itemOverrides: { 'adh-tas-005': { translation: edited } } },
    });
    const m = resolveMeaning(state, 'lahawla', false);
    assert.equal(m.kind, 'match');
    assert.equal(m.item.translation.en, 'Edited by the user');
  });

  test('custom phrases get the own-words state; hostile ids never match', () => {
    const state = meaningState();
    assert.deepEqual(resolveMeaning(state, 'custom-1', true), { kind: 'custom' });
    assert.equal(resolveMeaning(state, 'nope-not-a-phrase', false).kind, 'link');
    assert.equal(resolveMeaning(state, '', false).kind, 'link');
    assert.equal(resolveMeaning(state, null, false).kind, 'link');
    assert.equal(resolveMeaning(state, '__proto__', false).kind, 'link');
    // An absent/ hostile library never throws.
    assert.equal(resolveMeaning({}, 'lahawla', false).kind, 'link');
    assert.equal(findLibraryItem(null, 'adh-tas-005'), null);
    assert.equal(findLibraryItem(meaningState(), ''), null);
  });
});

describe('C15 open flag', () => {
  beforeEach(() => {
    store.dispatch(actions.tasbihMeaningSet(false));
  });

  test('ephemeral ui flag toggles and is idempotent', () => {
    const s0 = initialState();
    assert.equal(s0.ui.tasbihMeaningOpen, false);
    const s1 = reduce(s0, actions.tasbihMeaningSet(true));
    assert.equal(s1.ui.tasbihMeaningOpen, true);
    assert.equal(reduce(s1, actions.tasbihMeaningSet(true)), s1, 'same value → same state');
    const s2 = reduce(s1, actions.tasbihMeaningSet(false));
    assert.equal(s2.ui.tasbihMeaningOpen, false);
  });

  test('hostile payloads coerce to false and junk actions pass through', () => {
    const s0 = initialState();
    const s1 = reduce(s0, { type: 'TASBIH_MEANING_SET', on: 'yes' });
    assert.equal(s1.ui.tasbihMeaningOpen, false);
    assert.equal(reduce(s0, { type: 'TASBIH_MEANING_SET' }), s0);
    const s2 = reduce(s0, actions.tasbihMeaningSet(true));
    assert.equal(s2.ui.tasbihFloat, false, 'sibling ui flags untouched');
  });
});

describe('C15 view wiring', () => {
  test('the affordance sits outside the tap stage; the card carries no count action', () => {
    const state = meaningState({ meaningOpen: true, activeItemId: 'lahawla' });
    const html = renderTasbih(state);
    const stageEnd = html.indexOf('</div>', html.indexOf('tasbih-stage__cycles'));
    const toggleAt = html.indexOf('data-action="tasbih-meaning-toggle"');
    assert.ok(toggleAt > stageEnd, 'toggle renders after the stage, never inside it');
    const cardStart = html.indexOf('id="tasbih-meaning-card"');
    assert.ok(cardStart > -1, 'card renders when open');
    const card = html.slice(cardStart, html.indexOf('tasbih-options'));
    assert.ok(!card.includes('tasbih-tap'), 'the card never counts');
    // The granted match shows its real virtue + source, EN chrome.
    assert.ok(card.includes('treasure from the treasures of Paradise'), 'virtue from adh-tas-005');
    assert.ok(card.includes('Sahih al-Bukhari'), 'reference from adh-tas-005');
    assert.ok(card.includes(en['tasbih.meaningVirtue']));
    assert.ok(card.includes('data-id="tasbih-general"'), 'honest link to the section');
  });

  test('glorification card: translation without virtue lines, AR chrome', () => {
    const state = meaningState({ lang: 'ar', meaningOpen: true, activeItemId: 'subhanallah' });
    const html = renderTasbih(state);
    const card = html.slice(html.indexOf('id="tasbih-meaning-card"'));
    const glossItem = rawAdhkar.categories
      .find((c) => c.id === 'post-prayer')
      .items.find((it) => it.id === 'adh-pos-004a');
    // AR chrome shows the entry's AR translation; EN falls back when absent.
    assert.ok(card.includes(glossItem.translation.ar), 'AR translation from adh-pos-004a');
    assert.ok(card.includes(glossItem.transliteration), 'transliteration from adh-pos-004a');
    assert.ok(!card.includes(ar['tasbih.meaningVirtue']), 'no virtue line for a gloss');
    assert.ok(card.includes(ar['tasbih.meaning']), 'AR chrome');
    assert.ok(card.includes(ar['tasbih.meaningMore']));
    // EN chrome shows the EN translation.
    const enHtml = renderTasbih(meaningState({ meaningOpen: true, activeItemId: 'subhanallah' }));
    assert.ok(enHtml.includes('Glory is to Allah.'), 'EN translation from adh-pos-004a');
  });

  test('custom phrase card is the own-words state; closed flag renders no card', () => {
    const customs = [{ id: 'c1', text: 'رب اغفر لي', target: 33, ts: 1 }];
    const open = meaningState({ meaningOpen: true, activeItemId: 'c1', customs });
    const html = renderTasbih(open);
    assert.ok(html.includes(en['tasbih.meaningOwnWords']));
    assert.ok(!html.includes('tasbih-meaning__virtue'), 'nothing invented for a custom phrase');
    const closed = renderTasbih(meaningState({ meaningOpen: false }));
    assert.ok(!closed.includes('id="tasbih-meaning-card"'), 'closed → no card');
    assert.ok(closed.includes('data-action="tasbih-meaning-toggle"'), 'affordance stays');
  });

  test('lens-deleted granted card renders the unavailable note, not the virtue', () => {
    const state = meaningState({
      meaningOpen: true,
      activeItemId: 'lahawla',
      prefs: { deletedItems: { 'adh-tas-005': true } },
    });
    const html = renderTasbih(state);
    assert.ok(html.includes(en['tasbih.meaningUnavailable']));
    assert.ok(!html.includes('treasure from the treasures of Paradise'));
  });

  test('aria wiring: expanded/controls, region label, dismiss control', () => {
    const open = renderTasbih(meaningState({ meaningOpen: true }));
    assert.ok(open.includes('aria-expanded="true"'));
    assert.ok(open.includes('aria-controls="tasbih-meaning-card"'));
    assert.ok(open.includes('role="region"'));
    assert.ok(open.includes(en['tasbih.meaningClose']));
    const closed = renderTasbih(meaningState({ meaningOpen: false }));
    assert.ok(closed.includes('aria-expanded="false"'));
  });

  test('opening scrolls the card into view (nearest, reduced-motion aware)', () => {
    // Planner gate on 947b062: at 390x800 the card opened behind the
    // bottom nav. The handler brings it into view on open only, with the
    // shared scrollBehavior() so reduced motion gets 'auto'.
    const src = readFileSync(join(ROOT, 'js/app/handlers/tasbih.js'), 'utf8');
    const toggleBody = src.slice(
      src.indexOf("'tasbih-meaning-toggle'"),
      src.indexOf("'tasbih-reset'")
    );
    assert.ok(toggleBody.includes('if (opening)'), 'scrolls on open only, never on dismiss');
    assert.ok(toggleBody.includes("block: 'nearest'"), 'minimal page movement');
    assert.ok(toggleBody.includes('behavior: scrollBehavior()'), 'reduced-motion aware');
    assert.ok(toggleBody.includes('requestAnimationFrame'), 'waits for the re-render');
    assert.ok(!toggleBody.includes('tasbih-tap'), 'never counts');
  });
});

describe('C15 strings and honesty', () => {
  test('every chrome string ships EN + AR', () => {
    for (const k of KEYS) {
      assert.ok(en[k], `en ${k}`);
      assert.ok(ar[k], `ar ${k}`);
      assert.notEqual(en[k], ar[k], k);
    }
  });

  test('the code authors no religious text: virtue/translation bytes come from data', () => {
    const viewSrc = readFileSync(join(ROOT, 'js/views/tasbih.js'), 'utf8');
    const domainSrc = readFileSync(join(ROOT, 'js/domain/tasbihMeaning.js'), 'utf8');
    const adhkarSrc = readFileSync(join(ROOT, 'data/adhkar.json'), 'utf8');
    // Arabic phrases on the dial predate C15 (PRESETS); the meaning card
    // adds none of its own — every item byte flows through resolveMeaning.
    for (const src of [viewSrc, domainSrc]) {
      assert.ok(!src.includes('كنز من كنوز'), 'no authored virtue text');
      assert.ok(!src.includes('I seek the forgiveness'), 'no authored translation');
    }
    // The granted ids exist in the real corpus (never a stale mapping).
    for (const id of [...Object.values(MATCH_ITEM_IDS), ...Object.values(GLOSS_ITEM_IDS)]) {
      assert.ok(adhkarSrc.includes(`"id": "${id}"`), `${id} present in adhkar.json`);
    }
    assert.equal(MORE_CATEGORY_ID, 'tasbih-general');
    assert.ok(adhkarSrc.includes('"id": "tasbih-general"'));
    // The preset ids the tables key on are the view's real presets.
    const presetIds = PRESETS.map((p) => p.id);
    for (const id of [...Object.keys(MATCH_ITEM_IDS), ...Object.keys(GLOSS_ITEM_IDS)]) {
      assert.ok(presetIds.includes(id), `${id} is a real preset`);
    }
  });
});
