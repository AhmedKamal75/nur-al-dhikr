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
  TAJWEED_FAMILIES,
  tajweedRule,
} from '../js/domain/tajweed.js';

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
  // The preceding word ends in kasra (بِسْمِ), so the lām of
  // lafẓ al-jalālah is light here and must not receive the heavy Tafkhim tag.
  assert.deepEqual(ruleTextPairs(result[1].word), [
    { rule: 'hamzat_wasl', text: '\u0671' },
  ]); // بِسْمِ ٱللَّهِ — lām al-jalālah is tarqiq after kasra
  const rahman = ruleTextPairs(result[2].word);
  assert.ok(rahman.some((r) => r.rule === 'hamzat_wasl'));
  assert.ok(rahman.some((r) => r.rule === 'lam_shamsiyyah'));
  assert.ok(rahman.some((r) => r.rule === 'madd_2')); // the dagger alif
  const raheem = classifyWordTajweed(result[3].word, { isLastWordOfAyah: true });
  assert.ok(raheem.some((s) => s.rule === 'madd_246')); // ayah-final madd, pause-lengthened
});


test('lam of lafz al-jalalah respects heavy/light vowel context', () => {
  const hasAllahTafkhim = (text) =>
    classifyAyahTajweed(text).some((word) =>
      word.spans.some((span) => span.rule === 'tafkhim')
    );

  assert.equal(hasAllahTafkhim('ٱللَّهُ'), true, 'initial recitation uses the heavy lām');
  assert.equal(hasAllahTafkhim('قَالَ ٱللَّهُ'), true, 'a preceding fatḥah supports tafkhim');
  assert.equal(hasAllahTafkhim('وَٱللَّهِ'), true, 'the attached wāw-prefix has fatḥah');
  assert.equal(hasAllahTafkhim('فِي ٱللَّهِ'), false, 'a preceding kasrah requires tarqiq');
  assert.equal(hasAllahTafkhim('بِٱللَّهِ'), false, 'the attached bi-prefix has kasrah');
  assert.equal(hasAllahTafkhim('لِلَّهِ'), false, 'the attached li-prefix has kasrah');
  assert.equal(
    hasAllahTafkhim('قَالَ ۚ ٱللَّهُ'),
    true,
    'a standalone ornament must not erase a preceding heavy vowel'
  );
  assert.equal(
    hasAllahTafkhim('فِي ۚ ٱللَّهِ'),
    false,
    'a standalone ornament must not erase the preceding kasrah context'
  );
});

test('hamzat al-wasl fires on every \u0671, nowhere else', () => {
  assert.ok(
    rulesOf('\u0671\u0644\u0652\u0639\u064e\u0627\u0644\u064e\u0645ِ\u064a\u0646َ').includes(
      'hamzat_wasl'
    )
  ); // ٱلْعَالَمِينَ
  assert.deepEqual(rulesOf('\u0642\u064e\u0627\u0644َ'), ['madd_2']); // قَالَ has no hamza-wasl at all, only its own natural madd
});

test('lam shamsiyyah also detects the article after a lam-prefix', () => {
  assert.ok(
    rulesOf('\u0644\u0650\u0644\u0637\u0651\u064e\u0627\u0653\u0626\u0650\u0641\u0650\u064a\u0646').includes(
      'lam_shamsiyyah'
    )
  ); // لِلطَّآئِفِينَ
  assert.ok(
    rulesOf('\u0644\u0650\u0644\u0638\u0651\u064e\u0627\u0644\u0650\u0645\u0650\u064a\u0646').includes(
      'lam_shamsiyyah'
    )
  ); // لِلظَّالِمِينَ

  const lamPrefixExample = '\u0644\u0650\u0644\u0638\u0651\u064e\u0627\u0644\u0650\u0645\u0650\u064a\u0646';
  const articleLam = classifyWordTajweed(lamPrefixExample).find((span) => span.rule === 'lam_shamsiyyah');
  assert.ok(articleLam, 'the silent article lām should receive the Tajweed span');
  assert.equal(articleLam.start, 2, 'classify the second lām, not the pronounced lām-prefix');
  assert.equal(lamPrefixExample.slice(articleLam.start, articleLam.end), '\u0644');
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

test('Muqaṭṭaʿāt opening tokens do not inherit bare-letter Qalqalah', () => {
  for (const word of [
    '\u0637\u0647',
    '\u0637\u0633\u0653',
    '\u0637\u0633\u0653\u0645\u0653',
    '\u0642\u0653',
    '\u0639\u0633\u0653\u0642\u0653',
  ]) {
    assert.deepEqual(
      rulesOf(word).filter((r) => r === 'qalqalah'),
      [],
      word
    );
  }
});

test('qalqalah suppression requires explicit assimilation evidence', () => {
  assert.deepEqual(
    rulesOf('\u0642\u0652', {
      nextWordFirstBase: '\u0643',
      nextWordFirstHasShadda: false,
    }).filter((r) => r === 'qalqalah'),
    ['qalqalah']
  ); // adjacency alone is not enough.
  assert.deepEqual(
    rulesOf('\u0642\u0652', {
      nextWordFirstBase: '\u0643',
      nextWordFirstHasShadda: true,
    }).filter((r) => r === 'qalqalah'),
    []
  ); // explicit next-kaf shadda supports the qaf→kaf assimilation family.
  assert.deepEqual(
    rulesOf('\u062F\u0652', {
      nextWordFirstBase: '\u062F',
      nextWordFirstHasShadda: false,
    }).filter((r) => r === 'qalqalah'),
    ['qalqalah']
  );
  assert.deepEqual(
    rulesOf('\u062F\u0652', {
      nextWordFirstBase: '\u062F',
      nextWordFirstHasShadda: true,
    }).filter((r) => r === 'qalqalah'),
    []
  ); // explicit identical-letter idgham.
  assert.deepEqual(
    rulesOf('\u062F\u0652', {
      nextWordFirstBase: '\u062A',
      nextWordFirstHasShadda: false,
    }).filter((r) => r === 'qalqalah'),
    ['qalqalah']
  ); // no assimilation cue without the target shadda.
  assert.deepEqual(
    rulesOf('\u062F\u0652', {
      nextWordFirstBase: '\u062A',
      nextWordFirstHasShadda: true,
    }).filter((r) => r === 'qalqalah'),
    []
  ); // required dal→ta assimilation.
  assert.deepEqual(
    rulesOf('\u0628\u0652', {
      nextWordFirstBase: '\u0645',
      nextWordFirstHasShadda: true,
    }).filter((r) => r === 'qalqalah'),
    ['qalqalah']
  ); // ارْكَبْ مَّعَنَا remains route-sensitive without a profile.
  for (const word of [
    '\u0627\u064e\u062D\u064e\u0637\u0652\u062A\u064f', // أَحَطْتُ
    '\u0628\u064e\u0633\u064e\u0637\u0652\u062A\u064e', // بَسَطْتَ
    '\u0641\u064e\u0631\u0651\u064e\u0637\u062A\u064f', // فَرَّطتُ
    '\u0641\u064e\u0631\u0651\u064e\u0637\u062A\u064f\u0645\u06E1', // فَرَّطتُمۡ
    '\u0646\u064e\u062E\u0652\u0644\u064F\u0642\u0643\u0651\u064F\u0645\u0652', // نَخْلُقكُّم
  ]) {
    assert.deepEqual(rulesOf(word).filter((r) => r === 'qalqalah'), []);
  }
  assert.ok(rulesOf('\u0642\u0652', { nextWordFirstBase: '\u062E' }).includes('qalqalah'));
});

test('ayah-level Qalqalah suppression survives confirmed source spellings', () => {
  const mergedDal = classifyAyahTajweed(
    '\u0648\u064e\u0642\u064e\u062F \u062F\u0651\u064e\u062E\u064e\u0644\u064F\u0648\u0627'
  );
  assert.equal(mergedDal[1].spans.some((sp) => sp.rule === 'qalqalah'), false);

  const mergedTa = classifyAyahTajweed('\u0642\u064e\u062F \u062A\u0651\u064e\u0628\u064e\u064a\u0651\u064e\u0646\u064e');
  assert.equal(mergedTa[0].spans.some((sp) => sp.rule === 'qalqalah'), false);
});

test('ghunnah fires on shaddah-marked \u0646/\u0645 only', () => {
  assert.ok(rulesOf('\u0625ِ\u0646َّ').includes('ghunnah')); // إِنَّ
  assert.ok(rulesOf('\u062B\u064F\u0645َّ').includes('ghunnah')); // ثُمَّ
});

test('low Uthmani iqlab mark canonicalizes to the same iqlab rule', () => {
  assert.equal(
    rulesOf('\u0645\u0652\u0646\u06ED', { nextWordFirstBase: '\u0628' }).includes('iqlab'),
    true,
    'the low mark must normalize to iqlab even when the preceding same-word meem has its own rule'
  );
});

test('noon sakinah / tanween: iqlab, idgham (with/without ghunnah), ikhfa, and clean izhar', () => {
  assert.equal(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0628' })[0], 'iqlab'); // منْ بـ...
  assert.equal(rulesOf('\u0645َ\u0646ْ', { nextWordFirstBase: '\u064A' })[0], 'idgham_ghunnah'); // منْ يـ...
  assert.equal(rulesOf('\u0645َ\u0646ْ', { nextWordFirstBase: '\u0644' })[0], 'idgham_no_ghunnah'); // منْ لـ...
  assert.equal(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0643' })[0], 'ikhfa'); // منْ كـ...
  // followed by a throat letter (ء ه ع ح غ خ) -> explicit halqi izhar.
  assert.equal(rulesOf('\u0645ِ\u0646ْ', { nextWordFirstBase: '\u0647' })[0], 'izhar');
});

test('tanween triggers the same noon-sakinah family as a bare sakin noon', () => {
  assert.ok(
    rulesOf('\u0643ِ\u062A\u064e\u0627\u0628ٌ', { nextWordFirstBase: '\u0645' }).includes(
      'idgham_ghunnah'
    )
  ); // كِتَابٌ + م...
});

test('small waw/yeh only become Madd as-Silah after hāʾ al-kinayah', () => {
  assert.ok(rulesOf('\u0644\u064e\u0647\u064f\u06E5').includes('madd_silah')); // لَهُۥ
  assert.equal(rulesOf('\u062F\u064e\u0627\u0648\u064F\u06E5\u062F\u064F').includes('madd_silah'), false); // دَاوُۥدُ
  assert.ok(rulesOf('\u062F\u064e\u0627\u0648\u064F\u06E5\u062F\u064F').includes('madd_2'));
  assert.equal(rulesOf('\u064A\u064F\u062D\u0652\u064A\u0650\u06E6').includes('madd_silah'), false); // يُحۡيِۦ
  assert.ok(rulesOf('\u064A\u064F\u062D\u0652\u064A\u0650\u06E6').includes('madd_2'));
});

test('madd badal requires hamza+madd orthography, not any madda sign', () => {
  assert.equal(rulesOf('\u0622\u062F\u064e\u0645َ')[0], 'madd_badal'); // آدَمَ
  assert.ok(
    rulesOf('\u0645\u064e\u0627\u0653').includes('madd_2'),
    'مَآ is an explicitly marked ordinary madd, not Madd Badal'
  );
  assert.equal(
    rulesOf('\u0645\u064e\u0627\u0653').includes('madd_badal'),
    false
  );
  assert.equal(
    rulesOf('\u0623\u0653\u062F\u064e\u0645َ')[0],
    'madd_badal'
  ); // explicit hamza + madda spelling of the same category
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

test('Muqaṭṭaʿāt Meem is not treated as ordinary Meem Sakinah', () => {
  const opening = classifyAyahTajweed('\u062D\u0645\u0653 \u0639\u0633\u0653\u0642\u0653')[0];
  assert.equal(
    opening.spans.some((s) =>
      ['idgham_shafawi', 'ikhfa_shafawi', 'izhar_shafawi'].includes(s.rule)
    ),
    false
  );
  assert.ok(opening.spans.some((s) => s.rule === 'madd_6'));
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

test("madd 'arid requires a following final consonant", () => {
  const duha = classifyAyahTajweed('\u0648\u064e\u0671\u0644\u0636\u0651\u064f\u062d\u064e\u0670');
  assert.equal(
    duha[0].spans.some((s) => s.rule === 'madd_246'),
    false,
    'وَٱلضُّحَىٰ ends on the madd letter itself; it is not madd arid'
  );
  assert.ok(
    duha[0].spans.some((s) => s.rule === 'madd_2'),
    'the final alif maqsurah remains a natural madd when no final consonant follows'
  );

  const raheem = classifyAyahTajweed('الرَّحِيمِ');
  assert.ok(
    raheem[0].spans.some((s) => s.rule === 'madd_246'),
    'الرَّحِيمِ has a final consonant after the madd letter'
  );
});

test('ornament-only tokens do not break cross-word Tajweed lookahead or ayah-final context', () => {
  const izhar = classifyAyahTajweed('مِنْ ۚ هُدًى');
  assert.equal(izhar[0].spans[0]?.rule, 'izhar', 'ornament must not hide the next throat letter');

  const idgham = classifyAyahTajweed('مِنْ ۖ يَعْمَلْ');
  assert.equal(
    idgham[0].spans[0]?.rule,
    'idgham_ghunnah',
    'ornament must not hide the next idgham letter'
  );

  const sajdah = classifyAyahTajweed('مِنْ ۩ هُدًى');
  assert.equal(sajdah[1].spans.length, 0, 'standalone sajdah mark remains a render-only token');

  const final = classifyAyahTajweed('الرَّحِيمِ ۚ');
  assert.ok(
    final[0].spans.some((s) => s.rule === 'madd_246'),
    'a trailing ornament must not steal final-word pause context'
  );

  const iwad = classifyAyahTajweed('عَلِيمًا ۚ');
  assert.ok(
    iwad[0].spans.some((s) => s.rule === 'madd_iwad'),
    'a trailing ornament must not suppress final madd iwad'
  );
  const numbered = classifyAyahTajweed('مِنْ ١ هُدًى');
  assert.equal(numbered[1].spans.length, 0, 'standalone ayah numeral remains a render-only token');
  assert.equal(final[1].spans.length, 0, 'standalone ornament remains a render-only token');
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
    'izhar',
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

/* ------------------------------------------------------------------ */
/* v4.5.2 — the app-palette additions: Tafkhim + Madd 'Iwad      */
/* ------------------------------------------------------------------ */

test('tafkhim: the lām of Lafẓ al-Jalālah follows its vowel context', () => {
  // A standalone word is treated as initial recitation only when the caller says so.
  assert.ok(
    rulesOf('\u0671\u0644\u0644\u0651\u064e\u0647\u0650', { isFirstWordOfAyah: true }).includes('tafkhim')
  );
  // وَٱللَّهِ — attached wāw with fatḥah supports the heavy lām.
  assert.ok(rulesOf('\u0648\u064e\u0671\u0644\u0644\u0651\u064e\u0647\u0650').includes('tafkhim'));
  // بِٱللَّهِ and لِلَّهِ have kasrah before the name: tarqiq, not tafkhim.
  assert.ok(!rulesOf('\u0628\u0650\u0671\u0644\u0644\u0651\u064e\u0647\u0650').includes('tafkhim'));
  assert.ok(!rulesOf('\u0644\u0650\u0644\u0651\u064e\u0647\u0650').includes('tafkhim'));
  // ٱللَّهُمَّ — Allahumma: the lam-ha ending is NOT there (ends لهم), no tafkhim lam.
  assert.ok(
    !rulesOf('\u0671\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e').includes('tafkhim')
  );
});
test('tafkhim: ra\u2019 mufakhkhamah (fatha/damma) fires; kasra and sukun do not', () => {
  assert.ok(rulesOf('\u0631\u064e\u0628\u0651').includes('tafkhim')); // رَبّ — fatha
  assert.ok(rulesOf('\u0631\u064f\u0632\u0650\u0642').includes('tafkhim')); // رُزِق — damma
  assert.ok(!rulesOf('\u0631\u0650\u062C\u064e\u0644').includes('tafkhim')); // رِجَل — kasra = tarqiq
  assert.ok(!rulesOf('\u0627\u0644\u0652\u0642\u064e\u0645\u064e\u0631').includes('tafkhim')); // القَمَر final sukun ra — context rule, left uncolored
});

test("madd 'iwad: ayah-final fathah tanween is red; mid-ayah tanween is not", () => {
  // عَلِيمًا as the LAST word of an ayah → 'iwad
  assert.ok(
    rulesOf('\u0639\u064e\u0644\u0650\u064A\u0645\u064b\u0627', {
      isLastWordOfAyah: true,
    }).includes('madd_iwad')
  );
  // the same word mid-ayah → no 'iwad (the noon family owns tanween there)
  assert.ok(
    !rulesOf('\u0639\u064e\u0644\u0650\u064A\u0645\u064b\u0627', {
      isLastWordOfAyah: false,
    }).includes('madd_iwad')
  );
});

test('the app palette: families match the reference chart colors', () => {
  const colorOf = (id) => TAJWEED_RULES.find((r) => r.id === id)?.color;
  // silent gray
  assert.equal(colorOf('hamzat_wasl'), '#9E9E9E');
  assert.equal(colorOf('lam_shamsiyyah'), '#9E9E9E');
  // nasal green family — one color for the whole noon/meem sakinah family
  for (const id of [
    'ghunnah',
    'ikhfa',
    'iqlab',
    'idgham_ghunnah',
    'idgham_shafawi',
    'ikhfa_shafawi',
  ])
    assert.equal(colorOf(id), '#4CAF50', `${id} should be app-palette green`);
  // qalqalah cyan, tafkhim blue
  assert.equal(colorOf('qalqalah'), '#00BCD4');
  assert.equal(colorOf('tafkhim'), '#2196F3');
  // madd ladder: app-palette reds (cumin → orange-red → blood → dark)
  assert.equal(colorOf('madd_2'), '#D32F2F');
  assert.equal(colorOf('madd_iwad'), '#D32F2F');
  assert.equal(colorOf('madd_munfasil'), '#BF3600');
  assert.equal(colorOf('madd_muttasil'), '#C62828');
  assert.equal(colorOf('madd_6'), '#B71C1C');
  // the three rules this app's presentation convention leaves uncolored
  assert.equal(colorOf('idgham_no_ghunnah'), null);
  assert.equal(colorOf('izhar_shafawi'), null);
  assert.equal(colorOf('izhar'), null);
  // every rule carries a family, and every family id exists in TAJWEED_FAMILIES
  const familyIds = new Set(TAJWEED_FAMILIES.map((f) => f.id));
  for (const r of TAJWEED_RULES) {
    assert.ok(r.family, `${r.id} missing family`);
    if (r.family !== 'plain') assert.ok(familyIds.has(r.family), `${r.id} unknown family`);
  }
});
