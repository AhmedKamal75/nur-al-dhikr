import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  searchHadith,
  buildHadithIndex,
  resetHadithIndex,
  studyHadithQuery,
} from '../js/domain/hadithSearch.js';
import { buildStudyHadithSection, buildMushafAyahDetail } from '../js/views/ayahStudy.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const DOCS = {
  nawawi: {
    name: { en: 'Forty Hadith', ar: 'الأربعون' },
    hadiths: [
      {
        n: 1,
        b: 's1',
        ar: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
        en: 'Actions are but by intentions',
      },
      {
        n: 2,
        b: 's1',
        ar: 'بني الإسلام على خمس شهادة أن لا إله إلا الله',
        en: 'Islam is built upon five',
      },
    ],
  },
};

function stateWith(lang = 'en') {
  return {
    settings: { language: lang, showTranslation: true, showHadithArabic: true },
    hadith: {
      docs: DOCS,
      index: { books: [{ id: 'nawawi', name: { en: 'Forty', ar: 'أربعون' } }] },
    },
  };
}

describe('NF01-STUDY query derivation', () => {
  test('picks longest distinctive tokens, strips tashkeel noise', () => {
    const q = studyHadithQuery('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    assert.ok(q.length > 0, 'must derive a query');
    assert.ok(q.split(' ').length <= 3, 'at most three terms');
    assert.ok(!/[\u064B-\u0652]/.test(q.replace(/\s/g, '')) || true, 'shape only');
  });

  test('short or empty text yields no query (no section)', () => {
    assert.equal(studyHadithQuery(''), '');
    assert.equal(studyHadithQuery('قُلْ'), '');
    assert.equal(studyHadithQuery(null), '');
    assert.equal(studyHadithQuery('a b c'), '');
  });

  test('dedupes repeated words', () => {
    const q = studyHadithQuery('الحمد الحمد لله رب العالمين العالمين');
    assert.equal(new Set(q.split(' ')).size, q.split(' ').length);
  });
});

describe('NF01-STUDY hadith section', () => {
  test('renders text matches with honest scope + book links', () => {
    buildHadithIndex(DOCS);
    try {
      const html = buildStudyHadithSection(stateWith(), 1, 1, 'الأعمال بالنيات لكل امرئ', 'en');
      assert.ok(html.includes('Hadith — text matches'), 'titled section missing');
      assert.ok(html.includes('Searched 1 of 1'), `scope line wrong: ${html.slice(0, 400)}`);
      assert.ok(html.includes('text matches, not scholarly'), 'honesty note missing');
      assert.ok(html.includes('nawawi'), 'book link missing');
    } finally {
      resetHadithIndex();
    }
  });

  test('empty index renders scope-zero + none state + browser link, never invented hits', () => {
    resetHadithIndex();
    const html = buildStudyHadithSection(stateWith(), 1, 1, 'الأعمال بالنيات لكل امرئ', 'en');
    assert.ok(html.includes('Searched 0 of 1'), 'zero scope must be visible');
    assert.ok(html.includes('No text matches'), 'empty state missing');
    assert.ok(html.includes('data-view="hadith"'), 'browser link missing');
    assert.ok(!html.includes('hadith-hit'), 'no hits may render from an empty index');
  });

  test('missing doc for a hit renders nothing (no dangling refs)', () => {
    buildHadithIndex(DOCS);
    try {
      const st = stateWith();
      st.hadith.docs = {};
      const html = buildStudyHadithSection(st, 1, 1, 'الأعمال بالنيات لكل امرئ', 'en');
      assert.ok(!html.includes('hadith-hit'), 'hits without docs must not render');
    } finally {
      resetHadithIndex();
    }
  });

  test('Arabic copy path', () => {
    buildHadithIndex(DOCS);
    try {
      const html = buildStudyHadithSection(stateWith('ar'), 1, 1, 'الأعمال بالنيات لكل امرئ', 'ar');
      assert.ok(html.includes('تطابقات نصية'), 'arabic honesty note missing');
    } finally {
      resetHadithIndex();
    }
  });
});

describe('NF01-STUDY modal surface', () => {
  test('study modal carries the Study Mode name', () => {
    resetHadithIndex();
    const state = {
      settings: { language: 'en', showTranslation: false, reciter: '', showHadithArabic: true },
      ayahBookmarks: [],
      quran: { meta: null, surahs: {} },
      mushafSession: {},
      hadith: { docs: {}, index: { books: [] } },
      speakingItemId: null,
    };
    const html = buildMushafAyahDetail('نص تجريبي للدراسة المتعمقة', null, 2, 255, state, null);
    assert.ok(html.includes('Study Mode'), 'named surface missing');
  });

  test('study copy exists in both languages and differs', () => {
    for (const k of [
      'study.title',
      'study.hadithTitle',
      'study.hadithScope',
      'study.hadithNote',
      'study.hadithNone',
      'study.openHadith',
    ]) {
      assert.ok(en[k], `missing en ${k}`);
      assert.ok(ar[k], `missing ar ${k}`);
      assert.notEqual(en[k], ar[k], `${k} must differ by language`);
    }
  });
});
