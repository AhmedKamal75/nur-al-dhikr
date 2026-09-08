/**
 * event-registries.test.js — Blueprint D gates: the change/input arms
 * moved out of events.js into feature-owned { sel, run } registries.
 * Pins completeness (no arm lost in the move), selector uniqueness
 * (first-match-wins stays unambiguous), and the rejection boundary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  changeRegistry,
  inputRegistry,
  matchRegistry,
  dispatchRegistry,
} from '../js/app/events.js';
import { actions, store } from '../js/core/state.js';

function fakeEl(sel) {
  return {
    value: '',
    checked: false,
    dataset: {},
    closest: () => null,
    matches: (s) => s === sel,
  };
}

test('D: every arm survived the move (27 change + 10 input)', () => {
  assert.equal(changeRegistry.length, 27);
  assert.equal(inputRegistry.length, 10);
});

test('D: registry entries are well-formed with unique selectors', () => {
  for (const [name, registry] of [
    ['change', changeRegistry],
    ['input', inputRegistry],
  ]) {
    const sels = [];
    for (const entry of registry) {
      assert.equal(typeof entry.sel, 'string', `${name} sel`);
      assert.ok(entry.sel.length > 0, `${name} sel non-empty`);
      assert.equal(typeof entry.run, 'function', `${name}:${entry.sel} run`);
      sels.push(entry.sel);
    }
    assert.deepEqual([...new Set(sels)], sels, `${name} selectors unique`);
  }
});

test('D: first matching selector wins', () => {
  const order = [];
  const registry = [
    { sel: 'a', run: () => order.push('a') },
    { sel: 'b', run: () => order.push('b') },
  ];
  const el = { matches: (s) => s === 'a' || s === 'b' };
  assert.equal(matchRegistry(registry, el).sel, 'a');
  assert.equal(matchRegistry(registry, { matches: () => false }), null);
  assert.equal(matchRegistry(registry, null), null);
  void order;
});

test('D: prayer-method change round-trips through the registry', () => {
  const entry = changeRegistry.find((e) => e.sel === '[data-bind="prayer-method"]');
  assert.ok(entry);
  const before = store.getState().settings.prayer.method;
  entry.run({}, { ...fakeEl(), value: 'ISNA' });
  assert.equal(store.getState().settings.prayer.method, 'ISNA');
  store.dispatch(actions.updatePrayerSettings({ method: before }));
  assert.equal(store.getState().settings.prayer.method, before);
});

test('D: home-panel-toggle hides and re-shows', () => {
  const entry = changeRegistry.find((e) => e.sel === '[data-action="home-panel-toggle"]');
  assert.ok(entry);
  const ds = { id: 'verse' };
  entry.run(ds, { ...fakeEl(), checked: false });
  assert.equal(store.getState().settings.hiddenHome?.verse, true);
  entry.run(ds, { ...fakeEl(), checked: true });
  assert.equal(store.getState().settings.hiddenHome?.verse, undefined);
});

test('D: fontScale input round-trips through the registry', () => {
  const entry = inputRegistry.find((e) => e.sel === '[data-bind="fontScale"]');
  assert.ok(entry);
  const before = store.getState().settings.fontScale;
  entry.run({}, { ...fakeEl(), value: '1.5' });
  assert.equal(store.getState().settings.fontScale, 1.5);
  store.dispatch(actions.updateSettings({ fontScale: before }));
});

test('D: a throwing run surfaces through the boundary instead of escaping', () => {
  globalThis.document = { getElementById: () => null };
  try {
    const registry = [
      {
        sel: 'x',
        run: () => {
          throw new Error('boom');
        },
      },
    ];
    const el = { dataset: {}, matches: (s) => s === 'x' };
    assert.equal(dispatchRegistry('change', registry, { target: el }), true);
    assert.equal(dispatchRegistry('change', registry, { target: { matches: () => false } }), false);
  } finally {
    delete globalThis.document;
  }
});
