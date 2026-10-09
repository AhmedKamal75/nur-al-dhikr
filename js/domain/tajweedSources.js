/**
 * tajweedSources.js — runtime mirror of data/tajweed-sources.json (v5.17.18)
 *
 * A JS module, not a fetch, because the mushaf legend and the Settings
 * panel both need the citation synchronously and offline. The JSON file is
 * the canonical copy; tests/tajweed-sources.test.js fails if the two drift,
 * so the mirror cannot quietly rot.
 *
 * Why this exists at all: a tajweed rule description is religious teaching.
 * AGENTS.md §1.1a requires that such prose name where it came from, and
 * attaching a line reference to each rule satisfied that without rewriting
 * wording that was already correct. A `contested` review state means
 * authorities disagree and the UI must show the spread, not pick a side —
 * thirteen of the twenty-seven entries are contested (the madd/qalqalah
 * caveats plus the makharij 17/16/14 and sifat 17/18/20/44 spreads), which
 * is the honest state of the material.
 *
 * Generated from the JSON; edit the JSON, not this file.
 */

export const TAJWEED_WORKS = Object.freeze({
  'tuhfat-al-atfal': Object.freeze({
    author: Object.freeze({
      en: 'Sulayman ibn Muhammad al-Jamzuri',
      ar: 'سليمان بن محمد الجمزوري',
    }),
    shortTitle: Object.freeze({ en: 'Tuhfat al-Atfal', ar: 'تحفة الأطفال' }),
    death: '1179 AH / 1766 CE',
    note: Object.freeze({
      en: 'The standard first tajweed text for beginners, and the spine of most taught beginner curricula.',
      ar: 'أشهر متون التجويد للمبتدئين، وهو عمود أغلب المناهج المبتدئة.',
    }),
  }),
  jazariyya: Object.freeze({
    author: Object.freeze({ en: 'Ibn al-Jazari', ar: 'ابن الجزري' }),
    shortTitle: Object.freeze({ en: 'al-Muqaddima al-Jazariyya', ar: 'المقدمة الجزرية' }),
    death: '833 AH / 1429 CE',
    note: Object.freeze({
      en: "107 verses. The section titles are later editorial additions, not Ibn al-Jazari's own.",
      ar: '107 أبيات. عناوين الأبواب مضافة من المحققين، ليست من ابن الجزري.',
    }),
  }),
  tamhid: Object.freeze({
    author: Object.freeze({ en: 'Ibn al-Jazari', ar: 'ابن الجزري' }),
    shortTitle: Object.freeze({ en: 'al-Tamhid fi ilm al-Tajwid', ar: 'التهويد في علم التجويد' }),
    edition: 'ed. Ali Husayn al-Bawwab, Riyadh 1405/1985',
    note: Object.freeze({
      en: 'The prose expansion of the Jazariyya, and the usual reference for chapter-level organisation.',
      ar: 'متن شرح للمقدمة الجزرية، وهو المرجع المعتاد في تنظيم الأبواب.',
    }),
  }),
  'madd-wa-qasr': Object.freeze({
    author: Object.freeze({
      en: "A. D. al-Sayyid Isma'il Ali Sulayman",
      ar: 'أ. د. السيد إسماعيل علي سليمان',
    }),
    shortTitle: Object.freeze({
      en: 'al-Madd wa-l-Qasr (Egyptian Ministry of Awqaf)',
      ar: 'المد والقصر (وزارة الأوقاف المصرية)',
    }),
    note: Object.freeze({
      en: "Official Egyptian Ministry of Awqaf article. Its section on the opening letters describes the 4/6-count exception for ʿayn.",
      ar: 'مقال رسمي لوزارة الأوقاف المصرية. يذكر قسم أحكام الحروف في أوائل السور استثناء العين بمقدار أربع أو ست حركات.',
    }),
    url: 'https://awkafonline.gov.eg/content-sections/116/5024/%D8%A7%D9%84%D9%85%D8%AF-%D9%88%D8%A7%D9%84%D9%82%D8%B5%D8%B1',
  }),
  'mawsua-saudiyya': Object.freeze({
    author: Object.freeze({
      en: "King Fahd Glorious Quran Printing Complex (al-Mawsu'a al-Sa'udiyya)",
      ar: 'المجمع السعودي لخدمات المصحف الشريف',
    }),
    shortTitle: Object.freeze({ en: "al-Mawsu'a al-Sa'udiyya", ar: 'الموسوعة السعودية' }),
    note: Object.freeze({
      en: 'Reference work used here for the qalqalah letter-count dispute.',
      ar: 'مرجع مستخدَم هنا في خلاف عدد حروف قلقلة.',
    }),
  }),
});

/** workId -> the citation string a reader sees, per language. */
export const TAJWEED_SOURCES = Object.freeze({
  hamzat_wasl: Object.freeze({
    work: 'jazariyya',
    lines: '100-103',
    review: 'sourced',
    also: Object.freeze(['tamhid']),
    topic: 'orthography',
  }),
  lam_shamsiyyah: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '24-29',
    review: 'sourced',
    also: Object.freeze(['jazariyya']),
    topic: 'lams',
  }),
  ghunnah: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '14-17',
    review: 'sourced',
    also: Object.freeze(['jazariyya']),
    topic: 'ikhfa-and-ghunnah',
    caveat: Object.freeze({
      en: 'Ghunnah has ONE articulation point, al-khaysum. The figure 15 counts ikhfa letters, not ghunnah points.',
      ar: 'للغنة مخرج واحد، الخيشوم. والعدد ١٥ يعد حروف الإخفاء لا مخارج الغنة.',
    }),
  }),
  ikhfa: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '14-17',
    review: 'sourced',
    topic: 'ikhfa-and-ghunnah',
    caveat: Object.freeze({
      en: 'Ikhfa is 15 letters; published texts differ on the noon-ruling count (3, 4, 5 or 6).',
      ar: 'الإخفاء خمسة عشر حرفًا، وتتباعد النصوص في عدد أحكام النون الساكنة والتنوين (٣ أو ٤ أو ٥ أو ٦).',
    }),
  }),
  izhar: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '6-13',
    review: 'sourced',
    topic: 'nun-sakinah',
  }),
  iqlab: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '6-13',
    review: 'sourced',
    topic: 'nun-sakinah',
  }),
  idgham_ghunnah: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '6-13',
    review: 'sourced',
    topic: 'nun-sakinah',
  }),
  idgham_no_ghunnah: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '6-13',
    review: 'sourced',
    topic: 'nun-sakinah',
  }),
  idgham_shafawi: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '18-23',
    review: 'sourced',
    topic: 'mim-sakinah',
  }),
  ikhfa_shafawi: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '18-23',
    review: 'sourced',
    topic: 'mim-sakinah',
  }),
  izhar_shafawi: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '18-23',
    review: 'sourced',
    topic: 'mim-sakinah',
  }),
  qalqalah: Object.freeze({
    work: 'jazariyya',
    lines: '23, 37-39',
    review: 'contested',
    also: Object.freeze(['mawsua-saudiyya']),
    caveat: Object.freeze({
      en: 'Five letters or six? al-Jabari added hamzah, al-Sibawayh ta, al-Mubarrad kaf; the majority refuse all three. Grades of qalqalah are likewise given as 2, 3 or 4, which changes intensity rather than the sound.',
      ar: 'خمسة أحرف أم ستة؟ أضاف الجباري الهمزة، والسيباويه التاء، والمبرد الكاف، ورفض الجمهور هذه الثلاثة. أما درجات القلقلة فتقال ٢ أو ٣ أو ٤، والأمر في الشدة لا في الصوت.',
    }),
  }),
  tafkhim: Object.freeze({
    work: 'jazariyya',
    lines: '34-56',
    review: 'sourced',
    topic: 'sifat',
  }),
  // (v5.17.32) The makharij/sifat spreads. Contested position ids, not
  // classifier rules: each carries a bilingual label and the disagreement
  // note the course view renders, and none of them is the app's default —
  // there is no TAJ-09 ruling in the tree, so all three counts ship.
  makharij_17: Object.freeze({
    work: 'tamhid',
    lines: 'ch. 8',
    review: 'contested',
    also: Object.freeze(['jazariyya']),
    topic: 'makharij',
    label: Object.freeze({
      en: '17 — Khalil ibn Ahmad, adopted by Ibn al-Jazari',
      ar: '١٧ — الخليل بن أحمد، واعتمده ابن الجزري',
    }),
    caveat: Object.freeze({
      en: "Seventeen articulation points, keeping al-jawf as a real makhraj: jawf 1, halq 3, lisan 10, shafatan 2, khayshum 1. Ibn al-Jazari states his choice in al-Muqaddima v. 9, seventeen on the view of whoever has tested it. Two other counts are taught in this course, 16 and 14, and no count is this app's default.",
      ar: 'سبعة عشر مخرجًا، مع إبقاء الجوف مخرجًا حقيقيًّا: الجوف ١ والحلق ٣ واللسان ١٠ والشفتان ٢ والخيشوم ١. واختارها ابن الجزري في المقدمة في البيت ٩. ويُدرَّس في هذه الدورة عددان آخران، ١٦ و١٤، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  makharij_16: Object.freeze({
    work: 'tamhid',
    lines: 'ch. 8',
    review: 'contested',
    topic: 'makharij',
    label: Object.freeze({
      en: '16 — Sibawayh and al-Shatibi: al-jawf deleted',
      ar: '١٦ — سيبويه والشاطبي: إسقاط الجوف',
    }),
    caveat: Object.freeze({
      en: "Sixteen: al-jawf is deleted and its three letters redistributed, alif to the halq, ya to mid-tongue, waw to the lips, and many followed him therein, among them al-Shatibi. The 17-count and the 14-count are taught alongside it, and no count is this app's default.",
      ar: 'ستة عشر: يُسقَط مخرج الجوف وتُوزَّع حروفه على بقية المخارج، فالألف من الحلق والياء من وسط اللسان والواو من الشفتين، وتابعه على ذلك كثير منهم الشاطبي. ويُدرَّس معه العددان ١٧ و١٤، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  makharij_14: Object.freeze({
    work: 'tamhid',
    lines: 'ch. 8',
    review: 'contested',
    topic: 'makharij',
    label: Object.freeze({
      en: '14 — al-Farra, Qutrub, al-Jarmi, Ibn Kayyan: dhulqiyyah merged',
      ar: '١٤ — الفراء وقطرب والجرمي وابن كيّان: جمع الذلقية',
    }),
    caveat: Object.freeze({
      en: "Fourteen: al-jawf deleted as Sibawayh did, and the tongue's makharij made eight, because lam, nun and ra are put in one makhraj. That is the way of Qutrub, al-Jarmi, al-Farra and their followers. Taught alongside 17 and 16, and no count is this app's default.",
      ar: 'أربعة عشر: يُسقَط الجوف كما فعل سيبويه، وتُجعَل مخارج اللسان ثمانية لأن اللام والنون والراء من مخرج واحد، وهو مذهب قطرب والجرمي والفراء ومن تبعهم. ويُدرَّس مع العددين ١٧ و١٦، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  sifat_17: Object.freeze({
    work: 'jazariyya',
    lines: '19-26',
    review: 'contested',
    topic: 'sifat',
    label: Object.freeze({
      en: '17 — Ibn al-Jazari: ten with opposites, seven without',
      ar: '١٧ — ابن الجزري: عشر لها ضد وسبع لا ضد لها',
    }),
    caveat: Object.freeze({
      en: "Seventeen sifat, ten with opposites and seven without, as counted for Ibn al-Jazari in al-Wajiz (al-Muqaddima vv. 19-26). The reason given for seventeen is parity: so that the number of sifat would be seventeen, like the number of makharij. Others count differently: 18 counting al-tawassut as its own sifah, 20 adding al-khafa and al-ghunnah, and 44 with Makki ibn Abi Talib. No count is this app's default.",
      ar: 'سبع عشرة صفة، عشر لها ضد وسبع لا ضد لها، كما عدّها الوجيز لابن الجزري في المقدمة في الأبيات ١٩-٢٦. وسبب السبعة عشر المحاذاة: ليكون عدد الصفات سبع عشرة مثل عدد مخارج الحروف. ويعدّ غيره على خلاف ذلك: ١٨ بعدّ التوسط صفة مستقلة، و٢٠ بإضافة الخفاء والغنة، و٤٤ عند مكي بن أبي طالب. وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  sifat_18: Object.freeze({
    work: 'jazariyya',
    lines: '19-26',
    review: 'contested',
    topic: 'sifat',
    label: Object.freeze({
      en: '18 — al-Amid reports Ibn al-Jazari and the majority: al-tawassut counted',
      ar: '١٨ — العميد عن ابن الجزري والجمهور: عدّ التوسط',
    }),
    caveat: Object.freeze({
      en: "Eighteen: Ibn al-Jazari and the majority, as reported in al-Amid, counting al-tawassut, between-between, as its own sifah. Al-Wajiz counts 17, ten with opposites and seven without; Ghayat al-Murid counts 20. Taught alongside them, and no count is this app's default.",
      ar: 'ثماني عشرة: ابن الجزري والجمهور كما في العميد، بعدّ التوسط صفة مستقلة. ويعدّ الوجيز ١٧، عشرًا لها ضد وسبعًا لا ضد لها، ويعدّ غاية المريد ٢٠. تُدرَّس معهما، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  sifat_20: Object.freeze({
    work: 'jazariyya',
    lines: '19-26',
    review: 'contested',
    topic: 'sifat',
    label: Object.freeze({
      en: '20 — Ghayat al-Murid: al-khafa and al-ghunnah added',
      ar: '٢٠ — غاية المريد: بإضافة الخفاء والغنة',
    }),
    caveat: Object.freeze({
      en: "Twenty: Ghayat al-Murid, eighteen plus al-khafa, a sifah of the three madd letters and ha, plus al-ghunnah. Taught alongside 17 and 18, and no count is this app's default.",
      ar: 'عشرون: غاية المريد، الثماني عشرة مع الخفاء وهي صفة لحروف المد الثلاثة والهاء، والغنة. تُدرَّس مع ١٧ و١٨، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  sifat_44: Object.freeze({
    work: 'jazariyya',
    lines: '19-26',
    review: 'contested',
    topic: 'sifat',
    label: Object.freeze({
      en: '44 — Makki ibn Abi Talib: many more added',
      ar: '٤٤ — مكي بن أبي طالب: بزيادات كثيرة',
    }),
    caveat: Object.freeze({
      en: "Forty-four: Makki ibn Abi Talib al-Qaysi, adding many more, as reported in al-Wajiz. The minority position, taught so the spread is complete, and no count is this app's default.",
      ar: 'أربع وأربعون: مكي بن أبي طالب القيسي، بزيادات كثيرة كما في الوجيز. وهو قول الأقلية، ويُذكَر لتكتمل الصورة، وليس أي عدد هو المعتمَد في التطبيق.',
    }),
  }),
  madd_2: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '35-41',
    review: 'sourced',
    also: Object.freeze(['jazariyya']),
    topic: 'madd-tabi',
  }),
  madd_246: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '42-47',
    review: 'contested',
    also: Object.freeze(['jazariyya']),
    topic: 'madd-aridh-lazil',
    caveat: Object.freeze({
      en: "This id groups madd ʿāriḍ and madd lāzīl, which most texts set down as two separate rulings. The grouping is this app's, made so the colouring can share one family.",
      ar: 'يجمع هذا المعرّف بين المد العارض والمد اللازم اللذين تفرد أغلب النصوص حكمين، والجمع من وضع التطبيق ليشتركا في لون واحد.',
    }),
  }),
  madd_muttasil: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '42-47',
    review: 'sourced',
    also: Object.freeze(['jazariyya']),
    topic: 'madd-muttasil-munfasil',
  }),
  madd_munfasil: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '42-47',
    review: 'sourced',
    also: Object.freeze(['jazariyya']),
    topic: 'madd-muttasil-munfasil',
  }),
  madd_iwad: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '47-58',
    review: 'contested',
    topic: 'madd-lazim',
    caveat: Object.freeze({
      en: 'Whether ʿiwāḍ is counted among the madd lāzim types or set apart from them differs between texts; the recitation itself is unaffected.',
      ar: 'يختلف النصوص في عدّ العود من أنواع المد اللازمة أو إفرادها عنها، والأمر في الأداء واحد.',
    }),
  }),
  madd_badal: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '46',
    review: 'contested',
    topic: 'madd-badal',
    caveat: Object.freeze({
      en: "Madd Badal is a distinct madd category and must not be conflated with the four types of Madd Lazim. In this app's current classifier it is represented as a 2-count rule (see the executable fixture). Other recitation traditions can differ, so any future multi-riwayah support must scope the length explicitly.",
      ar: 'مد البدل باب مستقل من أبواب المد، ولا ينبغي خلطه بأنواع المد اللازم الأربعة. يمثله المصنّف الحالي في التطبيق كمد بمقدار حركتين (وفق الاختبار التنفيذي). وقد تختلف بعض طرق القراءة، لذلك يجب تحديد المقدار صراحة عند إضافة دعم لقراءات متعددة.',
    }),
  }),
  madd_silah: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '47-58',
    review: 'contested',
    topic: 'madd-lazim',
    caveat: Object.freeze({
      en: 'Ṣilah is set down by some as a type of madd lāzim and by others under madd ʿāriḍ; the recitation is the same either way.',
      ar: 'يجعلها بعضهم من المد اللازمة وبعضهم من المد العارض، والأمر في الأداء واحد.',
    }),
  }),
  madd_6: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '47-58',
    review: 'contested',
    topic: 'madd-lazim',
    caveat: Object.freeze({
      en: '`madd_6` names the six-count length, not a count of six rule types. Tuhfat al-Atfal describes four forms of madd lazim in this passage. Keep the identifier for compatibility; do not infer that separate rules grouped in a course session are all madd lazim.',
      ar: 'يشير المعرّف البرمجي إلى مقدار ست حركات، لا إلى عدد ستة أنواع من المد. تعرض تحفة الأطفال في هذا الموضع أربعة أنواع من المد اللازم. يُبقى المعرّف للتوافق، ولا يعني جمع أحكام مستقلة في درس واحد أنها كلها من المد اللازم.',
    }),
  }),
  madd_4_6: Object.freeze({
    work: 'tuhfat-al-atfal',
    lines: '54',
    review: 'contested',
    topic: 'madd-lin',
    also: Object.freeze(['madd-wa-qasr']),
    caveat: Object.freeze({
      en: 'In the Muqaṭṭaʿāt openings, ʿayn is treated as Madd al-Līn and may be read for 4 or 6 counts (six is preferred in this teaching source). This is distinct from fixed six-count Madd Lazim; the app marks it separately and does not choose a duration.',
      ar: 'في فواتح السور، يُعامل حرف العين على أنه مد لين، ويُقرأ أربعًا أو ست حركات (والست هي المقدّمة في هذا المصدر التعليمي). وهذا غير المد اللازم ذي الست حركات؛ يميّزه التطبيق ولا يختار مقدار الأداء.',
    }),
  }),
});

/**
 * Citation for one rule, already localised, or null when the registry has no
 * entry. Returning null rather than a blank string keeps "unattributed"
 * visible to a test instead of rendering as an empty line that looks fine.
 */
export function tajweedCitation(ruleId, lang) {
  const entry = TAJWEED_SOURCES[ruleId];
  if (!entry) return null;
  const work = TAJWEED_WORKS[entry.work];
  if (!work) return null;
  const title = lang === 'ar' ? work.shortTitle.ar : work.shortTitle.en;
  const author = lang === 'ar' ? work.author.ar : work.author.en;
  const also = (entry.also || [])
    .map((workId) => {
      const source = TAJWEED_WORKS[workId];
      // Only expose secondary entries that have a directly openable source.
      // The legacy string-only references remain attribution metadata, not UI links.
      if (!source?.url) return null;
      return {
        title: lang === 'ar' ? source.shortTitle.ar : source.shortTitle.en,
        author: lang === 'ar' ? source.author.ar : source.author.en,
        url: source.url,
      };
    })
    .filter(Boolean);
  return {
    title,
    author,
    lines: entry.lines,
    review: entry.review,
    caveat: entry.caveat || null,
    url: work.url || null,
    also,
  };
}

/** Rule ids with no citation. Must be empty; the test says so out loud. */
export function uncitedTajweedRules(ruleIds) {
  return ruleIds.filter((id) => !TAJWEED_SOURCES[id]);
}
