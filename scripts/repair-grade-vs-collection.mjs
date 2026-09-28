#!/usr/bin/env node
/**
 * repair-grade-vs-collection.mjs — make `grade` agree with the collection the
 * item already cites.
 *
 * 61 records (not the 13 first sampled) carried `grade: "Unknown"` while their
 * own `reference.collection` read "Sahih al-Bukhari 6306" or "Sahih Muslim
 * 2708", often with a note opening "Sahih — narrated by ...". A reader opening
 * the most-recited supitation in Sunni practice was shown an "Unverified" chip
 * beside a precise citation into a collection whose own title and whose own
 * preambles assert exactly that grading. That is the app contradicting itself
 * on the one thing it is not allowed to be vague about.
 *
 * WHAT THIS DOES NOT DO
 * It does not go looking for grades. It reads the citation the record already
 * carries and stops the record from denying it. The information was already in
 * the data; this only stops the two fields from disagreeing.
 *
 * THE SCOPE IS DELIBERATELY TWO COLLECTIONS
 * `Sahih al-Bukhari` and `Sahih Muslim` self-certify in their own titles. A
 * record in one of them is sahih by the collection's own assertion, so
 * `grade: "Sahih"` follows from the citation rather than from anyone's memory.
 *
 * Everything else is left exactly as it was, and the two cases that would have
 * been wrong to promote are left alone on purpose:
 *   - `my-06-011` cites Musnad Ahmad 17784, which contains da'if and mawdu'
 *     material. A note in that collection saying nothing is not a sahih claim.
 *   - `my-13-004` cites al-Adab al-Mufrad 707 with al-Albani's grading in the
 *     note. That is a real attributed grading, but attributing it is a
 *     scholarly editorial decision, not a mechanical one. It stays `Unknown`
 *     and the note keeps carrying the attribution.
 *
 * Usage:  node scripts/repair-grade-vs-collection.mjs           (report)
 *         node scripts/repair-grade-vs-collection.mjs --write   (apply)
 *         node scripts/repair-grade-vs-collection.mjs --check   (exit 1 if any remain)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');

/** Collections that assert their own grading in their own title. */
const SAHIH_COLLECTIONS = new Set(['Sahih al-Bukhari', 'Sahih Muslim']);

const mode = process.argv[2] ?? 'report';

const walk = (node, visit) => {
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, visit));
  } else if (node && typeof node === 'object') {
    if ('grade' in node && node.reference) visit(node);
    Object.values(node).forEach((v) => {
      if (v && typeof v === 'object') walk(v, visit);
    });
  }
};

const touched = [];
let filesChanged = 0;

for (const file of readdirSync(DATA)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const path = join(DATA, file);
  const before = readFileSync(path, 'utf8');
  const doc = JSON.parse(before);
  let changed = 0;

  walk(doc, (item) => {
    if (item.grade !== 'Unknown') return;
    const collection = item.reference?.collection;
    if (!SAHIH_COLLECTIONS.has(collection)) return;
    item.grade = 'Sahih';
    changed += 1;
    touched.push({
      id: item.id ?? '?',
      file,
      collection,
      hadith: item.reference?.hadith ?? item.reference?.number ?? '?',
    });
  });

  if (!changed) continue;
  filesChanged += 1;
  if (mode === '--write') {
    writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  }
}

if (mode === '--write') {
  console.log(`repaired ${touched.length} records across ${filesChanged} files:`);
  for (const t of touched) {
    console.log(`  ${t.file.padEnd(14)} ${t.id.padEnd(14)} ${t.collection} ${t.hadith}`);
  }
} else if (mode === '--check') {
  if (touched.length) {
    console.error(`${touched.length} records still contradict their own citation:`);
    for (const t of touched.slice(0, 20)) {
      console.error(`  ${t.file} ${t.id} cites ${t.collection} ${t.hadith}`);
    }
    process.exit(1);
  }
  console.log('no record denies the grading of the collection it cites');
} else {
  console.log(`${touched.length} records would be repaired across ${filesChanged} files:`);
  for (const t of touched.slice(0, 12)) {
    console.log(`  ${t.file.padEnd(14)} ${t.id.padEnd(14)} ${t.collection} ${t.hadith}`);
  }
  if (touched.length > 12) console.log(`  ... and ${touched.length - 12} more`);
}
