/**
 * lexicon-field-aware.test.js — (LEX-01..LEX-05) field-aware lexicon contract.
 *
 * Pins: applicability states (never fabricated), provenance plumbing from
 * dict/root tiers into materialized records, and bilingual renderer labels.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEXICAL_STATES,
  isFunctionToken,
  resolveSynonymState,
  resolveAntonymState,
  resolveLemmaProvenance,
  resolveRootProvenance,
  resolveContextProvenance,
} from '../js/domain/lexicalProvenance.js';
import { dictEntryFor, materializeWordStudy } from '../js/domain/wordStudy.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('LEX-01 applicability states', () => {
  test('state enum is complete', () => {
    for (const s of ['CURATED', 'CORPUS', 'TAFSIR', 'CLASSICAL_LEXICON', 'NOT_ATTESTED', 'NOT_APPLICABLE']) {
      assert.equal(LEXICAL_STATES[s], s);
    }
  });

  test('function tokens are NOT_APPLICABLE, content tokens NOT_ATTESTED', () => {
    const particle = { pos: 'P', lemma: 'ما', root: null };
    assert.equal(isFunctionToken(particle), true);
    assert.equal(resolveSynonymState(null, particle).state, 'NOT_APPLICABLE');
    assert.equal(resolveAntonymState(null, particle).state, 'NOT_APPLICABLE');
    const noun = { pos: 'N', lemma: 'كتاب', root: 'كتب' };
    assert.equal(isFunctionToken(noun), false);
    assert.equal(resolveSynonymState(null, noun).state, 'NOT_ATTESTED');
    assert.equal(resolveAntonymState(null, noun).state, 'NOT_ATTESTED');
  });

  test('non-empty lists pass through untouched', () => {
    const word = { pos: 'N', lemma: 'يوم', root: 'يوم' };
    assert.deepEqual(resolveSynonymState({ syn: ['نهار'] }, word).list, ['نهار']);
    assert.deepEqual(resolveAntonymState({ ant: ['ليل'] }, word).list, ['ليل']);
  });

  test('lemma/root/context provenance resolution', () => {
    assert.equal(resolveLemmaProvenance(null).state, 'NOT_ATTESTED');
    assert.equal(resolveLemmaProvenance({ ar: 'x' }).state, 'CORPUS');
    assert.equal(
      resolveLemmaProvenance({
        ar: 'x',
        src: { sourceId: 's', work: 'w', author: 'a', edition: 'e' },
      }).state,
      'CLASSICAL_LEXICON'
    );
    assert.equal(
      resolveRootProvenance({ source: 'no-independent-root-policy' }).state,
      'NOT_APPLICABLE'
    );
    assert.equal(
      resolveRootProvenance({ source: 'bundled-root-core-meaning' }).state,
      'CORPUS'
    );
    assert.equal(
      resolveContextProvenance({ contextualMeaning: { ar: 'الطيور', source: 'lemma-dictionary' } })
        .state,
      'CORPUS'
    );
    assert.equal(resolveContextProvenance({ contextualMeaning: { ar: '', source: '' } }).state, 'NOT_ATTESTED');
  });
});

describe('LEX-02..LEX-04 materialized record', () => {
  test('particle gets NOT_APPLICABLE syn/ant, rootless policy provenance', () => {
    const word = { pos: 'P', lemma: 'ما', root: null, en: 'what' };
    const m = materializeWordStudy(word, { contextualMeaning: { ar: '', source: '' }, irab: {} }, null, null);
    assert.equal(m.synonyms.state, 'NOT_APPLICABLE');
    assert.equal(m.antonyms.state, 'NOT_APPLICABLE');
    assert.equal(m.provenance.root.state, 'NOT_APPLICABLE');
    assert.ok(m.synonyms.noteEn.length > 0);
    assert.ok(m.antonyms.noteEn.length > 0);
  });

  test('content word without dict entry gets NOT_ATTESTED (nothing invented)', () => {
    const word = { pos: 'N', lemma: 'كتاب', root: 'كتب', en: 'book' };
    const m = materializeWordStudy(word, { contextualMeaning: { ar: 'سفر', source: 'lemma-dictionary' }, irab: {} }, null, null);
    assert.equal(m.synonyms.state, 'NOT_ATTESTED');
    assert.equal(m.antonyms.state, 'NOT_ATTESTED');
    assert.deepEqual(m.synonyms.ar, []);
    assert.deepEqual(m.antonyms.ar, []);
    assert.equal(m.contextualMeaning.provenanceState, 'CORPUS');
  });

  test('dictEntryFor preserves src citation through to the record', () => {
    const entry = dictEntryFor(
      { index: { RIGHT: { ar: 'صواب', en: 'right', syn: [], ant: [], src: { sourceId: 's', work: 'w', author: 'a', edition: 'e' } } } },
      'RIGHT'
    );
    assert.ok(entry && entry.src);
    assert.equal(entry.src.sourceId, 's');
  });
});

describe('LEX-05 renderer labels (AR/EN parity)', () => {
  test('provenance + state keys exist in both languages', () => {
    for (const source of [read('js/core/i18n/en.js'), read('js/core/i18n/ar.js')]) {
      for (const key of [
        'wordStudy.provenance',
        'wordStudy.sourceCorpus',
        'wordStudy.stateNotAttested',
        'wordStudy.stateNotApplicable',
      ]) {
        assert.match(source, new RegExp(`'${key.replace('.', '\\.')}'`));
      }
    }
  });
});
