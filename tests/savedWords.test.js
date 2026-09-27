import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSavedWordsPanel } from '../js/views/tafsirPanel.js';

function state(lang = 'en', bookmarks = {}) {
  return {
    settings: { language: lang },
    wordBookmarks: bookmarks,
    quranWords: {
      1: { 4: [{ i: 2, text: '<word>' }] },
      2: { 255: [{ i: 3, text: 'آية' }] },
    },
  };
}

test('saved words panel renders an honest empty state in both languages', () => {
  const en = buildSavedWordsPanel(state('en'));
  const ar = buildSavedWordsPanel(state('ar'));
  assert.match(en, /id="modal-title-word-bookmarks"/);
  assert.match(en, /No saved words yet\./);
  assert.match(ar, /لا توجد كلمات محفوظة بعد\./);
  assert.match(en, /data-action="modal-close"/);
});

test('saved words panel sorts numeric references and preserves exact keys', () => {
  const input = {
    '2:255:3': true,
    '01:002:003': true,
    '1:4:2': true,
    '1:4:99': false,
    invalid: true,
  };
  const snapshot = JSON.stringify(input);
  const html = buildSavedWordsPanel(state('en', input));
  assert.equal(JSON.stringify(input), snapshot, 'render does not mutate bookmarks');
  assert.match(html, /data-key="01:002:003"/);
  assert.match(html, /data-key="1:4:2"/);
  assert.match(html, /data-key="2:255:3"/);
  assert.ok(html.indexOf('01:002:003') < html.indexOf('1:4:2'));
  assert.ok(html.indexOf('1:4:2') < html.indexOf('2:255:3'));
  assert.match(html, /data-action="word-bookmark-open"/);
  assert.match(html, /data-action="word-bookmark-remove"/);
  assert.match(html, /&lt;word&gt;/);
  assert.doesNotMatch(html, /<word>/);
});

test('saved words panel falls back to the reference when the word tier is absent', () => {
  const html = buildSavedWordsPanel({
    settings: { language: 'en' },
    wordBookmarks: { '9:1:1': true },
    quranWords: {},
  });
  assert.match(html, /9:1:1/);
  assert.match(html, /Word 1/);
});
