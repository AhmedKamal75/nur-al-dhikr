import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRoots } from '../js/views/roots.js';
import { buildStudyHadithSection } from '../js/views/ayahStudy.js';
import { buildHadithIndex, resetHadithIndex, studyHadithQuery } from '../js/domain/hadithSearch.js';
import { resetMutashabihatCache } from '../js/domain/mutashabihat.js';
const text = 'الأعمال بالنيات وإنما لكل امرئ ما نوى دائما';
for (const lang of ['en', 'ar'])
  test(`root and hadith continuations retain exact scope (${lang})`, () => {
    const surahs = { 1: { ayahs: Array.from({ length: 8 }, (_, i) => ({ number: i + 1, text })) } };
    const state = {
      settings: { language: lang },
      activeParams: { id: 'رحم', tab: 'confusables' },
      quran: { surahs },
      quranRoots: {
        رحم: {
          count: 8,
          occ: Array.from({ length: 8 }, (_, i) => ({ s: 1, a: i + 1, i: 1, t: 'ألف' })),
        },
      },
      quranWords: {},
      hadith: {
        index: { books: [{ id: 'test' }] },
        docs: {
          test: {
            sections: [],
            hadiths: Array.from({ length: 17 }, (_, i) => ({ n: i + 1, ar: text, en: 'test' })),
          },
        },
      },
    };
    resetMutashabihatCache();
    const first = renderRoots(state);
    assert.equal((first.match(/class="root-confusable"/g) || []).length, 12);
    assert.ok(first.includes('28'));
    const last = renderRoots({ ...state, activeParams: { ...state.activeParams, page: '99' } });
    assert.equal((last.match(/class="root-confusable"/g) || []).length, 4);
    assert.match(last, /data-page="4" disabled/);
    buildHadithIndex(state.hadith.docs);
    const section = buildStudyHadithSection(state, 1, 1, text, lang);
    assert.match(section, /data-study-hadith-all/);
    assert.ok(section.includes('17'));
    assert.ok(section.includes(`data-q="${studyHadithQuery(text)}"`));
    assert.equal((section.match(/<article class="hadith-card/g) || []).length, 5);
    resetHadithIndex();
    resetMutashabihatCache();
  });
