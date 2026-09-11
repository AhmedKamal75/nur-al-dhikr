/**
 * dailyAyah.test.js (v5.2.30) — B-4: the restored verse-of-the-day theme
 * bias. Keyword matching is substring on plain text (no network, no curated
 * lists that could drift); hostile shapes degrade, never throw.
 * Run: node --test tests/dailyAyah.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { DAILY_THEMES, matchesTheme, pickDailyItemThemed } from '../js/domain/dailyAyah.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { renderHome } from '../js/views/home.js';

const mercyEntry = (id) => ({
  item: {
    id,
    arabic: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً',
    translation: { en: 'Our Lord, grant us mercy from Yourself' },
  },
  category: { id: 'c1' },
  document: { metadata: { id: 'lib1' } },
});

const plainEntry = (id) => ({
  item: {
    id,
    arabic: 'وَأَقِيمُوا الصَّلَاةَ',
    translation: { en: 'And establish prayer' },
  },
  category: { id: 'c1' },
  document: { metadata: { id: 'lib1' } },
});

test('theme ids: domain list and sanitizer allowlist agree, hostile falls back', () => {
  assert.deepEqual(
    [...DAILY_THEMES],
    ['any', 'mercy', 'patience', 'gratitude', 'guidance', 'paradise']
  );
  assert.equal(DEFAULT_SETTINGS.dailyAyahTheme, 'any');
  for (const th of DAILY_THEMES) {
    assert.equal(sanitizeSettings({ dailyAyahTheme: th }).dailyAyahTheme, th);
  }
  assert.equal(sanitizeSettings({ dailyAyahTheme: '__proto__' }).dailyAyahTheme, 'any');
  assert.equal(sanitizeSettings({ dailyAyahTheme: 'mercy;DROP' }).dailyAyahTheme, 'any');
  assert.equal(sanitizeSettings({}).dailyAyahTheme, 'any');
});

test('matchesTheme: EN + AR keywords, unknown theme open, hostile safe', () => {
  assert.equal(matchesTheme(mercyEntry('a'), 'mercy'), true);
  assert.equal(matchesTheme(plainEntry('b'), 'mercy'), false);
  assert.equal(matchesTheme(plainEntry('b'), 'any'), true);
  assert.equal(matchesTheme(plainEntry('b'), 'nope'), true, 'unknown theme never blanks');
  assert.equal(matchesTheme(null, 'mercy'), false);
  assert.equal(matchesTheme('junk', 'mercy'), false);
});

test('pickDailyItemThemed: same item all day, sparse theme falls back, empty null', () => {
  const index = { a: mercyEntry('a'), b: plainEntry('b') };
  const day = new Date(2026, 8, 11, 9, 0);
  const first = pickDailyItemThemed(index, 'mercy', day);
  const second = pickDailyItemThemed(index, 'mercy', new Date(2026, 8, 11, 21, 0));
  assert.equal(first?.item?.id, second?.item?.id, 'stable within the day');
  assert.equal(first?.item?.id, 'a', 'biased to the theme pool');
  // 'paradise' matches nothing here: falls back to the full pool, never null.
  const fallback = pickDailyItemThemed(index, 'paradise', day);
  assert.ok(['a', 'b'].includes(fallback?.item?.id));
  assert.equal(pickDailyItemThemed({}, 'mercy', day), null);
  assert.equal(pickDailyItemThemed(null, 'mercy', day), null);
});

test('renderHome: mercy theme shows the mercy verse + six theme chips', () => {
  const base = initialState();
  const state = {
    ...base,
    settings: { ...base.settings, language: 'en', dailyAyahTheme: 'mercy', hiddenHome: {} },
    library: {
      raw: [],
      order: [],
      documents: [],
      itemIndex: { a: mercyEntry('a'), b: plainEntry('b') },
    },
    history: [],
    favorites: [],
    collections: [],
    counters: {},
  };
  const html = renderHome(state);
  assert.ok(html.includes('grant us mercy'), 'themed verse on the card');
  assert.ok(!html.includes('establish prayer'), 'off-theme verse not on the card');
  for (const th of DAILY_THEMES) {
    assert.ok(html.includes(`data-key="dailyAyahTheme" data-value="${th}"`), `chip for ${th}`);
  }
});
