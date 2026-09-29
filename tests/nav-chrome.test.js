import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderNav, quranModeSwitchHTML } from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/**
 * REORG Phase 2 locks (supersedes the ORG-02 two-doors ruling): one book,
 * one door. The classic reader no longer competes for a chrome slot —
 * #/quran stays a real route and lights the mushaf door, while the
 * in-chrome List/Word switch carries the hop. ROOTS keeps its Phase 1
 * door as the Qur'an depth.
 */
const stateFor = (activeView) => ({ ...initialState(), activeView });

function activeViews(html) {
  const out = [];
  const re =
    /data-view="([^"]+)"[^>]*aria-current="page"|aria-current="page"[^>]*data-view="([^"]+)"/g;
  for (const m of html.matchAll(re)) out.push(m[1] || m[2]);
  return out;
}

describe('Phase 2 chrome: one Qur’an door', () => {
  test('rail and drawer expose the mushaf door once each; no competing reader entry', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'mushaf entry present');
    const quranHits = html.split(`data-view="${VIEWS.QURAN}"`).length - 1;
    assert.equal(quranHits, 0, `reader must not compete in the chrome (saw ${quranHits})`);
    const rootsHits = html.split(`data-view="${VIEWS.ROOTS}"`).length - 1;
    assert.ok(rootsHits >= 2, `roots depth keeps its door in rail and drawer (saw ${rootsHits})`);
  });

  test('active states merged: #/quran deep link lights the mushaf door; roots keeps its own', () => {
    // Each destination lights in rail + drawer + mobile bar, so dedupe:
    // exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.MUSHAF))), [VIEWS.MUSHAF]);
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.QURAN))),
      [VIEWS.MUSHAF],
      'a deep link into #/quran lights the Qur’an door, not a second entry'
    );
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.ROOTS))), [VIEWS.ROOTS]);
  });

  test('in-chrome switch links list reading and word study with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = quranModeSwitchHTML(VIEWS.QURAN, lang);
      assert.ok(
        html.includes(`data-view="${VIEWS.QURAN}"`) && html.includes(`data-view="${VIEWS.ROOTS}"`),
        `switch carries both modes (${lang})`
      );
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="quran-'),
        `switch reuses navigate only (${lang})`
      );
    }
    // Active segment follows the route; on the mushaf neither is active.
    assert.ok(
      quranModeSwitchHTML(VIEWS.QURAN, 'en').includes('segmented__btn--active'),
      'list segment active on #/quran'
    );
    assert.ok(
      quranModeSwitchHTML(VIEWS.ROOTS, 'en').includes('segmented__btn--active'),
      'word segment active on #/roots'
    );
    assert.ok(
      !quranModeSwitchHTML(VIEWS.MUSHAF, 'en').includes('segmented__btn--active'),
      'the book is the door — no segment claims it'
    );
  });

  test('Qur’an chrome copy is bilingual: nav.quran plus the switch labels', () => {
    assert.ok(en['nav.quran'] && ar['nav.quran']);
    assert.notEqual(en['nav.quran'], ar['nav.quran']);
    for (const key of ['quran.modeList', 'quran.modeWord']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });
});
