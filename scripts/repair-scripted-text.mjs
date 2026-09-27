/**
 * scripts/repair-scripted-text.mjs — the P0 scripture repair, kept
 * reproducible and idempotent.
 *
 *   node scripts/repair-scripted-text.mjs [upstreamDir]
 *
 * The 14 Mushaf repairs are self-contained: each entry names the page, the
 * exact token index and the verified word (recovered from the bundled
 * Qur'an corpus, checked against the page's own verse). A token that
 * already reads correctly is skipped; a token that is NOT corrupted is a
 * hard error — the script never rewrites healthy text.
 *
 * The Hadeeth repairs need the recovered sunnah.com Arabic, which is not
 * bundled (third-party text). Pass a directory holding
 * `hadith-sunnah.json` — an array of {book, n, text} rows — to re-apply
 * them; without it the script repairs the Mushaf pages only and leaves
 * Hadeeth untouched. It never guesses: a missing or corrupt recovery row
 * throws instead of inventing text.
 *
 * Afterwards run `npm run compress-data` and `npm run manifest:generate`;
 * tests/scripture-text-integrity.test.js is the permanent gate.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const replacementChar = '\uFFFD';
const upstreamDir = process.argv[2] || '';
const mushafRepairs = {
  '2:156': [24, 3, 'مُّصِيبَةٞ'],
  '2:273': [46, 19, 'يَسۡـَٔلُونَ'],
  '4:81': [91, 12, 'ۚ'],
  '4:89': [92, 11, 'أَوۡلِيَآءَ'],
  '5:36': [113, 12, 'لِيَفۡتَدُوا۟'],
  '6:73': [136, 20, 'ٱلصُّورِ'],
  '7:50': [156, 9, 'ٱلۡمَآءِ'],
  '12:69': [243, 9, 'إِنِّىٓ'],
  '15:53': [265, 6, 'غَلِيمٍ'],
  '19:58': [309, 14, 'وَمِن'],
  '42:21': [485, 4, 'لَهُم'],
  '52:18': [524, 4, 'وَوَقَىٰهُمْ'],
  '54:41': [530, 4, 'ٱلنُّذُرُ'],
  '60:4': [549, 38, 'وَمَآ'],
};

function readJSON(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJSON(file, value) {
  const trailingNewline = readFileSync(file, 'utf8').endsWith('\n');
  writeFileSync(file, JSON.stringify(value) + (trailingNewline ? '\n' : ''));
}

let repaired = 0;
for (const [ref, [pageNumber, tokenIndex, value]] of Object.entries(mushafRepairs)) {
  const [surah, ayah] = ref.split(':').map(Number);
  const file = path.join(root, 'data', 'mushaf', `${pageNumber}.json`);
  const page = readJSON(file);
  const chapter = page.chapters.find((row) => row.verses.some((verse) => verse.number === ayah));
  if (!chapter || chapter.number !== surah) throw new Error(`Missing mushaf verse ${ref}`);
  const entry = chapter.verses.find((row) => row.number === ayah);
  const tokens = entry.text.split(/\s+/);
  if (tokenIndex >= tokens.length) throw new Error(`Missing token ${tokenIndex} in ${ref}`);
  if (tokens[tokenIndex] === value) continue;
  if (!tokens[tokenIndex].includes(replacementChar)) {
    throw new Error(`Expected corruption at ${ref} token ${tokenIndex}`);
  }
  tokens[tokenIndex] = value;
  entry.text = tokens.join(' ');
  if (entry.text.includes(replacementChar)) throw new Error(`Corruption remains in ${ref}`);
  writeJSON(file, page);
  repaired += 1;
}

if (upstreamDir) {
  const recoveries = JSON.parse(readFileSync(path.join(upstreamDir, 'hadith-sunnah.json'), 'utf8'));
  const byKey = new Map(recoveries.map((row) => [`${row.book}:${row.n}`, row]));
  for (const book of ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah']) {
    const file = path.join(root, 'data', 'hadith', `${book}.json`);
    const local = readJSON(file);
    for (const row of local.hadiths) {
      if (!row.ar.includes(replacementChar)) continue;
      if (book === 'muslim' && String(row.n) === '7512') {
        const repairedText = row.ar.replace('��َجُلٌ', 'رَجُلٌ');
        if (repairedText === row.ar || repairedText.includes(replacementChar)) {
          throw new Error('Expected singular man phrase not found in muslim#7512');
        }
        row.ar = repairedText;
        repaired += 1;
        continue;
      }
      const recovery = byKey.get(`${book}:${row.n}`);
      if (!recovery || recovery.error || typeof recovery.text !== 'string') {
        throw new Error(`No verified sunnah.com Arabic for ${book}#${row.n}`);
      }
      if (recovery.text.includes(replacementChar)) {
        throw new Error(`Corrupt recovery source for ${book}#${row.n}`);
      }
      row.ar = recovery.text;
      repaired += 1;
    }
    writeJSON(file, local);
  }
}

console.log(`repaired ${repaired} scripture fields`);
