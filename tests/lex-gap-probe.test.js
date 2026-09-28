/**
 * lex-gap-probe.test.js — TEMPORARY LEX-01 gap probe (TEST-ONLY, do not commit).
 * Asserts: particle→NOT_APPLICABLE, missing content word→NOT_ATTESTED,
 * malformed citation→INVALID_CITATION/CORPUS, tracking URL rejected.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEXICAL_STATES,
  isFunctionToken,
  isValidCitation,
  resolveSynonymState,
  resolveAntonymState,
  resolveLemmaProvenance,
  resolveRootProvenance,
} from '../js/domain/lexicalProvenance.js';

const GOOD = {
  sourceId: 'lisan-al-arab-bulaq',
  work: 'Lisan al-Arab',
  author: 'Ibn Manzur',
  edition: 'Bulaq 1300H',
};

describe('LEX-01 gap probe', () => {
  test('1: particle resolves to NOT_APPLICABLE', () => {
    const particle = { pos: 'P', lemma: 'ما', root: null };
    assert.equal(isFunctionToken(particle), true);
    assert.equal(resolveSynonymState(null, particle).state, LEXICAL_STATES.NOT_APPLICABLE);
    assert.equal(resolveAntonymState(null, particle).state, LEXICAL_STATES.NOT_APPLICABLE);
  });

  test('2: missing content word resolves to NOT_ATTESTED', () => {
    const noun = { pos: 'N', lemma: 'كتاب', root: 'كتب' };
    assert.equal(isFunctionToken(noun), false);
    assert.equal(resolveSynonymState(null, noun).state, LEXICAL_STATES.NOT_ATTESTED);
    assert.equal(resolveAntonymState(null, noun).state, LEXICAL_STATES.NOT_ATTESTED);
    assert.equal(resolveLemmaProvenance(null).state, LEXICAL_STATES.NOT_ATTESTED);
  });

  test('3: malformed citation stays CORPUS + INVALID_CITATION', () => {
    const malformed = { sourceId: 'partial-source' };
    const lemma = resolveLemmaProvenance({ src: malformed });
    assert.equal(lemma.state, LEXICAL_STATES.CORPUS);
    assert.equal(lemma.reviewStatus, 'INVALID_CITATION');
    const root = resolveRootProvenance({ src: malformed });
    assert.equal(root.state, LEXICAL_STATES.CORPUS);
    assert.equal(root.reviewStatus, 'INVALID_CITATION');
  });

  test('4: tracking URL / telemetry citation rejected', () => {
    assert.equal(isValidCitation({ ...GOOD, url: 'https://example.com/entry' }), true);
    assert.equal(isValidCitation({ ...GOOD, url: 'https://example.com/?utm_source=x' }), false);
    assert.equal(isValidCitation({ ...GOOD, url: 'https://example.com/?gclid=abc' }), false);
    assert.equal(isValidCitation({ ...GOOD, url: 'https://example.com/?fbclid=abc' }), false);
    assert.equal(isValidCitation({ ...GOOD, url: 'javascript:alert(1)' }), false);
    assert.equal(isValidCitation({ ...GOOD, tracking: 'x' }), false);
    assert.equal(isValidCitation({ ...GOOD, beacon: 'x' }), false);
  });
});
