/** Seed-bundle contract: the slim archive is intentionally tiny but runnable. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_MODE } from './helpers/seedMode.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const seedSurahs = [1, 32, 112];

if (SEED_MODE) {
  test('seed manifest is explicit and minimal', () => {
    const seed = readJSON('data/seed.json');
    assert.deepEqual(seed.surahs, seedSurahs);
    assert.equal(seed.adhkarItems, 15);
    assert.equal(seed.hadithSamples, 6);
  });

  test('only seed Quran, word, and word-study surahs are shipped', () => {
    for (const dir of ['data/quran', 'data/quran-words', 'data/quran-word-study']) {
      const files = readdirSync(path.join(ROOT, dir)).filter((f) => /^\d+\.json$/.test(f));
      assert.deepEqual(
        files.sort(),
        seedSurahs
          .map(String)
          .map((n) => `${n}.json`)
          .sort(),
        dir
      );
    }
  });

  test('adhkar seed contains exactly 15 items and all are schema-shaped', () => {
    const doc = readJSON('data/adhkar.json');
    const items = (doc.categories || []).flatMap((c) => c.items || []);
    assert.equal(items.length, 15);
    assert.ok(items.every((it) => it.arabic && it.title?.en && it.title?.ar && it.translation?.en));
  });

  test('hadith seed contains six Nawawi samples and keeps other canonical books remote', () => {
    const idx = readJSON('data/hadith/index.json');
    const naw = readJSON('data/hadith/nawawi.json');
    const sample = readJSON('data/hadith/seed-samples.json');
    assert.equal(naw.hadiths.length, 6);
    assert.equal(sample.count, 6);
    assert.equal(sample.hadiths.length, 6);
    assert.equal(idx.books.find((b) => b.id === 'nawawi')?.count, 6);
    assert.equal(idx.books.filter((b) => b.bundled).length, 1);
  });

  test('tafsir/grammar seed files are limited to the three seed surahs', () => {
    const ids = readdirSync(path.join(ROOT, 'data/tafsir'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const id of ids) {
      const numeric = readdirSync(path.join(ROOT, 'data/tafsir', id)).filter((f) =>
        /^\d+\.json$/.test(f)
      );
      assert.deepEqual(
        numeric.sort(),
        seedSurahs
          .map(String)
          .map((n) => `${n}.json`)
          .sort(),
        id
      );
    }
  });
} else {
  test('full tree does not carry a seed marker', () => {
    assert.equal(existsSync(path.join(ROOT, 'data/seed.json')), false);
  });
}
