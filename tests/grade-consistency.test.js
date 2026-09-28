/**
 * grade-consistency.test.js — `grade` must not deny what the record itself cites.
 *
 * The failure this pins was not subtle to a reader and was invisible to the
 * suite. 61 records carried `grade: "Unknown"` next to a `reference` reading
 * "Sahih al-Bukhari 6306" or "Sahih Muslim 2708", many with a note that opened
 * "Sahih — narrated by ...". The UI dutifully rendered an *Unverified* chip
 * beside a precise citation into a collection whose own title asserts exactly
 * that grading. tests/grades.test.js only ever tested the chip renderer, so no
 * test in the tree read the corpus and asked whether the two fields agreed.
 *
 * The rule enforced here is deliberately narrow, because the wide version would
 * be a guess: a record in a collection that self-certifies in its own title
 * cannot simultaneously claim it is unverified.
 *
 * The equal-and-opposite error is treated as just as much a defect, and that is
 * the part worth remembering. A grader that only ever promoted records would
 * have passed while quietly filling in grades nobody established — and this
 * project has been wrong in exactly that direction before. So the negative case
 * is pinned by ID.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GRADE_LABELS } from '../js/core/config.js';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = `${ROOT}data`;

/** Collections that assert their own grading in their own title. */
const SAHIH_COLLECTIONS = new Set(['Sahih al-Bukhari', 'Sahih Muslim']);

/**
 * Records that MUST stay `Unknown` despite a Sahih-looking note, because
 * nothing in the citation establishes the grading:
 *   my-06-011 — Musnad Ahmad 17784. That collection contains da'if and mawdu'
 *     material; silence in it is not a sahih claim.
 *   my-13-004 — al-Adab al-Mufrad 707, where al-Albani's grading appears in the
 *     note. Real and attributed, but adopting it is an editorial decision.
 */
const MUST_STAY_UNKNOWN = new Set(['my-06-011', 'my-13-004']);

const items = [];
for (const file of readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(`${DATA}/${file}`, 'utf8'));
  (function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      if ('grade' in node && node.reference) items.push({ ...node, __file: file });
      Object.values(node).forEach((v) => {
        if (v && typeof v === 'object') walk(v);
      });
    }
  })(doc);
}

test('the corpus is actually being read, so this suite is not vacuous', () => {
  // A grade-consistency test that walked zero records would pass forever.
  assert.ok(items.length > 400, `expected the corpus to yield records, got ${items.length}`);
  assert.ok(
    items.some((i) => i.grade === 'Unknown'),
    'expected some records to remain honestly Unknown'
  );
});

test('no record denies the grading of the collection it cites', () => {
  const contradictions = items
    .filter((i) => i.grade === 'Unknown')
    .filter((i) => SAHIH_COLLECTIONS.has(i.reference?.collection))
    .map((i) => `${i.__file} ${i.id} cites ${i.reference.collection} ${i.reference.hadith ?? ''}`);

  assert.deepEqual(
    contradictions,
    [],
    `grade "Unknown" beside a self-certifying citation:\n  ${contradictions.join('\n  ')}`
  );
});

test('the records that must stay Unknown were not promoted', () => {
  const promoted = MUST_STAY_UNKNOWN;
  for (const id of promoted) {
    const item = items.find((i) => i.id === id);
    assert.ok(item, `expected to find ${id} in the corpus — the guard list has gone stale`);
    assert.equal(
      item.grade,
      'Unknown',
      `${id} cites ${item.reference?.collection}, which does not establish a grading on its own`
    );
  }
});

test('every grade is a canonical value from the closed vocabulary', () => {
  const bad = items
    .filter((i) => typeof i.grade !== 'string' || !(i.grade in GRADE_LABELS))
    .map((i) => `${i.__file} ${i.id}: ${JSON.stringify(i.grade)}`);
  assert.deepEqual(bad, [], `grades outside the allowlist:\n  ${bad.join('\n  ')}`);
});

test('the repair is idempotent — running it again would change nothing', () => {
  // The script is committed and re-runnable, so it has to converge. If a
  // future record reintroduces the contradiction the script would fix it, but
  // if the script were non-idempotent it would also be unsafe to re-run.
  const stillBroken = items.filter(
    (i) => i.grade === 'Unknown' && SAHIH_COLLECTIONS.has(i.reference?.collection)
  );
  assert.deepEqual(
    stillBroken.map((i) => i.id),
    [],
    'scripts/repair-grade-vs-collection.mjs --check should agree with this'
  );
});
