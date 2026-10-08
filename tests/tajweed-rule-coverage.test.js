/**
 * tajweed-rule-coverage.test.js
 *
 * Contract: every deterministic Tajweed classifier rule must have at least
 * one positive regression fixture, and every classifier rule must remain
 * reachable from the written course. This is deliberately separate from
 * tajweed.test.js so a new rule cannot quietly ship with only legend/source
 * coverage and no behavioural fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyWordTajweed, classifyAyahTajweed, TAJWEED_RULES } from '../js/domain/tajweed.js';
import { courseRules } from '../js/domain/tajweedCourse.js';

const has = (word, rule, opts = {}) =>
  classifyWordTajweed(word, opts).some((span) => span.rule === rule);

test('every deterministic classifier rule has a positive regression fixture', () => {
  const fixtures = {
    hamzat_wasl: () => has('ٱلْعَالَمِينَ', 'hamzat_wasl'),
    lam_shamsiyyah: () => has('ٱلرَّحِيمِ', 'lam_shamsiyyah'),
    ghunnah: () => has('إِنَّ', 'ghunnah'),
    ikhfa: () => has('مِنْ', 'ikhfa', { nextWordFirstBase: 'ك' }),
    izhar: () => has('مِنْ', 'izhar', { nextWordFirstBase: 'ه' }),
    iqlab: () => has('مِنْ', 'iqlab', { nextWordFirstBase: 'ب' }),
    idgham_ghunnah: () => has('مِنْ', 'idgham_ghunnah', { nextWordFirstBase: 'ي' }),
    idgham_no_ghunnah: () => has('مِنْ', 'idgham_no_ghunnah', { nextWordFirstBase: 'ل' }),
    idgham_shafawi: () => classifyAyahTajweed('هُمْ مِّنْ')[0].spans.some((s) => s.rule === 'idgham_shafawi'),
    ikhfa_shafawi: () => classifyAyahTajweed('عَنْهُمْ بِآيَاتٍ')[0].spans.some((s) => s.rule === 'ikhfa_shafawi'),
    izhar_shafawi: () => classifyAyahTajweed('أَلَمْ نَشْرَحْ')[0].spans.some((s) => s.rule === 'izhar_shafawi'),
    qalqalah: () => has('يَدْخُلُونَ', 'qalqalah'),
    tafkhim: () => has('ٱللَّهِ', 'tafkhim'),
    madd_2: () => has('قَالَ', 'madd_2'),
    madd_iwad: () => has('عَلِيمًا', 'madd_iwad', { isLastWordOfAyah: true }),
    madd_badal: () => has('آدَمَ', 'madd_badal'),
    madd_246: () => has('الرَّحِيمِ', 'madd_246', { isLastWordOfAyah: true }),
    madd_munfasil: () => has('فِي', 'madd_munfasil', { nextWordFirstBase: 'أ' }),
    madd_silah: () => has('بِهِۦ', 'madd_silah'),
    madd_muttasil: () => has('جَاءَ', 'madd_muttasil'),
    madd_6: () => has('الضَّآلِّينَ', 'madd_6'),
  };

  const ruleIds = TAJWEED_RULES.map((r) => r.id);
  assert.deepEqual(
    Object.keys(fixtures).sort(),
    ruleIds.slice().sort(),
    'fixture matrix must cover every deterministic rule exactly once'
  );
  for (const [rule, fixture] of Object.entries(fixtures)) {
    assert.equal(fixture(), true, `${rule} has no working positive fixture`);
  }
});

test('every deterministic classifier rule is reachable from the course', () => {
  const taught = new Set(courseRules());
  const missing = TAJWEED_RULES.map((r) => r.id).filter((id) => !taught.has(id));
  assert.deepEqual(missing, [], 'classifier rules absent from the written course');
});
