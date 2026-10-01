/**
 * tests/ambientLamp.test.js — (v5.17.55, merged-plan item 8) nightstand
 * lamp mode: warm low-light recitation shelf with big transport
 * (prev / play-pause / next, ayah by ayah) and the listen-mode sleep chip.
 *
 * Pins the whole contract: the dim-warm palette (capped luminance, no
 * pure white, no blue-dominant ink, existing tokens only), the rendered
 * transport + sleep wiring (existing recite-* actions, handler-backed),
 * auto-advance default OFF with no endless-loop controls, bilingual
 * EN+AR, no gamification copy, and the 19/19 renderer budget untouched.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAmbient } from '../js/views/ambient.js';
import { initialState } from '../js/core/state/initial.js';
import { sanitizeSettings } from '../js/core/config.js';
import { AMBIENT_MODES } from '../js/core/config.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import {
  LAMP_GROUND,
  LAMP_AMBER,
  LAMP_LUMINANCE_CAP,
  lampAutoAdvanceDefault,
  lampShouldAutoAdvance,
  lampLuminance,
  lampIsBlueDominant,
  lampPaletteHoldsCap,
} from '../js/domain/ambient.js';
import { nextSleepRung } from '../js/domain/sleepTimer.js';
import { mergedClickHandlers } from '../js/app/events.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CARDS_CSS = readFileSync(join(HERE, '..', 'assets', 'css', 'cards.css'), 'utf8');
const VARIABLES_CSS = readFileSync(join(HERE, '..', 'assets', 'css', 'variables.css'), 'utf8');
const RENDERER_SRC = readFileSync(join(HERE, '..', 'js', 'app', 'renderer.js'), 'utf8');

function lampState(overrides = {}) {
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
        ambientMode: 'lamp',
      },
    },
    library: { ...s.library, itemIndex: {} },
    quran: {
      meta: { surahs: [{ number: 1, nameTransliteration: 'Al-Fatihah', nameAr: 'الفاتحة' }] },
    },
    surahPlayback: { active: false, surah: null, ayah: null, total: 0, paused: false },
    ...overrides,
  };
}

function activeLampState() {
  return lampState({
    surahPlayback: { active: true, surah: 1, ayah: 3, total: 7, paused: false },
  });
}

describe('lamp palette: dim, warm, capped', () => {
  test('palette pins mirror the glass-bar tokens and hold the cap', () => {
    assert.equal(LAMP_GROUND, '#10201a', 'mirrors --fs-bar-bg (variables.css)');
    assert.equal(LAMP_AMBER, '#d4bd77', 'mirrors --fs-bar-gold (variables.css)');
    assert.ok(lampPaletteHoldsCap(), 'whole palette holds the dim-warm contract');
    for (const c of [LAMP_GROUND, LAMP_AMBER]) {
      assert.ok(lampLuminance(c) <= LAMP_LUMINANCE_CAP, `${c} luminance capped`);
      assert.notEqual(c.toLowerCase(), '#ffffff', 'no pure white');
      assert.equal(lampIsBlueDominant(c), false, `${c} is not blue-dominant`);
    }
  });

  test('lamp CSS uses existing tokens only — no new custom properties', () => {
    const start = CARDS_CSS.indexOf('(v5.17.55, item 8) Lamp shelf');
    assert.ok(start > 0, 'lamp block exists in cards.css');
    const end = CARDS_CSS.indexOf('.prayer-row {', start);
    const lampBlock = CARDS_CSS.slice(start, end > start ? end : start + 6000);
    assert.ok(!lampBlock.includes('--lamp-'), 'no new --lamp-* tokens introduced');
    const used = [...lampBlock.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    assert.ok(used.length > 0, 'lamp block consumes tokens');
    const defined = new Set(
      [...VARIABLES_CSS.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((m) => m[1])
    );
    const unknown = [...new Set(used)].filter((v) => !defined.has(v));
    assert.deepEqual(unknown, [], `lamp uses undefined tokens: ${unknown.join(', ')}`);
    assert.ok(
      !/#fff/i.test(lampBlock.replace(/\.ambient__/g, '')),
      'no pure-white hex in lamp CSS'
    );
  });
});

describe('lamp transport + sleep chip render', () => {
  test('idle lamp renders big transport, sleep chip, and honest no-session note', () => {
    const html = renderAmbient(lampState());
    assert.match(html, /view--ambient-lamp/, 'lamp surface class');
    assert.match(html, /ambient__transport/, 'transport group');
    assert.match(html, /dir="ltr"/, 'transport order pinned ltr (never mirrors)');
    assert.match(html, /data-action="recite-ayah-prev"/, 'prev ayah');
    assert.match(html, /data-action="recite-pause-toggle"/, 'play/pause');
    assert.match(html, /data-action="recite-ayah-next"/, 'next ayah');
    assert.match(html, /data-action="recite-sleep-cycle"/, 'sleep-timer chip wired');
    assert.match(html, /ambient\.lampNoSession|Start a recitation/, 'honest no-session note');
    assert.match(html, /disabled/, 'transport disables with no session');
  });

  test('active session renders the now-line with ayah position, enabled transport', () => {
    const html = renderAmbient(activeLampState());
    assert.match(html, /ambient__lamp-now/, 'now-reciting line');
    assert.match(html, /3 \/ 7/, 'ayah position x / y (plain position, not a score)');
    assert.ok(!/disabled/.test(html), 'transport enables during a session');
  });

  test('every lamp action resolves to a real handler (no dead buttons)', () => {
    const html = renderAmbient(activeLampState());
    const emitted = [...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
    for (const a of [
      'recite-ayah-prev',
      'recite-pause-toggle',
      'recite-ayah-next',
      'recite-sleep-cycle',
    ]) {
      assert.ok(emitted.includes(a), `lamp emits ${a}`);
      assert.equal(typeof mergedClickHandlers[a], 'function', `${a} has a handler`);
    }
  });

  test('sleep ladder behind the chip is the shared off-first rung cycle', () => {
    assert.equal(nextSleepRung(false, null), 5, 'off arms at the first rung');
    assert.equal(nextSleepRung(true, 60), null, 'last rung cycles back off');
  });
});

describe('lamp auto-advance: default OFF, no endless loop', () => {
  test('policy helpers pin OFF', () => {
    assert.equal(lampAutoAdvanceDefault(), false, 'default OFF');
    assert.equal(lampShouldAutoAdvance(), false, 'never self-advances past the wird');
  });

  test('lamp renders no listen/loop/repeat (the endless-loop controls)', () => {
    const html = renderAmbient(activeLampState());
    for (const a of ['recite-listen-toggle', 'recite-loop-toggle', 'recite-repeat-toggle']) {
      assert.ok(!html.includes(`data-action="${a}"`), `lamp must not emit ${a}`);
    }
  });

  test('lamp is allowlisted; hostile modes still fall back to countdown', () => {
    assert.ok(AMBIENT_MODES.includes('lamp'), 'lamp is a first-class ambient mode');
    const base = initialState().settings;
    assert.equal(
      sanitizeSettings({ ...base, prayer: { ...base.prayer, ambientMode: 'lamp' } }).prayer
        .ambientMode,
      'lamp'
    );
    assert.equal(
      sanitizeSettings({ ...base, prayer: { ...base.prayer, ambientMode: 'karaoke' } }).prayer
        .ambientMode,
      'countdown'
    );
  });
});

describe('lamp bilingual + calm', () => {
  test('new keys exist in EN+AR with no Latin leakage into AR chrome', () => {
    for (const k of [
      'ambient.modeLamp',
      'ambient.lampHint',
      'ambient.lampNoSession',
      'ambient.lampNow',
      'ambient.lampTransport',
    ]) {
      assert.ok(en[k], `en has ${k}`);
      assert.ok(ar[k], `ar has ${k}`);
    }
    for (const k of [
      'ambient.lampHint',
      'ambient.lampNoSession',
      'ambient.lampNow',
      'ambient.lampTransport',
    ]) {
      assert.ok(!/[A-Za-z]/.test(ar[k]), `${k} AR carries no Latin`);
    }
  });

  test('no gamification or shame copy anywhere on the lamp surface', () => {
    const html = renderAmbient(activeLampState());
    assert.ok(
      !/streak|confetti|leaderboard|badge|score|shame|xp|level up|reward/i.test(html),
      'calm surface: no gamification vocabulary'
    );
  });

  test('renderer 19/19 static budget holds (lamp reuses the lazy ambient view)', () => {
    const staticViews = [...RENDERER_SRC.matchAll(/from\s+['"]\.\.\/views\/[^'"]+['"]/g)].map(
      (m) => m[0]
    );
    assert.ok(
      staticViews.length <= 19,
      `renderer keeps ≤19 static view imports (found ${staticViews.length})`
    );
    assert.ok(
      RENDERER_SRC.includes("import('../views/ambient.js')"),
      'ambient stays a lazy dynamic import'
    );
  });
});
