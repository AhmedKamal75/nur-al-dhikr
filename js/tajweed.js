/**
 * tajweed.js
 * A deterministic Tajweed (recitation-rule) classifier that runs directly
 * against this app's own Uthmani text. Character-index alignment between
 * this app's text and any pre-computed third-party annotation set turned
 * out to drift by the time you reach surah 2 (different tatweel/sukun
 * glyph choices, Basmala-prefixed ayah-1 offsets, ~17% mismatch at full-
 * Quran scale when checked) — unacceptable for a feature whose entire
 * point is showing someone exactly which letter to pronounce how. Instead
 * every rule below is derived mechanically from the diacritics and letters
 * already in the text, so a rule can only ever be "wrong" the same way a
 * bug in this file would be wrong — never misaligned.
 *
 * This covers the rules that are true local (or one-word-lookahead)
 * patterns: hamzat al-wasl, lam shamsiyyah, qalqalah, ghunnah, the noon
 * sakinah / tanween family (idgham/ikhfa/iqlab), the meem sakinah family
 * (izhar/idgham/ikhfa shafawi), and madd (natural/connected/separated/
 * obligatory). It intentionally leaves a small number of rules that need
 * full recitation-context (e.g. madd al-'iwad, some riwayah-specific waqf
 * behavior) uncolored rather than guess.
 */

// Diacritics
const FATHA = '\u064E';
const KASRA = '\u0650';
const DAMMA = '\u064F';
const SHADDA = '\u0651';
const SUKUN = '\u0652';
const SUKUN_ALT = '\u06E1'; // alternate small-high-rounded-zero sukun glyph used in some Uthmani sources
const FATHATAN = '\u064B';
const KASRATAN = '\u064D';
const DAMMATAN = '\u064C';
const DAGGER_ALIF = '\u0670';
const TATWEEL = '\u0640';
const MADDA_ABOVE = '\u0653'; // combining madda — this Uthmani source marks madd points (incl. the muqatta'at letter-names) explicitly rather than leaving them to be inferred
const IQLAB_MARK = '\u06E2'; // small high meem isolated form — marks a noon/tanween that has already undergone iqlab in the text itself
const DIACRITIC_CHARS = new Set([
  FATHA,
  KASRA,
  DAMMA,
  SHADDA,
  SUKUN,
  SUKUN_ALT,
  FATHATAN,
  KASRATAN,
  DAMMATAN,
  MADDA_ABOVE,
  IQLAB_MARK,
]);
const TANWEEN_MARKS = new Set([FATHATAN, KASRATAN, DAMMATAN]);

// Letters
const ALIF = '\u0627';
const ALIF_WASLA = '\u0671';
const ALIF_MADDA = '\u0622';
const WAW = '\u0648';
const YEH = '\u064A';
const ALEF_MAKSURA = '\u0649';
const SMALL_WAW = '\u06E5'; // pronunciation-guide "silent waw" on a ha' al-kinayah pronoun (e.g. بِهِۦٓ)
const SMALL_YEH = '\u06E6'; // pronunciation-guide "silent ya" on the same
const LAM = '\u0644';
const NOON = '\u0646';
const MEEM = '\u0645';
const BEH = '\u0628';

const HAMZA_LETTERS = new Set(['\u0621', '\u0623', '\u0625', '\u0624', '\u0626', ALIF_MADDA]);
const SUN_LETTERS = new Set([
  '\u062A',
  '\u062B',
  '\u062F',
  '\u0630',
  '\u0631',
  '\u0632',
  '\u0633',
  '\u0634',
  '\u0635',
  '\u0636',
  '\u0637',
  '\u0638',
  LAM,
  NOON,
]);
const QALQALAH_LETTERS = new Set(['\u0642', '\u0637', BEH, '\u062C', '\u062F']);
const IDGHAM_GHUNNAH_LETTERS = new Set([YEH, NOON, MEEM, WAW]);
const IDGHAM_NO_GHUNNAH_LETTERS = new Set([LAM, '\u0631']);
const IKHFA_LETTERS = new Set([
  '\u062A',
  '\u062B',
  '\u062C',
  '\u062F',
  '\u0630',
  '\u0632',
  '\u0633',
  '\u0634',
  '\u0635',
  '\u0636',
  '\u0637',
  '\u0638',
  '\u0641',
  '\u0642',
  '\u0643',
]);
/* Meem-sakinah lookahead groups (v3.7). Exactly one letter decides each:
 * before م the two merge entirely (idgham mutamathilayn, with ghunnah);
 * before ب the meem hides softly (ikhfa shafawi); every other letter reads
 * plainly through (izhar shafawi). A bare meem carries NO vowel of its own,
 * which this source often leaves unmarked (particles like لَهُمْ), so "no
 * diacritics at all" counts as sakinah — the same honest convention the
 * noon-sakinah rules already rely on. */

/** Legend metadata for the settings/legend UI. Order matters (display order). */
export const TAJWEED_RULES = Object.freeze([
  {
    id: 'hamzat_wasl',
    color: '#8E8E8E',
    name: { en: 'Hamzat al-Wasl', ar: 'همزة الوصل' },
    desc: {
      en: 'A connecting hamza — dropped in pronunciation when preceded by another word.',
      ar: 'همزة تسقط في النطق إذا وصلت بما قبلها.',
    },
  },
  {
    id: 'lam_shamsiyyah',
    color: '#8E8E8E',
    name: { en: 'Lam Shamsiyyah', ar: 'اللام الشمسية' },
    desc: {
      en: "The definite article's lam assimilates into the following sun letter — not pronounced.",
      ar: 'لام "ال" التي تُدغم في الحرف الشمسي بعدها فلا تُنطق.',
    },
  },
  {
    id: 'qalqalah',
    color: '#D97706',
    name: { en: 'Qalqalah', ar: 'القلقلة' },
    desc: {
      en: 'A slight echoing bounce on ق ط ب ج د when they carry sukun.',
      ar: 'اهتزاز خفيف عند نطق حروف (قطب جد) الساكنة.',
    },
  },
  {
    id: 'ghunnah',
    color: '#059669',
    name: { en: 'Ghunnah', ar: 'الغنة' },
    desc: {
      en: 'A 2-count nasal sound on a doubled (shaddah) ن or م.',
      ar: 'صوت أنفي بمقدار حركتين عند النون أو الميم المشددة.',
    },
  },
  {
    id: 'iqlab',
    color: '#2563EB',
    name: { en: 'Iqlab', ar: 'الإقلاب' },
    desc: {
      en: 'Noon sakinah/tanween before ب converts to a hidden م with ghunnah.',
      ar: 'قلب النون الساكنة أو التنوين ميمًا مخفاة عند لقائها بالباء.',
    },
  },
  {
    id: 'idgham_ghunnah',
    color: '#2563EB',
    name: { en: 'Idgham (with Ghunnah)', ar: 'الإدغام بغنة' },
    desc: {
      en: 'Noon sakinah/tanween merges into a following ي ن م و, with nasalization.',
      ar: 'إدغام النون الساكنة أو التنوين في أحد حروف (ينمو) بغنة.',
    },
  },
  {
    id: 'idgham_no_ghunnah',
    color: '#7C3AED',
    name: { en: 'Idgham (no Ghunnah)', ar: 'الإدغام بلا غنة' },
    desc: {
      en: 'Noon sakinah/tanween merges into a following ل or ر, no nasalization.',
      ar: 'إدغام النون الساكنة أو التنوين في اللام أو الراء بلا غنة.',
    },
  },
  {
    id: 'ikhfa',
    color: '#BE185D',
    name: { en: 'Ikhfa', ar: 'الإخفاء' },
    desc: {
      en: 'Noon sakinah/tanween is pronounced softly, between clear and merged.',
      ar: 'إخفاء النون الساكنة أو التنوين عند خمسة عشر حرفًا.',
    },
  },
  {
    id: 'izhar_shafawi',
    color: '#CA8A04',
    name: { en: 'Izhar Shafawi', ar: 'الإظهار الشفوي' },
    desc: {
      en: 'Meem sakinah is pronounced plainly when followed by any letter other than م or ب.',
      ar: 'إظهار الميم الساكنة عند كل حرف سوى الميم والباء.',
    },
  },
  {
    id: 'idgham_shafawi',
    color: '#A16207',
    name: { en: 'Idgham Shafawi', ar: 'الإدغام الشفوي' },
    desc: {
      en: 'A sakin meem merging into a following م, keeping the 2-count nasal sound.',
      ar: 'إدغام الميم الساكنة في الميم بعدها مع الغنة.',
    },
  },
  {
    id: 'ikhfa_shafawi',
    color: '#854D0E',
    name: { en: 'Ikhfa Shafawi', ar: 'الإخفاء الشفوي' },
    desc: {
      en: 'The lips form a soft concealment when a sakin meem meets a following ب.',
      ar: 'إخفاء الميم الساكنة عند الباء.',
    },
  },
  {
    id: 'madd_2',
    color: '#0891B2',
    name: { en: 'Madd (natural, 2 counts)', ar: 'المد الطبيعي' },
    desc: { en: 'A natural elongation of 2 counts.', ar: 'مد طبيعي بمقدار حركتين.' },
  },
  {
    id: 'madd_badal',
    color: '#0E7490',
    name: { en: 'Madd Badal (2 counts)', ar: 'مد البدل' },
    desc: {
      en: 'A hamza followed directly by its own madd letter (e.g. \u0622), 2 counts.',
      ar: 'همزة يليها حرف مد من جنس حركتها، بمقدار حركتين.',
    },
  },
  {
    id: 'madd_silah',
    color: '#0E7490',
    name: { en: 'Madd as-Silah (\u0647 pronoun, up to 4\u20135)', ar: 'مد الصلة' },
    desc: {
      en: 'The connecting madd on a \u0647ُ/\u0647ِ pronoun ending, lengthened because a hamza follows.',
      ar: 'مد هاء الكناية الذي يمد لوقوع همزة بعده.',
    },
  },
  {
    id: 'madd_muttasil',
    color: '#0E7490',
    name: { en: 'Madd Muttasil (connected, 4\u20135)', ar: 'المد المتصل' },
    desc: {
      en: 'A madd letter followed by hamza in the same word — 4\u20135 counts.',
      ar: 'مد يليه همز في نفس الكلمة، بمقدار 4-5 حركات.',
    },
  },
  {
    id: 'madd_munfasil',
    color: '#0369A1',
    name: { en: 'Madd Munfasil (separated, 4\u20135)', ar: 'المد المنفصل' },
    desc: {
      en: 'A madd letter at the end of a word, followed by hamza starting the next word.',
      ar: 'مد في آخر كلمة يليه همز في أول الكلمة التالية.',
    },
  },
  {
    id: 'madd_246',
    color: '#1D4ED8',
    name: { en: "Madd 'Arid (at a stop, 2\u20136)", ar: 'المد العارض للسكون' },
    desc: {
      en: 'A madd letter at the very end of the ayah, where reciters pause.',
      ar: 'مد يقع آخر الآية عند الوقف عليه.',
    },
  },
  {
    id: 'madd_6',
    color: '#1E3A8A',
    name: { en: 'Madd Lazim (obligatory, 6)', ar: 'المد اللازم' },
    desc: {
      en: 'An obligatory 6-count elongation, e.g. \u0622 (alif madda).',
      ar: 'مد لازم بمقدار ست حركات، كألف المدة (آ).',
    },
  },
]);

function isBaseLetter(ch) {
  return !DIACRITIC_CHARS.has(ch) && ch !== TATWEEL && ch !== ' ';
}

/** Group a word's characters into {base, start, end, diacritics} units,
 *  skipping tatweel/spaces (purely cosmetic, never part of a rule). */
function tokenizeUnits(word) {
  const units = [];
  for (let i = 0; i < word.length; i += 1) {
    const ch = word[i];
    if (ch === TATWEEL) continue;
    if (isBaseLetter(ch)) {
      units.push({ base: ch, start: i, end: i + 1, diacritics: new Set() });
    } else if (DIACRITIC_CHARS.has(ch) && units.length) {
      const u = units[units.length - 1];
      u.diacritics.add(ch);
      u.end = i + 1;
    }
  }
  return units;
}

function isMaddLetter(unit, prev) {
  if (unit.base === DAGGER_ALIF) return true;
  if (unit.base === ALIF_MADDA) return true;
  if (HAMZA_LETTERS.has(unit.base) && unit.diacritics.has(MADDA_ABOVE)) return true; // e.g. \u0623 + \u0653, an alternate spelling of \u0622
  if ((unit.base === SMALL_WAW || unit.base === SMALL_YEH) && unit.diacritics.has(MADDA_ABOVE))
    return true; // silah madd, only when the text signals it's lengthened
  if (unit.diacritics.size > 0 && !unit.diacritics.has(MADDA_ABOVE)) return false; // a madd letter carries no *vowel* of its own, but may carry the madda mark
  if ((unit.base === ALIF || unit.base === ALIF_WASLA) && prev?.diacritics.has(FATHA)) return true;
  if (unit.base === WAW && prev?.diacritics.has(DAMMA)) return true;
  if ((unit.base === YEH || unit.base === ALEF_MAKSURA) && prev?.diacritics.has(KASRA)) return true;
  return false;
}

/** بِسْمِ ٱللَّهِ etc. — "Allah" is a fixed divine name, not decomposed as
 *  ال + ILAH in live recitation pedagogy, so its doubled lam is
 *  conventionally left uncolored in published tajweed mus7afs even though
 *  the same assimilation is phonetically happening. Matched on the
 *  consonant skeleton so any vowel/case-ending still matches. */
function isDivineName(word) {
  const skeleton = [...word].filter((ch) => !DIACRITIC_CHARS.has(ch) && ch !== TATWEEL).join('');
  return skeleton === `${ALIF_WASLA}${LAM}${LAM}\u0647` || skeleton === `${ALIF}${LAM}${LAM}\u0647`;
}

/**
 * Classify one word's tajweed rules. Returns spans {start, end, rule}
 * with indices relative to `word` itself (not the whole ayah) — the
 * caller (renderAyahWords) already processes one word at a time, so this
 * slots directly into that loop with no extra offset bookkeeping.
 *
 * `nextWordFirstBase` / `isLastWordOfAyah` let the noon-sakinah/tanween
 * and madd rules see one letter across a word boundary without needing
 * the whole ayah's text.
 */
export function classifyWordTajweed(
  word,
  { nextWordFirstBase = null, isLastWordOfAyah = false } = {}
) {
  if (!word) return [];
  const units = tokenizeUnits(word);
  const spans = [];

  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    const prev = units[i - 1];
    const next = units[i + 1];

    if (u.base === ALIF_WASLA) {
      spans.push({ start: u.start, end: u.end, rule: 'hamzat_wasl' });
      continue; // an alif-wasla can't simultaneously be a madd letter
    }

    if (
      u.base === LAM &&
      i === 1 &&
      prev &&
      (prev.base === ALIF_WASLA || prev.base === ALIF) &&
      next &&
      SUN_LETTERS.has(next.base) &&
      next.diacritics.has(SHADDA) &&
      !isDivineName(word)
    ) {
      spans.push({ start: u.start, end: u.end, rule: 'lam_shamsiyyah' });
    }

    if (QALQALAH_LETTERS.has(u.base)) {
      const sakin =
        u.diacritics.has(SUKUN) || u.diacritics.has(SUKUN_ALT) || u.diacritics.size === 0;
      if (sakin) spans.push({ start: u.start, end: u.end, rule: 'qalqalah' });
    }

    if ((u.base === NOON || u.base === MEEM) && u.diacritics.has(SHADDA)) {
      spans.push({ start: u.start, end: u.end, rule: 'ghunnah' });
    }

    // A handful of very frequent grammatical particles (مِن، عَن، أَن...) are
    // traditionally written in the Uthmani rasm with the final noon's
    // sukun left implicit rather than marked — a bare letter (no
    // diacritic at all) is sakinah exactly as much as an explicitly
    // sukun-marked one, so both count here.
    const noonSakinah =
      u.base === NOON &&
      !u.diacritics.has(SHADDA) &&
      (u.diacritics.has(SUKUN) ||
        u.diacritics.has(SUKUN_ALT) ||
        u.diacritics.has(IQLAB_MARK) ||
        u.diacritics.size === 0);
    const tanween = [...u.diacritics].some((d) => TANWEEN_MARKS.has(d));
    if (noonSakinah || tanween) {
      if (u.diacritics.has(IQLAB_MARK)) {
        // The text itself already marks this as iqlab (small high meem) —
        // no need to peek at the next letter.
        spans.push({ start: u.start, end: u.end, rule: 'iqlab' });
      } else {
        const nb = next ? next.base : nextWordFirstBase;
        if (nb === BEH) spans.push({ start: u.start, end: u.end, rule: 'iqlab' });
        else if (nb && IDGHAM_GHUNNAH_LETTERS.has(nb))
          spans.push({ start: u.start, end: u.end, rule: 'idgham_ghunnah' });
        else if (nb && IDGHAM_NO_GHUNNAH_LETTERS.has(nb))
          spans.push({ start: u.start, end: u.end, rule: 'idgham_no_ghunnah' });
        else if (nb && IKHFA_LETTERS.has(nb))
          spans.push({ start: u.start, end: u.end, rule: 'ikhfa' });
      }
    }

    // Madd (elongation). This Uthmani source marks madd points explicitly
    // with a combining madda-above (\u0653) — including on a bare consonant
    // for the muqatta'at letter-names (e.g. \u0627\u0644\u0670\u0645\u0670,
    // "Alif Laam Meem", where "Laam"/"Meem" each carry an inherent 6-count
    // madd as part of the letter's *name*). That mark is a stronger, more
    // direct signal than inferring purely from hamza-adjacency, so it's
    // checked first; hamza-adjacency still resolves *which* signaled madd
    // (muttasil/munfasil/badal) once we know one applies.
    const muqattaMadd = u.diacritics.has(MADDA_ABOVE) && !isMaddLetter(u, prev);
    if (muqattaMadd) {
      // Marked on a bare consonant -> a muqatta'at letter-name madd.
      spans.push({ start: u.start, end: u.end, rule: 'madd_6' });
    } else if (isMaddLetter(u, prev)) {
      const signaled = u.base === ALIF_MADDA || u.diacritics.has(MADDA_ABOVE);
      const isSilah = u.base === SMALL_WAW || u.base === SMALL_YEH;
      if (next && HAMZA_LETTERS.has(next.base)) {
        spans.push({ start: u.start, end: u.end, rule: 'madd_muttasil' });
      } else if (!next && nextWordFirstBase && HAMZA_LETTERS.has(nextWordFirstBase)) {
        spans.push({ start: u.start, end: u.end, rule: isSilah ? 'madd_silah' : 'madd_munfasil' });
      } else if (isSilah) {
        spans.push({ start: u.start, end: u.end, rule: 'madd_silah' });
      } else if (signaled) {
        // A signaled madd letter with no hamza immediately adjacent —
        // the hamza that motivates the elongation is the letter itself
        // (e.g. \u0622 in \u0622\u062F\u064e\u0645َ, "\u0100dam").
        spans.push({ start: u.start, end: u.end, rule: 'madd_badal' });
      } else if (isLastWordOfAyah && i >= units.length - 2) {
        // The madd letter sits in the ayah's final syllable (itself the
        // last unit, or exactly one closing consonant remains) — that's
        // the syllable a reciter pauses on, hence 'arid lissukoon rather
        // than a plain natural madd.
        spans.push({ start: u.start, end: u.end, rule: 'madd_246' });
      } else {
        spans.push({ start: u.start, end: u.end, rule: 'madd_2' });
      }
    }

    // Meem sakinah family (v3.7) — closes the gap TODO.md documented since
    // v3.4. Same "bare letter = implicitly sakinah" convention as the noon
    // rules above; guarded so it can never collide with an already-
    // classified unit: a shaddah'd meem is ghunnah and a madda-marked one is
    // a muqatta'at letter-name (both handled above), any other vowel means
    // it simply isn't sakinah. End-of-ayah stays uncolored because what
    // follows the pause belongs to the NEXT ayah's recitation context.
    if (
      u.base === MEEM &&
      !muqattaMadd &&
      !u.diacritics.has(SHADDA) &&
      !u.diacritics.has(MADDA_ABOVE) &&
      (u.diacritics.has(SUKUN) || u.diacritics.has(SUKUN_ALT) || u.diacritics.size === 0)
    ) {
      const nb = next ? next.base : nextWordFirstBase;
      if (nb === MEEM) spans.push({ start: u.start, end: u.end, rule: 'idgham_shafawi' });
      else if (nb === BEH) spans.push({ start: u.start, end: u.end, rule: 'ikhfa_shafawi' });
      else if (nb) spans.push({ start: u.start, end: u.end, rule: 'izhar_shafawi' });
    }
  }

  return spans;
}

/**
 * Convenience wrapper: classify every word of a full ayah at once,
 * handling the word-boundary lookahead automatically.
 * Returns [{ word, wordIndex, spans }] in reading order.
 */
export function classifyAyahTajweed(ayahText) {
  const words = String(ayahText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((word, i) => {
    const nextWord = words[i + 1];
    const nextWordFirstBase = nextWord ? (tokenizeUnits(nextWord)[0]?.base ?? null) : null;
    return {
      word,
      wordIndex: i + 1,
      spans: classifyWordTajweed(word, {
        nextWordFirstBase,
        isLastWordOfAyah: i === words.length - 1,
      }),
    };
  });
}

/** Look up a rule's legend entry by id. */
export function tajweedRule(id) {
  return TAJWEED_RULES.find((r) => r.id === id) || null;
}

/** Every letter-unit of a word (base + character span), with no rule
 *  classification attached — used by practice mode to render *every*
 *  letter as a tappable target, not just the ones a rule already flags. */
export function wordUnits(word) {
  return tokenizeUnits(word).map((u) => ({ base: u.base, start: u.start, end: u.end }));
}
