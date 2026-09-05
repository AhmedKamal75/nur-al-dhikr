/**
 * tests/translationCompare.test.js — translation-compare view helpers
 * (v5.2.0): overlay reduction + visibility rules. Pure domain, no store.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVisible,
  normalizeEditionKey,
  translationBMap,
} from '../js/domain/translationCompare.js';

const KNOWN = ['en-sahih', 'ur-jalandhry', 'fr-hamidullah'];

test('translationBMap reduces a well-formed overlay file', () => {
  const map = translationBMap({
    key: 'ur-jalandhry',
    surah: 1,
    ayahs: [
      { number: 1, translation: 'bismillah ur' },
      { number: 2, translation: 'hamd ur' },
    ],
  });
  assert.deepEqual(map, { 1: 'bismillah ur', 2: 'hamd ur' });
});

test('translationBMap rejects corrupt shapes (never blank the reader)', () => {
  assert.equal(translationBMap(null), null);
  assert.equal(translationBMap({}), null);
  assert.equal(translationBMap({ ayahs: [] }), null);
  assert.equal(translationBMap({ ayahs: [{ number: 0, translation: 'x' }] }), null);
  assert.equal(translationBMap({ ayahs: [{ number: 'a', translation: 'x' }] }), null);
  assert.equal(translationBMap({ ayahs: [{ number: 1, translation: '  ' }] }), null);
  assert.equal(translationBMap({ ayahs: [{ number: 1 }] }), null);
});

test('compareVisible: off when unset, equal, or inline — on otherwise', () => {
  assert.equal(compareVisible('en-sahih', null), false);
  assert.equal(compareVisible('ur-jalandhry', 'ur-jalandhry'), false);
  assert.equal(compareVisible('fr-hamidullah', 'en-sahih'), false);
  assert.equal(compareVisible('en-sahih', 'ur-jalandhry'), true);
  assert.equal(compareVisible('ur-jalandhry', 'fr-hamidullah'), true);
});

test('normalizeEditionKey allowlists unknown/garbage to fallback', () => {
  assert.equal(normalizeEditionKey('ur-jalandhry', KNOWN, null), 'ur-jalandhry');
  assert.equal(normalizeEditionKey('nope', KNOWN, null), null);
  assert.equal(normalizeEditionKey('', KNOWN, null), null);
  assert.equal(normalizeEditionKey(null, KNOWN, null), null);
  assert.equal(normalizeEditionKey(42, KNOWN, null), null);
});
