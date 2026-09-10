/**
 * focus-cycle.test.js — v5.2.20 (F-015), permanent.
 *
 * The modal trap and the nav-drawer containment ran two hand-rolled
 * copies of the same three Tab-cycling branches. Both call
 * cycleTabFocus now; these cases pin the shared math (DOM-free: the
 * active element arrives as a parameter, focus()/preventDefault are
 * spies). A source scan pins that neither owner re-implements the
 * branches anymore.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cycleTabFocus } from '../js/ui/modal.js';

const ROOT = new URL('..', import.meta.url).pathname;
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

function fakeItem() {
  return {
    focused: false,
    focus() {
      this.focused = true;
    },
  };
}

function fakeEvent(key = 'Tab', shiftKey = false) {
  return {
    key,
    shiftKey,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}

function containerWith(...members) {
  return { contains: (el) => members.includes(el) };
}

test('focus cycle: shift+Tab on first wraps to last', () => {
  const a = fakeItem();
  const b = fakeItem();
  const e = fakeEvent('Tab', true);
  assert.equal(cycleTabFocus(e, containerWith(a, b), [a, b], a), true);
  assert.equal(e.prevented, true);
  assert.equal(b.focused, true);
  assert.equal(a.focused, false);
});

test('focus cycle: Tab on last wraps to first', () => {
  const a = fakeItem();
  const b = fakeItem();
  const e = fakeEvent('Tab', false);
  assert.equal(cycleTabFocus(e, containerWith(a, b), [a, b], b), true);
  assert.equal(e.prevented, true);
  assert.equal(a.focused, true);
});

test('focus cycle: focus outside is pulled back to first', () => {
  const a = fakeItem();
  const b = fakeItem();
  const e = fakeEvent('Tab', false);
  assert.equal(cycleTabFocus(e, containerWith(a, b), [a, b], { elsewhere: true }), true);
  assert.equal(e.prevented, true);
  assert.equal(a.focused, true);
});

test('focus cycle: middle element is untouched (returns false)', () => {
  const a = fakeItem();
  const b = fakeItem();
  const c = fakeItem();
  const e = fakeEvent('Tab', false);
  assert.equal(cycleTabFocus(e, containerWith(a, b, c), [a, b, c], b), false);
  assert.equal(e.prevented, false);
  assert.ok(!a.focused && !b.focused && !c.focused);
});

test('focus cycle: non-Tab, empty list, and missing container decline', () => {
  const a = fakeItem();
  const e = fakeEvent('Enter', false);
  assert.equal(cycleTabFocus(e, containerWith(a), [a], a), false);
  assert.equal(cycleTabFocus(fakeEvent(), containerWith(a), [], a), false);
  assert.equal(cycleTabFocus(fakeEvent(), null, [a], a), false);
});

test('focus cycle: neither owner re-implements the branches', () => {
  const modal = stripComments(readFileSync(`${ROOT}js/ui/modal.js`, 'utf8'));
  assert.ok(/cycleTabFocus\(e, panel, focusables/.test(modal), 'modal trap calls the helper');
  const events = stripComments(readFileSync(`${ROOT}js/app/events.js`, 'utf8'));
  assert.ok(
    /cycleTabFocus\(e, drawer, focusables/.test(events),
    'drawer containment calls the helper'
  );
  // The three-branch shape exists exactly once, in the helper itself.
  const helperBodies = (modal.match(/active === first/g) || []).length;
  assert.equal(helperBodies, 1, 'one first/last comparison lives in modal.js');
});
