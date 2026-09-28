/**
 * open-issues-ledger.test.js — the ledger must not lie about itself
 * (v5.17.23)
 *
 * docs/OPEN-ISSUES.md states its own totals in a header AND in a summary
 * table, in prose as well as in the ledger rows. Over several sessions those
 * three copies drifted apart, and a second hostile review found the summary
 * claiming 20 open where the recounted header said 11, naming three
 * "release-gating" items the table had already marked resolved, and
 * attaching an honest-absence claim to three libraries that contain zero
 * Unknown grades.
 *
 * A document whose counts disagree with its own contents is worse than no
 * document, because it is trusted. This test makes the numbers in the prose
 * derive from the table, and refuses a total that does not add up.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'docs/OPEN-ISSUES.md'), 'utf8');

/** The ledger rows: | n | item | STATUS | evidence | */
const ROWS = src
  .split('\n')
  .filter((l) => /^\|\s*\d+[a-z]?\s*\|/.test(l))
  .map((l) => {
    const cells = l.split('|').map((c) => c.trim());
    return { id: cells[1], status: (cells[3] || '').replace(/\*/g, '').trim() };
  });

/** Collapse the status cell to one of the buckets the header names. */
function bucketOf(status) {
  if (/^RESOLVED/.test(status)) return 'RESOLVED';
  if (/^DEFERRED/.test(status)) return 'DEFERRED';
  if (/^BLOCKED:scholar/.test(status)) return 'BLOCKED:scholar';
  if (/^BLOCKED:device/.test(status)) return 'BLOCKED:device';
  if (/^DECIDED-NO/.test(status)) return 'DECIDED-NO';
  if (/^STANDING CONSTRAINT/.test(status)) return 'STANDING CONSTRAINT';
  if (/^PROPOSED/.test(status)) return 'PROPOSED';
  if (/^OPEN/.test(status)) return 'OPEN';
  return `UNPARSED:${status}`;
}

const counted = {};
for (const r of ROWS) {
  const b = bucketOf(r.status);
  counted[b] = (counted[b] || 0) + 1;
}

test('every ledger row parses into a known bucket', () => {
  const bad = ROWS.filter((r) => bucketOf(r.status).startsWith('UNPARSED')).map(
    (r) => `${r.id}=${r.status}`
  );
  assert.deepEqual(bad, [], `rows with an unrecognised status: ${bad.join(', ')}`);
  assert.ok(ROWS.length >= 40, `the ledger should not have shrunk to ${ROWS.length} rows`);
});

test('the header totals match the table', () => {
  const header = /\*\*(\d+) rows —([^*]*)\*\*/.exec(src);
  assert.ok(header, 'the header must state its own totals, so they can be checked');

  const claims = {};
  // Strip the block-quote markers first: the header is a multi-line
  // '> ' quote, so a bucket name can be split across lines by '> '
  // between its two words. Matching the raw text silently dropped it.
  const headerText = header[2].replace(/\n\s*>\s*/g, ' ').replace(/\s+/g, ' ');
  for (const m of headerText.matchAll(
    /(\d+) (OPEN|PROPOSED|DEFERRED|DECIDED-NO|RESOLVED|STANDING CONSTRAINT|BLOCKED:scholar|BLOCKED:device)/g
  )) {
    claims[m[2].replace(/\s+/g, ' ')] = Number(m[1]);
  }
  const problems = [];
  for (const [bucket, claimed] of Object.entries(claims)) {
    const actual = counted[bucket] || 0;
    if (claimed !== actual) problems.push(`${bucket}: header says ${claimed}, rows say ${actual}`);
  }
  const summed = Object.values(claims).reduce((a, b) => a + b, 0);
  if (summed !== ROWS.length) {
    problems.push(`the header's buckets sum to ${summed} but the table has ${ROWS.length} rows`);
  }
  assert.deepEqual(
    problems,
    [],
    `docs/OPEN-ISSUES.md does not agree with itself:\n  ${problems.join('\n  ')}`
  );
});

test('the summary table agrees with the ledger too', () => {
  // The summary block is prose-with-a-table, and it is the copy people read
  // first, so it gets the same treatment as the header.
  const summary = src.slice(src.indexOf('## The honest summary'));
  const problems = [];
  for (const [label, bucket] of [
    ['OPEN', 'OPEN'],
    ['PROPOSED', 'PROPOSED'],
    ['BLOCKED:scholar', 'BLOCKED:scholar'],
    ['BLOCKED:device', 'BLOCKED:device'],
  ]) {
    // Escape the whole label, so BLOCKED:scholar's colon is literal rather
    // than a regex quantifier.
    const escaped = label.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');
    const row = new RegExp(`\\*\\*${escaped}\\*\\*[^|]*\\|\\s*\\*\\*(\\d+)\\*\\*`, 'i').exec(
      summary
    );
    if (!row) {
      problems.push(`the summary has no row for ${label}`);
      continue;
    }
    const claimed = Number(row[1]);
    const actual = counted[bucket] || 0;
    if (claimed !== actual) problems.push(`summary ${label}: says ${claimed}, rows say ${actual}`);
  }
  assert.deepEqual(
    problems,
    [],
    `the honest summary disagrees with the table:\n  ${problems.join('\n  ')}`
  );
});

test('no row is left asserting a gate that already exists', () => {
  // The three stale claims a review caught, named so they cannot come back
  // as confident prose. Each was verified against the tree.
  const row32 = ROWS.find((r) => r.id === '32');
  assert.ok(row32, 'row 32 must exist');
  assert.match(
    row32.status,
    /^RESOLVED/,
    'row 32 asserted that three libraries display as Unknown; they contain none'
  );
  const summary = src.slice(src.indexOf('## The honest summary'));
  assert.equal(
    /single highest-risk one is \*\*`http:\/\/` custom audio servers\*\*/.test(src),
    false,
    'the prose still names a gate as highest-risk when audioCatalog.js has required https since v5.13.0'
  );
  assert.equal(
    /Of the 27, two are release-gating/.test(summary),
    false,
    'the summary still names two resolved items as release-gating'
  );
});
