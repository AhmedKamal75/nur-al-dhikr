import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gradeChipHTML, gradeStateOf, normalizeGrade } from '../js/domain/grades.js';

describe('DATA-01 honest grades', () => {
  test('valid grade + source renders an authoritative chip', () => {
    const html = gradeChipHTML('Sahih', 'en');
    assert.ok(html.includes('chip--grade-sahih'), html);
    assert.ok(html.includes('Authentic'), html);
    assert.equal(gradeStateOf('Sahih'), 'valid');
  });

  test('explicit Unknown renders the visibly uncertain chip', () => {
    const html = gradeChipHTML('Unknown', 'en');
    assert.ok(html.includes('chip--grade-unknown'), html);
    assert.ok(html.includes('Unverified'), html);
    assert.equal(gradeStateOf('Unknown'), 'unknown');
  });

  test('missing grade renders nothing', () => {
    for (const g of [undefined, null, '', '   ']) {
      assert.equal(gradeChipHTML(g, 'en'), '', `grade ${JSON.stringify(g)} must render nothing`);
      assert.equal(gradeStateOf(g), 'missing');
    }
  });

  test('malformed grade never renders as an authoritative claim', () => {
    for (const g of ['saheeh', 'Sahih!!', '<script>', 'UNKNOWNx', 42, {}]) {
      assert.equal(
        gradeChipHTML(g, 'en'),
        '',
        `malformed grade must render nothing: ${JSON.stringify(g)}`
      );
      assert.equal(gradeStateOf(g), 'malformed');
    }
  });

  test('case-insensitive match recovers the canonical chip', () => {
    assert.ok(gradeChipHTML('sahih', 'en').includes('chip--grade-sahih'));
    assert.ok(gradeChipHTML('HASAN', 'ar').includes('chip--grade-hasan'));
    assert.equal(normalizeGrade(' hasan '), 'Hasan');
  });

  test('Arabic labels stay Arabic', () => {
    assert.ok(gradeChipHTML('Sahih', 'ar').includes('صحيح'));
    assert.ok(gradeChipHTML('Unknown', 'ar').includes('غير محقق'));
  });
});
