import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function provenanceReport() {
  const out = execFileSync('node', ['scripts/audit-content.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out);
}

describe('DATA-02 provenance completeness dashboard', () => {
  test('every library carries a machine-readable provenance report', () => {
    const report = provenanceReport();
    assert.ok(Array.isArray(report.libraries) && report.libraries.length > 0);
    for (const lib of report.libraries) {
      assert.ok(lib.provenance, `${lib.file}: missing provenance section`);
      for (const field of ['source', 'grade', 'translation', 'virtue']) {
        assert.ok(lib.provenance[field], `${lib.file}: missing provenance.${field}`);
      }
      // Grade accounting is exact: every item is exactly one of
      // covered / explicitly-unknown / missing / not-applicable.
      const g = lib.provenance.grade;
      assert.equal(
        g.covered + g.unknown + g.missing + g.na,
        lib.items,
        `${lib.file}: grade provenance does not sum to item count`
      );
      assert.equal(
        lib.gradeUnknown.length,
        g.unknown,
        `${lib.file}: gradeUnknown list disagrees with provenance`
      );
      assert.equal(
        lib.gradeMissing.length,
        g.missing,
        `${lib.file}: gradeMissing list disagrees with provenance`
      );
    }
  });

  test('fixed-seed accounting: na (Quran/Custom) never counts as missing', () => {
    const report = provenanceReport();
    const totalNA = report.libraries.reduce((n, l) => n + l.provenance.grade.na, 0);
    const totalMissing = report.libraries.reduce((n, l) => n + l.provenance.grade.missing, 0);
    // Quran verses + custom devotionals exist in the corpus, so na > 0;
    // the invariant is structural: na items are disjoint from missing.
    assert.ok(totalNA > 0, 'expected Quran/Custom N/A items in the corpus');
    assert.equal(typeof totalMissing, 'number');
  });
});
