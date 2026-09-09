/**
 * docs-honesty.test.js — F-003: docs must never hardcode a passing claim
 * the tree cannot prove. Counts live in ARCHITECTURE/README tables,
 * regenerated from actual runs per the release protocol; the badge and
 * command descriptions stay count-free and claim-free so a red tree can
 * never advertise green docs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const readme = readFileSync(`${ROOT}README.md`, 'utf8');

test('F-003: no hardcoded passing-count badge in README', () => {
  assert.ok(
    !/tests-\d+_passing/.test(readme),
    'badge must not hardcode a count — exact numbers live in the docs tables'
  );
});

test('F-003: no all-green status claims in README', () => {
  assert.ok(!/all green/i.test(readme), 'status claims rot — CI is the source of truth');
});
