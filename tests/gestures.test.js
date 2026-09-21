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
  MUSHAF_DRAG_CLAMP_RATIO,
  mushafSwipeTurn,
  isSwipeGuardTarget,
  isPlayerDismissSwipe,
  resolveMinControl,
  findTouch,
  mushafDragStyle,
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

test('swipe minimize: resolves the bar chevron, the fs sibling, or null', () => {
  const chevron = {
    clicked: 0,
    click() {
      this.clicked += 1;
    },
  };
  // Windowed bar / fs console rows carry their own chevron.
  const bar = { querySelector: () => chevron, parentElement: null };
  assert.equal(resolveMinControl(bar), chevron, 'own chevron wins');
  // The fs transport row carries none — the sibling console's answers.
  const sib = {};
  const transport = {
    querySelector: () => null,
    parentElement: {
      querySelector: (sel) => (sel.includes('.mushaf-fs-console') ? sib : null),
    },
  };
  assert.equal(resolveMinControl(transport), sib, 'transport falls to sibling console');
  // Quiet fullscreen (no console): null, so the caller no-ops.
  const quiet = { querySelector: () => null, parentElement: { querySelector: () => null } };
  assert.equal(resolveMinControl(quiet), null, 'quiet transport never minimizes');
  assert.equal(resolveMinControl(null), null);
  assert.equal(resolveMinControl(undefined), null);
  assert.equal(resolveMinControl({}), null, 'no querySelector, no crash');
  assert.equal(
    resolveMinControl({
      querySelector: () => {
        throw new Error('hostile');
      },
    }),
    null,
    'throwing querySelector, no crash'
  );
});

test('touch identity: findTouch matches the tracked finger, never a stranger', () => {
  const a = { identifier: 3, clientX: 10, clientY: 20 };
  const b = { identifier: 7, clientX: 90, clientY: 20 };
  // Real TouchList shape: length + item(), no namedItem.
  const list = { length: 2, item: (i) => [a, b][i] };
  assert.equal(findTouch(list, 7), b, 'second finger resolves by id');
  assert.equal(findTouch(list, 3), a, 'first finger resolves by id');
  assert.equal(findTouch(list, 9), null, 'unknown id never falls back to item(0)');
  assert.equal(findTouch({ length: 0, item: () => null }, 3), null);
  assert.deepEqual(findTouch([a, b], 7), b, 'array stubs work too');
  assert.equal(findTouch(null, 3), null);
  assert.equal(findTouch(list, null), null);
  assert.equal(findTouch({}, 3), null, 'hostile shape, no crash');
});

test('paper drag: book tracks the finger, clamped, with lift', () => {
  const w = 400;
  const right = mushafDragStyle(100, w);
  assert.equal(right.x, 100, 'one-to-one under the finger');
  assert.ok(right.scale < 1 && right.scale >= 0.985, 'lift dip bounded');
  assert.ok(right.progress > 0 && right.progress < 1);
  const left = mushafDragStyle(-100, w);
  assert.equal(left.x, -100, 'direction-agnostic: left drags go left');
  const max = w * MUSHAF_DRAG_CLAMP_RATIO;
  assert.equal(mushafDragStyle(10000, w).x, max, 'clamped at 45% width');
  assert.equal(mushafDragStyle(-10000, w).x, -max);
  assert.equal(mushafDragStyle(10000, w).progress, 1);
  assert.equal(mushafDragStyle(0, w).x, 0);
  assert.equal(mushafDragStyle(NaN, w), null);
  assert.equal(mushafDragStyle(100, 0), null);
  assert.equal(mushafDragStyle(100, -50), null);
});
