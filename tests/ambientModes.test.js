/**
 * tests/ambientModes.test.js — (v5.10.1) nightstand display modes: the
 * deterministic verse/dhikr slide picks, the ambientMode sanitizer
 * allowlist, and per-mode ambient renders with honest corpus fallback.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ambientVerse, ambientDhikr } from '../js/domain/ambient.js';
import { renderAmbient } from '../js/views/ambient.js';
import { initialState } from '../js/core/state/initial.js';
import { sanitizeSettings } from '../js/core/config.js';

const INDEX = {
  a: {
    item: { id: 'x1', arabic: 'سُبْحَانَ اللَّهِ', translation: 'Glory be to Allah' },
    document: { metadata: { id: 'adhkar' } },
    category: {},
  },
  b: {
    item: {
      id: 'x2',
      arabic: 'وَاذْكُر رَّبَّكَ كَثِيرًا وَسَبِّحْ بِالْعَشِيِّ وَالْإِبْكَارِ',
      translation: 'And remember your Lord much and exalt Him in the evening and the morning',
    },
    document: { metadata: { id: 'adhkar' } },
    category: {},
  },
  c: {
    item: { id: 'x3', arabic: 'الحمد لله رب العالمين حمدا كثيرا طيبا مباركا فيه'.repeat(5) },
    document: { metadata: { id: 'adhkar' } },
    category: {},
  },
};

const DAY = new Date(2026, 8, 17);

function ambientState(mode, itemIndex = INDEX) {
  const s = initialState();
  return {
    ...s,
    settings: {
      ...s.settings,
      language: 'en',
      prayer: {
        ...s.settings.prayer,
        latitude: 30.0,
        longitude: 31.0,
        locationName: 'Cairo',
        method: 'MWL',
        asr: 'Standard',
        offsets: {},
        ambientMode: mode,
      },
    },
    library: { ...s.library, itemIndex },
  };
}

describe('ambient slide picks', () => {
  test('verse + dhikr are deterministic per day', () => {
    assert.deepEqual(ambientVerse(INDEX, DAY), ambientVerse(INDEX, DAY));
    assert.deepEqual(ambientDhikr(INDEX, DAY), ambientDhikr(INDEX, DAY));
    assert.notDeepEqual(
      ambientDhikr(INDEX, DAY),
      ambientDhikr(INDEX, new Date(2026, 8, 18)),
      'rotates daily (pool > 1 in most corpora)'
    );
  });

  test('dhikr pick is short; empty index yields null', () => {
    const pick = ambientDhikr(INDEX, DAY);
    assert.ok(pick.item.arabic.length <= 140, 'fits one glance');
    assert.equal(ambientVerse({}, DAY), null);
    assert.equal(ambientDhikr({}, DAY), null);
  });
});

describe('ambientMode sanitize', () => {
  test('allowlisted; junk falls back to countdown', () => {
    const base = initialState().settings;
    assert.equal(
      sanitizeSettings({ ...base, prayer: { ...base.prayer, ambientMode: 'verse' } }).prayer
        .ambientMode,
      'verse'
    );
    assert.equal(
      sanitizeSettings({ ...base, prayer: { ...base.prayer, ambientMode: 'karaoke' } }).prayer
        .ambientMode,
      'countdown'
    );
  });
});

describe('ambient view modes', () => {
  test('countdown default renders clock + switcher', () => {
    const html = renderAmbient(ambientState('countdown'));
    assert.match(html, /role="timer"/, 'live clock');
    assert.match(html, /data-action="ambient-mode"/, 'mode switcher');
    assert.match(html, /ambient__mode--active[^>]*>\s*Countdown/s, 'countdown active');
  });

  test('verse mode renders the slide + compact clock', () => {
    const html = renderAmbient(ambientState('verse'));
    assert.match(html, /ambient__slide/, 'verse slide');
    assert.match(html, /ambient__clock--compact/, 'clock shrinks under the slide');
  });

  test('empty corpus falls back to countdown with an honest note', () => {
    const html = renderAmbient(ambientState('dhikr', {}));
    assert.match(html, /ambient__empty/, 'honest note');
    assert.match(html, /role="timer"/, 'countdown fallback');
  });
});
