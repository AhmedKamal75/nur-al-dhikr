import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { classifyAyahTajweed, classifyWordTajweed } from '../js/domain/tajweed.js';

function readJSON(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

function quranAyah(surah, ayah) {
  const payload = readJSON(`../data/quran/${surah}.json`);
  return payload.ayahs.find((row) => row.number === ayah)?.text;
}

function mushafAyah(page, surah, ayah) {
  const payload = readJSON(`../data/mushaf/${page}.json`);
  const chapter = payload.chapters.find((row) => row.number === surah);
  return chapter?.verses.find((row) => row.number === ayah)?.text;
}

function firstSpan(text, rule) {
  for (const word of classifyAyahTajweed(text)) {
    const span = word.spans.find((candidate) => candidate.rule === rule);
    if (span) return { word: word.word, text: word.word.slice(span.start, span.end) };
  }
  return null;
}

test('Madd Badal recognizes both checked-in spellings in Quran 2:4 and 2:8', () => {
  for (const [ayah, page] of [[4, 2], [8, 3]]) {
    const corpusText = quranAyah(2, ayah);
    const mushafText = mushafAyah(page, 2, ayah);
    assert.ok(corpusText, `missing Quran 2:${ayah}`);
    assert.ok(mushafText, `missing Mushaf 2:${ayah}`);

    const corpus = firstSpan(corpusText, 'madd_badal');
    const mushaf = firstSpan(mushafText, 'madd_badal');
    assert.ok(corpus, `Quran 2:${ayah} must classify Madd Badal`);
    assert.ok(mushaf, `Mushaf 2:${ayah} must classify Madd Badal`);
    assert.match(corpus.text, /أٓ/u);
    assert.ok(
      mushaf.text.includes('ـَٔا'),
      `Mushaf 2:${ayah} should highlight the hamza-above/alif cluster, got ${mushaf.text}`
    );
  }
});

test('Madd Iwad accepts the corpus final-tanween spelling contextually', () => {
  const corpusText = quranAyah(4, 1);
  const mushafText = mushafAyah(77, 4, 1);
  assert.ok(corpusText);
  assert.ok(mushafText);

  const corpus = firstSpan(corpusText, 'madd_iwad');
  const mushaf = firstSpan(mushafText, 'madd_iwad');
  assert.ok(corpus, 'Quran 4:1 must classify the final rasm as Madd Iwad');
  assert.ok(mushaf, 'Mushaf 4:1 must retain Madd Iwad');
  assert.equal(corpus.text, 'بٗ');
  assert.equal(mushaf.text, 'بً');

  const midAyah = classifyWordTajweed('رَقِيبٗا', { isLastWordOfAyah: false });
  assert.equal(midAyah.some((span) => span.rule === 'madd_iwad'), false);
});

test('the small-high-meem independently signals Iqlab in both Quran and Mushaf 2:18', () => {
  const corpusText = quranAyah(2, 18);
  const mushafText = mushafAyah(4, 2, 18);
  assert.ok(corpusText);
  assert.ok(mushafText);

  for (const [label, text] of [
    ['Quran', corpusText],
    ['Mushaf', mushafText],
  ]) {
    const firstWord = classifyAyahTajweed(text)[0];
    assert.ok(firstWord.spans.some((span) => span.rule === 'ghunnah'), `${label} ghunnah`);
    assert.ok(firstWord.spans.some((span) => span.rule === 'iqlab'), `${label} iqlab`);
  }
});
