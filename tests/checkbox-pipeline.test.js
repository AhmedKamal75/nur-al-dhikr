/**
 * checkbox-pipeline.test.js — a switch must actually switch (v5.17.17)
 *
 * The delegated click listener calls e.preventDefault() before dispatching
 * (events.js) so links and buttons behave. On a checkbox that preventDefault
 * CANCELS the native state toggle, so a click-handled checkbox reads its own
 * pre-toggle value, writes the same value back, and sits there doing nothing.
 *
 * That is not hypothetical: "Store downloads compressed" shipped that way and
 * never worked. Nothing failed, no test went red, and the switch looked fine.
 *
 * So this is an app-wide structural audit, not a regression pin for one
 * control: EVERY checkbox/radio carrying a data-action must be owned by the
 * change pipeline, which reads el.checked after the browser has toggled it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/** Every data-action on a checkbox/radio, across every view. */
function toggleActions() {
  const dir = path.join(root, 'js/views');
  const found = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = read(`js/views/${file}`);
    // Match the input element regardless of attribute order.
    for (const m of src.matchAll(/<input[^>]*>/g)) {
      const tag = m[0];
      if (!/type="(checkbox|radio)"/.test(tag)) continue;
      const act = /data-action="([a-z0-9-]+)"/.exec(tag);
      if (!act) continue;
      if (!found.has(act[1])) found.set(act[1], []);
      found.get(act[1]).push(file);
    }
  }
  return found;
}

/** Every sel the change pipelines actually claim. */
function changeSelectors() {
  const dir = path.join(root, 'js/app/handlers');
  const sels = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    for (const m of read(`js/app/handlers/${file}`).matchAll(/sel:\s*'([^']+)'/g)) {
      sels.push(m[1]);
    }
  }
  return sels;
}

test('every checkbox/radio is owned by the change pipeline, not the click table', () => {
  const sels = changeSelectors();
  const orphans = [];
  for (const [action, files] of toggleActions()) {
    const owned = sels.some((sel) => sel.includes(`[data-action="${action}"]`));
    if (!owned) orphans.push(`${action} (${[...new Set(files)].join(', ')})`);
  }
  assert.deepEqual(
    orphans,
    [],
    'these switches would never move: a click-handled checkbox has its native toggle cancelled by preventDefault'
  );
});

test("the two offline storage switches are the change pipeline's business", () => {
  // Named explicitly because this is the pair that shipped broken: one dead
  // since v5.3.0, one added in v5.17.17 by copying its broken neighbour.
  const handlers = read('js/app/handlers/offline.js');
  for (const action of ['offline-toggle-compressed', 'offline-toggle-essentials-auto']) {
    assert.ok(
      handlers.includes(`sel: '[data-action="${action}"]'`),
      `${action} must be a sel-based change handler`
    );
  }
  const clickTable = handlers.split('export const changeHandlers')[0];
  for (const action of ['offline-toggle-compressed', 'offline-toggle-essentials-auto']) {
    assert.equal(
      clickTable.includes(action),
      false,
      `${action} must not also sit in clickHandlers, or it fires twice`
    );
  }
});

test("the click pipeline does not cancel a toggle's own state change", () => {
  const events = read('js/app/events.js');
  // lastIndexOf, not indexOf: dispatchHandler() opens with the same line, so
  // the first hit is inside the helper, not at the delegated listener.
  const at = events.lastIndexOf('const handler = clickHandlers[action];');
  assert.ok(at > 0, 'the click dispatch site exists');
  const window = events.slice(at, at + 900);
  // The guard must exist and must sit BEFORE the dispatch.
  assert.match(
    window,
    /isToggle/,
    'the click pipeline must recognise a checkbox/radio before preventDefault'
  );
  const guardAt = window.indexOf('isToggle');
  const preventAt = window.indexOf('e.preventDefault()');
  assert.ok(guardAt >= 0 && preventAt > guardAt, 'the guard precedes the preventDefault call');
  assert.match(window, /if \(!isToggle\) e\.preventDefault\(\);/);
});

test('a change handler reads el.checked, never the event', () => {
  // run(ds, el) — el is the element. Reading `e.checked` off a MouseEvent is
  // undefined, which is how a switch ends up dispatching "unchanged" forever.
  const offline = read('js/app/handlers/offline.js');
  for (const m of offline.matchAll(/run:\s*async?\s*\(ds, el\)[\s\S]{0,400}?\n  \},/g)) {
    assert.equal(/\be\.checked\b/.test(m[0]), false, 'must read el.checked, not e.checked');
  }
});
