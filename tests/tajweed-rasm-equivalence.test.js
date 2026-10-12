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
  for (const [ayah, page] of [
    [4, 2],
    [8, 3],
  ]) {
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

test('cross-rasm tanween-fatha spelling does not invent natural madd (Quran 2:95)', () => {
  const corpusText = quranAyah(2, 95);
  const mushafText = mushafAyah(15, 2, 95);
  assert.ok(corpusText, 'missing Quran 2:95');
  assert.ok(mushafText, 'missing Mushaf 2:95');

  const corpus = classifyAyahTajweed(corpusText).find((row) => row.word.startsWith('أَبَد'));
  const mushaf = classifyAyahTajweed(mushafText).find((row) => row.word.startsWith('أَبَد'));
  assert.ok(corpus, 'Quran spelling of أَبَدًا must be present');
  assert.ok(mushaf, 'Mushaf spelling of أَبَدًا must be present');
  assert.equal(corpus.word, 'أَبَدَۢا');
  assert.equal(mushaf.word, 'أَبَدًۢا');
  assert.ok(
    corpus.spans.some((span) => span.rule === 'iqlab'),
    'keep the explicit Iqlab classification'
  );
  assert.ok(
    mushaf.spans.some((span) => span.rule === 'iqlab'),
    'keep the explicit Iqlab classification in the alternate spelling'
  );
  assert.ok(!corpus.spans.some((span) => span.rule === 'madd_2'));
  assert.ok(!mushaf.spans.some((span) => span.rule === 'madd_2'));
});

test('ra with dammatan is heavy in both checked-in rasms (Quran 2:96)', () => {
  const corpusText = quranAyah(2, 96);
  const mushafText = mushafAyah(15, 2, 96);
  assert.ok(corpusText, 'missing Quran 2:96');
  assert.ok(mushafText, 'missing Mushaf 2:96');

  const corpus = classifyAyahTajweed(corpusText).find((row) => row.word.startsWith('بَصِير'));
  const mushaf = classifyAyahTajweed(mushafText).find((row) => row.word.startsWith('بَصِير'));
  assert.ok(corpus, 'Quran spelling of بَصِير must be present');
  assert.ok(mushaf, 'Mushaf spelling of بَصِير must be present');
  assert.equal(corpus.word, 'بَصِيرُۢ');
  assert.equal(mushaf.word, 'بَصِيرٌۢ');
  assert.ok(
    corpus.spans.some((span) => span.rule === 'tafkhim'),
    'damma on ra supports tafkhim'
  );
  assert.ok(
    mushaf.spans.some((span) => span.rule === 'tafkhim'),
    'dammatan on ra also supports tafkhim'
  );
});

test('Madd Iwad recognises ayah-final Iqlab tanween-fatha across the two rasms (4:137)', () => {
  const corpusText = quranAyah(4, 137);
  const mushafText = mushafAyah(100, 4, 137);
  assert.ok(corpusText, 'missing Quran 4:137');
  assert.ok(mushafText, 'missing Mushaf 4:137');

  const corpus = classifyAyahTajweed(corpusText).at(-1);
  const mushaf = classifyAyahTajweed(mushafText).at(-1);
  assert.equal(corpus.word, 'سَبِيلَۢا');
  assert.equal(mushaf.word, 'سَبِيلًۢا');
  assert.ok(corpus.spans.some((span) => span.rule === 'madd_iwad'));
  assert.ok(mushaf.spans.some((span) => span.rule === 'madd_iwad'));

  const midAyah = classifyWordTajweed('رَقِيبَۢا', { isLastWordOfAyah: false });
  assert.ok(!midAyah.some((span) => span.rule === 'madd_iwad'));
});

test('Madd Muttasil recognises hamza-above encoded on a seated letter in both rasms', () => {
  const cases = [
    [10, 15, 210],
    [16, 90, 277],
    [20, 130, 321],
    [30, 8, 405],
    [30, 16, 406],
    [42, 51, 488],
  ];
  for (const [surah, ayah, page] of cases) {
    const corpusText = quranAyah(surah, ayah);
    const mushafText = mushafAyah(page, surah, ayah);
    assert.ok(corpusText, `missing Quran ${surah}:${ayah}`);
    assert.ok(mushafText, `missing Mushaf ${surah}:${ayah}`);

    const corpusWord = classifyAyahTajweed(corpusText).find((row) => row.word.includes('ٓيٕ'));
    const mushafWord = classifyAyahTajweed(mushafText).find((row) => row.word.includes('ٓئ'));
    assert.ok(corpusWord, `missing seated-letter hamza in Quran ${surah}:${ayah}`);
    assert.ok(mushafWord, `missing explicit hamza in Mushaf ${surah}:${ayah}`);
    assert.ok(
      corpusWord.spans.some((span) => span.rule === 'madd_muttasil'),
      `Quran ${surah}:${ayah} must classify the source hamza form as Madd Muttasil`
    );
    assert.ok(
      mushafWord.spans.some((span) => span.rule === 'madd_muttasil'),
      `Mushaf ${surah}:${ayah} must classify the explicit hamza form as Madd Muttasil`
    );
    assert.ok(!corpusWord.spans.some((span) => span.rule === 'madd_2'));
  }
});

test('Allah tafkhim respects final kasrah across yeh/alif-maqsurah rasms (49:1)', () => {
  const corpusText = quranAyah(49, 1);
  const mushafText = mushafAyah(515, 49, 1);
  assert.ok(corpusText, 'missing Quran 49:1');
  assert.ok(mushafText, 'missing Mushaf 49:1');
  assert.ok(corpusText.includes('يَدَيِ'));
  assert.ok(mushafText.includes('يَدَىِ'));

  const corpusAllah = classifyAyahTajweed(corpusText).find((row) => row.word === 'ٱللَّهِ');
  const mushafAllah = classifyAyahTajweed(mushafText).find((row) => row.word === 'ٱللَّهِ');
  assert.ok(corpusAllah, 'missing Allah after the kasrah-ended source word in Quran rasm');
  assert.ok(mushafAllah, 'missing Allah after the kasrah-ended source word in Mushaf rasm');
  assert.ok(!corpusAllah.spans.some((span) => span.rule === 'tafkhim'));
  assert.ok(!mushafAllah.spans.some((span) => span.rule === 'tafkhim'));
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
    assert.ok(
      firstWord.spans.some((span) => span.rule === 'ghunnah'),
      `${label} ghunnah`
    );
    assert.ok(
      firstWord.spans.some((span) => span.rule === 'iqlab'),
      `${label} iqlab`
    );
  }
});
