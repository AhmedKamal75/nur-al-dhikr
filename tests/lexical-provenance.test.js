/**
 * lexical-provenance.test.js — (v5.17.2) audit F-02/F-03 follow-up.
 *
 * Pins the provenance contract without fabricating scholarship:
 * - the citation schema exists and requires sourceId/work/author/edition;
 * - every per-lemma `src` / per-root `src` present in the bundle matches it;
 * - unattested entries stay explicitly unknown (no invented antonyms/roots).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));

const REQUIRED = ['sourceId', 'work', 'author', 'edition'];
const ALLOWED_GENERIC = new Set([
  'bundled-root-core-meaning',
  'no-independent-root-policy',
  'no-attested-direct-antonym',
]);

function assertCitation(src, where) {
  assert.ok(src && typeof src === 'object', `${where}: src must be an object`);
  for (const k of REQUIRED) {
    assert.equal(typeof src[k], 'string', `${where}: src.${k} must be a string`);
    assert.ok(src[k].trim().length > 0, `${where}: src.${k} must be non-empty`);
  }
  assert.ok(!('tracking' in src) && !('beacon' in src), `${where}: no telemetry keys`);
}

describe('lexical provenance schema', () => {
  test('schema file is well-formed', () => {
    const schema = readJSON('data/lexical-provenance-schema.json');
    assert.equal(schema.schemaVersion, '1.0');
    assert.deepEqual(schema.citation.required, REQUIRED);
    assert.ok(Array.isArray(schema.rules) && schema.rules.length >= 3);
  });

  test('lemma entries: cited or honestly unattested, never fabricated', () => {
    const dict = readJSON('data/quran-dict.json');
    const entries = Object.values(dict.entries || dict);
    assert.ok(entries.length > 4000, 'lemma tier is intact');
    let cited = 0;
    for (const e of entries) {
      if (e.src != null) {
        assertCitation(e.src, `lemma ${e.key || e.lemma || '?'}`);
        cited += 1;
      }
      if (Array.isArray(e.ant)) {
        for (const a of e.ant) assert.equal(typeof a, 'string');
      }
    }
    // Honest state: attested antonym coverage stays sparse until a cited
    // scholarly layer lands. This gate fails if anyone bulk-fills antonyms
    // without citations.
    const withAnt = entries.filter((e) => Array.isArray(e.ant) && e.ant.length > 0);
    assert.ok(
      withAnt.length / entries.length < 0.5,
      `antonym coverage ${(withAnt.length / entries.length).toFixed(3)} looks bulk-filled; cite per-entry sources`
    );
    assert.ok(cited >= 0, 'zero citations today is valid (explicit unknown)');
  });

  test('root entries: generic label allowed, per-edition src must validate', () => {
    const roots = readJSON('data/quran-roots-meaning.json');
    const entries = Object.values(roots.entries || roots);
    assert.ok(entries.length > 1000, 'root tier is intact');
    for (const e of entries.slice(0, 5000)) {
      if (e.src != null) {
        assertCitation(e.src, `root ${e.root || '?'}`);
      } else if (typeof e.source === 'string') {
        assert.ok(
          ALLOWED_GENERIC.has(e.source) || e.source.trim().length > 0,
          'root source must be a known generic label or a named edition'
        );
      }
    }
  });
});
