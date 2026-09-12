/**
 * separation-renderers.test.js — template-level language-separation gates
 * (takeover audit A1-A4, A6, B2).
 *
 * The v5.2.31 audit pinned the contract at five renderers; the takeover
 * audit found four more leaking. This file renders every content renderer
 * through both locales with a fully bilingual fixture and asserts:
 *   AR → zero Latin-script content (transliteration, translation.en,
 *         unmapped sources, title fallbacks), Quran sources mapped.
 *   EN → full content present.
 * Plus: unknown hadith book ids render a not-found state, never the
 * network-failure copy (B2).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { collectionFor, contentTitleFor, referenceLineFor } from '../js/domain/localeContent.js';
import { cardHTML, miniCardHTML } from '../js/ui/card.js';
import { renderQuiz } from '../js/views/quiz.js';
import { renderHadith } from '../js/views/hadith.js';
import { renderEditor } from '../js/views/editor.js';

const LATIN_RE = /[A-Za-z]/;

const ITEM = {
  id: 'fix-001',
  category_id: 'cat-1',
  title: { en: '', ar: '' },
  arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  transliteration: 'Subhana Allahi wa bihamdih',
  translation: { en: 'Glory be to Allah and praise Him', ar: 'ترجمة عربية' },
  reference: {
    collection: 'Sahih al-Bukhari',
    book: '',
    chapter: '',
    hadith: '6405',
    narrator: 'Abu Hurayrah',
    grading: 'Sahih',
    notes: '',
  },
  grade: 'Sahih',
  custom_grade: { en: '', ar: '' },
  repetitions: 3,
  virtues: { en: 'English virtue text', ar: 'فضل عربي' },
  audio: null,
  image: null,
  tags: [],
  related: [],
  notes: '',
  order: 1,
};
const CATEGORY = { id: 'cat-1', name: { en: 'Morning', ar: 'الصباح' }, color: 'slate' };

describe('separation: contentTitleFor never leaks Latin into AR', () => {
  test('empty title falls back to Arabic in AR, transliteration in EN', () => {
    assert.equal(contentTitleFor(ITEM, 'ar'), ITEM.arabic);
    assert.equal(contentTitleFor(ITEM, 'en'), ITEM.transliteration);
  });
  test('localized title wins on both sides', () => {
    const it = { ...ITEM, title: { en: 'Morning dhikr', ar: 'ذكر الصباح' } };
    assert.equal(contentTitleFor(it, 'ar'), 'ذكر الصباح');
    assert.equal(contentTitleFor(it, 'en'), 'Morning dhikr');
  });
});

describe('separation: miniCardHTML (A3)', () => {
  test('AR mini-card has no Latin title fallback', () => {
    const html = miniCardHTML(ITEM, 'ar');
    assert.ok(!html.includes('Subhana Allahi'), 'no transliteration fallback in AR mini-card');
    assert.ok(html.includes(ITEM.arabic.slice(0, 10)));
  });
  test('EN mini-card keeps the transliteration title', () => {
    assert.ok(miniCardHTML(ITEM, 'en').includes('Subhana Allahi'));
  });
});

describe('separation: quiz (A1, A2)', () => {
  function quizState(lang, revealed) {
    const item = {
      ...ITEM,
      translation: { en: 'The All-Forgiving', ar: 'الغفور' },
      virtues: { en: 'EN virtue', ar: 'فضل عربي' },
    };
    return {
      settings: { language: lang },
      quizStats: { bestScore: 0, totalAttempts: 0 },
      library: { itemIndex: { 'fix-001': { item } } },
      quiz: {
        deck: [{ itemId: 'fix-001', choices: ['fix-001'] }],
        index: 0,
        revealed,
        selectedId: revealed ? 'fix-001' : null,
        correctCount: 0,
        finished: false,
      },
    };
  }
  test('AR feedback never prints the Latin transliteration', () => {
    const html = renderQuiz(quizState('ar', true));
    assert.ok(!html.includes('Subhana Allahi'), 'transliteration suppressed in AR feedback');
    assert.ok(html.includes('فضل عربي'));
  });
  test('EN feedback keeps the transliteration reinforcement', () => {
    const html = renderQuiz(quizState('en', true));
    assert.ok(html.includes('Subhana Allahi'));
  });
  test('AR choices use strict pick (no cross-language fallback)', () => {
    // Item with EN-only translation: AR must render an empty label, never EN.
    const st = quizState('ar', false);
    st.library.itemIndex['fix-001'].item.translation = { en: 'Only English', ar: '' };
    const html = renderQuiz(st);
    assert.ok(!html.includes('Only English'), 'no EN fallback into AR choices');
  });
});

describe('separation: Quran article prefix (A6)', () => {
  test('"The Qur\'an" maps like "Quran"', () => {
    assert.equal(collectionFor({ reference: { collection: "The Qur'an" } }, 'ar'), 'القرآن الكريم');
    assert.equal(
      collectionFor({ reference: { collection: "The Qur'an 2:201" } }, 'ar'),
      'القرآن الكريم 2:201'
    );
  });
  test('referenceLineFor joins through the choke point', () => {
    assert.equal(referenceLineFor(ITEM, 'ar', 'رواه').includes('صحيح البخاري'), true);
    assert.ok(
      !LATIN_RE.test(referenceLineFor({ reference: { collection: "The Qur'an 2:201" } }, 'ar'))
    );
  });
  test('reference_ar wins over the mapper', () => {
    const it = {
      reference: {
        collection: 'Some Unmapped Source',
        reference_ar: { collection: 'مصدر عربي حقيقي' },
      },
    };
    assert.equal(collectionFor(it, 'ar'), 'مصدر عربي حقيقي');
  });
});

describe('separation: cardHTML AR output has no Latin content', () => {
  test('AR card hides translit/translation/EN virtue', () => {
    const html = cardHTML(ITEM, CATEGORY, { lang: 'ar' });
    assert.ok(!html.includes('Subhana Allahi'));
    assert.ok(!html.includes('Glory be to Allah'));
    assert.ok(!html.includes('English virtue text'));
    assert.ok(html.includes('فضل عربي'));
    assert.ok(html.includes('صحيح البخاري'));
  });
});

describe('separation: editor rows (A4)', () => {
  test('AR editor row falls back to Arabic, never transliteration', () => {
    const state = {
      settings: { language: 'ar' },
      customContent: {
        lib1: {
          metadata: { id: 'lib1', name: { en: 'L', ar: 'مكتبة' } },
          categories: [
            {
              id: 'c1',
              name: { en: 'C', ar: 'قسم' },
              items: [{ ...ITEM, title: { en: '', ar: '' } }],
            },
          ],
        },
      },
    };
    const html = renderEditor(state);
    assert.ok(!html.includes('Subhana Allahi'), 'no transliteration fallback in AR editor rows');
  });
});

describe('hadith: unknown book id is not a network failure (B2)', () => {
  function hadithState(bookId, withIndex) {
    return {
      settings: { language: 'en', showTranslation: true, showHadithArabic: true },
      activeParams: { id: bookId },
      activeView: 'hadith',
      ui: {},
      hadith: {
        index: withIndex
          ? {
              books: [
                {
                  id: 'bukhari',
                  name: { en: 'Bukhari', ar: 'البخاري' },
                  count: 1,
                  sectionCount: 1,
                },
              ],
            }
          : null,
        docs: {},
        errors: { nosuchbook: true },
        bookView: { query: '', section: 'all', page: 1 },
      },
      hadithBookmarks: [],
      hadithNotes: {},
      hadithMemRecords: {},
    };
  }
  test('unknown id with a loaded catalog renders the not-found state', () => {
    const html = renderHadith(hadithState('nosuchbook', true));
    assert.ok(html.includes('No such book'), 'unknown-book copy');
    assert.ok(!html.includes('check your connection'), 'not the network-failure copy');
  });
  test('known id still renders the retry state on failure', () => {
    const st = hadithState('bukhari', true);
    st.hadith.errors = { bukhari: true };
    const html = renderHadith(st);
    assert.ok(html.includes('check your connection'));
  });
});
