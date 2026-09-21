/** Full-corpus Quran word-study coverage gate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dictEntryFor, materializeWordStudy, rootStudyEntryFor } from '../js/domain/wordStudy.js';
import { SEED_MODE } from './helpers/seedMode.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

function assertTokenStudy(word, row, surah, ayah) {
  assert.ok(row, `${surah}:${ayah}:${word.i} missing token study row`);
  assert.equal(typeof row.mA, 'string', `${surah}:${ayah}:${word.i} contextual Arabic missing`);
  assert.ok(row.mA.trim(), `${surah}:${ayah}:${word.i} contextual Arabic empty`);
  assert.equal(typeof row.iA, 'string', `${surah}:${ayah}:${word.i} Arabic i'rab missing`);
  assert.ok(row.iA.trim(), `${surah}:${ayah}:${word.i} Arabic i'rab empty`);
  assert.equal(typeof row.iE, 'string', `${surah}:${ayah}:${word.i} English i'rab missing`);
  assert.ok(row.iE.trim(), `${surah}:${ayah}:${word.i} English i'rab empty`);
  assert.equal(typeof word.en, 'string', `${surah}:${ayah}:${word.i} English translation missing`);
  assert.ok(word.en.trim(), `${surah}:${ayah}:${word.i} English translation empty`);
}

test(`Quran word-study coverage: ${SEED_MODE ? 'seed corpus' : 'all 77,429 tokens'}`, () => {
  const meta = readJSON('data/quran-word-study/index.json');
  const roots = readJSON('data/quran-roots-meaning.json').entries;
  const dict = readJSON('data/quran-dict.json').entries;
  const selected = SEED_MODE
    ? readJSON('data/seed.json').surahs || [1, 32, 112]
    : Array.from({ length: 114 }, (_, i) => i + 1);
  let tokenCount = 0;
  for (const s of selected) {
    const wordsDoc = readJSON(`data/quran-words/${s}.json`);
    const studyDoc = readJSON(`data/quran-word-study/${s}.json`);
    for (const [a, words] of Object.entries(wordsDoc)) {
      const studyRows = new Map((studyDoc[a] || []).map((r) => [Number(r.i), r]));
      for (const word of words) {
        const row = studyRows.get(Number(word.i));
        assertTokenStudy(word, row, s, a);
        const dictEntry = word.lemma ? dictEntryFor({ index: dict }, word.lemma) : null;
        if (word.lemma)
          assert.ok(dictEntry, `${s}:${a}:${word.i} lemma dictionary missing: ${word.lemma}`);
        const rootEntry = rootStudyEntryFor({ index: roots }, word.root);
        if (word.root) {
          assert.ok(rootEntry, `${s}:${a}:${word.i} root dictionary missing: ${word.root}`);
          assert.ok(rootEntry.rootLetters?.length, `${s}:${a}:${word.i} root letters missing`);
          assert.ok(
            rootEntry.classicalUsageAr && rootEntry.classicalUsageEn,
            `${s}:${a}:${word.i} classical usage missing`
          );
          assert.ok(
            rootEntry.quranicBridgeAr && rootEntry.quranicBridgeEn,
            `${s}:${a}:${word.i} Quranic bridge missing`
          );
        }
        const materialized = materializeWordStudy(
          word,
          {
            contextualMeaning: { ar: row.mA, source: row.mSrc },
            irab: { ar: row.iA, en: row.iE, source: row.iSrc },
          },
          dictEntry,
          rootEntry
        );
        assert.ok(
          materialized?.englishTranslation,
          `${s}:${a}:${word.i} materialized English missing`
        );
        assert.ok(
          materialized?.irab?.ar && materialized?.irab?.en,
          `${s}:${a}:${word.i} materialized i'rab missing`
        );
        assert.ok(
          materialized?.etymology?.classicalUsageAr && materialized?.etymology?.classicalUsageEn,
          `${s}:${a}:${word.i} etymology/rootless policy missing`
        );
        assert.ok(
          materialized?.etymology?.quranicBridgeAr && materialized?.etymology?.quranicBridgeEn,
          `${s}:${a}:${word.i} Quranic bridge/rootless policy missing`
        );
        assert.equal(materialized.antonyms.hasDirectAntonym, Boolean(dictEntry?.ant?.length));
        assert.ok(
          materialized.antonyms.hasDirectAntonym || materialized.antonyms.noteAr,
          `${s}:${a}:${word.i} antonym/no-antonym state missing`
        );
        tokenCount++;
      }
    }
  }
  assert.equal(
    meta.tokenCount,
    SEED_MODE ? tokenCount : 77429,
    'token-study manifest count must match the loaded corpus'
  );
  assert.equal(
    tokenCount,
    SEED_MODE
      ? selected.reduce(
          (sum, s) =>
            sum +
            Object.values(readJSON(`data/quran-words/${s}.json`)).reduce((n, a) => n + a.length, 0),
          0
        )
      : 77429
  );
});
