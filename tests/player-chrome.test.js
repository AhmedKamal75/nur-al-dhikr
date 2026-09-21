/**
 * tests/player-chrome.test.js — (v5.12.0) player chrome: minimize pill,
 * M-mute, keyboard guards, from-here affordances, and the fullscreen
 * file-player row. One player, every side.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { shortcutActionForKey } from '../js/domain/playerShortcuts.js';
import { renderMushaf, buildMushafPlayPick, buildMushafSheet } from '../js/views/mushafReader.js';
import { firstAyahOnPage, buildFullscreenConsole, fileConsole } from '../js/views/mushafPlayer.js';
import { renderPlayerBar } from '../js/views/playerBar.js';
import { consoleSnapshot } from '../js/ui/recitationConsole.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { actions, store } from '../js/core/state.js';
import { mergedClickHandlers } from '../js/app/events.js';
import {
  setMuted as setRecitationMuted,
  isMuted as isRecitationMuted,
  setVolume as setRecitationVolume,
  resetRecitationForTests,
} from '../js/services/recitation.js';
import {
  setMuted as setPlayerMuted,
  isMuted as isPlayerMuted,
  setVolume as setPlayerVolume,
  resetPlayerForTests,
} from '../js/services/player.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const mushafMeta = readJSON('data/mushaf-meta.json');
const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');
const surah2 = surah1;
const pageDocs = {};
for (const n of [1, 2, 3]) {
  pageDocs[n] = readJSON(`data/mushaf/${n}.json`);
}

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'en',
      audio: { ayahFollow: true },
      ...(settingsOverride || {}),
    },
    activeParams: { page: 2 },
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: { 2: surah2 } },
    mushaf: { meta: mushafMeta, pages: pageDocs },
    mushafBookmark: { page: 2 },
    ayahBookmarks: [],
    quranWords: {},
    ui: {},
    surahPlayback: { active: false, surah: null, ayah: null, total: 0 },
    mushafFullscreen: false,
    player: null,
    ...rest,
  };
}

const keyEvent = (key, target = null, extra = {}) => ({
  key,
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target,
  ...extra,
});
const bodyTarget = { tagName: 'DIV' };

describe('keyboard classifier guards', () => {
  test('the drills answer on plain body focus', () => {
    assert.equal(shortcutActionForKey(keyEvent(' ', bodyTarget)), 'toggle');
    assert.equal(shortcutActionForKey(keyEvent('m', bodyTarget)), 'mute');
    assert.equal(shortcutActionForKey(keyEvent('M', bodyTarget)), 'mute');
    assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', bodyTarget)), 'arrowLeft');
    assert.equal(shortcutActionForKey(keyEvent('ArrowRight', bodyTarget)), 'arrowRight');
  });

  test('modifiers never hijack', () => {
    assert.equal(shortcutActionForKey(keyEvent(' ', bodyTarget, { ctrlKey: true })), null);
    assert.equal(shortcutActionForKey(keyEvent('m', bodyTarget, { metaKey: true })), null);
    assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', bodyTarget, { altKey: true })), null);
  });

  test('typing stays sacred (inputs, selects, textareas, contenteditable)', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const t = { tagName: tag, type: 'text' };
      assert.equal(shortcutActionForKey(keyEvent(' ', t)), null, `${tag} space`);
      assert.equal(shortcutActionForKey(keyEvent('m', t)), null, `${tag} m`);
      assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', t)), null, `${tag} arrows`);
    }
    assert.equal(
      shortcutActionForKey(keyEvent('m', { tagName: 'DIV', isContentEditable: true })),
      null
    );
  });

  test('Space on buttons/links keeps native activate; arrows do not steal ranges', () => {
    assert.equal(shortcutActionForKey(keyEvent(' ', { tagName: 'BUTTON' })), null);
    assert.equal(shortcutActionForKey(keyEvent(' ', { tagName: 'A' })), null);
    assert.equal(
      shortcutActionForKey(keyEvent('ArrowLeft', { tagName: 'INPUT', type: 'range' })),
      null
    );
  });

  test('arrows on ayah/word surfaces walk the run, never the player', () => {
    // (v5.12.0 hostile review) one keypress must not both rove the ayahs
    // and step the session — the focused content owns Left/Right.
    const ayahTarget = (sel) => ({
      tagName: 'SPAN',
      closest: (s) => (String(s).includes('.mushaf-ayah') ? { sel } : null),
    });
    assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', ayahTarget('a'))), null);
    assert.equal(shortcutActionForKey(keyEvent('ArrowRight', ayahTarget('a'))), null);
    const wordTarget = {
      tagName: 'SPAN',
      closest: (s) => (String(s).includes('.qword') ? {} : null),
    };
    assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', wordTarget)), null);
    // Body focus keeps the drills.
    assert.equal(shortcutActionForKey(keyEvent('ArrowLeft', bodyTarget)), 'arrowLeft');
  });

  test('held Space/m do not flap; held arrows repeat for seek', () => {
    assert.equal(shortcutActionForKey(keyEvent(' ', bodyTarget, { repeat: true })), null);
    assert.equal(shortcutActionForKey(keyEvent('m', bodyTarget, { repeat: true })), null);
    assert.equal(
      shortcutActionForKey(keyEvent('ArrowLeft', bodyTarget, { repeat: true })),
      'arrowLeft'
    );
  });

  test('anything else is untouched', () => {
    assert.equal(shortcutActionForKey(keyEvent('Enter', bodyTarget)), null);
    assert.equal(shortcutActionForKey(keyEvent('f', bodyTarget)), null);
    assert.equal(shortcutActionForKey(null), null);
  });
});

describe('minimize state (ephemeral ui)', () => {
  test('toggle/set round-trip without persisting', () => {
    assert.equal(store.getState().ui?.playerMin, false);
    store.dispatch(actions.playerMinToggle());
    assert.equal(store.getState().ui?.playerMin, true);
    store.dispatch(actions.playerMinSet(false));
    assert.equal(store.getState().ui?.playerMin, false);
    store.dispatch(actions.playerMinSet(true));
    store.dispatch(actions.playerMinToggle());
    assert.equal(store.getState().ui?.playerMin, false);
  });

  test('mute mirror round-trips', () => {
    store.dispatch(actions.audioMutedSet(true));
    assert.equal(store.getState().ui?.audioMuted, true);
    store.dispatch(actions.audioMutedSet(false));
    assert.equal(store.getState().ui?.audioMuted, false);
  });
});

describe('minimized pill rendering', () => {
  const reciteState = (ui = {}) => ({
    settings: { language: 'en', audio: {}, reciter: 'ar.alafasy' },
    surahPlayback: { active: true, surah: 2, ayah: 50, total: 286, paused: false },
    quran: { meta: quranMeta },
    ui,
  });

  test('full recite bar carries minimize next to quit', () => {
    const html = renderPlayerBar(reciteState());
    assert.ok(!html.includes('player-bar--min'));
    assert.ok(html.includes('data-action="player-min-toggle"'), 'minimize button present');
    assert.ok(html.includes('data-action="recite-stop"'), 'quit still present');
  });

  test('minimized recite pill keeps pause + position + restore + quit', () => {
    const html = renderPlayerBar(reciteState({ playerMin: true }));
    assert.ok(html.includes('player-bar--min'), 'pill class');
    assert.ok(html.includes('data-action="recite-pause-toggle"'), 'pause kept');
    assert.ok(html.includes('data-action="player-min-toggle"'), 'restore kept');
    assert.ok(html.includes('data-action="recite-stop"'), 'quit kept');
    assert.ok(html.includes('2:50 / 286'), 'position kept');
    assert.ok(!html.includes('recite-more-toggle'), 'chip strip hidden');
  });

  test('minimized file pill keeps its own actions', () => {
    const html = renderPlayerBar({
      settings: { language: 'en', audio: {}, customReciters: [] },
      surahPlayback: { active: false },
      quran: { meta: quranMeta },
      player: { moshafId: 'x', surah: 36, playing: true, offline: false },
      ui: { playerMin: true },
    });
    assert.ok(html.includes('player-bar--min'));
    assert.ok(html.includes('data-action="player-toggle"'), 'file toggle kept');
    assert.ok(html.includes('data-action="player-close"'), 'file quit kept');
    assert.ok(html.includes('data-action="player-min-toggle"'), 'restore kept');
  });
});

describe('mute plumbing', () => {
  test('service flags flip without elements and reset clean', () => {
    assert.equal(setRecitationMuted(true), true);
    assert.equal(isRecitationMuted(), true);
    assert.equal(setPlayerMuted(true), true);
    assert.equal(isPlayerMuted(), true);
    resetRecitationForTests();
    resetPlayerForTests();
    assert.equal(isRecitationMuted(), false);
    assert.equal(isPlayerMuted(), false);
  });

  test('console snapshot carries the mute mirror; chip renders pressed', () => {
    const sp = { active: true, surah: 2, ayah: 5, total: 286, repeat: 1, loop: 1, speed: 1 };
    assert.equal(consoleSnapshot(sp, {}, null, 'en').muted, false);
    assert.equal(consoleSnapshot(sp, {}, null, 'en', { muted: true }).muted, true);
    const html = renderPlayerBar({
      settings: { language: 'en', audio: {}, reciter: 'ar.alafasy' },
      surahPlayback: { ...sp, paused: false },
      quran: { meta: quranMeta },
      ui: { audioMuted: true },
    });
    assert.ok(html.includes('data-action="audio-mute-toggle"'), 'mute chip present');
    assert.ok(html.includes('aria-pressed="true"'), 'mute chip pressed');
    assert.ok(html.includes('aria-label="Unmute"'), 'muted chip resolves audio.unmute (EN)');
    assert.ok(!html.includes('audio.unmuted'), 'no raw missing key leaks (EN)');
    const htmlAr = renderPlayerBar({
      settings: { language: 'ar', audio: {}, reciter: 'ar.alafasy' },
      surahPlayback: { ...sp, paused: false },
      quran: { meta: quranMeta },
      ui: { audioMuted: true },
    });
    assert.ok(htmlAr.includes('aria-label="إلغاء الكتم"'), 'muted chip resolves audio.unmute (AR)');
    assert.ok(!htmlAr.includes('audio.unmuted'), 'no raw missing key leaks (AR)');
  });

  test('mute never fights the sleep fade (separate element channels)', () => {
    // Mute rides element.muted; the sleep fade rides element.volume — a
    // fade bottoming out (or clearing) must never flip mute on either
    // engine. Player side asserts on a live element; verse side on flags
    // (its element needs full listener wiring — see the audio suites).
    const made = [];
    globalThis.Audio = class {
      constructor() {
        this.muted = false;
        this.volume = 1;
        made.push(this);
      }
    };
    try {
      resetPlayerForTests();
      setPlayerMuted(true);
      setPlayerVolume(0); // sleep fade bottoming out
      const el = made.at(-1);
      assert.equal(el.volume, 0, 'fade still moves volume');
      assert.equal(el.muted, true, 'fade keeps element muted');
      setPlayerVolume(1);
      assert.equal(el.muted, true, 'volume restore keeps mute');
      assert.equal(isPlayerMuted(), true, 'flag agrees');
      setRecitationMuted(true);
      setRecitationVolume(0);
      assert.equal(isRecitationMuted(), true, 'verse fade keeps mute');
      setRecitationVolume(1);
      assert.equal(isRecitationMuted(), true, 'verse restore keeps mute');
    } finally {
      resetRecitationForTests();
      resetPlayerForTests();
      delete globalThis.Audio;
    }
    assert.equal(isRecitationMuted(), false);
    assert.equal(isPlayerMuted(), false);
  });

  test('both new actions resolve to handlers', () => {
    assert.equal(typeof mergedClickHandlers['player-min-toggle'], 'function');
    assert.equal(typeof mergedClickHandlers['audio-mute-toggle'], 'function');
  });

  test('file seek step chips flank the range, both languages (v5.12.0)', () => {
    for (const lang of ['en', 'ar']) {
      const html = renderPlayerBar({
        settings: { language: lang, audio: {}, reciter: 'ar.alafasy' },
        surahPlayback: { active: false, surah: null },
        player: { moshafId: 'mp3-1', surah: 36, playing: true, offline: false },
        quran: { meta: quranMeta },
        ui: {},
      });
      assert.ok(html.includes('data-action="player-seek-back"'), `back chip (${lang})`);
      assert.ok(html.includes('data-action="player-seek-fwd"'), `fwd chip (${lang})`);
      assert.ok(!html.includes('audio.seekBack'), `seekBack resolves (${lang})`);
      assert.ok(!html.includes('audio.seekFwd'), `seekFwd resolves (${lang})`);
    }
    assert.equal(typeof mergedClickHandlers['player-seek-back'], 'function');
    assert.equal(typeof mergedClickHandlers['player-seek-fwd'], 'function');
  });

  test('file volume slider reflects the pref, yields to sleep (v5.12.0)', () => {
    const bar = (audio, player, lang = 'en') =>
      renderPlayerBar({
        settings: { language: lang, audio, reciter: 'ar.alafasy' },
        surahPlayback: { active: false, surah: null },
        player: { moshafId: 'mp3-1', surah: 36, playing: true, offline: false, ...player },
        quran: { meta: quranMeta },
        ui: {},
      });
    const html = bar({ fileVolume: 0.4 }, {});
    assert.ok(html.includes('data-player-volume'), 'slider present');
    assert.ok(html.includes('value="40"'), 'slider reflects the saved volume');
    assert.ok(!html.includes('audio.volume'), 'volume label resolves');
    const armed = bar(
      { fileVolume: 0.4 },
      { sleepEnabled: true, sleepMinutes: 15, sleepLabel: '14:59' }
    );
    assert.ok(armed.includes('disabled'), 'slider yields while sleep is armed');
    assert.ok(armed.includes('Sleep timer controls volume'), 'yield reason named');
    const ar = bar({ fileVolume: 1 }, {}, 'ar');
    assert.ok(ar.includes('مستوى الصوت'), 'AR volume label resolves');
    assert.ok(!ar.includes('audio.volumeSleep'), 'no raw key leaks (AR)');
  });

  test('mushaf Listen sheet re-homes speed + sleep (v5.12.0)', () => {
    const st = baseState({
      settings: {
        ...DEFAULT_SETTINGS,
        language: 'en',
        audio: { ...DEFAULT_SETTINGS.audio, ayahFollow: true, verseRate: 1.5 },
        customReciters: [],
      },
    });
    const html = buildMushafSheet(st);
    assert.ok(html.includes('data-action="recite-speed-cycle"'), 'speed row present');
    assert.ok(html.includes('data-action="recite-sleep-cycle"'), 'sleep row present');
    assert.ok(html.includes('×1.5'), 'live speed value shown');
    assert.ok(!html.includes('audio.speed'), 'speed label resolves');
  });

  test('windowed and fullscreen file rows agree on book-order chevrons (v5.12.0)', () => {
    const bar = renderPlayerBar({
      settings: { language: 'en', audio: {}, reciter: 'ar.alafasy' },
      surahPlayback: { active: false, surah: null },
      player: { moshafId: 'mp3-1', surah: 36, playing: true, offline: false },
      quran: { meta: quranMeta },
      ui: {},
    });
    const fs = fileConsole(
      {
        settings: { language: 'en', audio: {}, customReciters: [] },
        player: { moshafId: 'mp3-1', surah: 36, playing: true },
        quran: { meta: quranMeta },
        ui: {},
      },
      'en'
    );
    for (const [name, html] of [
      ['windowed', bar],
      ['fullscreen', fs],
    ]) {
      const prev = html.split('data-action="player-prev"')[1].split('data-action=')[0];
      const next = html.split('data-action="player-next"')[1].split('data-action=')[0];
      assert.ok(prev.includes('M9 5l7 7-7 7'), `prev is right chevron (${name})`);
      assert.ok(next.includes('M15 5 8 12l7 7'), `next is left chevron (${name})`);
    }
  });
});

describe('start-from-here', () => {
  test('firstAyahOnPage: min across docs, hostile input safe', () => {
    const docs = [
      { chapters: [{ number: 2, verses: [{ number: 6 }, { number: 7 }] }] },
      { chapters: [{ number: 2, verses: [{ number: 8 }] }] },
    ];
    assert.equal(firstAyahOnPage(docs, 2), 6);
    assert.equal(firstAyahOnPage(docs, 3), null, 'absent surah');
    assert.equal(firstAyahOnPage(null, 2), null);
    assert.equal(firstAyahOnPage(docs, 115), null, 'out of range');
    assert.equal(
      firstAyahOnPage([{ chapters: [{ number: 1, verses: [{ number: 0 }, { number: 1 }] }] }], 1),
      1,
      'bismillah marker skipped'
    );
  });

  test('play-pick offers from-here when the page starts mid-surah', () => {
    // Page 3 of the Madani mushaf starts Baqarah at 2:6 (page 2 is 2:1-5).
    const html = buildMushafPlayPick(baseState({ activeParams: { page: 3 } }));
    const row2 = html.split('mushaf-pick-row').find((r) => r.includes('data-surah="2"'));
    assert.ok(row2, 'surah 2 row exists');
    assert.equal(firstAyahOnPage([pageDocs[3]], 2), 6);
    assert.ok(row2.includes('data-from="6"'), 'row starts from the page');
  });

  test('play-pick keeps whole-surah start at a surah head', () => {
    const html = buildMushafPlayPick(baseState({ activeParams: { page: 2 } }));
    const row2 = html.split('mushaf-pick-row').find((r) => r.includes('data-surah="2"'));
    assert.ok(row2, 'surah 2 row exists');
    assert.ok(!row2.includes('data-from='), 'no from-here at 2:1');
  });
});

describe('fullscreen file row (one player, both sides)', () => {
  test('file track docked in fullscreen renders transport, not silence', () => {
    const html = renderMushaf(
      baseState({
        mushafFullscreen: true,
        player: { moshafId: 'x', surah: 36, playing: true, offline: false },
      })
    );
    assert.ok(html.includes('mushaf-fs-console'), 'second glass row present');
    assert.ok(html.includes('data-action="player-toggle"'), 'pause reachable');
    assert.ok(html.includes('data-action="player-prev"'), 'prev reachable');
    assert.ok(html.includes('data-action="player-next"'), 'next reachable');
    assert.ok(html.includes('data-action="player-close"'), 'quit reachable');
  });

  test('verse session still wins the row; quiet fullscreen stays clean', () => {
    const verse = renderMushaf(
      baseState({
        mushafFullscreen: true,
        surahPlayback: { active: true, surah: 2, ayah: 6, total: 286 },
      })
    );
    assert.ok(!verse.includes('data-action="player-toggle"'), 'no file row over a session');
    const quiet = renderMushaf(baseState({ mushafFullscreen: true }));
    assert.ok(!quiet.includes('mushaf-fs-console'), 'no console without audio');
  });

  test('fullscreen rows carry minimize; both yield to the pill', () => {
    const file = renderMushaf(
      baseState({
        mushafFullscreen: true,
        player: { moshafId: 'x', surah: 36, playing: true, offline: false },
      })
    );
    assert.ok(file.includes('data-action="player-min-toggle"'), 'file row minimizes');
    const verseState = baseState({
      mushafFullscreen: true,
      surahPlayback: { active: true, surah: 2, ayah: 6, total: 286 },
    });
    const verse = buildFullscreenConsole(verseState, 'en');
    assert.ok(verse.includes('mushaf-fs-console'), 'verse console renders');
    assert.ok(verse.includes('data-action="player-min-toggle"'), 'verse console minimizes');
    // Minimized, the pill overlays the book — the rows must not double it.
    const minFile = fileConsole(
      {
        player: { moshafId: 'x', surah: 36, playing: true },
        settings: { customReciters: [] },
        quran: { meta: quranMeta },
        ui: { playerMin: true },
      },
      'en'
    );
    assert.equal(minFile, '', 'file row yields to the pill');
    assert.equal(
      buildFullscreenConsole({ ...verseState, ui: { playerMin: true } }, 'en'),
      '',
      'verse console yields to the pill'
    );
  });
});
