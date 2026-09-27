import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Focus keyboard shortcuts never hijack a focused control', () => {
  const src = read('../js/app/focusRuntime.js');
  assert.ok(
    src.includes(
      'closest?.(\'button, a[href], input, select, textarea, [contenteditable="true"]\')'
    )
  );
  assert.ok(src.indexOf('closest?.(') < src.indexOf("e.key === ' '"));
});

test('Focus swipe requires one finger, the reading stage, and no modal', () => {
  const src = read('../js/app/events.js');
  assert.match(src, /e\.touches\.length !== 1/);
  assert.match(src, /isModalOpen\(\)/);
  assert.match(src, /closest\?\.\('\.focus__scroll'\)/);
  assert.match(src, /focusSwipeTurn\(dx, dy, isRTL\)/);
});

test('Azkar and Tasbih counting feedback has exactly one owner', () => {
  const items = read('../js/app/handlers/items.js');
  const tasbih = read('../js/app/handlers/tasbih.js');
  assert.doesNotMatch(items, /tasbih\.playTick|navigator\.vibrate/);
  assert.doesNotMatch(tasbih, /tasbih\.playTick|navigator\.vibrate/);
  assert.match(tasbih, /\.tasbih-stage\[data-phrase-id=/);
});

test('large counting surfaces disable double-tap zoom and text selection', () => {
  const css = read('../assets/css/cards.css');
  for (const selector of [".card[data-action='counter-tap']", '.focus__scroll']) {
    const start = css.indexOf(selector);
    assert.ok(start >= 0, `${selector} exists`);
    const rule = css.slice(start, css.indexOf('}', start));
    assert.match(rule, /touch-action:\s*manipulation/);
    assert.match(rule, /user-select:\s*none/);
  }
});

test('the in-app reduced-motion toggle restores idle reading controls', () => {
  const css = read('../assets/css/quran.css');
  assert.match(css, /\[data-reduce-motion='true'\] body\.reader-fs-idle/);
  assert.match(css, /\[data-reduce-motion='true'\] body\.mushaf-fs-idle/);
  assert.match(read('../assets/css/cards.css'), /\[data-reduce-motion='true'\] \.card--exiting/);
});

test('the effective card target outranks a stale counter snapshot', () => {
  const src = read('../js/ui/card.js');
  assert.match(src, /const target = item\.repetitions \|\| counter\?\.target \|\| 1/);
});
