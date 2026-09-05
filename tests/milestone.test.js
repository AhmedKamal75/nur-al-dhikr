/**
 * tests/milestone.test.js — tasbih milestone pings (v5.2.0): the pure
 * "buzz every Nth count" predicate used by services/tasbih.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { milestoneHit } from '../js/domain/celebrate.js';

test('fires exactly on positive multiples of the interval', () => {
  assert.equal(milestoneHit(10, 10), true);
  assert.equal(milestoneHit(33, 33), true);
  assert.equal(milestoneHit(100, 10), true);
  assert.equal(milestoneHit(9, 10), false);
  assert.equal(milestoneHit(1, 33), false);
});

test('off (0) and garbage never fire', () => {
  assert.equal(milestoneHit(100, 0), false);
  assert.equal(milestoneHit(0, 10), false);
  assert.equal(milestoneHit(-10, 10), false);
  assert.equal(milestoneHit(10, -10), false);
  assert.equal(milestoneHit('x', 10), false);
  assert.equal(milestoneHit(10, 'x'), false);
  assert.equal(milestoneHit(NaN, 10), false);
  assert.equal(milestoneHit(10.5, 10), false);
  assert.equal(milestoneHit(null, null), false);
});
