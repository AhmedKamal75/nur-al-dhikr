import test from 'node:test';
import assert from 'node:assert/strict';
import { focusSizePercent, focusSizeStep, focusSizeSheetHTML } from '../js/views/focus.js';
import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';

test('size ticks clamp malformed and stale settings without float drift', () => {
  for (const value of [undefined, null, NaN, Infinity, 'bad', 0, -1])
    assert.equal(focusSizePercent(value), 100);
  assert.equal(focusSizePercent(0.2), 85);
  assert.equal(focusSizePercent(9), 160);
  let n = 1;
  for (let i = 0; i < 100; i++) n = focusSizeStep(n, 1);
  assert.equal(n, 1.6);
  for (let i = 0; i < 100; i++) n = focusSizeStep(n, -1);
  assert.equal(n, 0.85);
  assert.equal(focusSizeStep(1, 1), 1.05);
  assert.equal(focusSizeStep(1, -1), 0.95);
});
for (const lang of ['en', 'ar'])
  test(`${lang} sheet shows shared scope, named controls and disabled bounds`, () => {
    const s = initialState();
    s.settings.language = lang;
    s.settings.arabicFontScale = 0.85;
    let h = focusSizeSheetHTML(s);
    assert.match(h, /data-dir="-1"[^>]*disabled/);
    assert.match(h, /85%/);
    assert.match(h, /aria-live="polite"/);
    assert.match(h, /aria-label=/);
    assert.match(h, lang === 'en' ? /Shared adhkar/ : /مشترك/);
    s.settings.arabicFontScale = 1.6;
    h = focusSizeSheetHTML(s);
    assert.match(h, /data-dir="1"[^>]*disabled/);
    assert.match(h, /160%/);
  });
test('the existing settings action leaves all session and Mushaf state untouched', () => {
  const s = initialState();
  s.activeView = 'focus';
  s.activeParams = { id: 'morning', subId: 'a' };
  s.counters = { a: { count: 2, target: 3 } };
  const n = reduce(s, { type: 'SETTINGS_UPDATE', patch: { arabicFontScale: 1.1 } });
  for (const key of Object.keys(s).filter((k) => k !== 'settings'))
    assert.equal(n[key], s[key], key);
  for (const key of Object.keys(s.settings).filter((k) => k !== 'arabicFontScale'))
    assert.deepEqual(n.settings[key], s.settings[key], key);
});
