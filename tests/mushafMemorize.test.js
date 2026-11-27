/**
 * tests/mushafMemorize.test.js — v5.17.186 (C17) memorize mode ON the
 * Mushaf page, first slice: word-level hide in place.
 *  1. hidden words keep the .qword span, data-action="word-tap" and
 *     data-i (tapping + arrow navigation untouched), gain only a
 *     display-only hide class, and stay a labelled reveal affordance;
 *  2. reveal/rehide reuse the classic reader's hifzSession semantics
 *     (revealed.all / revealed.words, Hide-again clears);
 *  3. scope: session surah only, word level only; ayah-end markers and
 *     the Bismillah band never hide;
 *  4. the tap handler turns a hidden word's tap into HIFZ_REVEAL on the
 *     mushaf and leaves study taps alone everywhere else;
 *  5. no Quran bytes change: hidden spans keep their full inner markup
 *     (tajweed spans included) — the mask is pure CSS.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { renderMushaf, buildMushafSheet } from '../js/views/mushafReader.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { actions, store } from '../js/core/state.js';
import { mergedClickHandlers } from '../js/app/events.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const mushafMeta = readJSON('data/mushaf-meta.json');
const quranMeta = readJSON('data/quran-meta.json');
const surah1 = readJSON('data/quran/1.json');
const pageDocs = { 1: readJSON('data/mushaf/1.json') };

function baseState(overrides = {}) {
  const { settings: settingsOverride, ...rest } = overrides;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      language: 'en',
      audio: { ayahFollow: true },
      ...(settingsOverride || {}),
    },
    activeParams: { page: 1 },
    activeView: 'mushaf',
    quran: { meta: quranMeta, surahs: { 1: surah1 } },
    mushaf: { meta: mushafMeta, pages: pageDocs },
    mushafBookmark: { page: 1 },
    ayahBookmarks: [],
    ayahBookmarkFolders: [],
    quranWords: {},
    quranRoots: null,
    tafsirEditions: { editions: [] },
    tafsir: {},
    studyTray: null,
    mushafFullscreen: false,
    hifzSession: { mode: false, surah: null, level: 'word', revealed: {}, test: null, mcq: null },
    ...rest,
  };
}

const session = (over = {}) => ({
  mode: true,
  surah: 1,
  level: 'word',
  revealed: {},
  test: null,
  mcq: null,
  ...over,
});

/** Slice one ayah's rendered run out of the page (span to next ayah). */
function ayahSlice(html, surah, ayah) {
  const start = html.indexOf(`data-surah="${surah}" data-ayah="${ayah}"`);
  assert.ok(start > 0, `ayah ${surah}:${ayah} renders`);
  const next = html.indexOf(`data-surah="${surah}" data-ayah="${ayah + 1}"`, start);
  return html.slice(start, next > start ? next : start + 4000);
}

describe('C17 mushaf memorize: hide in place', () => {
  test('hidden words keep span, action, index and gain only the hide class', () => {
    const html = renderMushaf(baseState({ hifzSession: session() }));
    const hidden = html.match(/qword--hifz-hidden/g) || [];
    assert.ok(hidden.length >= 20, `Al-Fatiha's words hide (got ${hidden.length})`);
    const a3 = ayahSlice(html, 1, 3);
    const span = a3.match(/<span class="qword[^"]*qword--hifz-hidden[^"]*"[^>]*>/)[0];
    assert.ok(span.includes('data-action="word-tap"'), 'tap action unchanged');
    assert.ok(/data-i="\d+"/.test(span), 'canonical index unchanged');
    assert.ok(span.includes('role="button"'), 'still a button for SR + keys');
    assert.ok(span.includes('aria-label="Reveal"'), 'labelled reveal affordance');
    assert.ok(!span.includes('Open word study'), 'hidden word drops the study label');
    // Ayah-end markers and ornaments stay visible.
    assert.ok(a3.includes('mushaf-ayah__marker'), 'ayah-end marker stays');
    assert.ok(!html.includes('hifz-word-blank'), 'no classic-reader cloze markup here');
  });

  test('reveal semantics match the classic reader: all + per-word', () => {
    const html = renderMushaf(
      baseState({
        hifzSession: session({ revealed: { 1: { all: true }, 3: { words: { 0: true } } } }),
      })
    );
    const a3 = ayahSlice(html, 1, 3);
    const words = a3.match(/<span class="qword[^>]*>/g) || [];
    assert.ok(words.length >= 2, 'ayah 3 words render as spans');
    assert.ok(!words[0].includes('qword--hifz-hidden'), 'revealed word 0 visible');
    assert.ok(words[0].includes('Open word study'), 'visible words keep the study label');
    assert.ok(words[1].includes('qword--hifz-hidden'), 'word 1 still hidden');
  });

  test('scope: session surah only, word level only, session off renders plain', () => {
    const other = renderMushaf(baseState({ hifzSession: session({ surah: 2 }) }));
    assert.ok(!other.includes('qword--hifz-hidden'), 'another surah never hides');
    const ayahLevel = renderMushaf(baseState({ hifzSession: session({ level: 'ayah' }) }));
    assert.ok(!ayahLevel.includes('qword--hifz-hidden'), 'ayah level out of this slice');
    const off = renderMushaf(baseState());
    assert.ok(!off.includes('qword--hifz-hidden'), 'no session, no hides');
    assert.ok(!off.includes('mushaf-hifz-bar'), 'no bar without a session');
  });

  test('no byte changes: hidden words keep their full inner markup', () => {
    const on = renderMushaf(
      baseState({
        hifzSession: session(),
        settings: { mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, tajweedColoring: true } },
      })
    );
    const a3 = ayahSlice(on, 1, 3);
    const hiddenSpan = a3.match(
      /<span class="qword[^"]*qword--hifz-hidden[^"]*"[^>]*>(.*?)<\/span>/s
    );
    assert.ok(hiddenSpan, 'hidden span found');
    assert.ok(/tajweed/.test(hiddenSpan[1]), 'tajweed markup intact under the CSS mask');
    const off = renderMushaf(
      baseState({
        settings: { mushafPrefs: { ...DEFAULT_SETTINGS.mushafPrefs, tajweedColoring: true } },
      })
    );
    // Strip only the hide class and the aria-label: the rest of the
    // markup — bytes, spans, indices — must be identical to the plain
    // render.
    const strip = (h) => h.replace(/ ?qword--hifz-hidden/g, '').replace(/ aria-label="[^"]*"/g, '');
    assert.equal(
      strip(ayahSlice(on, 1, 3)),
      strip(ayahSlice(off, 1, 3)),
      'markup identical but for the hide class and label'
    );
  });

  test('session bar and sheet row mirror the toggle state', () => {
    const on = renderMushaf(baseState({ hifzSession: session() }));
    assert.ok(on.includes('mushaf-hifz-bar'), 'bar renders on the session page');
    assert.ok(on.includes('data-action="hifz-rehide"'), 'Hide-again present');
    assert.ok(on.includes('data-action="mushaf-hifz-toggle" data-surah="1"'), 'End present');
    const sheetOff = buildMushafSheet(baseState());
    assert.ok(
      sheetOff.includes('data-action="mushaf-hifz-toggle" data-surah="1"'),
      'sheet offers Memorize'
    );
    assert.ok(sheetOff.includes('Memorize'), 'sheet row labelled Memorize');
    const sheetOn = buildMushafSheet(baseState({ hifzSession: session() }));
    assert.ok(sheetOn.includes('>End<'), 'sheet row flips to End');
  });
});

describe('C17 mushaf memorize: tap is the classic reveal', () => {
  test('hidden word tap dispatches HIFZ_REVEAL, End closes the session', async () => {
    store.dispatch(actions.navigate('mushaf', { page: 1 }));
    mergedClickHandlers['mushaf-hifz-toggle']({ surah: '1' });
    let sess = store.getState().hifzSession;
    assert.equal(sess.mode, true);
    assert.equal(Number(sess.surah), 1);
    assert.equal(sess.level, 'word', 'mushaf sessions are always word-level');

    await mergedClickHandlers['word-tap']({ surah: '1', ayah: '3', i: '2' });
    sess = store.getState().hifzSession;
    assert.ok(sess.revealed?.[3]?.words?.[1], 'tap revealed canonical word index 1 (0-based)');

    mergedClickHandlers['hifz-rehide']({});
    sess = store.getState().hifzSession;
    assert.deepEqual(sess.revealed, {}, 'Hide-again clears reveals');

    mergedClickHandlers['mushaf-hifz-toggle']({ surah: '1' });
    sess = store.getState().hifzSession;
    assert.equal(sess.mode, false, 'toggle again ends the session');
    store.dispatch(actions.navigate('home', {}));
  });

  test('revealed word tap falls through to study (no double reveal)', async () => {
    store.dispatch(actions.navigate('mushaf', { page: 1 }));
    store.dispatch(actions.hifzSessionStart({ surah: 1, level: 'word' }));
    store.dispatch(actions.hifzReveal({ ayah: 3, word: 1 }));
    const before = store.getState().hifzSession.revealed;
    // A revealed word taps through to the study path; the reveal map must
    // not change (the study modal itself is out of scope for this test).
    try {
      await mergedClickHandlers['word-tap']({ surah: '1', ayah: '3', i: '2' });
    } catch {
      // study path touches browser services; node degrades — state is the assertion
    }
    assert.deepEqual(store.getState().hifzSession.revealed, before, 'no re-reveal, no wipe');
    store.dispatch(actions.hifzSessionEnd());
    store.dispatch(actions.navigate('home', {}));
  });
});
