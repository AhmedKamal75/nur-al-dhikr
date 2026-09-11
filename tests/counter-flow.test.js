/**
 * counter-flow.test.js — v5.2.24 counter/accordion/focus wave, permanent.
 *
 * 1. Accordion memory: toggling a switch re-renders the view, so the open
 *    section id lives view-local in settings.js — a re-render re-opens
 *    exactly it (switches no longer collapse their section). Unknown ids
 *    collapse everything; the id list is stable and unique.
 * 2. Counter completion: a finished card renders the exit class inside its
 *    completion window and renders nothing once dismissed (session-only;
 *    counters/statistics untouched). The domain handoff is DOM-free.
 * 3. Focus enter: the slide plays only on item change, forward from the
 *    reading-start side, back from the other.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOpenSettingsSection,
  setOpenSettingsSection,
  settingsSectionIds,
} from '../js/views/settings.js';
import { renderSettings } from '../js/views/settings.js';
import {
  dismissCompleted,
  isDismissed,
  noteCompleted,
  wasCompletedRecently,
  clearDismissed,
} from '../js/domain/completedCards.js';
import { cardHTML } from '../js/ui/card.js';
import { focusEnterClass } from '../js/views/focus.js';

test('accordion memory: pin survives, unknown ids collapse', () => {
  setOpenSettingsSection('settings-sec-language');
  assert.equal(getOpenSettingsSection(), 'settings-sec-language');
  setOpenSettingsSection('settings-sec-content');
  assert.equal(getOpenSettingsSection(), 'settings-sec-content');
  setOpenSettingsSection('nope');
  assert.equal(getOpenSettingsSection(), null);
  setOpenSettingsSection(null);
  assert.equal(getOpenSettingsSection(), null);
  setOpenSettingsSection('settings-sec-language');
});

test('accordion memory: re-render re-opens exactly the pinned section', () => {
  const state = {
    settings: { language: 'en' },
    reminders: [],
    profiles: [],
    activeProfile: 'main',
  };
  setOpenSettingsSection('settings-sec-feedback');
  const html = renderSettings(state);
  const tags = html.match(/<details class="panel settings-acc"[^>]*>/g) || [];
  assert.equal(tags.length, 12);
  const openOnes = tags.filter((tag) => /\bopen\b/.test(tag));
  assert.equal(openOnes.length, 1, 'single-expansion survives the render');
  assert.ok(openOnes[0].includes('id="settings-sec-feedback"'), 'the pinned section is open');
  setOpenSettingsSection('settings-sec-language');
});

test('accordion memory: section id list is stable and unique', () => {
  const ids = settingsSectionIds();
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
  assert.ok(ids.every((id) => /^settings-sec-[a-z]+$/.test(id)));
});

const ITEM = {
  id: 'flow-exit-1',
  title: { en: 'Exit item' },
  arabic: 'نص',
  repetitions: 3,
};
const CAT = { id: 'cat-flow', name: { en: 'Flow' }, color: 'emerald' };
const OPTS = { counter: { count: 0, target: 3, completedCycles: 1 }, lang: 'en' };

test('counter dismiss: fresh completion renders the exit class', () => {
  clearDismissed();
  noteCompleted(ITEM.id);
  const html = cardHTML(ITEM, CAT, OPTS);
  assert.ok(html.includes('card--exiting'), 'exiting animation class rides the article');
  clearDismissed();
});

test('counter dismiss: dismissed cards render nothing, others unaffected', () => {
  clearDismissed();
  dismissCompleted(ITEM.id);
  assert.equal(cardHTML(ITEM, CAT, OPTS), '', 'dismissed card vanishes');
  assert.ok(
    cardHTML({ ...ITEM, id: 'flow-exit-2' }, CAT, OPTS).includes('<article'),
    'siblings still render'
  );
  clearDismissed();
  assert.equal(isDismissed(ITEM.id), false, 'clear resets the session memory');
});

test('counter dismiss: recency window expires', () => {
  clearDismissed();
  noteCompleted(ITEM.id);
  assert.equal(wasCompletedRecently(ITEM.id), true);
  assert.equal(wasCompletedRecently(ITEM.id, Date.now() + 60_000), false);
  clearDismissed();
});

test('focus enter: same item never replays, direction follows travel', () => {
  assert.equal(focusEnterClass('c:1', 0, null), ' focus--enter-next', 'first entry slides in');
  assert.equal(focusEnterClass('c:1', 0, { key: 'c:1', idx: 0 }), '', 'count taps never replay');
  assert.equal(
    focusEnterClass('c:2', 1, { key: 'c:1', idx: 0 }),
    ' focus--enter-next',
    'forward (incl. auto-advance) slides next'
  );
  assert.equal(
    focusEnterClass('c:1', 0, { key: 'c:2', idx: 1 }),
    ' focus--enter-prev',
    'back slides prev'
  );
});
