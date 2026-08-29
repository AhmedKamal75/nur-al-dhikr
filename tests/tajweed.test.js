/**
 * tests/tajweed.test.js — the deterministic Tajweed rule classifier.
 * Test cases are chosen from well-known textbook examples so each
 * assertion doubles as documentation of the rule it's checking.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyWordTajweed,
  classifyAyahTajweed,
  TAJWEED_RULES,
  tajweedRule,
} from '../js/tajweed.js';

function rulesOf(word, opts) {
  return classifyWordTajweed(word, opts).map((s) => s.rule);
}
function ruleTextPairs(word, opts) {
  return classifyWordTajweed(word, opts).map((s) => ({
    rule: s.rule,
    text: word.slice(s.start, s.end),
  }));
}

test('Al-Fatiha 1:1 matches the well-known reference reading', () => {
  const result = classifyAyahTajweed(
    '\u0628ِ\u0633\u0652\u0645ِ \u0671\u0644\u0644\u0651\u064e\u0647ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0652\u0645\u064e\u0670\u0646ِ \u0671\u0644\u0631\u0651\u064e\u062D\u0650\u064a\u0645ِ'
  );
  assert.deepEqual(result[0].spans, []); // بِسْمِ — nothing to mark
  assert.deepEqual(ruleTextPairs(result[1].word), [{ rule: 'hamzat_wasl', text: '\u0671' }]); // ٱللَّهِ — divine name, lam left uncolored
  const rahman = ruleTextPairs(result[2].word);
  assert.ok(rahman.some((r) => r.rule === 'hamzat_wasl'));
  assert.ok(rahman.some((r) => r.rule === 'lam_shamsiyyah'));
  assert.ok(rahman.some((r) => r.rule === 'madd_2')); // the dagger alif
  const raheem = classifyWordTajweed(result[3].word, { isLastWordOfAyah: true });
  assert.ok(raheem.some((s) => s.rule === 'madd_246')); // ayah-final madd, pause-lengthened
});

test('hamzat al-wasl fires on every \u0671, nowhere else', () => {
  assert.ok(
    rulesOf('\u0671\u0644\u0652\u0639\u064e\u0627\u0644\u064e\u0645ِ\u064a\u0646َ').includes(
      'hamzat_wasl'
    )
  ); // ٱلْعَالَمِينَ
  assert.deepEqual(rulesOf('\u0642\u064e\u0627\u0644َ'), ['madd_2']); // قَالَ has no hamza-wasl at all, only its own natural madd
});

test('lam shamsiyyah fires only for \u0627\u0644/\u0671\u0644 + shaddah sun letter, and never on the divine name', () => {
  assert.ok(
    rulesOf('\u0671\u0644\u0631\u0651\u064e\u062D\u0650\u064a\u0645ِ').includes('lam_shamsiyyah')
  ); // الرحيم — ر is a sun letter
  assert.ok(
    !rulesOf('\u0671\u0644\u0652\u0639\u064e\u0644\u064e\u0645ِ\u064a\u0646َ').includes(
      'lam_shamsiyyah'
    )
  ); // العالمين — ع is a moon letter
  assert.ok(!rulesOf('\u0671\u0644\u0644\u0651\u064e\u0647ِ').includes('lam_shamsiyyah')); // ٱللَّهِ excluded by name
});

test('qalqalah fires on ق ط ب ج د with sukun, not on other sakin letters', () => {
  assert.ok(
    rulesOf('\u064a\u064e\u062F\u0652\u062E\u064F\u0644\u0648\u0646َ').includes('qalqalah')
  ); // يَدْخُلُونَ — د sakin
  assert.deepEqual(
    rulesOf('\u0623\u064e\u0646\u0652\u0639َمْتَ').filter((r) => r === 'qalqalah'),
    []
  ); // أَنْعَمْتَ — ن and م sakin, neither is a qalqalah letter
});

test('ghunnah fires on shaddah-marked \u0646/\u0645 only', () => {
  assert.ok(rulesOf('\u0625ِ\u0646َّ').includes('ghunnah')); // إِنَّ
  assert.ok(rulesOf('\u062B\u064F\u0645َّ').includes('ghunnah')); // ثُمَّ
});

test('noon sakinah / tanween: iqlab, idgham (with/without ghunnah), ikhfa, and clean izhar', () => {
  assert.equal(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0628' })[0], 'iqlab'); // منْ بـ...
  assert.equal(rulesOf('\u0645َ\u0646ْ', { nextWordFirstBase: '\u064A' })[0], 'idgham_ghunnah'); // منْ يـ...
  assert.equal(rulesOf('\u0645َ\u0646ْ', { nextWordFirstBase: '\u0644' })[0], 'idgham_no_ghunnah'); // منْ لـ...
  assert.equal(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0643' })[0], 'ikhfa'); // منْ كـ...
  // followed by a throat letter (ه ع ح غ خ ء) -> izhar -> no rule at all
  assert.deepEqual(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0647' }), []);
});

test('tanween triggers the same noon-sakinah family as a bare sakin noon', () => {
  assert.ok(
    rulesOf('\u0643ِ\u062A\u064e\u0627\u0628ٌ', { nextWordFirstBase: '\u0645' }).includes(
      'idgham_ghunnah'
    )
  ); // كِتَابٌ + م...
});

test('madd: natural, connected (muttasil), separated (munfasil), badal, and obligatory (muqatta\u2019at)', () => {
  assert.ok(rulesOf('\u0642َالَ').includes('madd_2')); // قَالَ, plain natural madd
  assert.ok(rulesOf('\u062C\u064e\u0627\u0621َ').includes('madd_muttasil')); // جَاءَ — alif then hamza in the same word
  assert.equal(
    rulesOf('\u0641ِ\u064a', { nextWordFirstBase: '\u0623' }).includes('madd_munfasil'),
    true
  ); // في + أ... across a word boundary
  assert.equal(rulesOf('\u0622\u062F\u064e\u0645َ')[0], 'madd_badal'); // آدَمَ — hamza+madd with nothing hamza-adjacent following: badal, not lazim
  // الٓمٓ (Alif Laam Meem) — the muqatta'at letter-names carry an inherent
  // 6-count madd, marked directly in the text with a combining madda on
  // the consonant itself (\u0644\u0653 / \u0645\u0653), not on a vowel letter.
  const alm = classifyWordTajweed('\u0627\u0644\u0653\u0645\u0653');
  assert.deepEqual(
    alm.map((s) => s.rule),
    ['madd_6', 'madd_6']
  );
});

test('meem sakinah family: idgham (before م), ikhfa (before ب), izhar (everything else)', () => {
  // Cross-word cases go through classifyAyahTajweed so the one-letter
  // lookahead the rules depend on is exercised exactly as in production.
  const pairs = (ayahText, wordIdx) =>
    classifyAyahTajweed(ayahText)[wordIdx].spans.map((sp) => ({
      rule: sp.rule,
      text: classifyAyahTajweed(ayahText)[wordIdx].word.slice(sp.start, sp.end),
    }));
  // هُمْ followed by a shadda'd م — idgham shafawi with ghunnah.
  const idg = classifyAyahTajweed('هُمْ مِّنْ')[0].spans.map((s) => s.rule);
  assert.ok(idg.includes('idgham_shafawi'), 'meem before meem must be idgham shafawi');
  // عنهم before ب — ikhfa shafawi.
  assert.ok(
    classifyAyahTajweed('عَنْهُمْ بِآيَاتٍ')[0].spans.some((s) => s.rule === 'ikhfa_shafawi'),
    'word-final sakin meem before baa must be ikhfa shafawi'
  );
  // أَلَمْ before نَشْرَحْ (surah 94 opening) — izhar shafawi; exercises the
  // alternate small-high-rounded-zero sukun glyph this source actually uses.
  assert.ok(
    classifyAyahTajweed(
      '\u0623\u064E\u0644\u064E\u0645\u06E1 \u0646\u064E\u0634\u0652\u0631\u064E\u062D\u0652'
    )[0].spans.some((s) => s.rule === 'izhar_shafawi'),
    'alam nashrah: sakin meem before noon must be izhar shafawi'
  );
  // The mushadda'd member of the pair itself is ghunnah, independently.
  assert.ok(
    classifyAyahTajweed('هُمْ مِّنْ')[1].spans.some((s) => s.rule === 'ghunnah'),
    'mushadda meem stays ghunnah even while the previous meem idghams into it'
  );
  // A vowel-carrying meem is not sakinah at all.
  assert.deepEqual(
    classifyWordTajweed('مُ').map((s) => s.rule),
    [],
    'meem with damma is simply a normal letter'
  );
});

test('empty/undefined input never throws', () => {
  assert.deepEqual(classifyWordTajweed(''), []);
  assert.deepEqual(classifyWordTajweed(undefined), []);
  assert.deepEqual(classifyAyahTajweed(''), []);
  assert.deepEqual(classifyAyahTajweed(undefined), []);
});

test('TAJWEED_RULES / tajweedRule: every rule id used by the classifier has a legend entry', () => {
  const ids = new Set(TAJWEED_RULES.map((r) => r.id));
  const used = [
    'hamzat_wasl',
    'lam_shamsiyyah',
    'qalqalah',
    'ghunnah',
    'iqlab',
    'idgham_ghunnah',
    'idgham_no_ghunnah',
    'ikhfa',
    'madd_2',
    'madd_badal',
    'madd_silah',
    'madd_muttasil',
    'madd_munfasil',
    'madd_246',
    'madd_6',
  ];
  for (const id of used) assert.ok(ids.has(id), `missing legend entry for ${id}`);
  assert.equal(tajweedRule('qalqalah').id, 'qalqalah');
  assert.equal(tajweedRule('not-a-rule'), null);
  // every legend entry has both languages for name + description
  for (const r of TAJWEED_RULES) {
    assert.ok(r.name.en && r.name.ar, `${r.id} missing a name`);
    assert.ok(r.desc.en && r.desc.ar, `${r.id} missing a description`);
  }
});
