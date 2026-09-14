/**
 * tests/quickTiles.test.js — item 11 (home quick-actions) gates:
 *  1. the registry holds the 8 historic tiles (ids, destinations, icons,
 *     labels resolving EN + AR, accents);
 *  2. resolveQuickTiles: usage-driven default (stable ties), manual order
 *     with backfill, hidden filtering, hostile degradation;
 *  3. moveQuickTile swaps from the usage order when unsaved; edges and
 *     unknown ids no-op;
 *  4. settings sanitize keeps the tile fields honest;
 *  5. TILE_VISITED counts; restore keeps safe counts;
 *  6. quickTilesHTML renders tiles with visit actions, NOW suggestions
 *     and hidden filtering; settings manager lists all 8 with move/hide;
 *  7. handlers + APP_SHELL wiring.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { t } from '../js/core/i18n.js';
import { sanitizeSettings } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import {
  QUICK_TILE_IDS,
  QUICK_TILE_DEFS,
  moveQuickTile,
  resolveQuickTiles,
  usageTileOrder,
} from '../js/domain/quickTiles.js';
import { quickTilesHTML } from '../js/views/home.js';
import { renderSettings } from '../js/views/settings.js';

describe('tile registry: the historic eight', () => {
  test('ids, destinations, icons and resolving labels', () => {
    assert.deepEqual(
      [...QUICK_TILE_IDS],
      ['mushaf', 'morning', 'evening', 'tasbih', 'prayer', 'qibla', 'ramadan', 'zakat']
    );
    assert.equal(QUICK_TILE_DEFS.length, 8);
    for (const def of QUICK_TILE_DEFS) {
      assert.ok(QUICK_TILE_IDS.includes(def.id), `def for ${def.id}`);
      assert.ok(def.view && def.icon && def.accent, `fields for ${def.id}`);
      assert.ok(!t(def.labelKey, 'en').includes(def.labelKey), `EN label: ${def.id}`);
      assert.ok(!String(t(def.labelKey, 'ar')).includes(def.labelKey), `AR label: ${def.id}`);
    }
  });
});

describe('resolveQuickTiles: usage default, manual wins, hidden hides', () => {
  test('fresh installs render registry order (stable ties)', () => {
    assert.deepEqual(resolveQuickTiles({}), [...QUICK_TILE_IDS]);
    assert.deepEqual(resolveQuickTiles({ visits: {} }), [...QUICK_TILE_IDS]);
  });

  test('tap counts float tiles up, ties keep registry order', () => {
    assert.deepEqual(usageTileOrder({ zakat: 5, tasbih: 2 }), [
      'zakat',
      'tasbih',
      'mushaf',
      'morning',
      'evening',
      'prayer',
      'qibla',
      'ramadan',
    ]);
    assert.deepEqual(resolveQuickTiles({ visits: { qibla: 9 } })[0], 'qibla');
  });

  test('manual order wins with usage backfill; hidden filters', () => {
    assert.deepEqual(
      resolveQuickTiles({ order: ['zakat', 'tasbih'], visits: { qibla: 9 } }).slice(0, 3),
      ['zakat', 'tasbih', 'qibla']
    );
    assert.deepEqual(resolveQuickTiles({ hidden: { mushaf: true, zakat: true } }).length, 6);
    assert.ok(!resolveQuickTiles({ hidden: { mushaf: true } }).includes('mushaf'));
  });

  test('hostile input degrades to visible defaults', () => {
    assert.deepEqual(resolveQuickTiles({ order: ['bogus', 'zakat', 'zakat'] })[0], 'zakat');
    assert.deepEqual(resolveQuickTiles({ hidden: 'x', visits: null }), [...QUICK_TILE_IDS]);
    assert.deepEqual(resolveQuickTiles(null), [...QUICK_TILE_IDS]);
  });

  test('manager lists every tile once, hidden inline', () => {
    // resolveQuickTiles with no hides is the manager source (hidden tiles
    // keep their position so unhiding restores in place).
    assert.equal(resolveQuickTiles({ hidden: { mushaf: true } }).length, 7);
    assert.equal(resolveQuickTiles({}).length, 8);
  });
});

describe('moveQuickTile: explicit swaps from any base', () => {
  test('swaps both directions on a full order; edges and unknown ids no-op', () => {
    const base = [...QUICK_TILE_IDS];
    const down = moveQuickTile(base, null, 'morning', 1);
    assert.deepEqual(down.slice(0, 4), ['mushaf', 'evening', 'morning', 'tasbih']);
    const up = moveQuickTile(base, null, 'morning', -1);
    assert.deepEqual(up.slice(0, 3), ['morning', 'mushaf', 'evening']);
    assert.deepEqual(moveQuickTile(base, null, 'mushaf', -1), base);
    assert.deepEqual(moveQuickTile(base, null, 'zakat', 1), base);
    assert.deepEqual(moveQuickTile(base, null, 'bogus', 1), base);
  });

  test('first manual move preserves the usage arrangement', () => {
    const next = moveQuickTile(null, { zakat: 4 }, 'mushaf', 1);
    assert.equal(next[0], 'zakat', 'usage leader stays first');
    assert.deepEqual(next.slice(1, 3), ['morning', 'mushaf']);
    assert.equal(next.length, 8, 'full explicit order written');
  });
});

describe('settings sanitize: tile fields stay honest', () => {
  test('orders keep known ids deduped; hides keep literal-true known flags', () => {
    const s = sanitizeSettings({
      quickOrder: ['zakat', 'bogus', 'zakat'],
      hiddenQuick: { mushaf: true, bogus: 1 },
    });
    assert.deepEqual(s.quickOrder, ['zakat']);
    assert.deepEqual(s.hiddenQuick, { mushaf: true });
    assert.equal(sanitizeSettings({}).quickOrder, null);
    assert.deepEqual(sanitizeSettings({}).hiddenQuick, {});
    assert.equal(sanitizeSettings({ quickOrder: ['bogus'] }).quickOrder, null);
  });
});

describe('tile visits: count, restore, sanitize', () => {
  test('TILE_VISITED accumulates; hostile no-ops', () => {
    const s0 = initialState();
    assert.deepEqual(s0.tileVisits, {});
    const s = reduce(
      reduce(s0, actions.recordTileVisit('tasbih')),
      actions.recordTileVisit('tasbih')
    );
    assert.equal(s.tileVisits.tasbih, 2);
    assert.equal(reduce(s0, actions.recordTileVisit('')), s0);
    assert.equal(reduce(s0, actions.recordTileVisit(null)), s0);
  });

  test('restore keeps safe counts only', () => {
    const out = sanitizeRestoredPayload({
      tileVisits: { tasbih: 4, bogus: 2, evil: -1, __proto__: 9, arr: [] },
    });
    assert.deepEqual(out.tileVisits, { tasbih: 4, bogus: 2 });
    assert.deepEqual(sanitizeRestoredPayload({}).tileVisits, {});
  });
});

describe('quickTilesHTML: registry render with suggestions', () => {
  test('eight visit-counting tiles with destinations', () => {
    const html = quickTilesHTML([...QUICK_TILE_IDS], 'en', null);
    assert.equal((html.match(/data-action="quick-tile"/g) || []).length, 8);
    for (const id of QUICK_TILE_IDS) assert.ok(html.includes(`data-tile="${id}"`), id);
    assert.ok(html.includes('data-view="collection"') === false, 'no stray views');
    assert.ok(html.includes('#/category/morning'), 'morning deep link');
    assert.ok(html.includes('data-id="morning"'), 'category param rides along');
  });

  test('usage order and hides render; NOW suggestion marks the window', () => {
    const html = quickTilesHTML(resolveQuickTiles({ visits: { zakat: 3 } }), 'en', 'morning');
    assert.ok(
      html.indexOf('data-tile="zakat"') < html.indexOf('data-tile="mushaf"'),
      'usage first'
    );
    assert.ok(html.includes('quick-action--suggested'), 'window suggestion');
    assert.ok(html.includes('data-tile="morning"'), 'morning tile present');
    const hidden = quickTilesHTML(resolveQuickTiles({ hidden: { zakat: true } }), 'en', null);
    assert.ok(!hidden.includes('data-tile="zakat"'), 'hidden tile dropped');
    assert.ok(!hidden.includes('quick-action--suggested'), 'no suggestion without a window');
  });

  test('AR labels render without undefined', () => {
    const html = quickTilesHTML([...QUICK_TILE_IDS], 'ar', null);
    assert.doesNotMatch(html, /undefined/);
  });
});

describe('settings tile manager: all eight editable', () => {
  function settingsState(over = {}) {
    return {
      settings: { language: 'en', quickOrder: null, hiddenQuick: {}, ...over.settings },
      tileVisits: over.tileVisits || {},
      reminders: [],
      profiles: [],
      activeProfile: 'main',
      ...over,
    };
  }

  test('rows carry move + hide for every tile', () => {
    const html = renderSettings(settingsState());
    assert.equal(
      (html.match(/data-action="quick-tile-move"/g) || []).length,
      16,
      'up+down per tile'
    );
    assert.equal((html.match(/data-action="quick-tile-toggle"/g) || []).length, 8, 'hide per tile');
    assert.ok(html.includes('Quick actions'), 'group label');
  });

  test('hidden tiles show unchecked in place', () => {
    const html = renderSettings(
      settingsState({ settings: { language: 'en', hiddenQuick: { zakat: true } } })
    );
    const total = (html.match(/data-action="quick-tile-toggle"/g) || []).length;
    assert.equal(total, 8, 'hidden tiles stay manageable');
  });
});

describe('tile wiring: handlers, APP_SHELL', () => {
  const nav = readFileSync(new URL('../js/app/handlers/navigation.js', import.meta.url), 'utf8');
  const sys = readFileSync(new URL('../js/app/handlers/system.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  test('visit, move and toggle keys are registered', () => {
    assert.ok(nav.includes("'quick-tile'"), 'visit+go handler missing');
    assert.ok(sys.includes("'quick-tile-move'"), 'move handler missing');
    assert.ok(sys.includes('quick-tile-toggle'), 'toggle handler missing');
  });

  test('the new domain module is precached', () => {
    assert.ok(/'js\/domain\/quickTiles\.js'/.test(sw), 'APP_SHELL missing quickTiles.js');
  });
});
