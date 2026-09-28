/**
 * validate-lexicon-parity.test.js — validator/domain citation parity.
 *
 * Pins that scripts/validate-lexicon.mjs isValidCitation rejects everything
 * js/domain/lexicalProvenance.js isValidCitation rejects: tracking/beacon
 * keys, empty location/url, non-http(s) protocols (incl. javascript:),
 * URLs with credentials, and analytics params (utm_source/utm_medium/
 * utm_campaign/gclid/fbclid).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCitation as isDomainCitation } from '../js/domain/lexicalProvenance.js';
import { isValidCitation as isValidatorCitation } from '../scripts/validate-lexicon.mjs';

const BASE = Object.freeze({
  sourceId: 'lisan-al-arab',
  work: 'Lisan al-Arab',
  author: 'Ibn Manzur',
  edition: 'Dar Sader',
});

const valid = (over = {}) => ({ ...BASE, ...over });

const REJECT_CASES = [
  ['tracking key', valid({ tracking: 'x' })],
  ['beacon key', valid({ beacon: 'x' })],
  ['empty location', valid({ location: '   ' })],
  ['non-string location', valid({ location: 42 })],
  ['empty url', valid({ url: '' })],
  ['non-string url', valid({ url: 42 })],
  ['malformed url', valid({ url: 'not a url' })],
  ['javascript: url', valid({ url: 'javascript:alert(1)' })],
  ['non-http protocol', valid({ url: 'ftp://example.com/x' })],
  ['url with username', valid({ url: 'https://user@example.com/x' })],
  ['url with password', valid({ url: 'https://user:pass@example.com/x' })],
  ['utm_source', valid({ url: 'https://example.com/x?utm_source=google' })],
  ['utm_medium', valid({ url: 'https://example.com/x?utm_medium=cpc' })],
  ['utm_campaign', valid({ url: 'https://example.com/x?utm_campaign=ramadan' })],
  ['gclid', valid({ url: 'https://example.com/x?gclid=abc123' })],
  ['fbclid', valid({ url: 'https://example.com/x?fbclid=abc123' })],
];

const ACCEPT_CASES = [
  ['minimal citation', valid()],
  ['with location', valid({ location: 'vol. 3, p. 12' })],
  ['with clean https url', valid({ url: 'https://example.com/book/p12' })],
  ['with clean http url', valid({ url: 'http://example.com/book' })],
  ['url with benign query', valid({ url: 'https://example.com/x?page=3' })],
];

describe('validate-lexicon / domain citation parity', () => {
  test('domain oracle rejects tracking/beacon/analytics citations', () => {
    for (const [name, src] of REJECT_CASES) {
      assert.equal(isDomainCitation(src), false, `domain should reject: ${name}`);
    }
  });

  test('validator rejects everything the domain rejects', () => {
    for (const [name, src] of REJECT_CASES) {
      assert.equal(
        isValidatorCitation(src),
        false,
        `validator should reject what domain rejects: ${name}`
      );
    }
  });

  test('validator accepts what the domain accepts', () => {
    for (const [name, src] of ACCEPT_CASES) {
      assert.equal(isDomainCitation(src), true, `domain should accept: ${name}`);
      assert.equal(isValidatorCitation(src), true, `validator should accept: ${name}`);
    }
  });

  test('both reject malformed shapes', () => {
    const bad = [null, undefined, 42, 'x', [], { ...BASE, work: '  ' }, { sourceId: 'a' }];
    for (const src of bad) {
      assert.equal(isDomainCitation(src), false, `domain rejects ${JSON.stringify(src)}`);
      assert.equal(isValidatorCitation(src), false, `validator rejects ${JSON.stringify(src)}`);
    }
  });
});
