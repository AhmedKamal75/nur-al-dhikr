/**
 * tests/lastPosition.test.js — merged-plan item 2: the unified
 * last-position service.
 *
 * Seven slots, one honest record (js/domain/lastPosition.js): Qur'an +
 * Mushaf bookmarks (pre-existing), adhkar set (HISTORY_PUSH), tasbih
 * phrase (TASBIH_SET_ACTIVE), hadith book+number (navigation / explicit
 * stamp), tajweed lesson + rule (course + practice). Absence is always
 * null — never a guess. Home renders resume rows (words+numbers, zero
 * pressure copy) or the honest "no previous place" line.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { actions } from '../js/core/state/actions.js';
import {
  LAST_POSITION_SLOTS,
  defaultLastPosition,
  hasAnyLastPosition,
  readLastPositions,
  sanitizeLastPosition,
} from '../js/domain/lastPosition.js';
import { persistedSnapshot, sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { buildBackupPayload, parseBackup } from '../js/services/backup.js';
import { resumePanelHTML } from '../js/views/home.js';
import { resetSessionFlagsForTests } from '../js/domain/sessionFlags.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

function fresh() {
  resetSessionFlagsForTests();
  return initialState();
}

describe('lastPosition service: honest-empty when nothing lived', () => {
  test('fresh state reads null in all 7 slots', () => {
    assert.deepEqual(
      Object.keys(readLastPositions(fresh())).sort(),
      [...LAST_POSITION_SLOTS].sort()
    );
    assert.deepEqual(readLastPositions(fresh()), {
      quran: null,
      mushaf: null,
      adhkar: null,
      tasbih: null,
      hadith: null,
      tajweedLesson: null,
      tajweedRule: null,
    });
    assert.equal(hasAnyLastPosition(fresh()), false);
  });

  test('default + sanitize agree on the empty shape', () => {
    assert.deepEqual(defaultLastPosition(), sanitizeLastPosition(undefined));
    assert.deepEqual(defaultLastPosition(), sanitizeLastPosition(null));
    assert.deepEqual(defaultLastPosition(), sanitizeLastPosition('junk'));
  });
});

describe('lastPosition service: each slot stamps through its own write path', () => {
  test('quran bookmark stamps the quran slot', () => {
    let s = reduce(fresh(), actions.setQuranBookmark('2'));
    assert.deepEqual(readLastPositions(s).quran, { surah: '2', ts: s.quranBookmark.ts });
    assert.equal(hasAnyLastPosition(s), true);
  });

  test('mushaf bookmark stamps the mushaf slot', () => {
    let s = reduce(fresh(), actions.setMushafBookmark(10));
    assert.equal(readLastPositions(s).mushaf.page, 10);
  });

  test('history push stamps the adhkar set (category+item)', () => {
    let s = reduce(fresh(), actions.pushHistory('morning-1', 'morning'));
    assert.deepEqual(readLastPositions(s).adhkar, {
      categoryId: 'morning',
      itemId: 'morning-1',
      ts: s.history[0].ts,
    });
  });

  test('tasbih select stamps the tasbih phrase', () => {
    let s = reduce(fresh(), actions.setTasbihActive('alhamdulillah'));
    assert.equal(readLastPositions(s).tasbih.phraseId, 'alhamdulillah');
  });

  test('hadith navigation stamps book+number', () => {
    let s = reduce(fresh(), actions.navigate('hadith', { id: 'bukhari', n: '7' }));
    assert.deepEqual(readLastPositions(s).hadith, {
      bookId: 'bukhari',
      n: 7,
      ts: s.lastPosition.hadith.ts,
    });
  });

  test('hadith explicit stamp works without navigation', () => {
    let s = reduce(fresh(), actions.setHadithLast('muslim', 12));
    assert.equal(readLastPositions(s).hadith.bookId, 'muslim');
    assert.equal(readLastPositions(s).hadith.n, 12);
  });

  test('tajweed lesson stamps on explicit set', () => {
    let s = reduce(fresh(), actions.setTajweedLast({ sessionId: 'madd-natural' }));
    assert.equal(readLastPositions(s).tajweedLesson.sessionId, 'madd-natural');
    assert.equal(readLastPositions(s).tajweedRule, null);
  });

  test('tajweed rule stamps on practice results', () => {
    let s = reduce(fresh(), actions.recordTajweedPracticeResult('ghunnah', false));
    assert.equal(readLastPositions(s).tajweedRule.ruleId, 'ghunnah');
    assert.equal(readLastPositions(s).tajweedLesson, null);
  });
});

describe('lastPosition service: hostile shapes degrade to absence', () => {
  test('junk bookmarks never become positions', () => {
    let s = reduce(fresh(), actions.setQuranBookmark('999'));
    assert.equal(readLastPositions(s).quran, null);
    s = reduce(fresh(), actions.setMushafBookmark(99999));
    assert.equal(readLastPositions(s).mushaf, null);
  });

  test('hostile stamps no-op instead of poisoning', () => {
    let s = reduce(fresh(), actions.setHadithLast('__proto__', 1));
    assert.equal(readLastPositions(s).hadith, null);
    s = reduce(s, actions.setTajweedLast({ sessionId: '<img src=x>', ruleId: '__proto__' }));
    assert.equal(readLastPositions(s).tajweedLesson, null);
    assert.equal(readLastPositions(s).tajweedRule, null);
    assert.equal(s.lastPosition.tajweedLesson, null);
  });

  test('sanitize drops hostile backup shapes, keeps the honest ones', () => {
    const clean = sanitizeLastPosition({
      adhkar: { categoryId: 'morning', itemId: 'morning-1', ts: 1720000000000 },
      tasbih: { phraseId: '__proto__', ts: 1 },
      hadith: { bookId: 'bukhari', n: 'seven' },
      tajweedLesson: { sessionId: 'madd-natural', ts: 1720000000000 },
      tajweedRule: { ruleId: 'ghunnah', ts: 'junk' },
    });
    assert.deepEqual(clean.adhkar, {
      categoryId: 'morning',
      itemId: 'morning-1',
      ts: 1720000000000,
    });
    assert.equal(clean.tasbih, null);
    assert.equal(clean.hadith, null);
    assert.equal(clean.tajweedLesson.sessionId, 'madd-natural');
    assert.deepEqual(clean.tajweedRule, { ruleId: 'ghunnah', ts: null });
  });
});

describe('lastPosition service: backup round-trip keeps all 7 slots', () => {
  test('persisted snapshot → file → parse → restore reads back identical slots', () => {
    let s = fresh();
    s = reduce(s, actions.setQuranBookmark('36'));
    s = reduce(s, actions.setMushafBookmark(301));
    s = reduce(s, actions.pushHistory('evening-3', 'evening'));
    s = reduce(s, actions.setTasbihActive('astaghfirullah'));
    s = reduce(s, actions.setHadithLast('bukhari', 42));
    s = reduce(s, actions.setTajweedLast({ sessionId: 'ikhfa', ruleId: 'ikhfa' }));
    const before = readLastPositions(s);
    assert.equal(hasAnyLastPosition(s), true);

    const text = JSON.stringify(buildBackupPayload(persistedSnapshot(s)));
    const parsed = parseBackup(text);
    assert.equal(parsed.success, true);
    const restored = sanitizeRestoredPayload(parsed.value);
    assert.deepEqual(readLastPositions(restored), before);
  });
});

describe('resume cards on home: words+numbers, never pressure', () => {
  const BANNED = ['streak', 'shame', 'guilt', 'behind', 'catch up', 'lazy', 'punish'];

  function stateWith({ lang = 'en' } = {}) {
    const s = fresh();
    s.settings = { ...s.settings, language: lang };
    return s;
  }

  test('honest absence in both languages: no place, al-Fatihah offered, nothing faked', () => {
    for (const lang of ['en', 'ar']) {
      const html = resumePanelHTML(stateWith({ lang }));
      const dict = lang === 'en' ? en : ar;
      assert.ok(html.includes(dict['home.resumeTitle']), `${lang}: title`);
      assert.ok(html.includes(dict['home.resumeEmpty']), `${lang}: honest absence`);
      assert.ok(html.includes('#/quran'), `${lang}: links somewhere real`);
      assert.ok(!html.includes('panel--quran-continue'), `${lang}: no faked continue card`);
      for (const word of BANNED) assert.ok(!html.toLowerCase().includes(word), `${lang}: ${word}`);
    }
  });

  test('quran one-shot card keeps its legacy shape', () => {
    let s = stateWith();
    s = reduce(s, actions.setQuranBookmark('2'));
    const html = resumePanelHTML(s);
    assert.ok(html.includes('panel--quran-continue'), 'legacy card class');
    assert.ok(html.includes('data-action="mushaf-open-at-surah"'), 'legacy action');
    assert.ok(html.includes(en['quran.continueReading']), 'legacy label');
    assert.match(html, /Surah.*2|2.*Surah/, 'surah number shown');
  });

  test('every lived slot renders words (labels) + numbers (positions)', () => {
    let s = stateWith();
    s = reduce(s, actions.setMushafBookmark(77));
    s = reduce(s, actions.pushHistory('morning-1', 'morning'));
    s = reduce(s, actions.setTasbihActive('alhamdulillah'));
    s = reduce(s, actions.setHadithLast('bukhari', 7));
    s = reduce(s, actions.setTajweedLast({ sessionId: 'madd-natural', ruleId: 'ghunnah' }));
    const html = resumePanelHTML(s);
    for (const key of [
      'home.resumeTitle',
      'home.resume.mushaf',
      'home.resume.adhkar',
      'home.resume.tasbih',
      'home.resume.hadith',
      'home.resume.tajweed',
      'home.resume.lesson',
      'home.resume.rule',
    ]) {
      assert.ok(html.includes(en[key]), `label ${key}`);
    }
    for (const num of ['77', 'morning', 'bukhari', '7', 'madd-natural', 'ghunnah']) {
      assert.ok(html.includes(num), `position ${num}`);
    }
    for (const word of BANNED) assert.ok(!html.toLowerCase().includes(word), `banned: ${word}`);
  });

  test('only pre-existing actions are emitted (no dead UI)', () => {
    let s = stateWith();
    s = reduce(s, actions.setQuranBookmark('2'));
    s = reduce(s, actions.setMushafBookmark(3));
    s = reduce(s, actions.setHadithLast('bukhari', 1));
    const emitted = new Set(
      [...resumePanelHTML(s).matchAll(/data-action="([^"]+)"/g)].map((m) => m[1])
    );
    assert.ok(emitted.size > 0, 'the panel emits actions');
    for (const a of emitted) {
      assert.ok(a === 'navigate' || a === 'mushaf-open-at-surah', `unexpected data-action ${a}`);
    }
  });
});
