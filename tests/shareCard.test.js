/**
 * tests/shareCard.test.js — pure pieces of the image-card renderer
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, tint } from '../js/shareCard.js';

/** Fake measurer: every character is 10px wide. */
const charMeasure = (s) => s.length * 10;

test('wrapText: fits words within the measured width', () => {
  // maxWidth 100 = 10 chars per line.
  const lines = wrapText('aa bb ccc dddd ee', 100, charMeasure);
  assert.deepEqual(lines, ['aa bb ccc', 'dddd ee']);
});

test('wrapText: a single over-wide word is never split', () => {
  const lines = wrapText('short averyveryverylongword end', 100, charMeasure);
  assert.deepEqual(lines, ['short', 'averyveryverylongword', 'end']);
});

test('wrapText: collapses whitespace and drops empty input', () => {
  assert.deepEqual(wrapText('   ', 100, charMeasure), []);
  assert.deepEqual(wrapText(null, 100, charMeasure), []);
  assert.deepEqual(wrapText('a\t\nb', 100, charMeasure), ['a b']);
});

test('wrapText: one-word and exactly-fitting inputs behave', () => {
  assert.deepEqual(wrapText('abcdefghij', 100, charMeasure), ['abcdefghij']); // exactly 10
  assert.deepEqual(wrapText('abcdefghijk', 100, charMeasure), ['abcdefghijk']); // 11 — kept whole
  assert.deepEqual(wrapText('abc', 100, charMeasure), ['abc']);
});

test('tint blends toward white by ratio', () => {
  assert.equal(tint('#000000', 0), 'rgb(0, 0, 0)');
  assert.equal(tint('#000000', 1), 'rgb(255, 255, 255)');
  assert.equal(tint('#000000', 0.5), 'rgb(128, 128, 128)');
  // 3-digit shorthand expands.
  assert.equal(tint('#fff', 0), 'rgb(255, 255, 255)');
});
