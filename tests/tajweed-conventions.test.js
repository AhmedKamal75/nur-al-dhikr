import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAJWEED_RULE_REGISTRY, TAJWEED_PREDICATES } from '../js/domain/tajweedRules.js';
import { TAJWEED_RULES, tajweedPrefsOf, classifyAyahTajweed } from '../js/domain/tajweed.js';
import { sanitizeSettings } from '../js/core/config.js';
import { tajweedConventionHTML } from '../js/views/tajweedConvention.js';

test('rule registry mirror is byte-content equivalent to canonical JSON', () => {
  const canonical = JSON.parse(
    readFileSync(new URL('../data/tajweed-rules.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(TAJWEED_RULE_REGISTRY, canonical);
  assert.deepEqual(
    canonical.rules.map((r) => r.id),
    TAJWEED_RULES.map((r) => r.id)
  );
  assert.ok(Object.isFrozen(TAJWEED_RULE_REGISTRY.rules[0].conventions));
});

test('each registry rule uses a closed predicate, stable citation and two convention records', () => {
  for (const rule of [...TAJWEED_RULE_REGISTRY.rules, ...TAJWEED_RULE_REGISTRY.pendingRules]) {
    assert.equal(typeof TAJWEED_PREDICATES[rule.predicate], 'function');
    for (const convention of ['lpmq', 'dar-al-maarifah']) {
      assert.ok(rule.conventions[convention].citation.url);
      assert.ok(rule.conventions[convention].citation.locator);
    }
  }
});

test('unverified rule sites produce no spans, never inferred from a pattern', () => {
  assert.equal(TAJWEED_RULE_REGISTRY.verification.complete, false);
  for (const rule of TAJWEED_RULE_REGISTRY.pendingRules) {
    assert.equal(rule.conventions.lpmq.shippingEnabled, false);
    assert.equal(rule.conventions['dar-al-maarifah'].shippingEnabled, false);
  }
  for (const site of [null, {}, { verification: 'pending', source: 'x', start: 1, end: 2 }]) {
    assert.deepEqual(TAJWEED_PREDICATES.verifiedSite(site), []);
  }
});

test('new and legacy settings default to DAM, explicit LPMQ survives and junk clamps', () => {
  assert.equal(sanitizeSettings({}).tajweedConvention, 'dar-al-maarifah');
  assert.equal(
    sanitizeSettings({ tajweedPrefs: { rules: { ghunnah: false } } }).tajweedConvention,
    'dar-al-maarifah'
  );
  assert.equal(sanitizeSettings({ tajweedConvention: 'lpmq' }).tajweedConvention, 'lpmq');
  assert.equal(
    sanitizeSettings({ tajweedConvention: '<script>' }).tajweedConvention,
    'dar-al-maarifah'
  );
});

test('convention changes preserve user rule-ID and family overrides, classifier is unchanged', () => {
  const tajweedPrefs = { rules: { ghunnah: false }, colors: { nasal: '#123456' } };
  const before = classifyAyahTajweed('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
  for (const tajweedConvention of ['lpmq', 'dar-al-maarifah']) {
    const settings = sanitizeSettings({ tajweedPrefs, tajweedConvention });
    assert.deepEqual(settings.tajweedPrefs, tajweedPrefs);
    assert.equal(tajweedPrefsOf({ settings }).convention, tajweedConvention);
    assert.deepEqual(classifyAyahTajweed('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), before);
  }
});

test('bilingual disclosure names both sources and honestly states incomplete application', () => {
  for (const language of ['en', 'ar']) {
    const html = tajweedConventionHTML({ settings: { language, tajweedConvention: 'lpmq' } });
    assert.match(html, /data-convention="lpmq" aria-pressed="true"/);
    assert.match(html, /data-convention="dar-al-maarifah"/);
    assert.match(html, /tashih\.kemenag\.go\.id/);
    assert.match(html, /archive\.org/);
    assert.doesNotMatch(html, /undefined|\[object Object\]/);
    assert.ok(
      language === 'en'
        ? html.includes('verification is in progress')
        : html.includes('التحقق من الاصطلاحين')
    );
  }
});
