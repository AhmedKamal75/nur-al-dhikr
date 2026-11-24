import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaletteGroups, paletteGroupsHTML, paletteRowCount } from '../js/views/palette.js';
import { readFileSync } from 'node:fs';
function deps() {
  return {
    query: 'match',
    lang: 'en',
    surahs: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, nameEn: `match ${i}` })),
    ayahIndex: {
      hits: Array.from({ length: 75 }, (_, i) => ({ s: 1, a: i + 1, text: 'match', ref: 'ref' })),
    },
    tafsirIndex: { hits: Array.from({ length: 9 }, (_, i) => ({ s: 1, a: i + 1, text: 'match' })) },
    libraryHits: Array.from({ length: 11 }, (_, i) => ({
      itemId: `i${i}`,
      item: { id: `i${i}`, title: { en: 'match' } },
    })),
    reciters: Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, nameEn: 'match' })),
    books: Array.from({ length: 7 }, (_, i) => ({ id: `b${i}`, name: { en: 'match' } })),
    journal: Array.from({ length: 8 }, () => ({ text: 'match' })),
    settingsSections: Array.from({ length: 8 }, () => ({ id: 'appearance', titleKey: 'nav.home' })),
  };
}
for (const lang of ['en', 'ar'])
  test(`group totals are complete and expansion is isolated (${lang})`, () => {
    const d = deps();
    d.lang = lang;
    const initial = buildPaletteGroups(d);
    for (const key of ['surah', 'ayah', 'tafsir', 'library', 'reciter', 'book', 'journal']) {
      const g = initial.groups.find((g) => g.key === key);
      assert.ok(g.total > g.rows.length, key);
      const expanded = buildPaletteGroups({
        ...d,
        groupLimits: { [key]: g.rows.length + 60 },
      }).groups;
      assert.equal(
        expanded.find((x) => x.key === key).rows.length,
        Math.min(g.total, g.rows.length + 60)
      );
      for (const other of initial.groups.filter((x) => x.key !== key))
        assert.deepEqual(
          expanded.find((x) => x.key === other.key),
          other
        );
    }
    const html = paletteGroupsHTML(initial.groups, initial.terms, lang);
    assert.equal((html.match(/data-idx=/g) || []).length, paletteRowCount(initial.groups));
    assert.match(html, /data-palette-group=/);
    assert.equal(
      buildPaletteGroups({ ...d, query: '' }).groups.some((g) => g.total > g.rows.length),
      false
    );
  });
test('palette requests complete provider results rather than manufacturing totals', () => {
  const src = readFileSync(new URL('../js/app/palette.js', import.meta.url), 'utf8');
  assert.match(src, /searchQuran\(query, \{ limit: Infinity \}\)/);
  assert.match(src, /searchTafsir\(query, \{ limit: Infinity \}\)/);
  assert.match(src, /searchLibrary\(query, \{ limit: Infinity \}\)/);
  assert.doesNotMatch(src, /searchReciters\([^;]*?\.slice\(0, 4\)/);
});

test('history and settings caps also expose exact totals; boundaries need no expansion', () => {
  const d = deps();
  const h = buildPaletteGroups({
    ...d,
    query: '',
    history: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  }).groups.find((g) => g.key === 'history');
  assert.equal(h.total, 7);
  assert.equal(h.rows.length, 5);
  assert.equal(
    buildPaletteGroups({
      ...d,
      query: '',
      history: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      groupLimits: { history: 65 },
    }).groups.find((g) => g.key === 'history').rows.length,
    7
  );
  const settings = buildPaletteGroups({ ...d, query: 'Home' }).groups.find(
    (g) => g.key === 'settings'
  );
  assert.equal(settings.total, 8);
  assert.equal(settings.rows.length, 3);
  const g = buildPaletteGroups({ ...d, reciters: d.reciters.slice(0, 4) }).groups.find(
    (g) => g.key === 'reciter'
  );
  assert.equal(g.rows.length, g.total);
});
