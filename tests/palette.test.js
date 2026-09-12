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

describe('nav search item opens the palette', () => {
  test('rail and drawer search entries carry open-palette; siblings navigate', async () => {
    const { renderNav } = await import('../js/ui/shell.js');
    const state = { settings: { language: 'en', navCollapsed: false }, activeView: 'home' };
    const html = renderNav(state);
    // data-action precedes data-view in each tag, so every chunk before a
    // data-view="search" occurrence ends with that item's own opening tag.
    const parts = html.split('data-view="search"');
    assert.equal(parts.length - 1, 2, 'rail + drawer search entries');
    for (const tag of [parts[0].split('<a').at(-1), parts[1].split('<a').at(-1)]) {
      assert.ok(tag.includes('data-action="open-palette"'), `opens palette: ${tag.slice(-80)}`);
    }
    assert.ok(html.includes('data-view="home"') && html.includes('data-action="navigate"'));
  });
});

describe('list filters: settings, favorites, collections', () => {
  const entry = (id, titleEn, arabic) => ({
    item: {
      id,
      category_id: 'c1',
      title: { en: titleEn, ar: '' },
      arabic,
      transliteration: '',
      translation: { en: '', ar: '' },
      virtues: { en: '', ar: '' },
      reference: {},
      grade: 'Unknown',
      repetitions: 1,
      tags: [],
    },
    category: { id: 'c1', name: { en: 'Morning', ar: 'الصباح' } },
  });

  test('filterEntries matches titles and Arabic, empty query passes through', async () => {
    const { filterEntries } = await import('../js/domain/search.js');
    const entries = [entry('a', 'Morning Light', 'نور'), entry('b', 'Evening Calm', 'هدوء')];
    assert.deepEqual(filterEntries(entries, ''), entries);
    assert.deepEqual(
      filterEntries(entries, 'light').map((e) => e.item.id),
      ['a']
    );
    assert.deepEqual(
      filterEntries(entries, 'هدوء').map((e) => e.item.id),
      ['b']
    );
    assert.deepEqual(filterEntries(entries, 'zzz'), []);
    assert.deepEqual(filterEntries(null, 'x'), []);
  });

  test('matchSettingsSection matches titles and hints in both languages', async () => {
    const { SETTINGS_SECTIONS, matchSettingsSection } = await import('../js/views/settings.js');
    assert.ok(SETTINGS_SECTIONS.length >= 12);
    const reciter = SETTINGS_SECTIONS.find((s) => s.id === 'settings-sec-reciter');
    assert.ok(matchSettingsSection(reciter, 'reciter'));
    assert.ok(matchSettingsSection(reciter, 'قارئ'));
    assert.ok(!matchSettingsSection(reciter, 'zakat'));
    assert.ok(matchSettingsSection(reciter, ''));
  });

  test('renderSettings hides non-matching sections when filtering', async () => {
    const { renderSettings } = await import('../js/views/settings.js');
    const base = {
      settings: {
        language: 'en',
        palette: 'emerald',
        shape: 'round',
        themeMode: 'light',
        reciter: 'ar.alafasy',
        quranTranslation: 'en-sahih',
        reminders: [],
        fontScale: 1,
        arabicFontScale: 1,
        dailyGoal: 100,
      },
      activeParams: { q: 'reciter' },
      reminders: [],
      backupMeta: {},
      dataHealth: {},
    };
    const html = renderSettings(base);
    assert.ok(html.includes('id="settings-search-input"'));
    assert.ok(
      !html.includes('id="settings-sec-zakat" hidden') || !html.includes('settings-sec-zakat')
    );
    assert.ok(html.includes('settings-sec-reciter'));
    const hiddenCount = (html.match(/settings-acc" id="settings-sec-[a-z]+" hidden/g) || []).length;
    assert.ok(hiddenCount >= 5, `most sections hidden, got ${hiddenCount}`);
  });

  test('favorites and collection filter cards with highlights', async () => {
    const { renderFavorites } = await import('../js/views/favorites.js');
    const { renderCollection } = await import('../js/views/collection.js');
    const idx = { a: entry('a', 'Morning Light', 'نور'), b: entry('b', 'Evening Calm', 'هدوء') };
    const core = {
      favorites: [],
      settings: { language: 'en', showTransliteration: true, showTranslation: true },
      speakingItemId: null,
      counters: {},
      library: { itemIndex: idx },
    };
    const fav = renderFavorites({ ...core, favorites: ['a', 'b'], activeParams: { q: 'calm' } });
    assert.ok(!fav.includes('Morning Light'));
    assert.ok(fav.includes('<mark>Calm</mark>'));
    const miss = renderFavorites({ ...core, favorites: ['a', 'b'], activeParams: { q: 'zzz' } });
    assert.ok(!miss.includes('Morning Light') && !miss.includes('heart'));
    const col = renderCollection({
      ...core,
      collections: [{ id: 'c1', name: { en: 'Mine', ar: '' }, items: ['a', 'b'] }],
      activeParams: { id: 'c1', q: 'light' },
    });
    assert.ok(col.includes('<mark>Light</mark>'));
    assert.ok(!col.includes('Evening Calm'));
  });
});

describe('palette round 2: journal + settings providers', () => {
  test('journal entries match text and land filtered', async () => {
    const { buildPaletteGroups } = await import('../js/views/palette.js');
    const { groups } = buildPaletteGroups({
      query: 'mother',
      lang: 'en',
      libraryHits: [],
      surahs: [],
      ayahIndex: null,
      reciters: [],
      books: [],
      history: [],
      journal: [
        { text: 'Heal my mother soon', sub: '2026-09-01', query: 'mother' },
        { text: 'Pass the exam', sub: '2026-09-02', query: 'mother' },
      ],
    });
    const j = groups.find((g) => g.key === 'journal');
    assert.ok(j && j.rows.length === 1);
    assert.equal(j.title, 'Journal');
    assert.equal(j.rows[0].action, 'navigate');
    assert.ok(j.rows[0].data.q === 'mother' && j.rows[0].href.includes('journal'));
  });

  test('settings sections match bilingually and open Settings', async () => {
    const { buildPaletteGroups } = await import('../js/views/palette.js');
    const forQ = (query) =>
      buildPaletteGroups({
        query,
        lang: 'en',
        libraryHits: [],
        surahs: [],
        ayahIndex: null,
        reciters: [],
        books: [],
        history: [],
        journal: [],
        settingsSections: [
          { id: 'a', titleKey: 'settings.reciter', hintKey: 'settings.reciterHint' },
          { id: 'b', titleKey: 'settings.data' },
        ],
      });
    const en = forQ('reciter').groups.find((g) => g.key === 'settings');
    assert.ok(en && en.rows.length === 1);
    assert.ok(en.rows[0].href.includes('settings'));
    const ar = forQ('قارئ').groups.find((g) => g.key === 'settings');
    assert.ok(ar && ar.rows.length === 1, 'Arabic hint/label match');
    assert.ok(!forQ('zzz').groups.some((g) => g.key === 'settings'));
  });
});
