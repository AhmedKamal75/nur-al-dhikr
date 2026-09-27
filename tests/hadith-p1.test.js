import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hadithCardHTML } from '../js/views/hadithCard.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('every Hadeeth card action carries its own book id', () => {
  const html = hadithCardHTML(
    { n: 12, b: 1, ar: 'نص', en: 'text' },
    { lang: 'en', bookId: 'bukhari', showTranslation: true }
  );
  for (const action of ['hadith-copy', 'hadith-share', 'hadith-speak']) {
    assert.match(html, new RegExp(`data-action="${action}" data-book-id="bukhari" data-n="12"`));
  }
});

test('concurrent Hadeeth index callers share one flight and can retry', () => {
  const src = read('../js/app/hadithData.js');
  assert.match(src, /if \(rt\.hadithIndexFetch\) return rt\.hadithIndexFetch/);
  assert.match(src, /rt\.hadithDailyStarted = false;\s*\n\s*return;/);
  assert.doesNotMatch(src, /if \(key && key !== rt\.lastHadithSearchDocs\)/);
});

test('reset re-arms every Hadeeth loader latch', () => {
  const src = read('../js/app/stateSub.js');
  for (const key of [
    'rt.hadithIndexFetch = null',
    'rt.hadithDailyStarted = null',
    'rt.hadithSearchFlight = null',
    "rt.lastHadithSearchDocs = ''",
  ]) {
    assert.ok(src.includes(key), `reset includes ${key}`);
  }
});
