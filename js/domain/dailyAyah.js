/**
 * dailyAyah.js (v4.4)
 * Theme-biased selection for the home "verse of the day" card. The card
 * itself predates this module (pickDailyItem in views/home.js) — this
 * domain narrows its eligible pool by theme keywords so a user who wants
 * mercy on their home screen gets mercy.
 *
 * Themes map to keyword lists matched against the item's translation,
 * transliteration and virtues (EN) or arabic (AR). Matching is plain
 * substring on lowercased text — no network, no curated lists that could
 * silently drift from the corpus. An empty/unknown theme returns the full
 * pool (the pre-v4.4 behavior).
 */

export const DAILY_THEMES = Object.freeze([
  'any',
  'mercy',
  'patience',
  'gratitude',
  'guidance',
  'paradise',
]);

const KEYWORDS = Object.freeze({
  mercy: [
    'merciful',
    'mercy',
    'forgive',
    'forgiving',
    'compassion',
    'رحمة',
    'رحيم',
    'غفور',
    'مغفرة',
  ],
  patience: [
    'patient',
    'patience',
    'persevere',
    'steadfast',
    'with hardship',
    'صبر',
    'صابرين',
    'عسر',
    'يسر',
  ],
  gratitude: ['grateful', 'gratitude', 'thank', 'give thanks', 'شكر', 'شاكر', 'أنعم'],
  guidance: [
    'guide',
    'guidance',
    'straight path',
    'light',
    'rightly guided',
    'هدى',
    'يهدي',
    'صراط',
    'نور',
  ],
  paradise: ['paradise', 'garden', 'heaven', 'gardens', 'جنة', 'حدائق', 'الفردوس'],
});

/** True when the item matches the theme's keyword lists (any language). */
export function matchesTheme(entry, theme) {
  const kws = KEYWORDS[theme];
  if (!kws) return true;
  const e = entry && typeof entry === 'object' ? entry : {};
  const item = e.item || {};
  const hay = [
    item.translation?.en,
    item.translation?.ar,
    item.transliteration,
    item.virtues?.en,
    item.virtues?.ar,
    item.arabic,
  ]
    .filter((x) => typeof x === 'string')
    .join(' \u2014 ')
    .toLowerCase();
  return kws.some((k) => hay.includes(k));
}

/**
 * Deterministic theme-biased pick: same item all day, changes daily.
 * Falls back to the full pool when the theme matches nothing (a sparse
 * corpus day must never blank the card).
 */
export function pickDailyItemThemed(itemIndex, theme = 'any', today = new Date()) {
  const all = Object.values(itemIndex || {}).filter(
    (entry) => entry?.document?.metadata?.id !== 'asma'
  );
  if (!all.length) return null;
  const pool =
    DAILY_THEMES.includes(theme) && theme !== 'any'
      ? all.filter((e) => matchesTheme(e, theme))
      : all;
  const use = pool.length ? pool : all;
  const seed = [today.getFullYear(), today.getMonth() + 1, today.getDate()].reduce(
    (a, c) => a + c,
    0
  );
  return use[seed % use.length];
}
