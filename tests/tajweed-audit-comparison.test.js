import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareSharedRuleSpanCounts,
  compareSharedRuleSpanOffsets,
  groupSpansByRule,
} from '../scripts/tajweed-audit-comparison.mjs';

test('groups repeated spans by stable rule ID without losing occurrences', () => {
  const spans = [
    { rule: 'madd_2', start: 0, end: 1 },
    { rule: 'tafkhim', start: 2, end: 3 },
    { rule: 'madd_2', start: 4, end: 5 },
  ];
  const grouped = groupSpansByRule(spans);

  assert.deepEqual([...grouped.keys()], ['madd_2', 'tafkhim']);
  assert.equal(grouped.get('madd_2').length, 2);
  assert.equal(grouped.get('tafkhim').length, 1);
});

test('detects span multiplicity differences hidden by equal rule-ID sets', () => {
  const quran = [
    { rule: 'madd_2', start: 0, end: 1 },
    { rule: 'madd_2', start: 2, end: 3 },
    { rule: 'tafkhim', start: 4, end: 5 },
  ];
  const mushaf = [
    { rule: 'madd_2', start: 0, end: 1 },
    { rule: 'tafkhim', start: 4, end: 5 },
  ];

  assert.deepEqual(
    new Set(quran.map(({ rule }) => rule)),
    new Set(mushaf.map(({ rule }) => rule)),
    'the ordinary rule-ID comparison cannot see the missing repeated span'
  );
  assert.deepEqual(compareSharedRuleSpanCounts(quran, mushaf), [
    {
      rule: 'madd_2',
      quranCount: 2,
      mushafCount: 1,
      quranOnly: 1,
      mushafOnly: 0,
    },
  ]);
});

test('reports the direction of span-count differences and sorts by rule ID', () => {
  const quran = [
    { rule: 'tafkhim', start: 0, end: 1 },
    { rule: 'madd_2', start: 2, end: 3 },
  ];
  const mushaf = [
    { rule: 'tafkhim', start: 0, end: 1 },
    { rule: 'madd_2', start: 2, end: 3 },
    { rule: 'madd_2', start: 4, end: 5 },
    { rule: 'madd_2', start: 6, end: 7 },
  ];

  assert.deepEqual(compareSharedRuleSpanCounts(quran, mushaf), [
    {
      rule: 'madd_2',
      quranCount: 1,
      mushafCount: 3,
      quranOnly: 0,
      mushafOnly: 2,
    },
  ]);
});

test('leaves one-sided rule presence to the separate rule-set mismatch audit', () => {
  assert.deepEqual(
    compareSharedRuleSpanCounts(
      [{ rule: 'izhar', start: 0, end: 1 }],
      [{ rule: 'ikhfa', start: 0, end: 1 }]
    ),
    []
  );
  assert.deepEqual(compareSharedRuleSpanCounts(null, undefined), []);
});

test('does not infer offsets from unmatched span prefixes when cardinality differs', () => {
  const quran = [
    { rule: 'madd_2', letterOrdinal: 2 },
    { rule: 'madd_2', letterOrdinal: 5 },
  ];
  const mushaf = [{ rule: 'madd_2', letterOrdinal: 5 }];

  assert.deepEqual(compareSharedRuleSpanOffsets(quran, mushaf), []);
  assert.deepEqual(compareSharedRuleSpanCounts(quran, mushaf), [
    {
      rule: 'madd_2',
      quranCount: 2,
      mushafCount: 1,
      quranOnly: 1,
      mushafOnly: 0,
    },
  ]);
});

test('compares occurrence offsets only when rule span counts match', () => {
  const quran = [
    { rule: 'madd_2', letterOrdinal: 1 },
    { rule: 'madd_2', letterOrdinal: 5 },
  ];
  const mushaf = [
    { rule: 'madd_2', letterOrdinal: 1 },
    { rule: 'madd_2', letterOrdinal: 4 },
  ];

  assert.deepEqual(compareSharedRuleSpanOffsets(quran, mushaf), [
    {
      rule: 'madd_2',
      index: 1,
      quranSpan: quran[1],
      mushafSpan: mushaf[1],
    },
  ]);
});
