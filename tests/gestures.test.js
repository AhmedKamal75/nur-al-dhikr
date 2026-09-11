/**
 * gestures.test.js — v5.2.22 bug-report wave, permanent.
 *
 * 1. RTL swipe pin: the Mushaf swipe emulates a physical Arabic book, so
 *    right-to-left travel (dx < 0) is ALWAYS the next page and
 *    left-to-right (dx > 0) is ALWAYS the previous page — independent of
 *    the app's UI language. Short drags and scroll-like vertical drags
 *    never turn.
 * 2. Control-surface guard: touches beginning on buttons, links, inputs,
 *    the player bar, or the Mushaf consoles must never arm a page turn
 *    (swiping over player controls stole taps and turned pages).
 * 3. Mini-player dismiss: the recitation bar carries an explicit X wired
 *    to the existing recite-stop path (stop + clear metadata + unmount),
 *    the full-surah bar's X is tagged for the swipe-down gesture, and the
 *    swipe classifier only fires on mostly-vertical downward travel.
 * 4. Settings accordion: 12 collapsible <details> panels (first open),
 *    every TOC target resolving to a panel id.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MUSHAF_SWIPE_MIN_PX,
  PLAYER_DISMISS_MIN_DY,
  mushafSwipeTurn,
  isSwipeGuardTarget,
  isPlayerDismissSwipe,
} from '../js/domain/gestures.js';
import { renderPlayerBar } from '../js/views/playerBar.js';
import { renderSettings } from '../js/views/settings.js';
import { fsRecitationState } from '../js/views/mushafReader.js';

test('mushaf swipe: right-to-left travel turns to the NEXT page (RTL book order)', () => {
  assert.equal(mushafSwipeTurn(-120, 0), 'next');
  assert.equal(mushafSwipeTurn(-200, 30), 'next');
});

test('mushaf swipe: left-to-right travel turns to the PREVIOUS page', () => {
  assert.equal(mushafSwipeTurn(120, 0), 'prev');
  assert.equal(mushafSwipeTurn(200, -30), 'prev');
});

test('mushaf swipe: short drags and scroll-like vertical drags never turn', () => {
  assert.equal(mushafSwipeTurn(-(MUSHAF_SWIPE_MIN_PX - 1), 0), null);
  assert.equal(mushafSwipeTurn(40, 0), null);
  assert.equal(mushafSwipeTurn(-10, -200), null, 'mostly-vertical is a scroll');
  assert.equal(mushafSwipeTurn(-120, 121), null, 'diagonal past 45° is a scroll');
  assert.equal(mushafSwipeTurn(NaN, 0), null);
  assert.equal(mushafSwipeTurn(120, Number.NaN), null);
});

test('swipe guard: controls own their gesture, page text does not', () => {
  const on = (hit) => ({ closest: () => (hit ? {} : null) });
  assert.equal(isSwipeGuardTarget(on(true)), true);
  assert.equal(isSwipeGuardTarget(on(false)), false);
  assert.equal(isSwipeGuardTarget(null), false);
  assert.equal(isSwipeGuardTarget(undefined), false);
  assert.equal(isSwipeGuardTarget({}), false, 'no .closest, no crash');
  assert.equal(isSwipeGuardTarget({ closest: () => null }), false);
});

test('swipe guard: the selector covers the reported conflict surfaces', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../js/domain/gestures.js', import.meta.url), 'utf8');
  for (const sel of [
    '.player-bar',
    '.mushaf-fs-console',
    '.mushaf-fs-controls',
    'button',
    '[data-action]',
    '.modal',
    '.nav-drawer',
  ]) {
    assert.ok(src.includes(sel), `guard selector covers ${sel}`);
  }
});

test('player dismiss swipe: only mostly-vertical downward travel dismisses', () => {
  assert.equal(isPlayerDismissSwipe(0, PLAYER_DISMISS_MIN_DY + 40), true);
  assert.equal(isPlayerDismissSwipe(10, 200), true);
  assert.equal(isPlayerDismissSwipe(0, -(PLAYER_DISMISS_MIN_DY + 40)), false, 'up never dismisses');
  assert.equal(isPlayerDismissSwipe(0, PLAYER_DISMISS_MIN_DY - 1), false, 'short never dismisses');
  assert.equal(isPlayerDismissSwipe(200, 200), false, 'diagonal never dismisses');
  assert.equal(isPlayerDismissSwipe(200, 0), false, 'horizontal (seek) never dismisses');
});

const reciteState = {
  settings: { language: 'en', audio: {}, reciter: 'ar.alafasy' },
  surahPlayback: { active: true, surah: 1, ayah: 3, total: 7 },
  quran: { meta: { surahs: [] } },
};

test('mini-player: recitation bar carries an explicit dismiss X on recite-stop', () => {
  const html = renderPlayerBar(reciteState);
  assert.ok(html.includes('player-bar--recite'), 'recitation variant renders');
  assert.ok(html.includes('data-player-dismiss="1"'), 'dismiss hook present for the swipe gesture');
  assert.ok(html.includes('data-action="recite-stop"'), 'dismiss rides the stop path');
  const dismissBtn = html.match(/<button[^>]*data-player-dismiss="1"[^>]*>/);
  assert.ok(dismissBtn, 'dismiss button exists');
  assert.ok(dismissBtn[0].includes('data-action="recite-stop"'), 'the X itself stops the session');
});

test('mini-player: full-surah bar X is tagged for the same swipe-down gesture', () => {
  const html = renderPlayerBar({
    settings: { language: 'en', audio: {}, customReciters: [] },
    surahPlayback: { active: false, surah: null },
    player: { moshafId: 'nope', surah: 1, playing: true, offline: false },
    quran: { meta: { surahs: [] } },
  });
  assert.ok(html.includes('data-action="player-close"'), 'close action present');
  assert.ok(html.includes('data-action="player-close" data-player-dismiss="1"'), 'close X tagged');
});

const settingsState = {
  settings: { language: 'en' },
  reminders: [],
  profiles: [],
  activeProfile: 'main',
};

test('settings: 12 collapsible accordion panels, first open', () => {
  const html = renderSettings(settingsState);
  const panels = html.match(/<details class="panel settings-acc" id="settings-sec-[a-z]+"/g) || [];
  assert.equal(panels.length, 12, 'every settings section is an accordion panel');
  assert.ok(
    html.includes('<details class="panel settings-acc" id="settings-sec-language" open>'),
    'first panel open by default'
  );
  assert.ok(html.includes('<summary class="settings-acc__summary">'), 'native summary control');
  assert.ok(!html.includes('${panelHeader('), 'no unexpanded template leftovers');
});

test('settings: TOC jump chips are gone, the 12 accordion panels stand alone', () => {
  const html = renderSettings(settingsState);
  assert.ok(!html.includes('settings-toc'), 'no TOC nav renders');
  assert.ok(!html.includes('settings-toc-go'), 'no TOC action emitted');
  const panels = html.match(/<details class="panel settings-acc" id="settings-sec-[a-z]+"/g) || [];
  assert.equal(panels.length, 12, 'every settings section is still an accordion panel');
  assert.ok(
    html.includes('<details class="panel settings-acc" id="settings-sec-language" open>'),
    'first panel open by default'
  );
});

test('fullscreen session: console + counter ride the session, not the visible surah', () => {
  assert.deepEqual(fsRecitationState({ active: true, surah: 1 }, [1]), {
    sessionActive: true,
    recitingThis: true,
  });
  assert.deepEqual(
    fsRecitationState({ active: true, surah: 1 }, [2]),
    { sessionActive: true, recitingThis: false },
    'page turned away: session controls stay, play button reads play-this'
  );
  assert.deepEqual(fsRecitationState({ active: false, surah: null }, [1]), {
    sessionActive: false,
    recitingThis: false,
  });
  assert.deepEqual(fsRecitationState(null, [1]), { sessionActive: false, recitingThis: false });
  assert.deepEqual(fsRecitationState(undefined, undefined), {
    sessionActive: false,
    recitingThis: false,
  });
});

test('mini-player: compact head (pause + dismiss) over a chip strip', () => {
  const html = renderPlayerBar(reciteState);
  assert.ok(html.includes('player-bar__console'), 'chips ride a scroll strip, not the head');
  const headSeg = html.split('player-bar__console')[0];
  assert.ok(headSeg.includes('data-action="recite-pause-toggle"'), 'pause lives in the head');
  assert.ok(headSeg.includes('data-player-dismiss="1"'), 'dismiss X lives in the head');
});
