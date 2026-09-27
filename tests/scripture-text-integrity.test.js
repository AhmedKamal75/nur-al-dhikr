import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const dataDir = new URL('../data/', import.meta.url);
// Plain JSON only — the .gz twins are binary and are checked byte-for-byte
// against these files in the parity test below.
const files = [
  ...readdirSync(new URL('quran/', dataDir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `quran/${name}`),
  ...readdirSync(new URL('mushaf/', dataDir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `mushaf/${name}`),
  ...readdirSync(new URL('hadith/', dataDir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `hadith/${name}`),
];

test('scripture corpora contain no replacement or control characters', () => {
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, dataDir), 'utf8');
    if (text.includes('\uFFFD') || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, []);
});

test('every shipped scripture gzip twin matches its plain JSON bytes', () => {
  for (const file of files) {
    const plain = readFileSync(new URL(file, dataDir));
    const packed = gunzipSync(readFileSync(new URL(`${file}.gz`, dataDir)));
    assert.deepEqual(packed, plain, `${file}.gz is stale`);
  }
});

test('repaired Mushaf verses carry the expected verified words', () => {
  const expectations = {
    '24.json': ['2:156', 'مُّصِيبَةٞ'],
    '46.json': ['2:273', 'يَسۡـَٔلُونَ'],
    '91.json': ['4:81', 'ۚ'],
    '92.json': ['4:89', 'أَوۡلِيَآءَ'],
    '113.json': ['5:36', 'لِيَفۡتَدُوا۟'],
    '136.json': ['6:73', 'ٱلصُّورِ'],
    '156.json': ['7:50', 'ٱلۡمَآءِ'],
    '243.json': ['12:69', 'إِنِّىٓ'],
    '265.json': ['15:53', 'غَلِيمٍ'],
    '309.json': ['19:58', 'وَمِن'],
    '485.json': ['42:21', 'لَهُم'],
    '524.json': ['52:18', 'وَوَقَىٰهُمْ'],
    '530.json': ['54:41', 'ٱلنُّذُرُ'],
    '549.json': ['60:4', 'وَمَآ'],
  };
  for (const [name, [ref, word]] of Object.entries(expectations)) {
    const page = JSON.parse(readFileSync(new URL(`mushaf/${name}`, dataDir), 'utf8'));
    const [surah, ayah] = ref.split(':').map(Number);
    const text = page.chapters
      .find((chapter) => chapter.number === surah)
      ?.verses.find((verse) => verse.number === ayah)?.text;
    assert.ok(text?.includes(word), `${ref} contains ${word}`);
  }
});
