import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHTML,
  clamp,
  normalizeArabic,
  normalizeSearch,
  pickLocale,
  dateKey,
  addDays,
  uid,
  ok,
  fail,
} from '../js/utils.js';

describe('escapeHTML', () => {
  test('escapes all five dangerous characters', () => {
    assert.equal(
      escapeHTML(`<script>alert('x')&"y"</script>`),
      '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;&lt;/script&gt;'
    );
  });

  test('handles non-string / nullish input without throwing', () => {
    assert.equal(escapeHTML(), '');
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
  });

  test('is idempotent-safe for plain text (no false positives)', () => {
    assert.equal(escapeHTML('SubhanAllah'), 'SubhanAllah');
  });
});

describe('clamp', () => {
  test('clamps below range', () => assert.equal(clamp(-5, 0, 10), 0));
  test('clamps above range', () => assert.equal(clamp(50, 0, 10), 10));
  test('passes through in-range values', () => assert.equal(clamp(5, 0, 10), 5));
});

describe('normalizeArabic', () => {
  test('strips tashkeel (diacritics) for search matching', () => {
    // "بِسْمِ اللَّهِ" with full diacritics should match the bare "بسم الله"
    const withDiacritics = 'بِسْمِ اللَّهِ';
    const bare = normalizeArabic(withDiacritics);
    assert.ok(!/[\u064B-\u065F\u0670]/.test(bare), 'diacritic marks should be stripped');
  });

  test('does not throw on empty input', () => {
    assert.equal(normalizeArabic(''), '');
    assert.equal(normalizeArabic(), '');
  });
});

describe('normalizeSearch', () => {
  test('lowercases and trims for case-insensitive matching', () => {
    assert.equal(normalizeSearch('  Morning ADHKAR  '), 'morning adhkar');
  });
});

describe('pickLocale', () => {
  test('returns the requested language when present', () => {
    assert.equal(pickLocale({ en: 'Hello', ar: 'مرحبا' }, 'ar'), 'مرحبا');
  });

  test('falls back to English when the requested language is empty', () => {
    assert.equal(pickLocale({ en: 'Hello', ar: '' }, 'ar'), 'Hello');
  });

  test('handles a plain string field (legacy shape)', () => {
    assert.equal(pickLocale('Just a string', 'en'), 'Just a string');
  });

  test('handles nullish field without throwing', () => {
    assert.equal(pickLocale(null, 'en'), '');
    assert.equal(pickLocale(undefined, 'en'), '');
  });
});

describe('dateKey / addDays', () => {
  test('formats a date as YYYY-MM-DD', () => {
    assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  });

  test('addDays moves forward without mutating the input', () => {
    const original = new Date(2026, 0, 30);
    const originalTime = original.getTime();
    const next = addDays(original, 3);
    assert.equal(dateKey(next), '2026-02-02');
    assert.equal(original.getTime(), originalTime, 'input date must not be mutated');
  });

  test('addDays handles negative offsets (going backward)', () => {
    const d = addDays(new Date(2026, 0, 1), -1);
    assert.equal(dateKey(d), '2025-12-31');
  });
});

describe('uid', () => {
  test('generates unique, prefixed ids', () => {
    const a = uid('item');
    const b = uid('item');
    assert.notEqual(a, b);
    assert.ok(a.startsWith('item'));
  });
});

describe('ok/fail Result helpers', () => {
  test('ok() produces a success result carrying the value', () => {
    const r = ok(42);
    assert.equal(r.success, true);
    assert.equal(r.value, 42);
    assert.equal(r.error, null);
  });

  test('fail() produces a failure result carrying a string error', () => {
    const r = fail(new Error('boom'));
    assert.equal(r.success, false);
    assert.equal(r.value, null);
    assert.equal(r.error, 'boom');
  });
});
