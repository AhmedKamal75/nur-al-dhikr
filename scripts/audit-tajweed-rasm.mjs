#!/usr/bin/env node
/**
 * Compare Tajweed results from the Qur'an reader and 604-page Mushaf.
 * This is a diagnostic, not a scholarly gold-label oracle; it never edits Quran text.
 */
import { readFileSync } from 'node:fs';
import { canonicalWordTokens, classifyAyahTajweed } from '../js/domain/tajweed.js';

const ROOT = new URL('../', import.meta.url);
const SAMPLE_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--samples='))?.split('=')[1] || 30);
const ORNAMENTS = new Set([
  '\u0640', '\u06D6', '\u06D7', '\u06D8', '\u06DA', '\u06DB', '\u06DC', '\u06DE',
  '\u06E9', '\u06EC', '\uFD3E', '\uFD3F', '(', ')',
  ...'0123456789٠١٢٣٤٥٦٧٨٩',
]);

function readJSON(path) {
  return JSON.parse(readFileSync(new URL(path, ROOT), 'utf8'));
}

function keyOf(surah, ayah) {
  return `${surah}:${ayah}`;
}

function surfaceSkeleton(text) {
  return [...String(text || '')].filter((ch) => !/\p{M}/u.test(ch) && !ORNAMENTS.has(ch)).join('');
}

function letterOrdinal(text, offset) {
  return [...text.slice(0, offset)].filter(
    (ch) =>
      /\p{L}/u.test(ch) &&
      /\p{Script=Arabic}/u.test(ch) &&
      ch !== '\u0640' &&
      !/\p{M}/u.test(ch) &&
      !ORNAMENTS.has(ch)
  ).length;
}

function groupByRule(spans) {
  const groups = new Map();
  for (const span of spans) {
    if (!groups.has(span.rule)) groups.set(span.rule, []);
    groups.get(span.rule).push(span);
  }
  return groups;
}

function classifyCanonicalWords(text) {
  const canonical = canonicalWordTokens(text);
  const raw = classifyAyahTajweed(text);
  return canonical.map((token, index) => {
    const word = raw[token.rawIndex];
    const spans = (word?.spans || []).map((span) => ({
      rule: span.rule,
      start: span.start,
      end: span.end,
      text: word.word.slice(span.start, span.end),
      letterOrdinal: letterOrdinal(word.word, span.start),
      endLetterOrdinal: letterOrdinal(word.word, span.end),
      startsAtCombiningMark: /\p{M}/u.test(word.word[span.start] || ''),
      startsAtDaggerAlif: word.word[span.start] === '\u0670',
    }));
    return {
      canonicalIndex: index + 1,
      raw: token.raw,
      skeleton: surfaceSkeleton(token.text),
      rules: [...new Set(spans.map((span) => span.rule))].sort(),
      spans,
    };
  });
}

const quran = new Map();
const mushaf = new Map();
const duplicateQuran = [];
const duplicateMushaf = [];

for (let surah = 1; surah <= 114; surah += 1) {
  const payload = readJSON(`data/quran/${surah}.json`);
  for (const ayah of payload.ayahs || []) {
    const key = keyOf(payload.number ?? surah, ayah.number);
    if (quran.has(key)) duplicateQuran.push(key);
    quran.set(key, ayah.text);
  }
}

for (let page = 1; page <= 604; page += 1) {
  const payload = readJSON(`data/mushaf/${page}.json`);
  for (const chapter of payload.chapters || []) {
    for (const ayah of chapter.verses || []) {
      const key = keyOf(chapter.number, ayah.number);
      if (mushaf.has(key)) duplicateMushaf.push({ key, page });
      else mushaf.set(key, { text: ayah.text, page });
    }
  }
}

const missingFromMushaf = [...quran.keys()].filter((key) => !mushaf.has(key));
const missingFromQuran = [...mushaf.keys()].filter((key) => !quran.has(key));
const mismatchSamples = [];
const offsetSamples = [];
const ruleDeltas = new Map();
const affectedAyahs = new Set();
let checkedAyahs = 0;
let wordCountMismatches = 0;
let wordsCompared = 0;
let differingWords = 0;
let offsetDivergenceCount = 0;
let wordSkeletonDifferences = 0;
const wordSkeletonSamples = [];
let maddSpansStartingOnDaggerAlif = 0;
const daggerStartSamples = [];

for (const [key, text] of quran) {
  const pageRecord = mushaf.get(key);
  if (!pageRecord) continue;
  checkedAyahs += 1;
  const corpusWords = classifyCanonicalWords(text);
  const pageWords = classifyCanonicalWords(pageRecord.text);
  if (corpusWords.length !== pageWords.length) {
    wordCountMismatches += 1;
    continue;
  }

  let ayahDiffers = false;
  for (let i = 0; i < corpusWords.length; i += 1) {
    const a = corpusWords[i];
    const b = pageWords[i];
    wordsCompared += 1;
    if (a.skeleton !== b.skeleton) {
      wordSkeletonDifferences += 1;
      if (wordSkeletonSamples.length < SAMPLE_LIMIT) wordSkeletonSamples.push({ key, page: pageRecord.page, wordIndex: i + 1, quranWord: a.raw, mushafWord: b.raw, quranSkeleton: a.skeleton, mushafSkeleton: b.skeleton });
    }
    for (const [side, word] of [['Qur’an', a], ['Mushaf', b]]) {
      for (const span of word.spans) {
        if (span.rule.startsWith('madd') && span.startsAtDaggerAlif) {
          maddSpansStartingOnDaggerAlif += 1;
          if (daggerStartSamples.length < SAMPLE_LIMIT) daggerStartSamples.push({ key, page: pageRecord.page, wordIndex: i + 1, side, rule: span.rule, word: word.raw, span });
        }
      }
    }
    const onlyQuran = a.rules.filter((rule) => !b.rules.includes(rule));
    const onlyMushaf = b.rules.filter((rule) => !a.rules.includes(rule));
    if (onlyQuran.length || onlyMushaf.length) {
      ayahDiffers = true;
      differingWords += 1;
      for (const rule of onlyQuran) {
        const row = ruleDeltas.get(rule) || { quranOnly: 0, mushafOnly: 0 };
        row.quranOnly += 1;
        ruleDeltas.set(rule, row);
      }
      for (const rule of onlyMushaf) {
        const row = ruleDeltas.get(rule) || { quranOnly: 0, mushafOnly: 0 };
        row.mushafOnly += 1;
        ruleDeltas.set(rule, row);
      }
      if (mismatchSamples.length < SAMPLE_LIMIT) {
        mismatchSamples.push({
          key, page: pageRecord.page, wordIndex: i + 1,
          quranWord: a.raw, mushafWord: b.raw,
          quranRules: a.rules, mushafRules: b.rules, onlyQuran, onlyMushaf,
        });
      }
    }

    if (a.skeleton && a.skeleton === b.skeleton) {
      const byRuleA = groupByRule(a.spans);
      const byRuleB = groupByRule(b.spans);
      for (const [rule, aSpans] of byRuleA) {
        const bSpans = byRuleB.get(rule) || [];
        for (let j = 0; j < Math.min(aSpans.length, bSpans.length); j += 1) {
          if (aSpans[j].letterOrdinal !== bSpans[j].letterOrdinal) {
            offsetDivergenceCount += 1;
            if (offsetSamples.length < SAMPLE_LIMIT) {
              offsetSamples.push({
                key, page: pageRecord.page, wordIndex: i + 1, rule,
                quranWord: a.raw, mushafWord: b.raw,
                quranSpan: aSpans[j], mushafSpan: bSpans[j],
              });
            }
          }
        }
      }
    }
  }
  if (ayahDiffers) affectedAyahs.add(key);
}

console.log(JSON.stringify({
  scope: {
    quranAyahs: quran.size, mushafAyahs: mushaf.size, checkedAyahs, wordsCompared,
    wordCountMismatches, missingFromMushaf: missingFromMushaf.length,
    missingFromQuran: missingFromQuran.length, duplicateQuran: duplicateQuran.length,
    duplicateMushaf: duplicateMushaf.length,
  },
  result: {
    affectedAyahsByRuleSet: affectedAyahs.size, differingWords,
    wordSkeletonDifferences,
    offsetDivergences: offsetDivergenceCount,
    maddSpansStartingOnDaggerAlif,
    ruleDeltas: Object.fromEntries([...ruleDeltas.entries()].sort(([a], [b]) => a.localeCompare(b))),
  },
  samples: {
    ruleMismatches: mismatchSamples, offsetDivergences: offsetSamples,
    wordSkeletonDifferences: wordSkeletonSamples,
    maddSpansStartingOnDaggerAlif: daggerStartSamples,
    missingFromMushaf: missingFromMushaf.slice(0, SAMPLE_LIMIT),
    missingFromQuran: missingFromQuran.slice(0, SAMPLE_LIMIT),
    duplicateQuran: duplicateQuran.slice(0, SAMPLE_LIMIT),
    duplicateMushaf: duplicateMushaf.slice(0, SAMPLE_LIMIT),
  },
}, null, 2));
