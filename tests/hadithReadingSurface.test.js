import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hadithCardHTML } from '../js/views/hadithCard.js';
import { renderHadith } from '../js/views/hadith.js';
import { validateHadithIndex, validateHadithDoc } from '../js/services/hadith.js';

const BOOKS = [
  {
    id: 'nawawi',
    name: { en: 'Forty Hadith of an-Nawawi', ar: 'الأربعون النووية' },
    author: { en: 'Imam an-Nawawi', ar: 'الإمام النووي' },
    blurb: { en: 'Foundational hadith.', ar: 'أحاديث جامعة.' },
    count: 1,
    sectionCount: 1,
    bundled: true,
    order: 1,
  },
];

const DOC = validateHadithDoc({
  id: 'nawawi',
  name: BOOKS[0].name,
  author: BOOKS[0].author,
  blurb: BOOKS[0].blurb,
  sections: [{ id: '1', name: 'Faith', count: 1 }],
  hadiths: [
    {
      n: 1,
      b: '1',
      ar: 'قال أبو هريرة رضي الله عنه',
      en: 'Narrated Abu Hurairah: The Messenger said: Do good.',
      grade: 'sahih',
    },
  ],
});

function readerState(lang = 'en') {
  return {
    settings: { language: lang, showTranslation: true, showHadithArabic: true },
    hadith: {
      index: validateHadithIndex({ books: BOOKS }),
      docs: { nawawi: DOC },
      errors: {},
      bookView: { query: '', section: 'all', page: 1 },
    },
    activeParams: { id: 'nawawi' },
    hadithBookmarks: [],
    hadithNotes: {},
    hadithMemRecords: {},
    ui: {},
  };
}

describe('Hadith reading-first disclosure', () => {
  test('card hides metadata until Details is opened', () => {
    const html = hadithCardHTML(DOC.hadiths[0], {
      lang: 'en',
      bookName: 'Forty Hadith of an-Nawawi',
      sectionName: 'Faith',
      sectionId: '1',
      showTranslation: true,
      showArabic: true,
    });

    assert.equal((html.match(/hadith-card__details/g) || []).length, 1);
    assert.ok(html.includes('Details'));
    assert.ok(html.includes('Faith'));
    assert.ok(html.includes('Reference'));
    assert.ok(html.includes('Forty Hadith of an-Nawawi · #1'));
    assert.ok(html.includes('Abu Hurairah'));
    assert.doesNotMatch(html, /class="hadith-card__narrator"/);
  });

  test('book details carry source context while reader header stays compact', () => {
    const html = renderHadith(readerState('en'));
    assert.ok(html.includes('About this book'));
    assert.ok(html.includes('Imam an-Nawawi'));
    assert.ok(html.includes('Source'));
    assert.ok(html.includes('Forty Hadith of an-Nawawi'));
    assert.doesNotMatch(html, /<p class="view__meta">Foundational hadith\.<\/p>/);
  });

  test('chapter navigation is progressively disclosed instead of a permanent chip wall', () => {
    const html = renderHadith(readerState('en'));
    assert.ok(html.includes('class="hadith-contents"'));
    assert.ok(html.includes('Contents'));
    assert.equal(
      (html.match(/class="hadith-contents__row/g) || []).length,
      3,
      'fixture has all-chapters + bookmarked + one chapter row'
    );
    assert.doesNotMatch(html, /class="chip-row chip-row--scroll"/);
  });

  test('Arabic disclosure labels are complete', () => {
    const html = renderHadith(readerState('ar'));
    assert.ok(html.includes('التفاصيل'));
    assert.ok(html.includes('عن هذا الكتاب'));
    assert.ok(html.includes('المؤلف'));
    assert.ok(html.includes('المرجع'));
    assert.doesNotMatch(html, /undefined/);
  });
});
