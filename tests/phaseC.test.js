/**
 * tests/phaseC.test.js
 * v3.14 Phase C (loading & feedback) gates:
 *  - skeleton builders: shape, bounds, sr-only signal, no raw HTML leakage
 *  - empty-state builder: escaping, optional hint/action
 *  - sound design: explicit gating (off → no audio work at all), no-throw
 *    on a device without AudioContext (node has none — the catch is the
 *    honest behaviour, not a mock)
 *  - settings sanitization for the two new sound prefs
 *  - the audioDownloading ephemeral reducer pair (start/end/idempotence)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  skeletonLines,
  skeletonSurahList,
  skeletonAyahCards,
  skeletonReciterRows,
  skeletonHadithCard,
  skeletonMushafPage,
} from '../js/ui/skeleton.js';
import { emptyStateHTML } from '../js/ui/emptyState.js';
import * as soundDesign from '../js/services/soundDesign.js';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../js/core/config.js';
import { store, actions, PERSISTED_KEYS } from '../js/core/state.js';

const XSS = '<img src=x onerror="alert(1)">';

describe('skeleton builders', () => {
  test('surah list mirrors the tile grid and carries an sr-only loading line', () => {
    const html = skeletonSurahList('en', 10);
    assert.equal((html.match(/sk-tile"/g) || []).length, 10);
    assert.match(html, /class="sr-only"/);
    assert.match(html, /Loading/);
  });

  test('counts are clamped into sane bounds', () => {
    assert.equal((skeletonAyahCards('en', 0).match(/sk-ayah-card"/g) || []).length, 1);
    assert.equal((skeletonAyahCards('en', 500).match(/sk-ayah-card"/g) || []).length, 8);
    assert.equal((skeletonSurahList('en', 0).match(/sk-tile"/g) || []).length, 2);
    const page = skeletonMushafPage('en', 0);
    assert.ok((page.match(/sk--paper/g) || []).length >= 4);
    assert.ok((skeletonMushafPage('en', 99).match(/sk--paper/g) || []).length <= 16);
  });

  test('reciter rows and hadith cards render their mirror shapes', () => {
    assert.equal((skeletonReciterRows('en', 6).match(/sk-reciter-row/g) || []).length, 6);
    const hadith = skeletonHadithCard('en');
    assert.match(hadith, /sk-hadith-card/);
    assert.match(hadith, /panel/);
  });

  test('no caller string is ever embedded raw (skeletons only emit bars)', () => {
    // widths are numbers; the only external input is lang → passed to t().
    // (v4.3) the old `|| true` made the first assertion unfalsifiable — it
    // could never fail, so the clamp it names was never actually tested.
    const html = skeletonLines('en', [10, 120, -5]);
    assert.ok(!html.includes('120%')); // clamped to 100
    assert.ok(!html.includes('-5%'));
    assert.match(html, /--sk-w:100%/);
    assert.match(html, /--sk-w:10%/);
  });
});

describe('emptyStateHTML', () => {
  test('escapes title and hint, renders medallion + action', () => {
    const html = emptyStateHTML({
      iconName: 'heart',
      title: XSS,
      hint: XSS,
      actionHTML: '<a class="btn" href="#/library">go</a>',
    });
    assert.ok(!html.includes('<img src=x'), 'raw XSS must not survive');
    assert.ok(html.includes('&lt;img'), 'title must be escaped');
    assert.match(html, /empty-state__medallion/);
    assert.match(html, /href="#\/library"/);
  });

  test('hint and action are optional', () => {
    const html = emptyStateHTML({ iconName: 'search', title: 'Nothing here' });
    assert.ok(!html.includes('empty-state__hint'));
    assert.ok(!html.includes('btn'));
  });
});

describe('soundDesign gating', () => {
  test('disabled sounds return immediately (no context creation, no throw)', () => {
    soundDesign._resetForTests();
    assert.equal(soundDesign.playPageTurn(false), undefined);
    assert.equal(soundDesign.playKhatmaChime(false), undefined);
  });

  test('enabled sounds never throw even where AudioContext is unavailable', () => {
    soundDesign._resetForTests();
    // In node there is no window/AudioContext — the module must degrade to
    // a silent no-op rather than break the calling interaction.
    assert.doesNotThrow(() => soundDesign.playPageTurn(true));
    assert.doesNotThrow(() => soundDesign.playKhatmaChime(true));
  });
});

describe('new sound settings sanitize through the standard gate', () => {
  test('garbage falls back to defaults (both opt-in sounds default OFF)', () => {
    const clean = sanitizeSettings({});
    assert.equal(clean.pageTurnSound, DEFAULT_SETTINGS.pageTurnSound);
    assert.equal(clean.pageTurnSound, false);
    assert.equal(clean.khatmaChimeSound, DEFAULT_SETTINGS.khatmaChimeSound);
    assert.equal(clean.khatmaChimeSound, false);
  });

  test('non-boolean values reject strictly (asBool contract) — default OFF', () => {
    assert.equal(sanitizeSettings({ pageTurnSound: 'yes' }).pageTurnSound, false);
    assert.equal(sanitizeSettings({ pageTurnSound: 1 }).pageTurnSound, false);
    assert.equal(sanitizeSettings({ pageTurnSound: true }).pageTurnSound, true);
    assert.equal(sanitizeSettings({ khatmaChimeSound: '1' }).khatmaChimeSound, false);
    assert.equal(sanitizeSettings({ khatmaChimeSound: 'garbage' }).khatmaChimeSound, false);
    assert.equal(sanitizeSettings({ khatmaChimeSound: true }).khatmaChimeSound, true);
  });
});

describe('audioDownloading ephemeral state', () => {
  test('start/end round-trip through the real store; both are idempotent', () => {
    assert.deepEqual(store.getState().audioDownloading, {});
    store.dispatch(actions.markAudioDownloadStart('m1:2'));
    assert.equal(store.getState().audioDownloading['m1:2'], true);
    store.dispatch(actions.markAudioDownloadStart('m1:2')); // re-start no-op
    assert.equal(Object.keys(store.getState().audioDownloading).length, 1);
    store.dispatch(actions.markAudioDownloadEnd('m1:2'));
    assert.deepEqual(store.getState().audioDownloading, {});
    store.dispatch(actions.markAudioDownloadEnd('m1:2')); // end without start no-op
    assert.deepEqual(store.getState().audioDownloading, {});
  });

  test('audioDownloading is NOT persisted (ephemeral by design)', () => {
    assert.equal(PERSISTED_KEYS.includes('audioDownloading'), false);
    assert.equal(PERSISTED_KEYS.includes('audioDownloads'), true);
  });
});
