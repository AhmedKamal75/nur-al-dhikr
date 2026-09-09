/**
 * audio-session.test.js — UX-7: one session from two engines. Verse wins
 * when active; the tile glyph can never claim "paused" while the other
 * engine is sounding.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { selectors } from '../js/core/state.js';

const base = {
  surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
  player: { moshafId: null, surah: null, playing: false },
};

test('UX-7: silence by default', () => {
  assert.deepEqual(selectors.audioSession(base), {
    mode: 'none',
    surah: null,
    sounding: false,
    paused: false,
  });
});

test('UX-7: full-surah track drives the session', () => {
  const state = { ...base, player: { moshafId: 'm', surah: 2, playing: true } };
  assert.deepEqual(selectors.audioSession(state), {
    mode: 'surah',
    surah: 2,
    sounding: true,
    paused: false,
  });
  const paused = { ...base, player: { moshafId: 'm', surah: 2, playing: false } };
  assert.deepEqual(selectors.audioSession(paused), {
    mode: 'surah',
    surah: 2,
    sounding: false,
    paused: true,
  });
});

test('UX-7: active verse session wins over player residue', () => {
  const state = {
    surahPlayback: { active: true, surah: 2, ayah: 5, total: 286, paused: false },
    player: { moshafId: 'm', surah: 2, playing: false },
  };
  assert.deepEqual(selectors.audioSession(state), {
    mode: 'verse',
    surah: 2,
    sounding: true,
    paused: false,
  });
  const vp = {
    surahPlayback: { active: true, surah: 3, ayah: 1, total: 7, paused: true },
    player: { moshafId: null, surah: null, playing: false },
  };
  assert.deepEqual(selectors.audioSession(vp), {
    mode: 'verse',
    surah: 3,
    sounding: false,
    paused: true,
  });
});
