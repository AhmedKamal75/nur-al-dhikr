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
  isValidCitation,
  resolveSynonymState,
  resolveAntonymState,
  resolveLemmaProvenance,
  resolveRootProvenance,
  resolveContextProvenance,
} from '../js/domain/lexicalProvenance.js';
import { dictEntryFor, materializeWordStudy } from '../js/domain/wordStudy.js';
import { buildWordStudyPanel } from '../js/views/tafsirPanel.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('LEX-01 applicability states', () => {
  test('state enum is complete', () => {
    for (const s of [
      'CURATED',
      'CORPUS',
      'TAFSIR',
      'CLASSICAL_LEXICON',
      'NOT_ATTESTED',
      'NOT_APPLICABLE',
    ]) {
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
    assert.equal(resolveSynonymState({ syn: ['نهار'] }, word).state, LEXICAL_STATES.CORPUS);
  });

  test('cited non-empty lists are curated, uncited lists stay corpus-tier', () => {
    const word = { pos: 'N', lemma: 'يوم', root: 'يوم' };
    const cited = {
      syn: ['نهار'],
      src: {
        sourceId: 'lexicon:list',
        work: 'Reviewed Lexicon',
        author: 'Editor',
        edition: '2026',
      },
    };
    assert.equal(resolveSynonymState(cited, word).state, LEXICAL_STATES.CURATED);
    assert.equal(resolveSynonymState({ syn: ['نهار'] }, word).state, LEXICAL_STATES.CORPUS);
  });

  test('malformed citations remain corpus-tier and preserve review status', () => {
    const malformed = { sourceId: 'partial-source' };
    const lemma = resolveLemmaProvenance({ src: malformed });
    assert.equal(lemma.state, LEXICAL_STATES.CORPUS);
    assert.equal(lemma.reviewStatus, 'INVALID_CITATION');
    assert.equal(lemma.work, '');

    const root = resolveRootProvenance({ src: malformed, source: 'bundled-root-core-meaning' });
    assert.equal(root.state, LEXICAL_STATES.CORPUS);
    assert.equal(root.reviewStatus, 'INVALID_CITATION');

    const word = { pos: 'N', lemma: 'كتاب', root: 'كتب', en: 'book' };
    const materialized = materializeWordStudy(word, null, { ar: 'x', src: malformed });
    assert.equal(materialized.provenance.lemma.state, LEXICAL_STATES.CORPUS);
    assert.equal(materialized.provenance.lemma.reviewStatus, 'INVALID_CITATION');
  });

  test('valid citations and tafsir context retain their source metadata', () => {
    const citation = {
      sourceId: 'lexicon:test',
      work: 'Test Lexicon',
      author: 'Editor',
      edition: 'First edition',
      location: 'p. 12',
    };
    const lemma = resolveLemmaProvenance({ src: citation });
    assert.equal(lemma.state, LEXICAL_STATES.CLASSICAL_LEXICON);
    assert.equal(lemma.work, 'Test Lexicon');
    assert.equal(lemma.reference, 'p. 12');
    assert.equal(lemma.reviewStatus, 'CURATED');

    const context = resolveContextProvenance({
      contextualMeaning: { ar: 'سياق', source: 'tafsir:ibn-kathir', citation },
    });
    assert.equal(context.state, LEXICAL_STATES.TAFSIR);
    assert.equal(context.work, 'Test Lexicon');
    assert.equal(context.reviewStatus, 'CITED');
  });

  test('non-tafsir citations remain classical and unsafe URLs are rejected', () => {
    const citation = {
      sourceId: 'lexicon:grammar',
      work: 'Grammar Reference',
      author: 'Editor',
      edition: '2026',
    };
    assert.equal(
      resolveContextProvenance({ contextualMeaning: { ar: 'اسم', citation } }).state,
      LEXICAL_STATES.CLASSICAL_LEXICON
    );
    assert.equal(isValidCitation({ ...citation, url: 'https://example.com/entry' }), true);
    assert.equal(isValidCitation({ ...citation, url: 'javascript:alert(1)' }), false);
    assert.equal(isValidCitation({ ...citation, url: 'https://example.com/?utm_source=x' }), false);
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
    assert.equal(resolveRootProvenance({ source: 'bundled-root-core-meaning' }).state, 'CORPUS');
    assert.equal(
      resolveContextProvenance({ contextualMeaning: { ar: 'الطيور', source: 'lemma-dictionary' } })
        .state,
      'CORPUS'
    );
    assert.equal(
      resolveContextProvenance({ contextualMeaning: { ar: '', source: '' } }).state,
      'NOT_ATTESTED'
    );
  });
});

describe('LEX-02..LEX-04 materialized record', () => {
  test('particle gets NOT_APPLICABLE syn/ant, rootless policy provenance', () => {
    const word = { pos: 'P', lemma: 'ما', root: null, en: 'what' };
    const m = materializeWordStudy(
      word,
      { contextualMeaning: { ar: '', source: '' }, irab: {} },
      null,
      null
    );
    assert.equal(m.synonyms.state, 'NOT_APPLICABLE');
    assert.equal(m.antonyms.state, 'NOT_APPLICABLE');
    assert.equal(m.provenance.root.state, 'NOT_APPLICABLE');
    assert.ok(m.synonyms.noteEn.length > 0);
    assert.ok(m.antonyms.noteEn.length > 0);
  });

  test('content word without dict entry gets NOT_ATTESTED (nothing invented)', () => {
    const word = { pos: 'N', lemma: 'كتاب', root: 'كتب', en: 'book' };
    const m = materializeWordStudy(
      word,
      { contextualMeaning: { ar: 'سفر', source: 'lemma-dictionary' }, irab: {} },
      null,
      null
    );
    assert.equal(m.synonyms.state, 'NOT_ATTESTED');
    assert.equal(m.antonyms.state, 'NOT_ATTESTED');
    assert.deepEqual(m.synonyms.ar, []);
    assert.deepEqual(m.antonyms.ar, []);
    assert.equal(m.contextualMeaning.provenanceState, 'CORPUS');
  });

  test('content word without an attested root is not mislabeled as function-word data', () => {
    const m = materializeWordStudy(
      { pos: 'N', lemma: 'اسم', root: null, en: 'name' },
      { contextualMeaning: { ar: 'اسم', source: 'bundle' }, irab: {} },
      null,
      null
    );
    assert.equal(m.provenance.root.state, 'NOT_ATTESTED');
    assert.equal(m.etymology, null);
  });

  test('materializer uses shared resolvers for every provenance tier', () => {
    const citation = {
      sourceId: 'lexicon:materialized',
      work: 'Reviewed Lexicon',
      author: 'Editor',
      edition: '2026',
      location: 'entry 4',
    };
    const word = { pos: 'N', lemma: 'كتاب', root: 'كتب', en: 'book' };
    const materialized = materializeWordStudy(
      word,
      {
        contextualMeaning: { ar: 'سفر', source: 'tafsir:qurtubi' },
        irab: { ar: 'اسم', en: 'Noun', source: 'structured-morphology' },
      },
      { ar: 'كتاب', syn: ['سفر'], ant: [], src: citation },
      { root: 'كتب', ar: 'الكتابة', source: 'bundled-root-core-meaning' }
    );
    assert.equal(materialized.provenance.lemma.state, LEXICAL_STATES.CLASSICAL_LEXICON);
    assert.equal(materialized.synonyms.state, LEXICAL_STATES.CURATED);
    assert.equal(materialized.contextualMeaning.provenanceState, LEXICAL_STATES.TAFSIR);
    assert.equal(materialized.provenance.irab.state, LEXICAL_STATES.CORPUS);
    assert.equal(materialized.provenance.root.state, LEXICAL_STATES.CORPUS);
  });

  test('dictEntryFor preserves src citation through to the record', () => {
    const entry = dictEntryFor(
      {
        index: {
          RIGHT: {
            ar: 'صواب',
            en: 'right',
            syn: [],
            ant: [],
            src: { sourceId: 's', work: 'w', author: 'a', edition: 'e' },
          },
        },
      },
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
        'wordStudy.sourceTafsir',
        'wordStudy.sourceClassical',
        'wordStudy.reviewInvalidCitation',
      ]) {
        assert.match(source, new RegExp(`'${key.replace('.', '\\.')}'`));
      }
    }
  });

  test('popup renders tafsir and classical provenance in both languages', () => {
    const words = JSON.parse(read('data/quran-words/1.json'));
    const surah = JSON.parse(read('data/quran/1.json'));
    const roots = JSON.parse(read('data/quran-roots.json'));
    const word = {
      ...words['1'][1],
      study: {
        contextualMeaning: { ar: 'معنى سياقي', source: 'tafsir:ibn-kathir' },
        irab: { ar: 'اسم، مجرور', en: 'Noun, genitive', source: 'structured-morphology' },
      },
    };
    const dict = {
      ar: 'معنى معجمي',
      en: 'lexical gloss',
      syn: ['مرادف'],
      ant: [],
      src: {
        sourceId: 'lexicon:popup',
        work: 'Popup Lexicon',
        author: 'Editor',
        edition: '2026',
        location: 'p. 12',
      },
    };
    const state = {
      settings: { language: 'en' },
      activeWordStudy: { surah: 1, ayah: 1, i: 2 },
      quran: { surahs: { 1: surah } },
      quranWords: { 1: { 1: [word] } },
      quranRoots: roots,
      wordDict: { index: { [word.lemma]: dict } },
      rootsMeaning: { index: null },
      wordBookmarks: {},
    };
    const english = buildWordStudyPanel(state);
    assert.match(english, /Tafsir source/);
    assert.match(english, /Classical lexicon \(cited\)/);
    assert.match(english, /Grammar \(iʿrab\)/);
    assert.match(english, /p\. 12/);
    const arabic = buildWordStudyPanel({ ...state, settings: { language: 'ar' } });
    assert.match(arabic, /مصدر تفسيري/);
    assert.match(arabic, /معجم كلاسيكي/);
    assert.match(arabic, /p\. 12/);
  });
});
