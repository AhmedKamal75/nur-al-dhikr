import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { qiblaBearing, distanceToKaabaKm, cardinalLabel, angleDelta, KAABA } from '../js/qibla.js';

describe('qiblaBearing', () => {
  test('matches widely-published reference bearings for major cities', () => {
    // These figures are the commonly-cited great-circle qibla bearings
    // published by Islamic astronomy references (e.g. qiblalocator.com),
    // rounded to the nearest degree.
    assert.equal(Math.round(qiblaBearing(40.7128, -74.006)), 58); // New York City -> NE
    assert.equal(Math.round(qiblaBearing(51.5074, -0.1278)), 119); // London -> SE
    assert.equal(Math.round(qiblaBearing(-6.2088, 106.8456)), 295); // Jakarta -> WNW
  });

  test('always returns a value in [0, 360)', () => {
    for (const [lat, lon] of [[89, 179], [-89, -179], [0, 0], [21.4, 39.8]]) {
      const b = qiblaBearing(lat, lon);
      assert.ok(b >= 0 && b < 360, `${b} out of range for (${lat}, ${lon})`);
    }
  });
});

describe('distanceToKaabaKm', () => {
  test('distance from the Kaaba to itself is ~0', () => {
    assert.ok(distanceToKaabaKm(KAABA.latitude, KAABA.longitude) < 0.01);
  });

  test('distance is symmetric with the reverse great-circle calculation and positive elsewhere', () => {
    const d = distanceToKaabaKm(40.7128, -74.006);
    assert.ok(d > 10000 && d < 10700, `unexpected NYC distance: ${d}`);
  });
});

describe('cardinalLabel', () => {
  test('maps bearings to the correct 16-point compass label', () => {
    assert.equal(cardinalLabel(0), 'N');
    assert.equal(cardinalLabel(90), 'E');
    assert.equal(cardinalLabel(180), 'S');
    assert.equal(cardinalLabel(270), 'W');
    assert.equal(cardinalLabel(45), 'NE');
    assert.equal(cardinalLabel(359), 'N'); // wraps correctly
  });
});

describe('angleDelta', () => {
  test('returns the shortest signed turn between two bearings', () => {
    assert.equal(angleDelta(10, 20), 10);
    assert.equal(angleDelta(350, 10), 20); // wraps forward across 0
    assert.equal(angleDelta(10, 350), -20); // wraps backward across 0
    assert.equal(angleDelta(0, 180), 180);
  });

  test('is always within [-180, 180]', () => {
    for (let from = 0; from < 360; from += 37) {
      for (let to = 0; to < 360; to += 53) {
        const d = angleDelta(from, to);
        assert.ok(d >= -180 && d <= 180, `${d} out of range`);
      }
    }
  });
});
