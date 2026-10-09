/**
 * Corpus-wide Tajweed execution sweep.
 *
 * This is an execution/invariant test, not a scholarly oracle. It runs every
 * bundled Qur'an ayah through the classifier and catches crashes, invalid
 * spans, unknown rule ids, broken word-boundary plumbing, and rules that
 * become unreachable in real corpus text. A scholarly reference comparison
 * remains a separate audit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyAyahTajweed, TAJWEED_RULES } from '../js/domain/tajweed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QURAN_DIR = path.join(ROOT, 'data', 'quran');
const KNOWN_RULES = new Set(TAJWEED_RULES.map((r) => r.id));

function loadCorpus() {
  const files = fs
    .readdirSync(QURAN_DIR)
    .filter((name) => /^\d+\.json$/.test(name))
    .sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
  assert.equal(files.length, 114, 'bundled Quran corpus must contain all 114 surahs');

  const ayahs = [];
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(QURAN_DIR, file), 'utf8'));
    assert.ok(Array.isArray(payload.ayahs), `invalid Quran file: ${file}`);
    for (const ayah of payload.ayahs) {
      assert.equal(typeof ayah.text, 'string', `missing ayah text: ${file}:${ayah.number}`);
      ayahs.push({ surah: payload.number, ayah: ayah.number, text: ayah.text });
    }
  }
  return ayahs;
}

test('every bundled Quran ayah executes through the Tajweed classifier', () => {
  const corpus = loadCorpus();
  assert.equal(corpus.length, 6236, 'bundled Quran corpus must contain 6,236 ayahs');

  const seen = new Set();
  let spanCount = 0;
  const ruleCounts = new Map();
  let multiRuleSameUnit = 0;
  const multiRulePairs = new Map();
  let bareQalqalahSpans = 0;
  const qlqBoundaryPairs = new Map();
  const qlqBoundaryExamples = new Map();

  for (const row of corpus) {
    const rawWords = row.text.trim().split(/\s+/).filter(Boolean);
    const semanticWordIndexes = rawWords
      .map((word, i) => (/[\p{L}]/u.test(word) ? i : -1))
      .filter((i) => i >= 0);
    const nextSemanticIndex = new Map();
    for (let i = 0; i < semanticWordIndexes.length - 1; i += 1) {
      nextSemanticIndex.set(semanticWordIndexes[i], semanticWordIndexes[i + 1]);
    }

    const result = classifyAyahTajweed(row.text);
    assert.equal(
      result.length,
      row.text.trim().split(/\s+/).filter(Boolean).length,
      `word-count mismatch at ${row.surah}:${row.ayah}`
    );

    for (const word of result) {
      assert.ok(Number.isInteger(word.wordIndex) && word.wordIndex > 0);
      const seenSpanKeys = new Set();
      const spansByUnit = new Map();
      for (const span of word.spans) {
        const spanKey = span.start + ':' + span.end + ':' + span.rule;
        assert.ok(!seenSpanKeys.has(spanKey),
          'duplicate Tajweed span ' + spanKey + ' at ' + row.surah + ':' + row.ayah + ' word ' + word.wordIndex);
        seenSpanKeys.add(spanKey);
        const unitKey = span.start + ':' + span.end;
        const prior = spansByUnit.get(unitKey) || [];
        if (prior.length > 0) {
          multiRuleSameUnit += 1;
          const pairKey = [...prior, span.rule].sort().join('+');
          multiRulePairs.set(pairKey, (multiRulePairs.get(pairKey) || 0) + 1);
        }
        prior.push(span.rule);
        spansByUnit.set(unitKey, prior);
        assert.ok(KNOWN_RULES.has(span.rule),
          `unknown Tajweed rule ${span.rule} at ${row.surah}:${row.ayah}`);
        assert.ok(Number.isInteger(span.start) && Number.isInteger(span.end));
        assert.ok(
          span.start >= 0 &&
          span.end > span.start &&
          span.end <= word.word.length,
          `invalid span ${JSON.stringify(span)} at ${row.surah}:${row.ayah}`
        );
        seen.add(span.rule);
        ruleCounts.set(span.rule, (ruleCounts.get(span.rule) || 0) + 1);
        spanCount += 1;

        if (span.rule === 'qalqalah') {
          const renderedSpan = word.word.slice(span.start, span.end);
          // Include corpus-attested subscript/inverted tanween variants (U+0656/U+0657/U+065E);
          // otherwise a marked consonant can be misreported as a bare Qalqalah letter.
          if (!/[\\u064B-\\u065E\\u0670\\u06E1\\u06E2\\u06ED\\u06E4]/u.test(renderedSpan)) {
            bareQalqalahSpans += 1;
          }

          const nextIndex = nextSemanticIndex.get(word.wordIndex - 1);
          if (nextIndex !== undefined) {
            const nextWord = rawWords[nextIndex];
            const firstLetter = [...nextWord].find(
              (ch) => /\p{L}/u.test(ch) && /\p{Script=Arabic}/u.test(ch)
            );
            const wordLetters = [...word.word].map((ch, i) => ({
              ch,
              i,
            })).filter(({ ch }) => /\p{L}/u.test(ch) && /\p{Script=Arabic}/u.test(ch));
            const lastLetter = wordLetters.at(-1);
            if (lastLetter && span.start === lastLetter.i) {
              const pair = renderedSpan[0] + '->' + (firstLetter || '?');
              qlqBoundaryPairs.set(pair, (qlqBoundaryPairs.get(pair) || 0) + 1);
              const examples = qlqBoundaryExamples.get(pair) || [];
              if (examples.length < 12) {
                examples.push({
                  surah: row.surah,
                  ayah: row.ayah,
                  word: word.word,
                  nextWord,
                });
                qlqBoundaryExamples.set(pair, examples);
              }
            }
          }
        }
      }
    }
  }

  assert.ok(spanCount > 0, 'corpus sweep produced no Tajweed spans');
  assert.equal(
    bareQalqalahSpans,
    2,
    'after the exact ٱرۡكَب مَّعَنَا exception, only the two known ayah-final pause spans should be unmarked'
  );
  for (const rule of TAJWEED_RULES) {
    assert.ok(seen.has(rule.id), `rule is unreachable in the real Quran corpus: ${rule.id}`);
  }

  // Same-unit overlaps are not automatically classifier errors: tanween can
  // share a written unit with shaddah-ghunnah. Pin the four observed collisions
  // so any new pair forces deliberate review of the painter/inspector precedence.
  assert.deepEqual(
    [...multiRulePairs.entries()].sort(([a], [b]) => a.localeCompare(b)),
    [
      ['ghunnah+idgham_ghunnah', 3],
      ['ghunnah+idgham_no_ghunnah', 1],
    ],
    'same-unit Tajweed rule pairs changed; review rule overlap and rendering precedence'
  );

  console.log(JSON.stringify({
    corpusAyahs: corpus.length,
    spanCount,
    ruleCounts: Object.fromEntries([...ruleCounts.entries()].sort()),
    multiRuleSameUnit,
    multiRulePairs: Object.fromEntries([...multiRulePairs.entries()].sort()),
    bareQalqalahSpans,
    qlqBoundaryPairs: Object.fromEntries([...qlqBoundaryPairs.entries()].sort()),
    qlqBoundaryExamples: Object.fromEntries([...qlqBoundaryExamples.entries()].sort()),
  }, null, 2));
});
