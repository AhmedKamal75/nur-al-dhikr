/**
 * tests/hadithDeepLink.test.js — honest not-found states for hadith deep
 * links (audit rank 8, completed v5.2.69):
 *  1. an unknown book id says so (v5.2.32, pinned against regression);
 *  2. a followed ?n= whose number exists in no hadith of the book says so
 *     with the number (EN + AR);
 *  3. a valid ?n= highlights silently; an unconsumed ?n= stays silent.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { renderHadith } from '../js/views/hadith.js';
import { initialState } from '../js/core/state/initial.js';

const DOC = {
  name: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
  sections: [{ id: 's1', name: { en: 'Faith', ar: 'الإيمان' } }],
  hadiths: [
    { n: 1, b: 's1', ar: 'حَدِيث', en: 'A hadith.' },
    { n: 2, b: 's1', ar: 'حَدِيث', en: 'Another hadith.' },
  ],
};

function bookState(lang, params, view = {}) {
  const base = initialState();
  return {
    ...base,
    settings: { ...base.settings, language: lang },
    activeParams: params,
    hadith: {
      ...base.hadith,
      index: { books: [{ id: 'bukhari', name: DOC.name }] },
      docs: { bukhari: DOC },
      bookView: { query: '', section: 'all', page: 1, ...view },
    },
    hadithBookmarks: [],
    hadithNotes: {},
    hadithMemRecords: {},
    ui: { contentManage: false },
  };
}

describe('hadith deep-link not-found states', () => {
  test('unknown book id names the problem (both languages)', () => {
    const en = renderHadith(bookState('en', { id: 'nope' }));
    assert.ok(en.includes('No such book in this library'), 'EN unknown-book notice');
    const ar = renderHadith(bookState('ar', { id: 'nope' }));
    assert.ok(ar.includes('لا يوجد كتاب'), 'AR unknown-book notice');
  });

  test('followed ?n= with no such hadith names the number (both languages)', () => {
    const en = renderHadith(bookState('en', { id: 'bukhari', n: '999' }, { consumedN: '999' }));
    assert.ok(en.includes('No hadith #999 in this book'), 'EN unknown-number notice');
    assert.ok(en.includes('role="status"'), 'announced to assistive tech');
    const ar = renderHadith(bookState('ar', { id: 'bukhari', n: '999' }, { consumedN: '999' }));
    assert.ok(ar.includes('برقم 999'), 'AR unknown-number notice');
  });

  test('valid and unconsumed ?n= stay silent', () => {
    const hit = renderHadith(bookState('en', { id: 'bukhari', n: '1' }, { consumedN: '1' }));
    assert.ok(!hit.includes('unknownNumber') && !hit.includes('No hadith #'), 'hit: no notice');
    const stale = renderHadith(bookState('en', { id: 'bukhari', n: '999' }, { consumedN: null }));
    assert.ok(!stale.includes('No hadith #'), 'unconsumed: no notice');
  });
});
