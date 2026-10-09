/**
 * tajweedCourse.js — the course spine (v5.17.32)
 *
 * Eight stages, seventeen sessions, madd-first, shaped like Arabic101's
 * published 30-day programme and sequenced along the classical gradient the
 * matns already use. What this module owns is ORDER and PROGRESS — never the
 * teaching text. Every session points at rule ids whose bilingual name,
 * description and citation live in data/tajweed-sources.json, and drills are
 * generated at run time by the app's own classifier over the app's own
 * Uthmani text. No rule prose and no answer key is authored here.
 *
 * Two session kinds. A drillable session teaches classifier rules and offers
 * practice; a spread session (`spread`) teaches a disagreement — the
 * 17/16/14 makharij counts, the sifat counts — and offers study, not
 * drills, because drilling would pick the side the course refuses to pick.
 * `isDrivable` is false for exactly those sessions, and the view renders no
 * drill button for them.
 *
 * Two progression modes, because they answer different needs and the reader
 * picks:
 *
 *   guided — sessions unlock in order. A plan, with a "next up" that always
 *            exists. For someone who asked to be taught a sequence.
 *   open   — every session is available from the start. For someone who came
 *            for one rule and should not have to walk a ladder to reach it.
 *
 * The mode is a preference, never a gate on capability: `open` is not a
 * lesser mode, and switching between them must never lose progress.
 */

import { TAJWEED_SOURCES } from './tajweedSources.js';

/** Bilingual course text lives in data/tajweed-course.json; this is the
 *  runtime mirror, kept honest by tests/tajweed-course.test.js. */
export const COURSE_STAGES = Object.freeze([
  {
    id: 'madd',
    order: 1,
    citation: { work: 'tuhfat-al-atfal', lines: '35-58' },
    title: Object.freeze({ en: 'Madd — holding the vowel', ar: 'المدّ — إطالة الصوت' }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: "Madd is where a beginner's recitation is most audible, and most often wrong. It comes first here because everything later is easier to hear once the counts are right.",
      ar: 'المدّ أوضح ما يُسمَع في تلاوة المبتدئ، وأكثره خطأً. ويأتي أولًا هنا لأن ما بعده يصير أسهل على السمع متى ضبطت العدّات.',
    }),
    sessions: [
      {
        id: 'madd-natural',
        order: 1,
        title: Object.freeze({ en: 'Natural madd', ar: 'المد الطبيعي' }),
        focus: ['madd_2'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '35-41' },
      },
      {
        id: 'madd-connected',
        order: 2,
        title: Object.freeze({ en: 'Connected and separated madd', ar: 'المد المتصل والمنفصل' }),
        focus: ['madd_muttasil', 'madd_munfasil'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '42-47' },
      },
      {
        id: 'madd-paused',
        order: 3,
        title: Object.freeze({ en: 'Madd at a pause', ar: 'المد عند الوقف' }),
        focus: ['madd_246'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '42-47' },
      },
      {
        id: 'madd-obligatory',
        order: 4,
        title: Object.freeze({ en: 'Madd Lāzim and other madd forms', ar: 'المد اللازم وأنواع أخرى من المد' }),
        focus: ['madd_6', 'madd_4_6', 'madd_iwad', 'madd_badal', 'madd_silah'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '47-58' },
      },
    ],
  },
  {
    id: 'qalqalah',
    order: 2,
    citation: { work: 'jazariyya', lines: '23, 34-56' },
    title: Object.freeze({ en: 'Qalqalah and the weight of letters', ar: 'القلقلة وصفات الحروف' }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: 'Qalqalah and heavy/light letters change how a page sounds without changing its meaning, so they are learned by ear and repetition rather than by definition.',
      ar: 'القلقلة وصفات الحروف تغيّر صوت الصفحة دون أن تغيّر معناها، فتُتعلَّم بالأذن والتكرار لا بالحفظ.',
    }),
    sessions: [
      {
        id: 'qalqalah-rule',
        order: 1,
        title: Object.freeze({ en: 'The bounce', ar: 'القلقلة' }),
        focus: ['qalqalah'],
        mixed: false,
        citation: { work: 'jazariyya', lines: '23, 37-39' },
      },
      {
        id: 'tafkhim',
        order: 2,
        title: Object.freeze({ en: 'Heavy and light', ar: 'التفخيم والترقيق' }),
        focus: ['tafkhim'],
        mixed: false,
        citation: { work: 'jazariyya', lines: '34-56' },
      },
    ],
  },
  {
    id: 'noon',
    order: 3,
    citation: { work: 'tuhfat-al-atfal', lines: '6-17' },
    title: Object.freeze({ en: 'Noon sakinah and tanween', ar: 'أحكام النون الساكنة والتنوين' }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: 'The largest single block of rules, and the one that most changes how an ordinary page sounds. It also appears most often in the text, so it rewards the most drilling.',
      ar: 'أكبر كتلة من القواعد، وأكثرها أثرًا في صوت الصفحة المعتادة، وأكثرها ورودًا في النص، فهي الأكثر استحقاقًا للتكرار.',
    }),
    sessions: [
      {
        id: 'noon-izhar',
        order: 1,
        title: Object.freeze({ en: 'Clear noon', ar: 'الإظهار الحلقي' }),
        focus: ['izhar'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '6-13' },
      },
      {
        id: 'noon-idgham',
        order: 2,
        title: Object.freeze({ en: 'Merging noon', ar: 'الإدغام' }),
        focus: ['idgham_ghunnah', 'idgham_no_ghunnah'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '6-13' },
      },
      {
        id: 'noon-iqlab',
        order: 3,
        title: Object.freeze({ en: 'Noon into meem', ar: 'الإقلاب' }),
        focus: ['iqlab'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '6-13' },
      },
      {
        id: 'noon-ikhfa',
        order: 4,
        title: Object.freeze({ en: 'Hidden noon', ar: 'الإخفاء' }),
        focus: ['ikhfa'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '14-17' },
      },
    ],
  },
  {
    id: 'meem',
    order: 4,
    citation: { work: 'tuhfat-al-atfal', lines: '18-23' },
    title: Object.freeze({ en: 'Meem sakinah', ar: 'أحكام الميم الساكنة' }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: 'Three cases, fewer branches than the noon rules, and the same shape — which is the point: having just learned one set, this one is a variation, not new material.',
      ar: 'ثلاثة أحكام، أقل تفصيلًا من أحكام النون، وبنفس الصورة — وهذا هو المقصود: بعد تعلّم مجموعة تُعدّ هذه تنويعًا لا مادة جديدة.',
    }),
    sessions: [
      {
        id: 'meem-three',
        order: 1,
        title: Object.freeze({ en: 'The three rulings', ar: 'الأحكام الثلاثة' }),
        focus: ['ikhfa_shafawi', 'idgham_shafawi', 'izhar_shafawi'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '18-23' },
      },
    ],
  },
  {
    id: 'lam',
    order: 5,
    citation: { work: 'tuhfat-al-atfal', lines: '24-29' },
    title: Object.freeze({
      en: 'Lām, and the letters that change shape',
      ar: 'اللام، والحروف التي يتغير شكلها',
    }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: "Two different things that Arabic101's structure and the classical texts both place late: the sun-letter lām, and the two hamzahs, where written form and recited form diverge.",
      ar: 'م شيئان مختلفان يضعهما كلٌّ من بنية Arabic101 والمتون المتأخرة: لام الشمس، والهمزتان حيث يختلف الخط عن النطق.',
    }),
    sessions: [
      {
        id: 'lam-shamsiyyah',
        order: 1,
        title: Object.freeze({ en: 'The sun letters', ar: 'لام الشمس' }),
        focus: ['lam_shamsiyyah'],
        mixed: false,
        citation: { work: 'tuhfat-al-atfal', lines: '24-29' },
      },
      {
        id: 'hamzat-wasl',
        order: 2,
        title: Object.freeze({ en: 'Wasl and qaṭʿ', ar: 'الوصل والقطع' }),
        focus: ['hamzat_wasl'],
        mixed: false,
        citation: { work: 'jazariyya', lines: '100-103' },
      },
    ],
  },
  {
    id: 'makharij',
    order: 6,
    citation: { work: 'tamhid', lines: 'ch. 8' },
    title: Object.freeze({
      en: 'Makharij — the articulation points',
      ar: 'المخارج — مخارج الحروف',
    }),
    // A reference stage, not a ladder rung: the count itself is disputed,
    // so the sessions below show the spread and choose none of the counts.
    why: Object.freeze({
      en: 'The scholars who fixed the count disagree — 17, 16 or 14 — so this stage teaches the disagreement itself, each count with its authors and its mechanism, and chooses none.',
      ar: 'اختلف العلماء الذين حدّدوا العدد — ١٧ أو ١٦ أو ١٤ — فتُدرَّس هنا المسألة نفسها، كل عدد بأصحابه وطريقته، دون اختيار.',
    }),
    sessions: [
      {
        id: 'makharij-counts',
        order: 1,
        title: Object.freeze({
          en: 'Seventeen, sixteen, fourteen',
          ar: 'سبعة عشر وستة عشر وأربعة عشر',
        }),
        focus: ['makharij_17', 'makharij_16', 'makharij_14'],
        spread: 'makharij',
        mixed: false,
        citation: { work: 'tamhid', lines: 'ch. 8' },
      },
      {
        id: 'makharij-ghunnah',
        order: 2,
        title: Object.freeze({
          en: 'One point for ghunnah, fifteen letters for ikhfa',
          ar: 'مخرج واحد للغنة وخمسة عشر حرفًا للإخفاء',
        }),
        focus: ['ghunnah', 'ikhfa'],
        mixed: false,
        citation: { work: 'jazariyya', lines: '19' },
      },
    ],
  },
  {
    id: 'sifat',
    order: 7,
    citation: { work: 'jazariyya', lines: '19-26' },
    title: Object.freeze({
      en: 'Sifat — the characteristics of letters',
      ar: 'الصفات — صفات الحروف',
    }),
    // Same contract as makharij: the count is disputed, so the session
    // shows the spread with Ibn al-Jazari's own reason for seventeen.
    why: Object.freeze({
      en: "Seventeen, eighteen, twenty, forty-four: the count of the sifat is itself disputed, for reasons the scholars state. This stage shows the spread and repeats Ibn al-Jazari's own reason for seventeen.",
      ar: 'سبع عشرة أو ثماني عشرة أو عشرون أو أربع وأربعون: عدد الصفات نفسه محل خلاف لأسباب ذكرها العلماء. تعرض هذه المرحلة الأعداد وتذكر سبب ابن الجزري نفسه للسبعة عشر.',
    }),
    sessions: [
      {
        id: 'sifat-counts',
        order: 1,
        title: Object.freeze({
          en: 'Seventeen, eighteen, twenty, forty-four',
          ar: 'سبع عشرة وثماني عشرة وعشرون وأربع وأربعون',
        }),
        focus: ['sifat_17', 'sifat_18', 'sifat_20', 'sifat_44'],
        spread: 'sifat',
        mixed: false,
        citation: { work: 'jazariyya', lines: '19-26' },
      },
    ],
  },
  {
    id: 'mixed',
    order: 8,
    citation: { work: 'jazariyya', lines: '9-19' },
    title: Object.freeze({ en: 'Mixed recitation', ar: 'التلاوة المختلطة' }),
    // Why this stage sits here. Bilingual, and deliberately short: the
    // teaching itself is the rules' own sourced descriptions.
    why: Object.freeze({
      en: 'No new rule. This stage exists because isolated rules are easier than connected text, and the connected text is the point.',
      ar: 'لا قاعدة جديدة. هذه المرحلة موجودة لأن الأحكام المنفردة أيسر من النص المتصل، والنص المتصل هو المقصود.',
    }),
    sessions: [
      {
        id: 'mixed-drill',
        order: 1,
        title: Object.freeze({ en: 'All rules together', ar: 'جميع القواعد' }),
        focus: [],
        mixed: true,
        citation: { work: 'jazariyya', lines: '9-19' },
      },
    ],
  },
]);

export const COURSE_STAGE_IDS = Object.freeze(COURSE_STAGES.map((s) => s.id));
export const PATH_MODES = Object.freeze(['guided', 'open']);
export const DEFAULT_PATH_MODE = 'guided';

/** Flat, ordered list of every session with its stage attached. */
export function allSessions() {
  return COURSE_STAGES.flatMap((stage) =>
    stage.sessions.map((s) => ({ ...s, stageId: stage.id, stageOrder: stage.order }))
  );
}

export function findSession(sessionId) {
  return allSessions().find((s) => s.id === sessionId) || null;
}

export function findStage(stageId) {
  return COURSE_STAGES.find((s) => s.id === stageId) || null;
}

/** Every rule the course touches, in curriculum order, deduplicated. */
export function courseRules() {
  const seen = new Set();
  const out = [];
  for (const s of allSessions()) {
    for (const r of s.focus) {
      if (seen.has(r)) continue;
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

/** A session with no focus rules and no mixed flag teaches nothing. A spread
 *  session teaches a disagreement, not a drillable rule, so it is never
 *  drivable either: the practice engine drills one rule per round, and a
 *  spread row must not silently become one. */
export function isDrivable(session) {
  if (!session || session.spread) return false;
  return session.mixed === true || (Array.isArray(session.focus) && session.focus.length > 0);
}

/**
 * Sessions a reader may open, given progress and mode.
 *
 * `open` returns everything — that is the whole contract of the mode.
 * `guided` returns everything up to and including the first unfinished
 * session, which is what makes a ladder that still lets you revisit.
 */
export function availableSessions(progress, mode) {
  const done = new Set(Object.keys(progress || {}));
  const all = allSessions();
  if (mode === 'open') return all;
  const firstUndone = all.findIndex((s) => !done.has(s.id));
  if (firstUndone === -1) return all;
  return all.slice(0, firstUndone + 1);
}

export function isUnlocked(sessionId, progress, mode) {
  return availableSessions(progress, mode).some((s) => s.id === sessionId);
}

/**
 * The one session to show as "continue". Null when everything is done, which
 * is a real state and not a bug: the UI offers mixed practice instead of
 * pretending there is more course.
 */
export function nextSession(progress, _mode) {
  const done = new Set(Object.keys(progress || {}));
  return allSessions().find((s) => !done.has(s.id)) || null;
}

/** Per-stage completion, for a progress bar that means something. */
export function stageProgress(stageId, progress) {
  const stage = findStage(stageId);
  if (!stage) return { done: 0, total: 0, ratio: 0 };
  const doneSet = new Set(Object.keys(progress || {}));
  const done = stage.sessions.filter((s) => doneSet.has(s.id)).length;
  const total = stage.sessions.length;
  return { done, total, ratio: total ? done / total : 0 };
}

export function courseProgress(progress) {
  const doneSet = new Set(Object.keys(progress || {}));
  const all = allSessions();
  const done = all.filter((s) => doneSet.has(s.id)).length;
  return { done, total: all.length, ratio: all.length ? done / all.length : 0 };
}

/**
 * Search sessions by rule id or session id. Rule ids are the useful axis: a
 * reader who arrives knowing they want ikhfa should not have to remember
 * which stage it lives in.
 */
export function searchSessions(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return allSessions();
  return allSessions().filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.stageId.toLowerCase().includes(q) ||
      (s.focus || []).some((r) => r.toLowerCase().includes(q))
  );
}

/** Which sessions teach a given rule — powers "where is this rule taught?". */
export function sessionsForRule(ruleId) {
  return allSessions().filter((s) => (s.focus || []).includes(ruleId));
}

/**
 * A session that cites a rule with no citation is teaching something the app
 * cannot attribute. Returned rather than thrown so the UI can say so.
 */
export function uncitedSessions() {
  return allSessions().filter((s) => (s.focus || []).some((r) => !TAJWEED_SOURCES[r]));
}

/** Bounded so a corrupt or hand-edited blob cannot grow without limit. */
const MAX_PROGRESS_SESSIONS = 64;

/**
 * Restored progress, sanitised. Only known session ids survive, and the stored
 * value is reduced to a timestamp: anything else in the blob is dropped
 * rather than trusted, because this map is written by the client.
 */
export function sanitizeTajweedCourseProgress(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const known = new Set(allSessions().map((s) => s.id));
  const out = {};
  let n = 0;
  for (const [id, value] of Object.entries(raw)) {
    if (!known.has(id) || n >= MAX_PROGRESS_SESSIONS) continue;
    const at = Number(value?.at);
    if (!Number.isFinite(at) || at <= 0) continue;
    out[id] = { at };
    n += 1;
  }
  return out;
}
