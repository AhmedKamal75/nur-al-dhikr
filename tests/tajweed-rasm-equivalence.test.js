import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { canonicalWordTokens, classifyAyahTajweed, classifyWordTajweed } from '../js/domain/tajweed.js';

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

test('all aligned Qur’an/Mushaf words have matching Tajweed rules and glyph anchors', () => {
  const quran = new Map();
  const mushaf = new Map();
  const duplicates = [];
  for (let surah = 1; surah <= 114; surah += 1) {
    const payload = readJSON('../data/quran/' + surah + '.json');
    for (const ayah of payload.ayahs) {
      const key = surah + ':' + ayah.number;
      if (quran.has(key)) duplicates.push('Qur’an ' + key);
      quran.set(key, ayah.text);
    }
  }
  for (let page = 1; page <= 604; page += 1) {
    const payload = readJSON('../data/mushaf/' + page + '.json');
    for (const chapter of payload.chapters) {
      for (const ayah of chapter.verses) {
        const key = chapter.number + ':' + ayah.number;
        if (mushaf.has(key)) duplicates.push('Mushaf ' + key);
        else mushaf.set(key, ayah.text);
      }
    }
  }
  assert.equal(quran.size, 6236, 'classic text must contain 6,236 ayahs');
  assert.equal(mushaf.size, 6236, 'the 604 Mushaf pages must cover 6,236 ayahs');
  assert.deepEqual(duplicates, [], 'neither source may duplicate an ayah');
  assert.deepEqual([...quran.keys()].filter((key) => !mushaf.has(key)), []);
  assert.deepEqual([...mushaf.keys()].filter((key) => !quran.has(key)), []);

  const ornaments = new Set([
    '\u0640', '\u06D6', '\u06D7', '\u06D8', '\u06DA', '\u06DB',
    '\u06DC', '\u06DE', '\u06E9', '\u06EC', '\uFD3E', '\uFD3F',
    '(', ')', ...'0123456789٠١٢٣٤٥٦٧٨٩',
  ]);
  const skeleton = (word) => [...word].filter(
    (ch) => !/\p{M}/u.test(ch) && !ornaments.has(ch)
  ).join('');
  const letterOrdinal = (word, offset) => [...word.slice(0, offset)].filter(
    (ch) => /\p{L}/u.test(ch) && /\p{Script=Arabic}/u.test(ch) &&
      ch !== '\u0640' && !/\p{M}/u.test(ch) && !ornaments.has(ch)
  ).length;
  const wordsOf = (text) => {
    const tokens = canonicalWordTokens(text);
    const classified = classifyAyahTajweed(text);
    return tokens.map((token) => {
      const raw = classified[token.rawIndex];
      return {
        raw: token.raw,
        skeleton: skeleton(token.text),
        rules: [...new Set((raw?.spans || []).map((span) => span.rule))].sort(),
        spans: (raw?.spans || []).map((span) => ({
          rule: span.rule,
          startOrdinal: letterOrdinal(raw.word, span.start),
          endOrdinal: letterOrdinal(raw.word, span.end),
          startsOnMark: /\p{M}/u.test(raw.word[span.start] || ''),
        })),
      };
    });
  };

  const ruleMismatches = [];
  const offsetMismatches = [];
  const alignmentExceptions = [];
  let comparedWords = 0;
  let orthographicVariants = 0;

  for (const [key, quranText] of quran) {
    const qWords = wordsOf(quranText);
    const mWords = wordsOf(mushaf.get(key));
    let i = 0;
    let j = 0;
    const pairs = [];
    while (i < qWords.length && j < mWords.length) {
      const a = qWords[i];
      const b = mWords[j];
      if (a.skeleton === b.skeleton) {
        pairs.push([a, b]);
        i += 1;
        j += 1;
        continue;
      }
      const nextQuranMatches = i + 1 < qWords.length && qWords[i + 1].skeleton === b.skeleton;
      const nextMushafMatches = j + 1 < mWords.length && a.skeleton === mWords[j + 1].skeleton;
      if (nextQuranMatches && !nextMushafMatches) {
        alignmentExceptions.push({ ayah: key, source: 'Qur’an', token: a.raw });
        i += 1;
      } else if (nextMushafMatches && !nextQuranMatches) {
        alignmentExceptions.push({ ayah: key, source: 'Mushaf', token: b.raw });
        j += 1;
      } else {
        pairs.push([a, b]);
        orthographicVariants += 1;
        i += 1;
        j += 1;
      }
    }
    for (; i < qWords.length; i += 1) {
      alignmentExceptions.push({ ayah: key, source: 'Qur’an-tail', token: qWords[i].raw });
    }
    for (; j < mWords.length; j += 1) {
      alignmentExceptions.push({ ayah: key, source: 'Mushaf-tail', token: mWords[j].raw });
    }
    for (const [a, b] of pairs) {
      comparedWords += 1;
      if (JSON.stringify(a.rules) !== JSON.stringify(b.rules) && ruleMismatches.length < 30) {
        ruleMismatches.push({
          ayah: key, quranWord: a.raw, mushafWord: b.raw,
          quranRules: a.rules, mushafRules: b.rules,
        });
      }
      const ruleIds = new Set([...a.spans.map((s) => s.rule), ...b.spans.map((s) => s.rule)]);
      for (const rule of ruleIds) {
        const aa = a.spans.filter((span) => span.rule === rule);
        const bb = b.spans.filter((span) => span.rule === rule);
        if (aa.length !== bb.length ||
            aa.some((span) => span.startsOnMark) ||
            bb.some((span) => span.startsOnMark)) {
          if (offsetMismatches.length < 30) {
            offsetMismatches.push({
              ayah: key, rule, quranWord: a.raw, mushafWord: b.raw,
            });
          }
          continue;
        }
        for (let k = 0; k < aa.length; k += 1) {
          if (aa[k].startOrdinal !== bb[k].startOrdinal || aa[k].endOrdinal !== bb[k].endOrdinal) {
            if (offsetMismatches.length < 30) {
              offsetMismatches.push({
                ayah: key, rule, quranWord: a.raw, mushafWord: b.raw,
                quranSpan: aa[k], mushafSpan: bb[k],
              });
            }
          }
        }
      }
    }
  }
  assert.ok(comparedWords > 50000, 'cross-rasm gate must cover a substantial corpus sample');
  assert.deepEqual(
    ruleMismatches,
    [],
    'cross-rasm rule sets differ: alignment exceptions=' + alignmentExceptions.length +
      ', compared words=' + comparedWords + ', orthographic variants=' + orthographicVariants +
      '. Run scripts/audit-tajweed-rasm.mjs for the complete diagnostic.'
  );
  assert.deepEqual(offsetMismatches, [], 'paired rule spans must align to the same letter ordinals');
});
