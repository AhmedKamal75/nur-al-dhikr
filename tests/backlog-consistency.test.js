/**
 * backlog-consistency.test.js — the backlog must be true (v5.17.24)
 *
 * The owner asked for the goals, the backlog and the open issues to be
 * durable artefacts rather than something living in one agent's memory. That
 * only works if they cannot drift, so this cross-checks docs/BACKLOG.md
 * against docs/OPEN-ISSUES.md and against the tree.
 *
 * A backlog that claims a closure the tree does not have is worse than no
 * backlog, because it is the thing people plan from.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const backlog = read('docs/BACKLOG.md');
const ledger = read('docs/OPEN-ISSUES.md');

/** Ledger rows, parsed once. */
const ROWS = ledger
  .split('\n')
  .filter((l) => /^\|\s*\d+[a-z]?\s*\|/.test(l))
  .map((l) => {
    const c = l.split('|').map((x) => x.trim());
    return { id: c[1], item: c[2] || '', status: (c[3] || '').replace(/\*/g, '').trim() };
  });

test('the backlog states the version the tree is actually on', () => {
  const actual = JSON.parse(read('package.json')).version;
  const claimed = /Current version: \*\*v([\d.]+)\*\*/.exec(backlog);
  assert.ok(claimed, 'the backlog must state its version, so staleness is visible');
  assert.equal(claimed[1], actual, `the backlog says v${claimed[1]}, package.json says ${actual}`);
});

test('the backlog points at a ledger that exists and has rows', () => {
  assert.ok(backlog.includes('OPEN-ISSUES.md'), 'the backlog must point at the detailed ledger');
  assert.ok(ROWS.length >= 40, `the ledger should not have shrunk to ${ROWS.length} rows`);
  const claimed = /(\d+) rows/.exec(backlog);
  assert.ok(claimed, 'the backlog must state the ledger size');
  assert.equal(Number(claimed[1]), ROWS.length, 'the backlog miscounts the ledger');
});

test('every OPEN ledger row is either listed as open or explicitly not open here', () => {
  // A backlog that quietly stops mentioning an open row is how a real issue
  // gets lost. Any OPEN row must be visible in the backlog's open section.
  const openSection = backlog.slice(backlog.indexOf('## 4. Known, accepted, and still open'));
  const missing = ROWS.filter((r) => /^OPEN/.test(r.status)).filter(
    (r) => !openSection.includes(r.item.slice(0, 18)) && !openSection.includes(r.id)
  );
  assert.deepEqual(
    missing.map((r) => `${r.id} ${r.item.slice(0, 40)}`),
    [],
    'open ledger rows absent from the backlog open section'
  );
});

test('the backlog records the score history it claims', () => {
  // \s+ everywhere: prettier pads the table columns, and a strict single
  // space silently matched zero rows — which would have made this test
  // vacuous, the worst kind of green.
  const rows = [...backlog.matchAll(/^\|\s*\d+\s*\|\s*v([\d.]+)\s*\|\s*\*\*(\d\.\d)\*\*.*$/gm)];
  assert.ok(
    rows.length >= 3,
    `the score history should have at least three reviews, found ${rows.length}`
  );
  const scores = rows.map((r) => Number(r[2]));
  // Scores should rise, or at least hold. When one does NOT, the history has to
  // say so in the same row rather than smoothing it over — a silent dip is how
  // a table starts lying again. The gate is therefore not "never regress" but
  // "never regress quietly".
  //
  // (v5.17.26) This test previously failed the moment review 4 came back at
  // 8.7 against 8.8, and the tempting fix was to round the number up. The
  // score is the score. Naming the dip is the honest move, so the test now
  // accepts a regression that is explicitly acknowledged.
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] >= scores[i - 1]) continue;
    const row = rows[i][0];
    assert.match(
      row,
      /REGRESSION|regressed|went down|lower than/i,
      `review ${i + 1} scored ${scores[i]} against ${scores[i - 1]} — a regression that this row must name explicitly`
    );
  }
});

test('every review finding marked fixed has a test named for it', () => {
  // "Fixed" in this project is a test that fails without the change. A row
  // claiming a fix with no named proof is a claim, not a closure.
  const testFiles = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.js'));
  const e2e = fs.readdirSync(path.join(root, 'tests/e2e')).filter((f) => f.endsWith('.spec.js'));
  const available = new Set([...testFiles, ...e2e].map((f) => f.replace(/\.(test|spec)\.js$/, '')));
  const rows = backlog
    .split('\n')
    .filter((l) => /^\| .*\*\*fixed\*\*/.test(l) || /\| .*\| \*\*fixed\*\* \|/.test(l));
  assert.ok(rows.length >= 8, `expected many fixed rows, found ${rows.length}`);
  const unnamed = [];
  for (const row of rows) {
    // A fixed row must cite at least one real test file by name.
    const cited = [
      ...row.matchAll(/tests\/[\w./-]+?\.(test|spec)\.js|\b([a-z-]+)\.(test|spec)\.js/g),
    ];
    if (cited.length === 0) {
      unnamed.push(row.split('|')[1].trim().slice(0, 46));
      continue;
    }
    const known = cited.some((m) =>
      available.has((m[0].split('/').pop() || '').replace(/\.(test|spec)\.js$/, ''))
    );
    if (!known)
      unnamed.push(`${row.split('|')[1].trim().slice(0, 30)} (cites a test that does not exist)`);
  }
  assert.deepEqual(unnamed, [], `fixed rows without a real named test:\n  ${unnamed.join('\n  ')}`);
});

test('the backlog does not claim the 9.1 gate has been met', () => {
  // The gate is the owner's, and until a review says otherwise it is unmet.
  // Writing "9.1 met" into the backlog would be a claim no test can verify.
  assert.equal(
    /every scored criterion above \*\*9\.1\/10\*\*\s*\|[^|]*\|\s*(Met|met|Done|done|Achieved)/.test(
      backlog
    ),
    false,
    'the backlog must not record the 9.1 gate as met without a review number that says so'
  );
  assert.match(backlog, /8\.0 → 8\.2 → 8\.8/, 'the real score history must be present');
});

test('the deliberate non-fixes are recorded as decisions, not omissions', () => {
  // Each of these was raised by a review and consciously not changed. If a
  // future agent changes one, the reason should be gone with it.
  for (const needle of [
    'No per-dhikr audio',
    'Prayer methodology depth',
    '200% type does not reach the mushaf',
    'Mushaf: page-height sheet',
  ]) {
    assert.ok(backlog.includes(needle), `the backlog must record the open item: ${needle}`);
  }
});
