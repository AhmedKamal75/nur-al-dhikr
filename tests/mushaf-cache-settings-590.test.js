/**
 * mushaf-cache-settings-590.test.js — (v5.9.0) P2/E gates.
 *
 * 1. The mushaf page store stays bounded (48 most-recent docs) no matter
 *    how far a reading session flips.
 * 2. The Mushaf settings panel emits the tajweed-underlines toggle.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { store, actions } from '../js/core/state.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { buildMushafSettingsPanel } from '../js/views/tafsirPanel.js';

describe('bounded mushaf page cache', () => {
  test('evicts oldest-loaded beyond 48, refreshes recency on re-set', () => {
    for (let p = 1; p <= 60; p += 1) store.dispatch(actions.setMushafPage(p, { page: p }));
    const st = store.getState().mushaf;
    const keys = Object.keys(st.pages);
    assert.equal(keys.length, 48);
    assert.ok(!keys.includes('1'), 'oldest-loaded evicted');
    assert.ok(!keys.includes('12'), 'eviction is load-ordered');
    assert.ok(keys.includes('60'), 'newest kept');
    assert.equal(st.pageOrder.length, 48);
    assert.equal(st.pageOrder[st.pageOrder.length - 1], '60');
    // Re-setting an old survivor refreshes its recency.
    store.dispatch(actions.setMushafPage(13, { page: 13 }));
    const st2 = store.getState().mushaf;
    assert.equal(Object.keys(st2.pages).length, 48);
    assert.equal(st2.pageOrder[st2.pageOrder.length - 1], '13', 're-set page moves to newest');
    // Backward read order evicts the forward tail, not page 1 by number.
    for (let p = 60; p >= 1; p -= 1) store.dispatch(actions.setMushafPage(p, { page: p }));
    const keys3 = Object.keys(store.getState().mushaf.pages);
    assert.equal(keys3.length, 48);
    assert.ok(keys3.includes('1'), 'backward read keeps page 1');
    assert.ok(!keys3.includes('60'), 'backward read evicts the forward tail');
  });
});

describe('tajweed-underlines settings toggle', () => {
  test('emitted under Study aids, nested like wordUnderline', () => {
    const html = buildMushafSettingsPanel({
      settings: { language: 'en', mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs } },
    });
    assert.ok(html.includes('data-key="tajweedUnderlines"'), 'toggle emitted');
    assert.ok(html.includes('Show tajweed underlines'), 'label renders');
    const study = html.slice(html.indexOf('>Study aids<'));
    assert.ok(study.includes('data-key="tajweedUnderlines"'), 'toggle lives in Study aids');
  });
});
