/**
 * tests/recitation-honesty.test.js — two claims that audits have reported as
 * open, repeatedly, and which are in fact shipped. Both are pinned here by
 * EXECUTION so the report stops costing time:
 *
 *  1. The riwaya mismatch note. The bundled mushaf text is Hafs; a moshaf
 *     whose catalog `rewaya` is something else must SAY so while it plays.
 *     Silence is only correct when the catalog does not state a riwaya —
 *     110 of 312 entries do not, and guessing would be inventing religious
 *     data (ADR 0005).
 *  2. There is no "hidden" Bismillah style. Omitting the Bismillah normalizes
 *     a textless page, so the enum, the settings chips and the i18n strings
 *     all exclude it, and a stored legacy value falls back to 'auto'. Whether
 *     a Bismillah appears is the caller's decision — At-Tawbah carries none.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BISMILLAH_STYLES, sanitizeSettings } from '../js/core/config/sanitize.js';
import { renderPlayerBar } from '../js/views/playerBar.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');

const barState = (moshafId, over = {}) => ({
  settings: { language: 'en', customReciters: [], audio: {}, ...over.settings },
  ui: {},
  player: {
    moshafId,
    surah: 2,
    playing: true,
    duration: 120,
    currentTime: 10,
    repeat: 'off',
    ...over.player,
  },
  quran: { meta: { surahs: [{ number: 2, nameAr: 'البقرة', nameTransliteration: 'Al-Baqarah' }] } },
  surahPlayback: { active: false },
});

describe('the riwaya mismatch note is honest and data-driven', () => {
  test('a non-Hafs moshaf states the mismatch while it plays', () => {
    // findMoshaf() resolves bundled entries from the loaded catalog cache and
    // user entries from settings.customReciters — so the fixture goes in
    // there, which is also the real code path.
    const html = renderPlayerBar(
      barState('mp3-warsh', {
        settings: {
          customReciters: [
            {
              id: 'mp3-warsh',
              nameEn: 'Some Warsh Reciter',
              nameAr: 'قارئ بالورش',
              rewaya: "Warsh A'n Nafi'",
              server: 'https://example.org/warsh/',
            },
          ],
        },
      })
    );
    assert.match(html, /Warsh/i, 'the note names the actual riwaya');
    assert.match(html, /Hafs/i, 'and states the text it does not match');
  });

  test('a Hafs moshaf stays silent (no false alarm)', () => {
    const html = renderPlayerBar(
      barState('mp3-hafs', {
        settings: {
          customReciters: [
            {
              id: 'mp3-hafs',
              nameEn: 'Some Hafs Reciter',
              rewaya: "Hafs A'n Assem",
              server: 'https://example.org/hafs/',
            },
          ],
        },
      })
    );
    assert.doesNotMatch(html, /Hafs\./, 'no mismatch warning for a matching riwaya');
  });

  test('a moshaf with NO stated riwaya stays silent (unknown is not a mismatch)', () => {
    const html = renderPlayerBar(
      barState('mp3-unknown', {
        settings: {
          customReciters: [
            { id: 'mp3-unknown', nameEn: 'Unlabelled', server: 'https://example.org/x/' },
          ],
        },
      })
    );
    assert.ok(html.length > 0, 'the bar still renders');
    assert.doesNotMatch(html, /Hafs\./, 'no warning without data — never guess');
  });

  test('the note is bilingual and names the actual riwaya', () => {
    assert.ok(en['audio.riwayaNote'], 'EN string exists');
    assert.ok(ar['audio.riwayaNote'], 'AR string exists');
    assert.match(en['audio.riwayaNote'], /\{rewaya\}/, 'EN names the riwaya');
    assert.match(ar['audio.riwayaNote'], /\{rewaya\}/, 'AR names the riwaya');
    assert.notEqual(en['audio.riwayaNote'], ar['audio.riwayaNote'], 'not an English pass-through');
  });

  test('the rule is: warn on a KNOWN non-Hafs rewaya, stay silent otherwise', () => {
    // Pin the predicate itself so its logic cannot drift from the catalog.
    const src = readFileSync(join(ROOT, 'js/views/playerBar.js'), 'utf8');
    assert.match(src, /moshaf\?\.rewaya\s*&&\s*!\/hafs\/i\.test/, 'guarded on a present rewaya');
    assert.match(src, /!\/hafs\/i\.test\(String\(moshaf\.rewaya\)\)/, 'Hafs itself never warns');
  });

  test('the catalog really does carry rewaya for most moshafs (the data premise)', () => {
    const catalog = JSON.parse(readFileSync(join(ROOT, 'data/reciters.json'), 'utf8'));
    const list = catalog.reciters || catalog;
    const rows = Array.isArray(list) ? list : Object.values(list)[0];
    const withRewaya = rows.filter((r) => r.rewaya);
    assert.ok(withRewaya.length > 100, `${withRewaya.length} entries carry rewaya`);
    assert.ok(
      withRewaya.some((r) => /hafs/i.test(String(r.rewaya))),
      'Hafs is present, so a Hafs voice is correctly silent'
    );
    assert.ok(
      withRewaya.some((r) => !/hafs/i.test(String(r.rewaya))),
      'and so is at least one non-Hafs voice, which must warn'
    );
  });
});

describe('there is no "hidden" Bismillah style', () => {
  test('the enum excludes it', () => {
    assert.ok(!BISMILLAH_STYLES.has('hidden'), 'the style is not selectable');
    assert.deepEqual([...BISMILLAH_STYLES].sort(), ['accent', 'auto', 'gold']);
  });

  test('a stored legacy "hidden" falls back to auto (never a textless page)', () => {
    assert.equal(
      sanitizeSettings({ mushafPrefs: { bismillahStyle: 'hidden' } }).mushafPrefs.bismillahStyle,
      'auto'
    );
  });

  test('no orphaned "hidden" strings remain in either language', () => {
    for (const dict of [en, ar]) {
      const keys = Object.keys(dict);
      assert.ok(
        !keys.some((k) => k.includes('bismillah_hidden')),
        'an unreachable string is a lie waiting to be read'
      );
    }
  });

  test('no view branches on a style the sanitizer cannot produce', () => {
    for (const file of [
      'js/views/mushafReader.js',
      'js/views/quran.js',
      'js/views/tafsirPanel.js',
    ]) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      assert.ok(
        !/bismillahStyle\s*!==\s*'hidden'/.test(src),
        `${file} still guards an impossible state`
      );
    }
  });

  test('the settings sheet offers exactly the three real styles', () => {
    const src = readFileSync(join(ROOT, 'js/views/tafsirPanel.js'), 'utf8');
    const chipBlock = src.slice(
      src.indexOf('mushaf.bismillahStyle'),
      src.indexOf('mushaf-settings__bismillah-chip--active')
    );
    assert.match(chipBlock, /\['auto', 'gold', 'accent'\]/, 'three styles, no hidden');
  });
});
