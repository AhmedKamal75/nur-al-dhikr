import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderNav } from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/**
 * ORG-02 ruling locks: Mushaf + classic Reader are distinct chrome
 * entries (same book, two discoverable doors); the SEARCH rail item
 * keeps opening the palette by decision.
 */
const stateFor = (activeView) => ({ ...initialState(), activeView });

function activeViews(html) {
  const out = [];
  const re =
    /data-view="([^"]+)"[^>]*aria-current="page"|aria-current="page"[^>]*data-view="([^"]+)"/g;
  for (const m of html.matchAll(re)) out.push(m[1] || m[2]);
  return out;
}

describe('ORG-02 chrome rulings', () => {
  test('rail exposes both mushaf and quran with distinct labels', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'mushaf entry present');
    // Rail + drawer both render NAV_GROUPS (mobile bar is separate).
    const quranHits = html.split(`data-view="${VIEWS.QURAN}"`).length - 1;
    assert.ok(quranHits >= 2, `reader entry in rail and drawer (saw ${quranHits})`);
  });

  test('active states split: mushaf lit on mushaf, reader lit on quran', () => {
    // Each destination lights in rail + drawer + mobile bar, so dedupe:
    // exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.MUSHAF))), [VIEWS.MUSHAF]);
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.QURAN))), [VIEWS.QURAN]);
  });

  test('nav.reader copy exists in both languages and differs', () => {
    assert.ok(en['nav.reader'] && ar['nav.reader']);
    assert.notEqual(en['nav.reader'], ar['nav.reader']);
    assert.notEqual(en['nav.reader'], en['nav.quran']);
  });
});
