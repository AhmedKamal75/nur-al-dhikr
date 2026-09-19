/**
 * tests/tasbihCustom.test.js — item 3 (tasbih custom dhikr) gates:
 *  1. TASBIH_CUSTOM_ADD builds a capped entry (trimmed text, clamped named
 *     goal) and no-ops on empty input;
 *  2. TASBIH_CUSTOM_REMOVE deletes by id and never strands the dial on a
 *     ghost id (preset-active selections survive);
 *  3. restore sanitizes hostile customs (junk drops, dupes dedupe, text
 *     trims, targets clamp);
 *  4. custom counters ride the generic 'tasbih:'+id key through the shared
 *     increment() — taps count and record statistics;
 *  5. the view renders custom chips (escaped), the authoring form, and the
 *     custom stage — EN + AR, XSS-safe.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { increment } from '../js/services/tasbih.js';
import { renderTasbih } from '../js/views/tasbih.js';

function baseState() {
  const s = initialState();
  return { ...s, tasbihCustom: [] };
}

describe('TASBIH_CUSTOM_ADD: capped user entries', () => {
  test('builds id/text/target/ts and appends oldest-first', () => {
    const s = reduce(baseState(), actions.tasbihCustomAdd('  My dhikr  ', 100));
    assert.equal(s.tasbihCustom.length, 1);
    const [c] = s.tasbihCustom;
    assert.match(c.id, /^custom-/);
    assert.equal(c.text, 'My dhikr');
    assert.equal(c.target, 100);
    assert.ok(Number.isFinite(c.ts));
    const s2 = reduce(s, actions.tasbihCustomAdd('Second', 33));
    assert.deepEqual(
      s2.tasbihCustom.map((e) => e.text),
      ['My dhikr', 'Second']
    );
  });

  test('empty or whitespace-only input no-ops', () => {
    const s0 = baseState();
    assert.equal(reduce(s0, actions.tasbihCustomAdd('', 33)).tasbihCustom.length, 0);
    assert.equal(reduce(s0, actions.tasbihCustomAdd('   ', 33)).tasbihCustom.length, 0);
    assert.equal(reduce(s0, actions.tasbihCustomAdd(null, 33)).tasbihCustom.length, 0);
  });

  test('text caps at 500 chars, targets clamp 1..100000 (garbage → 33)', () => {
    let s = reduce(baseState(), actions.tasbihCustomAdd('x'.repeat(600), 0));
    assert.equal(s.tasbihCustom[0].text.length, 500);
    assert.equal(s.tasbihCustom[0].target, 1);
    s = reduce(baseState(), actions.tasbihCustomAdd('y', 999999));
    assert.equal(s.tasbihCustom[0].target, 100000);
    s = reduce(baseState(), actions.tasbihCustomAdd('z', 'junk'));
    assert.equal(s.tasbihCustom[0].target, 33);
  });

  test('the list caps at 50 (oldest fall off)', () => {
    let s = baseState();
    for (let i = 0; i < 55; i += 1) s = reduce(s, actions.tasbihCustomAdd(`dhikr ${i}`, 33));
    assert.equal(s.tasbihCustom.length, 50);
    assert.equal(s.tasbihCustom[0].text, 'dhikr 5');
    assert.equal(s.tasbihCustom[49].text, 'dhikr 54');
  });

  test('hostile slice state degrades to a fresh list', () => {
    const s = reduce({ ...baseState(), tasbihCustom: 'x' }, actions.tasbihCustomAdd('ok', 33));
    assert.equal(s.tasbihCustom.length, 1);
  });
});

describe('TASBIH_CUSTOM_REMOVE: delete without stranding the dial', () => {
  function twoCustoms() {
    let s = reduce(baseState(), actions.tasbihCustomAdd('First', 33));
    s = reduce(s, actions.tasbihCustomAdd('Second', 100));
    return s;
  }

  test('removes by id, unknown ids no-op', () => {
    const s = twoCustoms();
    const id = s.tasbihCustom[0].id;
    const next = reduce(s, actions.tasbihCustomRemove(id));
    assert.deepEqual(
      next.tasbihCustom.map((e) => e.text),
      ['Second']
    );
    assert.equal(reduce(s, actions.tasbihCustomRemove('custom-nope')), s);
    assert.equal(reduce(s, actions.tasbihCustomRemove(null)), s);
  });

  test('removing the ACTIVE custom falls back (no ghost dial)', () => {
    const s = twoCustoms();
    const id = s.tasbihCustom[1].id;
    const active = reduce(s, actions.setTasbihActive(id));
    assert.equal(active.tasbih.activeItemId, id);
    const next = reduce(active, actions.tasbihCustomRemove(id));
    assert.equal(next.tasbih.activeItemId, null);
    assert.deepEqual(
      next.tasbihCustom.map((e) => e.text),
      ['First']
    );
  });

  test('removing an inactive custom leaves a preset selection alone', () => {
    const s = twoCustoms();
    const active = reduce(s, actions.setTasbihActive('subhanallah'));
    const next = reduce(active, actions.tasbihCustomRemove(s.tasbihCustom[0].id));
    assert.equal(next.tasbih.activeItemId, 'subhanallah');
  });
});

describe('restore: hostile customs sanitize clean', () => {
  test('junk drops, dupes dedupe, text trims, targets clamp', () => {
    const out = sanitizeRestoredPayload({
      tasbihCustom: [
        { id: 'custom-a', text: '  Kept  ', target: 100, ts: 123 },
        { id: 'custom-a', text: 'Dupe id', target: 33 },
        { id: '__proto__', text: 'pollution', target: 33 },
        { id: 'custom-b', text: '   ', target: 33 },
        { id: 'custom-c', text: 'x'.repeat(600), target: 0 },
        { id: 'custom-d', text: 'No target' },
        null,
        'junk',
        { id: 'custom-e', text: 'Bad ts', target: 33, ts: 'x' },
      ],
    });
    assert.deepEqual(
      out.tasbihCustom.map((e) => [e.id, e.text, e.target]),
      [
        ['custom-a', 'Kept', 100],
        ['custom-c', 'x'.repeat(500), 1],
        ['custom-d', 'No target', 33],
        ['custom-e', 'Bad ts', 33],
      ]
    );
    assert.equal(out.tasbihCustom[0].ts, 123);
    assert.equal(out.tasbihCustom[3].ts, null);
  });

  test('non-array customs restore to []', () => {
    assert.deepEqual(sanitizeRestoredPayload({ tasbihCustom: 'x' }).tasbihCustom, []);
    assert.deepEqual(sanitizeRestoredPayload({}).tasbihCustom, []);
  });
});

describe('custom counters reuse the shared increment()', () => {
  test('taps on a custom key count and record statistics', () => {
    const key = 'tasbih:custom-test-1';
    const r = increment(key, 'tasbih-dhikr', 3);
    assert.deepEqual([r.count, r.cycleCompleted], [1, false]);
    const r2 = increment(key, 'tasbih-dhikr', 3);
    const r3 = increment(key, 'tasbih-dhikr', 3);
    assert.deepEqual([r3.count, r3.cycleCompleted, r3.completedCycles], [0, true, 1]);
    assert.equal(r2.count, 2);
  });
});

describe('tasbih view: customs render + authoring form', () => {
  function viewState(overrides = {}) {
    return {
      settings: { language: 'en' },
      tasbih: { activeItemId: null, activePhrase: null },
      tasbihCustom: [],
      counters: {},
      statistics: { totalRecitations: 0 },
      ...overrides,
    };
  }

  test('custom chips, form and i18n render (EN)', () => {
    const html = renderTasbih(
      viewState({ tasbihCustom: [{ id: 'custom-1', text: 'My evening dhikr', target: 50 }] })
    );
    assert.ok(html.includes('My evening dhikr'), 'custom chip text');
    assert.ok(html.includes('data-action="tasbih-custom-remove"'), 'delete control');
    assert.ok(html.includes('data-action="tasbih-custom-save"'), 'authoring form');
    assert.ok(html.includes('Add custom dhikr'), 'EN add label');
    assert.ok(html.includes('Type your dhikr'), 'EN placeholder');
    // Presets still render beside customs.
    assert.ok(html.includes('data-phrase-id="subhanallah"'), 'preset chips intact');
  });

  test('custom chips, form and i18n render (AR)', () => {
    const html = renderTasbih(
      viewState({
        settings: { language: 'ar' },
        tasbihCustom: [{ id: 'custom-1', text: 'ذكر المساء', target: 50 }],
      })
    );
    assert.ok(html.includes('ذكر المساء'), 'custom chip text');
    assert.ok(html.includes('إضافة ذكر مخصص'), 'AR add label');
    assert.ok(html.includes('اكتب الذكر هنا'), 'AR placeholder');
  });

  test('an active custom drives the stage with its own key + goal', () => {
    const html = renderTasbih(
      viewState({
        tasbihCustom: [{ id: 'custom-9', text: 'Stage dhikr', target: 77 }],
        tasbih: { activeItemId: 'custom-9', activePhrase: null },
        counters: { 'tasbih:custom-9': { count: 5, target: 77, completedCycles: 0 } },
      })
    );
    assert.ok(html.includes('data-phrase-id="custom-9"'), 'stage keyed on the custom id');
    assert.ok(html.includes('Stage dhikr'), 'stage shows the custom text');
    assert.ok(html.includes('dir="auto"'), 'no language assumption for user text');
    assert.ok(html.includes('/ 77'), 'the named goal reaches the dial');
  });

  test('custom text is escaped (no markup injection)', () => {
    const html = renderTasbih(
      viewState({
        tasbihCustom: [{ id: 'custom-x', text: '<img src=x onerror=alert(1)>', target: 33 }],
      })
    );
    assert.doesNotMatch(html, /<img src=x/);
    assert.ok(html.includes('&lt;img'), 'escaped text survives visibly');
  });

  test('hostile custom id drops at restore (slug gate, defense in depth)', () => {
    // Stored-XSS path: a crafted backup carries a quote-breaking id.
    // restore now rejects non-slug ids (isSafeKey + slug regex), so the
    // payload never reaches the stage; the render escape below stays as
    // the second layer for ids already live in state.
    const hostile = 'x" onmouseover="alert(1)';
    const restored = sanitizeRestoredPayload({
      tasbihCustom: [{ id: hostile, text: 'hello', target: 33, ts: 1700000000000 }],
    });
    assert.equal(restored.tasbihCustom.length, 0, 'hostile id drops at restore');
    const legit = sanitizeRestoredPayload({
      tasbihCustom: [{ id: 'custom-m1abc-xyz1234', text: 'hello', target: 33, ts: 1700000000000 }],
    });
    assert.equal(legit.tasbihCustom.length, 1, 'uid-shaped id survives restore');
    const html = renderTasbih(
      viewState({
        tasbihCustom: [{ id: hostile, text: 'hello', target: 33 }],
        tasbih: { activeItemId: hostile, activePhrase: null },
      })
    );
    assert.doesNotMatch(html, /onmouseover="alert\(1\)"/);
    assert.ok(html.includes('x&quot; onmouseover=&quot;alert(1)'), 'id escaped in stage attrs');
  });
});
