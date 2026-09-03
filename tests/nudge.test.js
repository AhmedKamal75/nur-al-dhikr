/**
 * tests/nudge.test.js — v3.25.0, the gentle "it's been a while" line.
 *
 * Three layers, mirroring the feature's shape:
 *   1. pure decision logic (js/nudge.js) against hostile shapes;
 *   2. the anti-guilt CONTRACT: every nudge.* key in BOTH languages is
 *      scanned for banned streak/shame vocabulary, digits, and
 *      placeholders — the absence is never counted, in any language;
 *   3. the view card (EN + AR smoke, suppression paths, CTA targeting)
 *      plus the store boundary (reducer ignores payloads; restore
 *      sanitization drops junk shown-days).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeNudge,
  shouldShowNudge,
  lastActivity,
  sanitizeNudgeState,
  defaultNudgeState,
  NUDGE_MIN_GAP_DAYS,
  NUDGE_REPEAT_DAYS,
  NUDGE_WARM_DAYS,
  NUDGE_FRESH_DAYS,
} from '../js/domain/nudge.js';
import { nudgeCardHTML } from '../js/views/home.js';
import { t } from '../js/core/i18n.js';
import { store, actions } from '../js/core/state.js';
import { addDays } from '../js/core/utils.js';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const TODAY = new Date(2025, 5, 15, 10, 30); // fixed local noon-ish
const key = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const daysAgo = (n) => addDays(TODAY, -n);

/** A state with the last activity `n` days ago of the given kind. */
function stateWith(kind, n, extra = {}) {
  const k = key(daysAgo(n));
  const dailyHistory = {};
  const dailyChecklist = {};
  if (kind === 'quran') dailyHistory[k] = { pages: 4, recitations: 0 };
  if (kind === 'dhikr') dailyHistory[k] = { pages: 0, recitations: 33 };
  if (kind === 'prayers') dailyChecklist[k] = { fajr: 'jamaah' };
  return { statistics: { dailyHistory }, dailyChecklist, nudge: defaultNudgeState(), ...extra };
}

/* ------------------------------------------------------------------ */
/* 1. pure decision logic                                              */
/* ------------------------------------------------------------------ */

test('computeNudge: never active -> null (a stranger gets nothing)', () => {
  assert.equal(computeNudge({ statistics: { dailyHistory: {} }, dailyChecklist: {} }, TODAY), null);
  assert.equal(computeNudge(null, TODAY), null);
  assert.equal(computeNudge(undefined, TODAY), null);
  assert.equal(computeNudge({}, TODAY), null);
});

test('computeNudge: hostile shapes degrade to null, never throw', () => {
  assert.equal(
    computeNudge({ statistics: { dailyHistory: [] }, dailyChecklist: 'x' }, TODAY),
    null
  );
  assert.equal(computeNudge({ statistics: null, dailyChecklist: 42 }, TODAY), null);
  assert.equal(computeNudge({ statistics: { dailyHistory: { junk: { pages: 5 } } } }, TODAY), null);
  // junk keys (not dates / rolled dates) never become "last activity"
  assert.equal(
    computeNudge(
      {
        statistics: { dailyHistory: { '2025-02-30': { pages: 5 }, 'not-a-date': { pages: 9 } } },
        dailyChecklist: { __proto__: { fajr: 'jamaah' } },
      },
      TODAY
    ),
    null
  );
});

test('computeNudge: active today or yesterday is not a gap', () => {
  assert.equal(computeNudge(stateWith('quran', 0), TODAY), null);
  assert.equal(computeNudge(stateWith('quran', 1), TODAY), null);
  assert.equal(NUDGE_MIN_GAP_DAYS, 2);
});

test('computeNudge: kind detection (quran / dhikr / prayers)', () => {
  assert.equal(computeNudge(stateWith('quran', 3), TODAY).kind, 'quran');
  assert.equal(computeNudge(stateWith('dhikr', 3), TODAY).kind, 'dhikr');
  assert.equal(computeNudge(stateWith('prayers', 3), TODAY).kind, 'prayers');
});

test('computeNudge: on a shared day, quran wins the kind (bookmark is the most concrete)', () => {
  const k = key(daysAgo(3));
  const s = {
    statistics: { dailyHistory: { [k]: { pages: 2, recitations: 50 } } },
    dailyChecklist: { [k]: { fajr: 'x' } },
    nudge: defaultNudgeState(),
  };
  assert.equal(computeNudge(s, TODAY).kind, 'quran');
});

test('computeNudge: the LATEST day wins, even if it is a different kind', () => {
  const s = {
    statistics: { dailyHistory: { [key(daysAgo(9))]: { pages: 2 } } },
    dailyChecklist: { [key(daysAgo(3))]: { fajr: 'x' } },
    nudge: defaultNudgeState(),
  };
  const nudge = computeNudge(s, TODAY);
  assert.equal(nudge.kind, 'prayers');
  assert.equal(nudge.sinceKey, key(daysAgo(3)));
});

test('computeNudge: copy tiers at the boundaries (2..6 light, 7..29 warm, 30+ fresh)', () => {
  assert.equal(computeNudge(stateWith('quran', 2), TODAY).tier, 'light');
  assert.equal(computeNudge(stateWith('quran', 6), TODAY).tier, 'light');
  assert.equal(computeNudge(stateWith('quran', 7), TODAY).tier, 'warm');
  assert.equal(computeNudge(stateWith('quran', 29), TODAY).tier, 'warm');
  assert.equal(computeNudge(stateWith('quran', 30), TODAY).tier, 'fresh');
  assert.equal(computeNudge(stateWith('quran', 200), TODAY).tier, 'fresh');
  assert.equal(NUDGE_WARM_DAYS, 7);
  assert.equal(NUDGE_FRESH_DAYS, 30);
});

test('lastActivity: checklist-only days count as activity (prayers are worship)', () => {
  const act = lastActivity(
    { statistics: { dailyHistory: {} }, dailyChecklist: { [key(daysAgo(4))]: { isha: 'jamaah' } } },
    TODAY
  );
  assert.equal(act.key, key(daysAgo(4)));
  assert.equal(act.kind, 'prayers');
});

test('lastActivity: zero-value entries are not activity (presence is not worship)', () => {
  const s = {
    statistics: { dailyHistory: { [key(daysAgo(4))]: { pages: 0, recitations: 0 } } },
    dailyChecklist: {},
  };
  assert.equal(lastActivity(s, TODAY), null);
});

/* ------------------------------------------------------------------ */
/* 2. the showing cycle                                                */
/* ------------------------------------------------------------------ */

test('shouldShowNudge: never shown -> show', () => {
  assert.equal(
    shouldShowNudge(stateWith('quran', 3), computeNudge(stateWith('quran', 3), TODAY), TODAY),
    true
  );
});

test('shouldShowNudge: shown today -> keep showing (no re-render flicker)', () => {
  const nudge = computeNudge(stateWith('quran', 3), TODAY);
  const s = stateWith('quran', 3, { nudge: { lastShownKey: key(TODAY) } });
  assert.equal(shouldShowNudge(s, nudge, TODAY), true);
});

test('shouldShowNudge: a fresh quiet stretch is suppressed for 6 days after a showing', () => {
  const nudge = computeNudge(stateWith('quran', 3), TODAY);
  for (const d of [1, 3, 6]) {
    const s = stateWith('quran', 3 + d, { nudge: { lastShownKey: key(daysAgo(d)) } });
    // lastShown 1..6 days ago, no activity since -> still inside the quiet window
    const today = daysAgo(0);
    assert.equal(shouldShowNudge(s, computeNudge(s, today), today), false, `day ${d}`);
  }
});

test('shouldShowNudge: 7+ days of quiet earns one more line', () => {
  assert.equal(NUDGE_REPEAT_DAYS, 7);
  const today = new Date(2025, 5, 15);
  const s = stateWith('quran', 10, { nudge: { lastShownKey: key(addDays(today, -7)) } });
  assert.equal(shouldShowNudge(s, computeNudge(s, today), today), true);
});

test('shouldShowNudge: activity after the last showing resets the cycle', () => {
  // shown on day -8, they came back on day -5 (after the showing), gapped again
  const today = new Date(2025, 5, 15);
  const s = {
    statistics: { dailyHistory: { [key(addDays(today, -5))]: { pages: 3 } } },
    dailyChecklist: {},
    nudge: { lastShownKey: key(addDays(today, -8)) },
  };
  assert.equal(shouldShowNudge(s, computeNudge(s, today), today), true);
});

test('shouldShowNudge: a hostile future shown-day degrades to never-shown', () => {
  const nudge = computeNudge(stateWith('quran', 3), TODAY);
  const s = stateWith('quran', 3, { nudge: { lastShownKey: '2099-01-01' } });
  // a forged future day can neither schedule a silence nor poison anything:
  // it reads through the sanitizer, lands on "never shown", and the card shows
  assert.equal(shouldShowNudge(s, nudge, TODAY), true);
});

test('shouldShowNudge: dismissed TODAY stays hidden across a reload (session flag dies, the marker persists)', () => {
  const today = new Date(2025, 5, 15);
  const s = {
    statistics: { dailyHistory: { [key(addDays(today, -10))]: { pages: 3 } } },
    dailyChecklist: {},
    // fresh session: nudgeDismissed session flag is gone, but the day was dismissed
    nudge: { lastShownKey: key(today), lastDismissedKey: key(today) },
  };
  assert.equal(shouldShowNudge(s, computeNudge(s, today), today), false);
  // yesterday's dismissal does NOT extend into today (the 7-day spacing governs)
  const day2 = addDays(today, 1);
  const s2 = {
    statistics: { dailyHistory: { [key(addDays(today, -10))]: { pages: 3 } } },
    dailyChecklist: {},
    nudge: { lastShownKey: key(today), lastDismissedKey: key(today) },
  };
  assert.equal(
    shouldShowNudge(s2, computeNudge(s2, day2), day2),
    false,
    'still inside the 7-day window'
  );
});

test('shouldShowNudge: session dismissal hides the card, whatever the cycle says', () => {
  const nudge = computeNudge(stateWith('quran', 3), TODAY);
  const s = stateWith('quran', 3, { nudgeDismissed: true });
  assert.equal(shouldShowNudge(s, nudge, TODAY), false);
  assert.equal(nudgeCardHTML({ ...s, settings: { language: 'en' } }, TODAY), '');
});

/* ------------------------------------------------------------------ */
/* 3. the anti-guilt CONTRACT (both languages)                         */
/* ------------------------------------------------------------------ */

const NUDGE_KEYS = [
  'nudge.title.light',
  'nudge.title.warm',
  'nudge.title.fresh',
  'nudge.line.quran',
  'nudge.line.dhikr',
  'nudge.line.prayers',
  'nudge.cta.quran',
  'nudge.cta.dhikr',
  'nudge.cta.prayers',
  'nudge.dismiss',
];

// Words this app will never say to someone who stepped away. The English
// list catches the manipulative habit-app vocabulary; the Arabic list its
// equivalents (missed/fell-short/broken/lost/guilt/shame/neglected).
const BANNED_EN = [
  'missed',
  'broken',
  'lost',
  'streak',
  'shame',
  'guilt',
  'lazy',
  'failure',
  'failed',
  'wasted',
  'punish',
  'behind',
  'overdue',
  'neglect',
];
const BANNED_AR = [
  'فوت',
  'فوّت',
  'فاتك',
  'فات',
  'كسر',
  'خسر',
  'تخلّف',
  'تأخر',
  'ذنب',
  'عار',
  'ضيّع',
  'ضيع',
];

test('CONTRACT: every nudge key exists in BOTH languages (AR fallback would return EN verbatim)', () => {
  for (const k of NUDGE_KEYS) {
    const en = t(k, 'en');
    const ar = t(k, 'ar');
    assert.notEqual(en, k, `missing EN key: ${k}`);
    assert.notEqual(ar, k, `missing AR key: ${k}`);
    assert.notEqual(ar, en, `AR missing for ${k} (fell back to EN)`);
  }
});

test('CONTRACT: no banned shame/streak vocabulary in any nudge copy, EN or AR', () => {
  for (const k of NUDGE_KEYS) {
    for (const lang of ['en', 'ar']) {
      const str = t(k, lang).toLowerCase();
      for (const w of BANNED_EN) {
        assert.ok(!str.includes(w), `${lang} ${k} contains banned word "${w}": ${str}`);
      }
    }
  }
  for (const k of NUDGE_KEYS) {
    const ar = t(k, 'ar');
    for (const w of BANNED_AR) {
      assert.ok(!ar.includes(w), `ar ${k} contains banned word "${w}": ${ar}`);
    }
  }
});

test('CONTRACT: no digits anywhere in nudge copy — the absence is never counted', () => {
  const digitRe = /[\d٠-٩]/;
  for (const k of NUDGE_KEYS) {
    for (const lang of ['en', 'ar']) {
      assert.ok(!digitRe.test(t(k, lang)), `${lang} ${k} contains a digit: ${t(k, lang)}`);
    }
  }
});

test('CONTRACT: no {placeholder} interpolation in nudge copy (nothing dynamic to count)', () => {
  for (const k of NUDGE_KEYS) {
    for (const lang of ['en', 'ar']) {
      assert.ok(!/[{}]/.test(t(k, lang)), `${lang} ${k} contains a placeholder`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 4. the view card                                                    */
/* ------------------------------------------------------------------ */

const LANG = (s, lang) => ({ ...s, settings: { language: lang } });

test('nudge card renders EN: title, line, CTA, dismiss — and never the gap number', () => {
  const s = LANG(stateWith('quran', 40), 'en');
  const html = nudgeCardHTML(s, TODAY);
  assert.ok(html.includes('data-nudge-card'));
  assert.ok(html.includes('Today is a fresh page'));
  assert.ok(html.includes('Your bookmark is exactly where you left it.'));
  assert.ok(html.includes('Continue reading'));
  assert.ok(html.includes('data-action="nudge-dismiss"'));
  assert.ok(!html.includes('40'), 'the gap itself must never appear in the card');
});

test('nudge card renders AR with RTL-appropriate copy', () => {
  const s = LANG(stateWith('dhikr', 9), 'ar');
  const html = nudgeCardHTML(s, TODAY);
  assert.ok(html.includes('الباب ما زال مفتوحًا'));
  assert.ok(html.includes('افتح المسبحة'));
  assert.ok(html.includes('data-action="nudge-dismiss"'));
});

test('nudge card CTA targets: mushaf bookmark deep link, tasbih, prayer view', () => {
  // (v4.4) the Qur'an nudge now lands on the person's saved MUSHAF page —
  // the book is the default reading experience; the classic reader stays
  // reachable from inside it.
  const q = nudgeCardHTML(
    LANG(stateWith('quran', 3, { mushafBookmark: { page: 42, ts: 1 } }), 'en'),
    TODAY
  );
  assert.ok(q.includes('data-page="42"'), 'quran CTA carries the bookmarked mushaf page');
  assert.ok(
    /href="[^"]*#\/mushaf\?page=42"/.test(q),
    `quran CTA deep links: ${q.match(/href="[^"]*"/)?.[0]}`
  );
  const plain = nudgeCardHTML(LANG(stateWith('quran', 3), 'en'), TODAY);
  assert.ok(/href="[^"]*#\/mushaf"/.test(plain), 'no bookmark -> the book itself');
  assert.ok(!plain.includes('data-page='), 'no phantom page attr without a bookmark');
  const d = nudgeCardHTML(LANG(stateWith('dhikr', 3), 'en'), TODAY);
  assert.ok(d.includes('#/tasbih'));
  const p = nudgeCardHTML(LANG(stateWith('prayers', 3), 'en'), TODAY);
  assert.ok(p.includes('#/prayer'));
});

test('nudge card suppressed for active users and never-shown-eligible states', () => {
  assert.equal(nudgeCardHTML(LANG(stateWith('quran', 1), 'en'), TODAY), '');
  assert.equal(nudgeCardHTML(LANG(stateWith('quran', 0), 'en'), TODAY), '');
  assert.equal(nudgeCardHTML(LANG(null, 'en'), TODAY), '');
});

test('nudge card: hostile junk in the nudge slice cannot resurrect or poison the card', () => {
  // a future shown-day is sanitized away inside the cycle check -> quiet
  const future = LANG(stateWith('quran', 3, { nudge: { lastShownKey: '<img src=x>' } }), 'en');
  // junk key never suppresses; and nothing injects
  const html = nudgeCardHTML(future, TODAY);
  assert.ok(html.includes('data-nudge-card'));
  assert.ok(!html.includes('<img src=x>'));
});

/* ------------------------------------------------------------------ */
/* 5. the store boundary                                               */
/* ------------------------------------------------------------------ */

test('NUDGE_SHOWN / NUDGE_DISMISS ignore any payload and write the device today', () => {
  store.dispatch({ type: 'NUDGE_SHOWN', key: '2099-01-01' });
  assert.notEqual(store.getState().nudge.lastShownKey, '2099-01-01');
  const shown = store.getState().nudge.lastShownKey;
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(shown));
  store.dispatch(actions.dismissNudge());
  assert.equal(store.getState().nudgeDismissed, true);
  assert.equal(
    store.getState().nudge.lastShownKey,
    shown,
    'dismiss records the same today, idempotently'
  );
});

test('sanitizeNudgeState: junk shapes, rolled dates, and future keys all drop', () => {
  assert.deepEqual(sanitizeNudgeState(null), { lastShownKey: null, lastDismissedKey: null });
  assert.deepEqual(sanitizeNudgeState('x'), { lastShownKey: null, lastDismissedKey: null });
  assert.deepEqual(sanitizeNudgeState([]), { lastShownKey: null, lastDismissedKey: null });
  assert.deepEqual(
    sanitizeNudgeState({ lastShownKey: 'not-a-date', lastDismissedKey: 'also-junk' }),
    { lastShownKey: null, lastDismissedKey: null }
  );
  assert.deepEqual(sanitizeNudgeState({ lastShownKey: '2025-02-30' }), {
    lastShownKey: null,
    lastDismissedKey: null,
  });
  assert.deepEqual(sanitizeNudgeState({ lastShownKey: '2099-01-01' }), {
    lastShownKey: null,
    lastDismissedKey: null,
  });
  assert.deepEqual(sanitizeNudgeState({ lastShownKey: key(TODAY), lastDismissedKey: key(TODAY) }), {
    lastShownKey: key(TODAY),
    lastDismissedKey: key(TODAY),
  });
  assert.deepEqual(
    sanitizeNudgeState({ lastShownKey: '2024-01-05', lastDismissedKey: '2024-01-06', junk: true }),
    { lastShownKey: '2024-01-05', lastDismissedKey: '2024-01-06' }
  );
});

test('RESTORE_STATE: a hostile backup cannot forge or weaponize the nudge marker', () => {
  store.dispatch({
    type: 'RESTORE_STATE',
    payload: {
      settings: {},
      nudge: { lastShownKey: '2099-01-01' },
      nudgeDismissed: true,
    },
  });
  const s = store.getState();
  assert.equal(s.nudge.lastShownKey, null, 'future shown-day dropped by the sanitizer');
  assert.equal(s.nudgeDismissed, false, 'session flag never rides in through a backup');
});
