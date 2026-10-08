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

  for (const row of corpus) {
    const result = classifyAyahTajweed(row.text);
    assert.equal(
      result.length,
      row.text.trim().split(/\s+/).filter(Boolean).length,
      `word-count mismatch at ${row.surah}:${row.ayah}`
    );

    for (const word of result) {
      assert.ok(Number.isInteger(word.wordIndex) && word.wordIndex > 0);
      for (const span of word.spans) {
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
        spanCount += 1;
      }
    }
  }

  assert.ok(spanCount > 0, 'corpus sweep produced no Tajweed spans');
  for (const rule of TAJWEED_RULES) {
    assert.ok(seen.has(rule.id), `rule is unreachable in the real Quran corpus: ${rule.id}`);
  }
});
