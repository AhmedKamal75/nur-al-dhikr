import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, pickPersisted } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
import { moodEntries, selectedMoodIds } from '../js/services/moodSelection.js';
import { renderMood, moodDestinationHTML } from '../js/views/mood.js';

function fixture() {
  const s = initialState();
  s.activeView = 'mood';
  s.activeParams = { id: 'anxious' };
  const items = ['a', 'b', 'c'].map((id) => ({
    id,
    title: { en: id, ar: id },
    arabic: 'نص',
    tags: ['anxiety'],
    repetitions: 1,
  }));
  const category = { id: 'test', items, name: { en: 'Test', ar: 'تجربة' } };
  const document = { metadata: { id: 'lib' }, categories: [category] };
  s.library.itemIndex = Object.fromEntries(
    items.map((item) => [item.id, { item, category, document }])
  );
  s.collections = [{ id: 'col', name: { en: 'Mine', ar: 'مجموعتي' }, items: ['old', 'b'] }];
  return s;
}
const dispatch = (s, type, extra = {}) => reduce(s, { type, ...extra });
function selected() {
  let s = dispatch(fixture(), 'MOOD_SELECT_START');
  for (const id of ['c', 'a', 'b']) s = dispatch(s, 'MOOD_SELECT_TOGGLE', { id });
  return s;
}

test('explicit start is empty, checkbox order is not saved order, append deduplicates', () => {
  let s = dispatch(fixture(), 'MOOD_SELECT_START');
  assert.deepEqual(selectedMoodIds(s), []);
  assert.equal(dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'col' }), s);
  s = selected();
  assert.deepEqual(selectedMoodIds(s), ['a', 'b', 'c']);
  const before = structuredClone(s);
  const next = dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'col' });
  assert.deepEqual(next.collections[0].items, ['old', 'b', 'a', 'c']);
  assert.equal(next.moodSelection, null);
  for (const key of [
    'history',
    'favorites',
    'counters',
    'quran',
    'speakingItemId',
    'dhikrAudioItemId',
    'stats',
  ])
    assert.deepEqual(next[key], before[key], key);
});

test('named creation uses exact ids once; invalid destination and empty name do nothing', () => {
  const s = selected();
  assert.equal(dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'missing' }), s);
  assert.equal(dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'new', name: ' ' }), s);
  assert.equal(dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'col', name: 'existing' }), s);
  const n = dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'new', name: ' Mine ' });
  assert.deepEqual(n.collections[1].items, ['a', 'b', 'c']);
  assert.deepEqual(n.collections[1].name, { en: 'Mine', ar: 'Mine' });
});

for (const key of [
  'hiddenItems',
  'deletedItems',
  'hiddenCategories',
  'deletedCategories',
  'hiddenLibraries',
  'deletedLibraries',
])
  test(`commit rechecks ${key} mid-selection`, () => {
    const s = selected();
    const id = key.endsWith('Items') ? 'b' : key.endsWith('Categories') ? 'test' : 'lib';
    s.settings.contentPrefs = { [key]: { [id]: true } };
    const expected = key.endsWith('Items') ? ['a', 'c'] : [];
    assert.deepEqual(selectedMoodIds(s), expected);
    const n = dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'new', name: 'New' });
    if (expected.length) assert.deepEqual(n.collections[1].items, expected);
    else assert.equal(n, s);
  });

test('missing index entries and deleted destination cannot be committed', () => {
  const s = selected();
  delete s.library.itemIndex.a;
  s.collections = [];
  assert.deepEqual(selectedMoodIds(s), ['b', 'c']);
  assert.equal(dispatch(s, 'MOOD_SELECTION_COMMIT', { id: 'col' }), s);
});

test('selection clears on cancel, navigation, need change, reload; select-all is explicit', () => {
  const s = selected();
  assert.equal(dispatch(s, 'MOOD_SELECT_CLEAR').moodSelection, null);
  for (const [view, params] of [
    ['home', {}],
    ['mood', { id: 'sleep' }],
    ['mood', { id: 'anxious' }],
  ])
    assert.equal(dispatch(s, 'NAVIGATE', { view, params }).moodSelection, null);
  assert.ok(!Object.hasOwn(pickPersisted(s), 'moodSelection'));
  assert.equal(initialState().moodSelection, null);
  const all = dispatch(dispatch(fixture(), 'MOOD_SELECT_START'), 'MOOD_SELECT_ALL');
  assert.deepEqual(selectedMoodIds(all), ['a', 'b', 'c']);
});

for (const lang of ['en', 'ar'])
  test(`${lang}: empty disable, labeled native checkboxes, explicit count preview`, () => {
    let s = fixture();
    s.settings.language = lang;
    assert.equal((renderMood(s).match(/type="checkbox"/g) || []).length, 0);
    s = dispatch(s, 'MOOD_SELECT_START');
    let html = renderMood(s);
    assert.match(html, /mood-selection-create" disabled/);
    assert.match(html, /mood-selection-destination" disabled/);
    assert.equal((html.match(/type="checkbox"/g) || []).length, 3);
    assert.match(html, /<label class="mood-selection__check">/);
    assert.match(html, /aria-live="polite"/);
    s = dispatch(s, 'MOOD_SELECT_ALL');
    assert.match(moodDestinationHTML(s), /mood-selection-add" data-id="col"/);
    assert.equal(moodEntries(s).length, 3);
  });
