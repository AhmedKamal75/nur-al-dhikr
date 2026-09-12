/**
 * palette.test.js — command-palette providers (pure, store-free).
 *
 * Pins the Spotlight-style overlay logic: literal-match highlighting,
 * provider grouping/caps, surah names in every script, translation-aware
 * library hits, and empty-query suggestions. Runtime wiring (modal,
 * shortcut, live updates) is deliberately thin glue over these.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildPaletteGroups, paletteRowCount } from '../js/views/palette.js';
import { highlightMatch } from '../js/core/utils.js';
import { searchSurahs, buildIndex, search } from '../js/domain/search.js';

describe('highlightMatch: literal <mark> decoration only', () => {
  test('wraps case-insensitive matches, escapes HTML first', () => {
    assert.equal(highlightMatch('Al-Baqarah', ['baq']), 'Al-<mark>Baq</mark>arah');
    assert.equal(highlightMatch('<b>x</b>', ['x']), '&lt;b&gt;<mark>x</mark>&lt;/b&gt;');
    assert.equal(highlightMatch('الفاتحة', ['فات']), 'ال<mark>فات</mark>حة');
    assert.equal(highlightMatch('nothing here', ['zzz']), 'nothing here');
    assert.equal(highlightMatch('abc', []), 'abc');
  });
});

describe('searchSurahs: names in every script + number', () => {
  const surahs = [
    { number: 1, nameEn: 'Al-Fatiha', nameTransliteration: 'Al-Fātiḥah', nameAr: 'الفاتحة' },
    { number: 2, nameEn: 'Al-Baqarah', nameTransliteration: 'Al-Baqarah', nameAr: 'البقرة' },
    { number: 36, nameEn: 'Ya-Sin', nameTransliteration: 'Yā-Sīn', nameAr: 'يس' },
  ];
  test('matches transliteration, Arabic, and number; ranks number first', () => {
    assert.deepEqual(
      searchSurahs(surahs, 'fatiha').map((s) => s.number),
      [1]
    );
    assert.deepEqual(
      searchSurahs(surahs, 'بقره').map((s) => s.number),
      [2]
    );
    assert.deepEqual(
      searchSurahs(surahs, '2').map((s) => s.number),
      [2]
    );
    assert.deepEqual(
      searchSurahs(surahs, '').map((s) => s.number),
      [1, 2, 36]
    );
    assert.deepEqual(searchSurahs(surahs, 'zzz'), []);
    assert.deepEqual(searchSurahs(null, 'x'), []);
  });
});

describe('global index: Arabic virtues + reference fields are searchable', () => {
  test('virtues.ar, narrator, and grading join the haystack', () => {
    buildIndex({
      'it-1': {
        item: {
          id: 'it-1',
          category_id: 'c1',
          title: { en: 'Morning', ar: 'الصباح' },
          arabic: 'سُبْحَانَ اللَّهِ',
          transliteration: 'Subhan Allah',
          translation: { en: 'Glory', ar: '' },
          virtues: { en: 'English virtue', ar: 'فضل الصباح العظيم' },
          reference: {
            collection: 'Sahih Muslim',
            narrator: 'Abu Hurayrah',
            grading: 'Sahih',
            hadith: '591',
          },
          tags: [],
        },
        category: { name: { en: 'Morning', ar: 'الصباح' } },
        document: { metadata: { name: { en: 'Adhkar', ar: 'الأذكار' } } },
      },
    });
    assert.ok(
      search('العظيم', { limit: 10 }).some((r) => r.itemId === 'it-1'),
      'virtues.ar hit'
    );
    assert.ok(
      search('hurayrah', { limit: 10 }).some((r) => r.itemId === 'it-1'),
      'narrator hit'
    );
    assert.ok(
      search('sahih', { limit: 10 }).some((r) => r.itemId === 'it-1'),
      'grading hit'
    );
  });
});

describe('buildPaletteGroups: providers and caps', () => {
  const item = {
    id: 'it-1',
    category_id: 'c1',
    title: { en: 'Morning Dhikr', ar: 'ذكر الصباح' },
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: '',
    translation: { en: '', ar: '' },
    virtues: { en: '', ar: '' },
    reference: {},
    tags: [],
  };
  const deps = (over = {}) => ({
    query: 'morning',
    lang: 'en',
    libraryHits: [
      { itemId: 'it-1', item, category: { name: { en: 'Morning', ar: 'الصباح' } }, score: 5 },
    ],
    surahs: [
      { number: 1, nameEn: 'Al-Fatiha', nameTransliteration: 'Al-Fātiḥah', nameAr: 'الفاتحة' },
    ],
    ayahIndex: {
      hits: [{ s: 1, a: 2, text: 'All praise is due to Allah', ref: 'Al-Fatiha · 1:2' }],
    },
    reciters: [
      { id: 'mp3-1', nameEn: 'Morning Reciter', nameAr: 'قارئ', rewaya: '', server: 'https://x/' },
    ],
    books: [{ id: 'bukhari', name: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' } }],
    history: ['mercy'],
    ...over,
  });

  test('non-empty query yields capped provider groups, no history', () => {
    const { groups } = buildPaletteGroups(deps());
    const keys = groups.map((g) => g.key);
    assert.ok(!keys.includes('navigate'), 'no destination matches "morning"');
    assert.ok(keys.includes('library'), 'library group');
    assert.ok(keys.includes('ayah'), 'ayah group');
    assert.ok(keys.includes('reciter'), 'reciter group');
    assert.ok(!keys.includes('history'), 'no history on typed query');
    const lib = groups.find((g) => g.key === 'library');
    assert.ok(lib.rows.length <= 6);
    assert.equal(lib.rows[0].action, 'open-focus');
    assert.equal(lib.rows[0].data.itemId, 'it-1');
    const rec = groups.find((g) => g.key === 'reciter');
    assert.equal(rec.rows[0].action, 'audio-pick-moshaf');
    assert.ok(paletteRowCount(groups) > 0);
  });

  test('destination labels match in either language', () => {
    const { groups } = buildPaletteGroups(
      deps({
        query: 'quran',
        libraryHits: [],
        ayahIndex: null,
        reciters: [],
        surahs: [],
        books: [],
      })
    );
    const nav = groups.find((g) => g.key === 'navigate');
    assert.ok(nav && nav.rows.length >= 1, 'Quran destination found');
    assert.equal(nav.rows[0].action, 'navigate');
  });

  test('surah provider matches names and numbers', () => {
    const { groups } = buildPaletteGroups(
      deps({ query: 'fatiha', libraryHits: [], ayahIndex: null, reciters: [], books: [] })
    );
    const surah = groups.find((g) => g.key === 'surah');
    assert.ok(surah && surah.rows.length === 1);
    assert.ok(surah.rows[0].href.includes('quran'));
  });

  test('empty query shows navigation + history + actions only', () => {
    const { groups } = buildPaletteGroups(deps({ query: '' }));
    const keys = groups.map((g) => g.key);
    assert.deepEqual(keys, ['navigate', 'history', 'action']);
    const hist = groups.find((g) => g.key === 'history');
    assert.equal(hist.rows[0].action, 'run-search');
    assert.equal(hist.rows[0].data.query, 'mercy');
  });

  test('hadith books filter by name in either language', () => {
    const { groups } = buildPaletteGroups(
      deps({ query: 'بخاري', libraryHits: [], ayahIndex: null, reciters: [], surahs: [] })
    );
    const book = groups.find((g) => g.key === 'book');
    assert.ok(book && book.rows[0].id === undefined);
    assert.ok(book.rows[0].href.includes('bukhari'));
  });
});

describe('highlight in every result template', () => {
  const item = {
    id: 'hl-1',
    category_id: 'c1',
    title: { en: 'Morning Light', ar: '' },
    arabic: 'نُورُ الصَّبَاح',
    transliteration: 'Noor as-sabah',
    translation: { en: 'Morning light', ar: '' },
    virtues: { en: 'Light virtue', ar: '' },
    reference: {},
    grade: 'Unknown',
    repetitions: 1,
    tags: [],
  };
  const cat = { id: 'c1', name: { en: 'Morning', ar: 'الصباح' }, color: 'slate' };

  test('cardHTML marks title/translation/virtue, escapes the rest', async () => {
    const { cardHTML } = await import('../js/ui/card.js');
    const html = cardHTML(item, cat, { lang: 'en', highlight: ['light'] });
    assert.ok(html.includes('<mark>Light</mark>'), 'title marked');
    assert.ok(html.includes('<mark>light</mark>'), 'translation/virtue marked');
    const plain = cardHTML(item, cat, { lang: 'en' });
    assert.ok(!plain.includes('<mark>'));
  });

  test('hadithCardHTML marks Arabic and English text', async () => {
    const { hadithCardHTML } = await import('../js/views/hadithCard.js');
    const h = {
      n: 1,
      b: '1',
      ar: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
      en: 'Actions are but by intentions',
    };
    const html = hadithCardHTML(h, { lang: 'en', highlight: ['intentions'] });
    assert.ok(html.includes('<mark>intentions</mark>'));
    // Literal-only by design: diacritic-split words do not mark (no invented highlights).
    const ar = hadithCardHTML(h, { lang: 'en', highlight: ['إِنَّمَا'] });
    assert.ok(ar.includes('<mark>'));
  });

  test('audio reciter rows mark the query', async () => {
    const { renderAudio } = await import('../js/views/audioManager.js');
    const state = {
      settings: {
        language: 'en',
        reciter: 'ar.alafasy',
        customReciters: [
          {
            id: 'c-hl',
            nameEn: 'Morning Reciter',
            nameAr: 'قارئ',
            server: 'https://x/',
            rewaya: '',
            source: 'custom',
          },
        ],
        audio: { moshafId: null },
      },
      audioManager: { query: 'morning' },
      audioDownloads: {},
      audioDownloading: {},
      quran: {},
      loadErrors: {},
    };
    assert.ok(renderAudio(state).includes('<mark>Morning</mark>'));
  });
});

describe('journal text filter', () => {
  const base = (over = {}) => ({
    settings: { language: 'en' },
    activeParams: {},
    duaJournal: [
      { id: 'd1', date: '2026-09-01', text: 'Heal my mother soon', answered: false },
      { id: 'd2', date: '2026-09-02', text: 'Pass the exam with ease', answered: false },
    ],
    reflections: [
      { id: 'r1', week: '2026-W35', promptId: null, text: 'Grateful for quiet mornings' },
    ],
    ...over,
  });

  test('q filters duas and marks matches; empty q shows all', async () => {
    const { renderJournal } = await import('../js/views/journal.js');
    const all = renderJournal(base());
    assert.ok(all.includes('Heal my mother') && all.includes('Pass the exam'));
    const filtered = renderJournal(base({ activeParams: { q: 'exam' } }));
    assert.ok(!filtered.includes('Heal my mother'));
    assert.ok(filtered.includes('<mark>exam</mark>'));
  });

  test('reflections filter matches text; miss shows generic empty state', async () => {
    const { renderJournal } = await import('../js/views/journal.js');
    const hit = renderJournal(base({ activeParams: { tab: 'reflections', q: 'grateful' } }));
    assert.ok(hit.includes('<mark>Grateful</mark>') || hit.includes('Grateful'));
    const miss = renderJournal(base({ activeParams: { tab: 'reflections', q: 'zzz-no-match' } }));
    assert.ok(!miss.includes('Grateful'));
  });
});
