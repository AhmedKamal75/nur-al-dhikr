/**
 * tests/review-v3.4-fixes.test.js
 * Regression tests for the v3.4.0 live-walkthrough fixes (see
 * REVIEW-v3.4.0.md): the completed-cycle counter badge, the zakat
 * nisab-threshold double-escape, and reminder-time validation at the
 * state boundary.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cardHTML } from '../js/ui/card.js';
import { formatAmount } from '../js/domain/zakat.js';
import { makeReminder } from '../js/services/notifications.js';
import { renderZakat } from '../js/views/zakat.js';
import { store } from '../js/core/state.js';

/* ------------------------------------------------------------------ */
/* W-2: the counter pill must show completed cycles                    */
/* ------------------------------------------------------------------ */

const BASE_ITEM = {
  id: 'test-item-1',
  category_id: 'cat-test',
  repetitions: 1,
  grade: 'Sahih',
  arabic: 'test',
  title: { en: 'Test item', ar: 'عنصر' },
};

test('cardHTML shows a completed-cycles badge once cycles exist', () => {
  const html = cardHTML(BASE_ITEM, null, { counter: { count: 0, target: 1, completedCycles: 4 } });
  assert.match(html, /counter-pill--done/);
  // (v4.3) /4/ matched ANY 4 anywhere in the card (widths, ids, svg paths);
  // pin the digit to its actual home — the cycles badge's own text node
  // (which renders as "✓ 4").
  assert.match(html, /counter-pill__cycles[^>]*>[^<]*\b4\b/);
  // title tooltip uses the translated label
  assert.match(html, /Completed 4 times/);
});

test('cardHTML omits the badge for a fresh counter (0 cycles)', () => {
  const html = cardHTML(BASE_ITEM, null, { counter: { count: 0, target: 1, completedCycles: 0 } });
  assert.doesNotMatch(html, /counter-pill--done/);
  assert.doesNotMatch(html, /counter-pill__cycles/);
});

test('cardHTML renders the badge even mid-cycle for multi-count dhikr', () => {
  const html = cardHTML({ ...BASE_ITEM, repetitions: 33 }, null, {
    counter: { count: 12, target: 33, completedCycles: 2 },
  });
  assert.match(html, /12 \/ 33/);
  assert.match(html, /counter-pill--done/);
  assert.match(html, /counter-pill__cycles[^>]*>.*2/s);
});

/* ------------------------------------------------------------------ */
/* W-3: the nisab threshold must single-escape the currency            */
/* ------------------------------------------------------------------ */

test('formatAmount escapes a markup currency exactly once', () => {
  const out = formatAmount(6375, '<b>$</b>');
  // exactly one level of entity encoding in the returned string
  assert.ok(out.includes('&lt;b&gt;$&lt;/b&gt;'), `expected single-escaped symbol, got: ${out}`);
  assert.ok(!out.includes('&amp;lt;'), 'symbol must not be double-escaped');
});

test('renderZakat nisab threshold does not double-escape the currency', () => {
  const state = {
    settings: { language: 'en' },
    zakat: {
      prefs: {
        basis: 'gold',
        goldPricePerGram: 75,
        silverPricePerGram: 1,
        currency: 'AT&T <b>units</b>',
      },
      inputs: {},
    },
    zakatHistory: [],
  };
  const html = renderZakat(state, 'en');
  const i = html.indexOf('Nisab threshold');
  const line = html.slice(i, i + 220);
  // The raw currency "AT&T" must appear entity-encoded ONCE in the line:
  // single escape = "AT&amp;T"; a double escape would show "AT&amp;amp;T".
  assert.ok(line.includes('AT&amp;T'), `expected AT&amp;T in threshold line: ${line}`);
  assert.ok(!line.includes('&amp;amp;'), `double-escape regression: ${line}`);
});

/* ------------------------------------------------------------------ */
/* W-4: reminder times are validated at every entry point              */
/* ------------------------------------------------------------------ */

test('makeReminder falls back to the default time for garbage input', () => {
  assert.equal(makeReminder({ id: 'r1', time: '25:99' }).time, '06:00');
  assert.equal(makeReminder({ id: 'r2', time: '' }).time, '06:00');
  assert.equal(makeReminder({ id: 'r3', time: 'garbage' }).time, '06:00');
  assert.equal(makeReminder({ id: 'r4', time: '07:05' }).time, '07:05');
  assert.equal(makeReminder({ id: 'r5', time: '23:59' }).time, '23:59');
});

test('sanitizeRestoredPayload drops reminders with unparseable times', () => {
  // The store exposes the sanitizer indirectly through RESTORE_STATE;
  // drive it through the real store to keep the test honest.
  store.dispatch({
    type: 'RESTORE_STATE',
    payload: {
      settings: {},
      reminders: [
        { id: 'ok-1', time: '06:30', label: 'good' },
        { id: 'bad-1', time: '25:99', label: 'bad hours' },
        { id: 'bad-2', time: '', label: 'empty' },
        { id: 'bad-3', time: 'garbage', label: 'garbage' },
      ],
      calendarNotes: [
        { id: 'note-1', title: 'with good time', reminder: true, reminderTime: '09:00' },
        { id: 'note-2', title: 'with bad time', reminder: true, reminderTime: 'nope' },
      ],
    },
  });
  const state = store.getState();
  assert.deepEqual(
    state.reminders.map((r) => r.id),
    ['ok-1']
  );
  assert.equal(state.reminders[0].time, '06:30');
  const note1 = state.calendarNotes.find((n) => n.id === 'note-1');
  const note2 = state.calendarNotes.find((n) => n.id === 'note-2');
  assert.equal(note1.reminderTime, '09:00');
  assert.equal(note2.reminderTime, null);
});
