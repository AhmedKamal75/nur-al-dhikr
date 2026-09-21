/**
 * tests/word-follow-spike.test.js — (v5.11.0 B) pins the pure shapes behind
 * the word-follow spike: segment normalization (drop hostile rows, never
 * repair), audio URL validation, and the feasibility verdict. The live
 * network half lives in scripts/spike-word-follow.mjs (run it for fresh
 * evidence); these tests pin what a future engine may trust.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSegments,
  audioFileUrl,
  classifyVerdict,
  API_BASE,
  AUDIO_HOST,
} from '../scripts/spike-word-follow.mjs';

describe('parseSegments', () => {
  test('normalizes [seq, pos1, startMs, endMs] rows', () => {
    assert.deepEqual(
      parseSegments([
        [0, 1, 1150, 2030],
        [1, 2, 2040, 3730],
      ]),
      [
        { pos: 1, startMs: 1150, endMs: 2030 },
        { pos: 2, startMs: 2040, endMs: 3730 },
      ]
    );
  });

  test('drops hostile rows instead of repairing them', () => {
    assert.deepEqual(
      parseSegments([
        [0, 1, 100, 200],
        'junk',
        [1], // short
        [2, 'x', 100, 200], // non-numeric pos
        [3, 4, -5, 200], // negative start
        [4, 5, 300, 300], // zero-length span
        [5, 6, 400, 350], // end before start
        [6, 0, 100, 200], // pos 0
        null,
      ]),
      [{ pos: 1, startMs: 100, endMs: 200 }]
    );
  });

  test('non-arrays and caps', () => {
    assert.deepEqual(parseSegments(null), []);
    assert.deepEqual(parseSegments({}), []);
    assert.deepEqual(parseSegments([]), []);
    const many = Array.from({ length: 600 }, (_, i) => [i, i + 1, i * 10, i * 10 + 5]);
    assert.equal(parseSegments(many).length, 500, 'bounded');
  });
});

describe('audioFileUrl', () => {
  test('builds the qurancdn absolute URL', () => {
    assert.equal(
      audioFileUrl('AbdulBaset/Murattal/mp3/002255.mp3'),
      `${AUDIO_HOST}/AbdulBaset/Murattal/mp3/002255.mp3`
    );
    assert.ok(API_BASE.startsWith('https://'), 'api base is https');
  });

  test('refuses absolute URLs, traversal, non-mp3', () => {
    assert.equal(audioFileUrl('https://evil.example/a.mp3'), null);
    assert.equal(audioFileUrl('//evil.example/a.mp3'), null);
    assert.equal(audioFileUrl('../secret.mp3'), null);
    assert.equal(audioFileUrl('a/playlist.m3u8'), null);
    assert.equal(audioFileUrl(''), null);
    assert.equal(audioFileUrl(null), null);
  });
});

describe('classifyVerdict', () => {
  const full = {
    wordsKeyless: true,
    segmentsKeyless: true,
    audioReachable: true,
    audioCorsOpen: true,
    audioRangeOk: true,
    coverageOk: true,
  };

  test('feasible only when every leg is keyless', () => {
    const v = classifyVerdict(full);
    assert.equal(v.feasible, true);
    assert.deepEqual(v.reasons, []);
    assert.ok(v.conditions.length > 0, 'feasibility ships with conditions');
    assert.ok(
      v.conditions.some((c) => c.includes('never apply')),
      'cross-encoding timings explicitly forbidden'
    );
  });

  test('any missing leg fails with honest reasons', () => {
    const v = classifyVerdict({ ...full, audioCorsOpen: false, coverageOk: false });
    assert.equal(v.feasible, false);
    assert.equal(v.conditions.length, 0);
    assert.ok(v.reasons.some((r) => r.includes('CORS')));
    assert.ok(v.reasons.some((r) => r.includes('spot-checked')));
  });

  test('empty/hostile evidence fails closed', () => {
    assert.equal(classifyVerdict(null).feasible, false);
    assert.equal(classifyVerdict({}).feasible, false);
    assert.ok(classifyVerdict({}).reasons.length > 0);
  });
});
