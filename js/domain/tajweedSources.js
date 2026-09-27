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
 * six of the twenty madd and qalqalah entries are contested, which is the
 * honest state of the material.
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
    lines: '47-58',
    review: 'contested',
    topic: 'madd-lazim',
    caveat: Object.freeze({
      en: 'Counted among the four madd lāzim types. Its permitted length is given as four or six counts in the case of ʿayn, with the same caution stated for the mīm in Āl ʿImrān.',
      ar: 'يُعدّ من أنواع المد اللازمة الأربعة، ويأتي تقديره أربعة أو ستة في حالة العين، وعلى نحوه ميم آل عمران.',
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
      en: 'The id says six. No matn gives six: Tuhfat al-Atfal counts madd lazim as FOUR, and the sixth is a later aggregation of iwad, silah and the two exceptions. The id is kept for data compatibility; the copy must not repeat it.',
      ar: 'المعرّف يحمل رقم ٦، ولا وجود لستة في متون التجويد: ف تحفة الأطفال تعد المد اللازمة أربعة، والستة تجميع متأخر للعود والصلة والاستثنائين. أُبقي المعرّف لتوافق البيانات، ولا يجوز أن تكرره العبارة الظاهرة للمستخدم.',
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
  return { title, author, lines: entry.lines, review: entry.review, caveat: entry.caveat || null };
}

/** Rule ids with no citation. Must be empty; the test says so out loud. */
export function uncitedTajweedRules(ruleIds) {
  return ruleIds.filter((id) => !TAJWEED_SOURCES[id]);
}
