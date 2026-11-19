#!/usr/bin/env node
/**
 * Compare Tajweed results from the Qur'an reader and 604-page Mushaf.
 * This is a diagnostic, not a scholarly gold-label oracle; it never edits Quran text.
 */
import { readFileSync } from 'node:fs';
import { canonicalWordTokens, classifyAyahTajweed } from '../js/domain/tajweed.js';

const ROOT = new URL('../', import.meta.url);
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
    (ch) => /\p{L}/u.test(ch) && /\p{Script=Arabic}/u.test(ch)
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
const ruleMismatchDetails = [];
const offsetDivergenceDetails = [];
const wordCountMismatchDetails = [];
const surfaceSkeletonMismatchDetails = [];
const ruleDeltas = new Map();
const affectedAyahs = new Set();
const unalignedAyahs = new Set();
let checkedAyahs = 0;
let wordCountMismatches = 0;
let surfaceSkeletonMismatches = 0;
let unalignedWordPairs = 0;
let wordsCompared = 0;
let differingWords = 0;
let offsetDivergenceCount = 0;

for (const [key, text] of quran) {
  const pageRecord = mushaf.get(key);
  if (!pageRecord) continue;
  checkedAyahs += 1;
  const corpusWords = classifyCanonicalWords(text);
  const pageWords = classifyCanonicalWords(pageRecord.text);
  if (corpusWords.length !== pageWords.length) {
    wordCountMismatches += 1;
    wordCountMismatchDetails.push({
      key,
      page: pageRecord.page,
      quranWordCount: corpusWords.length,
      mushafWordCount: pageWords.length,
      quranWords: corpusWords.map((word) => word.raw),
      mushafWords: pageWords.map((word) => word.raw),
    });
    continue;
  }

  let ayahDiffers = false;
  for (let i = 0; i < corpusWords.length; i += 1) {
    const a = corpusWords[i];
    const b = pageWords[i];
    if (a.skeleton !== b.skeleton) {
      surfaceSkeletonMismatches += 1;
      unalignedWordPairs += 1;
      unalignedAyahs.add(key);
      // Keep every raw unaligned pair in the artifact. Unlike ordinary
      // examples, alignment failures are the audit inventory itself and
      // must never be truncated in the audit artifact.
      surfaceSkeletonMismatchDetails.push({
        key,
        page: pageRecord.page,
        wordIndex: i + 1,
        quranWord: a.raw,
        mushafWord: b.raw,
        quranSkeleton: a.skeleton,
        mushafSkeleton: b.skeleton,
      });
      // Same-index tokens with different letter skeletons are not yet a
      // defensible semantic pair. Preserve the raw pair above, but do not
      // count rule-set or span deltas until a reviewed alignment exists.
      continue;
    }
    wordsCompared += 1;
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
      ruleMismatchDetails.push({
        key, page: pageRecord.page, wordIndex: i + 1,
        quranWord: a.raw, mushafWord: b.raw,
        quranRules: a.rules, mushafRules: b.rules, onlyQuran, onlyMushaf,
      });
    }

    if (a.skeleton && a.skeleton === b.skeleton) {
      const byRuleA = groupByRule(a.spans);
      const byRuleB = groupByRule(b.spans);
      for (const [rule, aSpans] of byRuleA) {
        const bSpans = byRuleB.get(rule) || [];
        for (let j = 0; j < Math.min(aSpans.length, bSpans.length); j += 1) {
          if (aSpans[j].letterOrdinal !== bSpans[j].letterOrdinal) {
            offsetDivergenceCount += 1;
            offsetDivergenceDetails.push({
              key, page: pageRecord.page, wordIndex: i + 1, rule,
              quranWord: a.raw, mushafWord: b.raw,
              quranSpan: aSpans[j], mushafSpan: bSpans[j],
            });
          }
        }
      }
    }
  }
  if (ayahDiffers) affectedAyahs.add(key);
}

console.log(JSON.stringify({
  scope: {
    quranAyahs: quran.size, mushafAyahs: mushaf.size, checkedAyahs,
    wordCountMatchedAyahs: checkedAyahs - wordCountMismatches,
    wordsCompared,
    unalignedWordPairs,
    wordCountMismatches,
    missingFromMushaf: missingFromMushaf.length,
    missingFromQuran: missingFromQuran.length, duplicateQuran: duplicateQuran.length,
    duplicateMushaf: duplicateMushaf.length,
  },
  result: {
    affectedAyahsByRuleSet: affectedAyahs.size,
    ayahsWithUnalignedWords: unalignedAyahs.size,
    differingWords,
    surfaceSkeletonMismatches,
    offsetDivergences: offsetDivergenceCount,
    ruleDeltas: Object.fromEntries([...ruleDeltas.entries()].sort(([a], [b]) => a.localeCompare(b))),
  },
  details: {
    ruleMismatches: ruleMismatchDetails,
    offsetDivergences: offsetDivergenceDetails,
    wordCountMismatchAyahs: wordCountMismatchDetails,
    surfaceSkeletonMismatches: surfaceSkeletonMismatchDetails,
    missingFromMushaf,
    missingFromQuran,
    duplicateQuran,
    duplicateMushaf,
  },
}, null, 2));
