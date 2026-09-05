/**
 * tests/kids.test.js — Kids mode: star awards + restore boundary, the
 * engine's natural-finish flag, and the Kids home render.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/core/state/reducer.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { sanitizeSettings } from '../js/core/config.js';
import { dateKey } from '../js/core/utils.js';

describe('KIDS_AWARD_STAR', () => {
  test('accumulates total + today', () => {
    let s = { ...initialState(), kidsStars: { total: 0, days: {} } };
    s = reduce(s, actions.awardKidsStar());
    s = reduce(s, actions.awardKidsStar());
    const key = dateKey(new Date());
    assert.equal(s.kidsStars.total, 2);
    assert.equal(s.kidsStars.days[key], 2);
    assert.ok(PERSISTED_KEYS.includes('kidsStars'));
  });

  test('restore keeps sane counts only', () => {
    const out = sanitizeRestoredPayload({
      kidsStars: { total: 'x', days: { '2026-09-05': 3, nope: 9, '2026-13-99': 2 } },
    });
    assert.deepEqual(out.kidsStars, { total: 0, days: { '2026-09-05': 3 } });
    const out2 = sanitizeRestoredPayload({ kidsStars: null });
    assert.deepEqual(out2.kidsStars, { total: 0, days: {} });
  });

  test('kidsMode sanitizes to boolean', () => {
    assert.equal(sanitizeSettings({ kidsMode: true }).kidsMode, true);
    assert.equal(sanitizeSettings({ kidsMode: 'yes' }).kidsMode, false);
  });
});

describe('natural-finish flag', () => {
  test('only true play-throughs set it; manual stops never do', async () => {
    const engine = await import('../js/services/surahPlayback.js');
    const { configureDriver } = await import('../js/services/recitation.js');
    const played = [];
    let endedCb = null;
    configureDriver({
      play: (url, key) => played.push(key),
      stop: () => {},
      onEnded: (cb) => {
        endedCb = cb;
      },
      onError: () => {},
    });
    const SURAHS = [{ number: 114, ayahCount: 2 }];
    engine.start({ surah: 114, total: 2, reciterId: 'x', surahsMeta: SURAHS });
    assert.equal(engine.consumeLastFinish(), null, 'start clears');
    endedCb('114:1');
    endedCb('114:2'); // natural end
    assert.equal(engine.consumeLastFinish(), 114, 'play-through flagged');
    assert.equal(engine.consumeLastFinish(), null, 'single-read');
    engine.start({ surah: 114, total: 2, reciterId: 'x', surahsMeta: SURAHS });
    engine.stop(); // manual stop
    assert.equal(engine.consumeLastFinish(), null, 'manual stop sets nothing');
    configureDriver(null);
  });
});

describe('Kids home render', () => {
  test('tiles for every kids surah, escaped names, star counts', async () => {
    const { renderKids, KIDS_SURAHS } = await import('../js/views/kids.js');
    assert.ok(KIDS_SURAHS.includes(1) && KIDS_SURAHS.includes(114));
    assert.equal(KIDS_SURAHS.length, 23);
    const state = {
      ...initialState(),
      settings: { ...initialState().settings, language: 'en' },
      quran: {
        meta: {
          surahs: KIDS_SURAHS.map((n) => ({
            number: n,
            nameAr: 'سورة',
            nameTransliteration: 'Name',
          })),
        },
        surahs: {},
      },
      surahPlayback: { active: true, surah: 112, ayah: 1, total: 6 },
      kidsStars: { total: 5, days: {} },
    };
    const html = renderKids(state);
    assert.ok(html.includes('data-surah="112"'), 'tiles carry play actions');
    assert.ok(html.includes('kids-tile--playing'), 'reciting tile marked');
    assert.ok(html.includes('>5<'), 'star total shown');
    assert.ok(html.includes('data-action="kids-exit-hold"'), 'hold-to-exit present');
    assert.ok(!html.includes('<script'), 'no markup smuggling');
  });
});
