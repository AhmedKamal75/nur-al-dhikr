/**
 * tests/khatma-row-5.2.80.test.js — UP-05: statistics closes the loop with
 * a khatma % line linking back into the Mushaf. Pure render checks.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { renderStatistics } from '../js/views/statistics.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

function stateWith(pagesRead) {
  const s = initialState();
  s.settings.language = 'en';
  s.mushafPagesRead = pagesRead;
  s.mushafBookmark = { page: 201, ts: 1 };
  s.statistics = s.statistics || { totalRecitations: 0, dailyHistory: {} };
  return s;
}

describe('khatma progress row', () => {
  test('no pages -> no khatma line', () => {
    const html = renderStatistics(stateWith({}));
    assert.ok(!html.includes('stats.khatmaLine') && !html.includes('Khatma progress'));
  });

  test('pages -> honest % line with mushaf deep link', () => {
    const pages = {};
    for (let i = 1; i <= 302; i++) pages[String(i)] = true;
    const html = renderStatistics(stateWith(pages));
    assert.ok(html.includes('Khatma progress'), 'label renders');
    assert.ok(html.includes('302 of 604 pages · 50%'), 'read/total/pct honest');
    assert.ok(html.includes('#/mushaf'), 'links back into the Mushaf');
    assert.ok(html.includes('page=201') || html.includes('/201'), 'bookmark page carried');
  });

  test('i18n parity for new keys', () => {
    for (const k of ['stats.khatmaProgress', 'stats.khatmaLine']) {
      assert.ok(en[k] && ar[k], k);
    }
    for (const ph of ['{r}', '{t}', '{p}']) {
      assert.ok(en['stats.khatmaLine'].includes(ph) && ar['stats.khatmaLine'].includes(ph), ph);
    }
  });
});
