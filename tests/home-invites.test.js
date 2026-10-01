/**
 * tests/home-invites.test.js — (v5.17.56, merged-plan item 9) permanent.
 *
 * Browse-by-need below the fold + three calm home invitations (Hijri date
 * note, Friday Al-Kahf, Ramadan countdown/companion):
 *   - the mood row renders AFTER the adhkar grid (the dhikr owns the fold),
 *     still 12 moods with live counts, bilingual;
 *   - each invitation renders per its own trigger (Hijri always, Friday on
 *     Fridays via the preset anchor, Ramadan in-season or approaching) and
 *     stays silent otherwise;
 *   - dismissal is persisted-calm: stamped today it hides for the day
 *     (reloads included), tomorrow the trigger decides again;
 *   - copy is invitational only — the nudge banned-word lists plus urgency
 *     vocabulary, in both languages, over keys and rendered HTML;
 *   - classical need labels untouched, no personalization read, no push
 *     armed, 19/19 renderer budget intact, no new view import.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processDocument } from '../js/core/schema.js';
import { VIEWS, DEFAULT_SETTINGS, sanitizeSettings } from '../js/core/config.js';
import { actions, store } from '../js/core/state.js';
import { initialState } from '../js/core/state/initial.js';
import { dateKey, pickLocale, escapeHTML } from '../js/core/utils.js';
import { MOODS } from '../js/domain/moods.js';
import {
  INVITE_IDS,
  RAMADAN_COUNTDOWN_DAYS,
  fridayOf,
  isFridayInviteDay,
  ramadanInviteState,
  hijriInviteState,
  isInviteDismissed,
  shouldShowInvite,
} from '../js/domain/homeInvitations.js';
import { toHijri, toGregorian, EVENT_LABELS } from '../js/domain/calendar.js';
import { ramadanInfo, nextRamadan } from '../js/domain/ramadan.js';
import { fridayAnchor, dayKey } from '../js/domain/reminderPresets.js';
import { adhkarBrowserHTML, homeInvitesHTML } from '../js/views/home.js';
import { clickHandlers as worshipClick } from '../js/app/handlers/worship.js';
import { mergedClickHandlers } from '../js/app/events.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const loadDoc = (file) =>
  processDocument(JSON.parse(readFileSync(join(ROOT, `data/${file}`), 'utf8'))).value;

const adhkarDoc = loadDoc('adhkar.json');
const duasDoc = loadDoc('duas.json');
const asmaDoc = loadDoc('asma.json');

/** Real corpus docs wired into a boot-shaped state (mirrors adhkar-browser). */
function browserState({ lang = 'en', dismissedInvites = {} } = {}) {
  const base = initialState();
  const documents = { adhkar: adhkarDoc, duas: duasDoc, asma: asmaDoc };
  const index = {};
  for (const doc of Object.values(documents)) {
    for (const cat of doc.categories || []) {
      for (const item of cat.items || []) {
        index[item.id] = { item, category: cat, document: doc };
      }
    }
  }
  return {
    ...base,
    settings: { ...base.settings, language: lang, dismissedInvites },
    library: { ...base.library, documents, order: ['adhkar', 'duas', 'asma'], itemIndex: index },
    customContent: {},
  };
}

/** Minimal state for the invites renderer (settings only). */
const inviteState = ({ lang = 'en', dismissedInvites = {} } = {}) => ({
  settings: { ...DEFAULT_SETTINGS, language: lang, dismissedInvites },
});

const FRIDAY = new Date(2026, 9, 2); // a Friday (2026-10-01 is Thursday)
const THURSDAY = new Date(2026, 9, 1);
const keyOf = (d) => dateKey(d);

/* ------------------------------------------------------------------ */
/* 1. mood row below the fold                                          */
/* ------------------------------------------------------------------ */

describe('item 9: browse-by-need sits below the grid', () => {
  test('grid first, then moods, then invitations, then reference', () => {
    const html = adhkarBrowserHTML(browserState());
    const grid = html.indexOf('category-grid');
    const moods = html.indexOf('library-section--moods');
    const invites = html.indexOf('home-invites');
    const ref = html.indexOf(en['home.referenceTitle']);
    assert.ok(grid >= 0 && moods >= 0, 'grid and mood row both render');
    assert.ok(grid < moods, 'the mood row sits AFTER the grid (the dhikr owns the fold)');
    if (invites >= 0) {
      assert.ok(moods < invites, 'invitations sit below the mood row');
      assert.ok(invites < ref, 'reference stays last');
    }
  });

  test('all 12 moods still ride chips with live counts (moved, not removed)', () => {
    const html = adhkarBrowserHTML(browserState());
    for (const mood of MOODS) {
      assert.ok(
        html.includes(`data-view="${VIEWS.MOOD}" data-id="${mood.id}"`),
        `mood chip missing: ${mood.id}`
      );
    }
    assert.equal(MOODS.length, 12, 'still exactly 12 classical needs');
  });

  test('AR mood row below the grid, no English leakage', () => {
    const html = adhkarBrowserHTML(browserState({ lang: 'ar' }));
    assert.ok(
      html.indexOf('category-grid') < html.indexOf('library-section--moods'),
      'AR order matches EN order'
    );
    assert.ok(html.includes(ar['moods.title']), 'AR moods title renders');
    assert.ok(!html.includes('>Read now<'), 'no English CTA leaks into Arabic chrome');
  });
});

/* ------------------------------------------------------------------ */
/* 2. triggers derive from the owning modules (rule 6)                 */
/* ------------------------------------------------------------------ */

describe('item 9: invitation triggers', () => {
  test('Friday is the preset anchor Friday — no second definition', () => {
    assert.equal(FRIDAY.getDay(), 5, 'test fixture is actually a Friday');
    assert.equal(THURSDAY.getDay(), 4, 'test fixture is actually a Thursday');
    assert.equal(fridayOf(FRIDAY), dayKey(FRIDAY), 'on Friday the anchor is today');
    assert.equal(fridayOf(FRIDAY), fridayAnchor(dayKey(FRIDAY)), 'anchor owned by reminderPresets');
    assert.equal(isFridayInviteDay(FRIDAY), true);
    assert.equal(isFridayInviteDay(THURSDAY), false);
  });

  test('unknown invitation ids never show', () => {
    assert.equal(shouldShowInvite('nope', FRIDAY, {}), false);
    assert.equal(shouldShowInvite('', FRIDAY, {}), false);
    assert.equal(shouldShowInvite(null, FRIDAY, {}), false);
  });

  test('INVITE_IDS is exactly the three invitations, in render order', () => {
    assert.deepEqual([...INVITE_IDS], ['hijri', 'friday', 'ramadan']);
  });

  test('hijri invitation is seasonless (orientation, not occasion)', () => {
    assert.equal(shouldShowInvite('hijri', FRIDAY, {}), true);
    assert.equal(shouldShowInvite('hijri', THURSDAY, {}), true);
    const st = hijriInviteState(THURSDAY);
    assert.ok(st.hijri && Number.isFinite(st.hijri.day), 'carries the Hijri date');
    assert.ok(st.eventKey && st.eventDate instanceof Date, 'carries the next occasion');
    assert.ok(EVENT_LABELS[st.eventKey]?.en, 'the occasion label exists (bilingual source)');
  });

  test('hijri state finds an occasion across the Gregorian year boundary', () => {
    const late = new Date(2026, 11, 28);
    const st = hijriInviteState(late);
    assert.ok(st.eventKey && st.eventDate instanceof Date, 'a December reader still gets an event');
    assert.ok(st.eventDate >= new Date(2026, 11, 28), 'the event is upcoming, not past');
  });

  test('ramadan invitation: in-season, near (counted, not pinned), far (silent)', () => {
    const hy = toHijri(new Date()).year;
    const midRamadan = toGregorian(hy, 9, 10);
    assert.equal(ramadanInfo(midRamadan).inRamadan, true, 'fixture is inside Ramadan');
    assert.deepEqual(ramadanInviteState(midRamadan), { mode: 'in', day: 10 });

    const shaban = toGregorian(hy, 8, 15);
    const near = ramadanInviteState(shaban);
    const expectDays = nextRamadan(shaban).daysUntil;
    assert.ok(
      expectDays > 0 && expectDays <= RAMADAN_COUNTDOWN_DAYS,
      `fixture is approaching (${expectDays}d)`
    );
    assert.deepEqual(near, {
      mode: 'near',
      daysUntil: expectDays,
      hijriYear: nextRamadan(shaban).hijriYear,
    });

    const shawwal = toGregorian(hy, 10, 15);
    const far = ramadanInviteState(shawwal);
    assert.ok(far.daysUntil > RAMADAN_COUNTDOWN_DAYS, `fixture is far (${far.daysUntil}d)`);
    assert.equal(far.mode, 'far');
    assert.equal(shouldShowInvite('ramadan', shawwal, {}), false, 'far Ramadan stays silent');
    assert.equal(shouldShowInvite('ramadan', midRamadan, {}), true);
    assert.equal(shouldShowInvite('ramadan', shaban, {}), true);
  });
});

/* ------------------------------------------------------------------ */
/* 3. render per trigger                                               */
/* ------------------------------------------------------------------ */

describe('item 9: invitation cards render per trigger', () => {
  test('hijri card: Hijri date + next occasion + calendar door + estimate honesty', () => {
    const html = homeInvitesHTML(inviteState(), THURSDAY);
    const st = hijriInviteState(THURSDAY);
    const h = toHijri(THURSDAY);
    assert.ok(html.includes('data-home-invite="hijri"'), 'hijri card renders');
    assert.ok(html.includes(String(h.day)), 'Hijri day renders');
    // Month names with quotes (Rabi' al-Thani) ride through t()'s
    // var-escaping, so the DOM carries the escaped form — correct, not a bug.
    assert.ok(html.includes(escapeHTML(pickLocale(h.monthName, 'en'))), 'Hijri month renders');
    assert.ok(
      html.includes(EVENT_LABELS[st.eventKey].en),
      'the next occasion is named from the calendar source'
    );
    assert.ok(html.includes(`data-view="${VIEWS.CALENDAR}"`), 'one honest door: the calendar');
    assert.ok(html.includes(en['calendar.estimateNote']), 'the ±1–2 day caveat is said out loud');
    assert.ok(html.includes(en['home.invite.hijriTitle']), 'invitational title renders');
  });

  test('friday card: only on Friday, one door into Surah Al-Kahf', () => {
    const fri = homeInvitesHTML(inviteState(), FRIDAY);
    assert.ok(fri.includes('data-home-invite="friday"'), 'Friday card renders on Friday');
    assert.ok(fri.includes(en['home.invite.fridayTitle']), 'Friday title renders');
    assert.ok(fri.includes('#/quran/18'), 'the door is Surah Al-Kahf itself');
    assert.ok(fri.includes(`data-view="${VIEWS.QURAN}" data-id="18"`), 'Kahf deep link is exact');
    const thu = homeInvitesHTML(inviteState(), THURSDAY);
    assert.ok(!thu.includes('data-home-invite="friday"'), 'no Friday card on Thursday');
  });

  test('ramadan card: Day N in-season, countdown when near, silent when far', () => {
    const hy = toHijri(new Date()).year;
    const inHtml = homeInvitesHTML(inviteState(), toGregorian(hy, 9, 10));
    assert.ok(inHtml.includes('data-home-invite="ramadan"'), 'Ramadan card renders in-season');
    assert.ok(inHtml.includes(en['home.invite.ramadanTitleIn']), 'in-season title renders');
    assert.ok(
      inHtml.includes(en['home.invite.ramadanBodyIn'].replace('{n}', '10')),
      'in-season day is stated, not counted as absence'
    );

    const shaban = toGregorian(hy, 8, 15);
    const days = nextRamadan(shaban).daysUntil;
    const nearHtml = homeInvitesHTML(inviteState(), shaban);
    assert.ok(
      nearHtml.includes(en['home.invite.ramadanBodyNear'].replace('{n}', String(days))),
      `countdown derives from nextRamadan (${days}d), never pinned`
    );
    assert.ok(nearHtml.includes(en['home.invite.ramadanTitleNear']), 'approaching title renders');

    const farHtml = homeInvitesHTML(inviteState(), toGregorian(hy, 10, 15));
    assert.ok(!farHtml.includes('data-home-invite="ramadan"'), 'far Ramadan renders nothing');
  });

  test('both languages render every card (AR fixture: a Friday in Ramadan week)', () => {
    // Find a Friday inside Ramadan so all three cards paint at once.
    const hy = toHijri(new Date()).year;
    let d = toGregorian(hy, 9, 1);
    while (d.getDay() !== 5) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    for (const lang of ['en', 'ar']) {
      const html = homeInvitesHTML(inviteState({ lang }), d);
      for (const id of INVITE_IDS) {
        assert.ok(html.includes(`data-home-invite="${id}"`), `${lang}: ${id} card renders`);
      }
      assert.ok(!html.includes('>Read now<') || lang === 'en', `${lang}: no stray English CTA`);
    }
    const arHtml = homeInvitesHTML(inviteState({ lang: 'ar' }), d);
    assert.ok(arHtml.includes(ar['home.invite.fridayTitle']), 'AR Friday title renders');
    assert.ok(arHtml.includes(ar['home.invite.ramadanCta']), 'AR Ramadan CTA renders');
  });

  test('cards are calm asides: native dismiss with a named label, navigate-only doors', () => {
    const html = homeInvitesHTML(inviteState(), FRIDAY);
    const actions = new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));
    assert.deepEqual(
      [...actions].sort(),
      ['home-invite-dismiss', 'navigate'],
      'dismiss + doors, nothing else (no push arming, no interstitial)'
    );
    assert.ok(html.includes('aria-label="Dismiss"'), 'dismiss button is named');
    assert.ok(
      !html.includes('<h1') && !html.includes('<h2'),
      'no headings stolen (nudge precedent)'
    );
  });
});

/* ------------------------------------------------------------------ */
/* 4. persistent calm dismissal                                        */
/* ------------------------------------------------------------------ */

describe('item 9: persistent calm dismissal', () => {
  test('dismissed today hides for the day, reloads included; tomorrow is fresh', () => {
    const today = keyOf(FRIDAY);
    const dismissed = { friday: today };
    assert.equal(isInviteDismissed(dismissed, 'friday', FRIDAY), true);
    assert.equal(shouldShowInvite('friday', FRIDAY, dismissed), false);
    const html = homeInvitesHTML(inviteState({ dismissedInvites: dismissed }), FRIDAY);
    assert.ok(!html.includes('data-home-invite="friday"'), 'dismissed card stays hidden');
    assert.ok(html.includes('data-home-invite="hijri"'), 'other cards are unaffected');

    const tomorrow = new Date(FRIDAY.getFullYear(), FRIDAY.getMonth(), FRIDAY.getDate() + 1);
    assert.equal(isInviteDismissed(dismissed, 'friday', tomorrow), false);
  });

  test("yesterday's stamp does not hide today", () => {
    const yesterday = new Date(FRIDAY.getFullYear(), FRIDAY.getMonth(), FRIDAY.getDate() - 1);
    const dismissed = { friday: keyOf(yesterday) };
    assert.equal(shouldShowInvite('friday', FRIDAY, dismissed), true);
  });

  test('hostile dismissal shapes read as never dismissed (no junk into the DOM)', () => {
    for (const junk of [
      null,
      'x',
      [],
      { friday: '<img src=x>' },
      { friday: 5 },
      { nope: keyOf(FRIDAY) },
    ]) {
      assert.equal(
        isInviteDismissed(junk, 'friday', FRIDAY),
        false,
        `junk tolerated: ${JSON.stringify(junk)}`
      );
    }
    const html = homeInvitesHTML(
      inviteState({ dismissedInvites: { friday: '<img src=x>' } }),
      FRIDAY
    );
    assert.ok(html.includes('data-home-invite="friday"'), 'junk stamp never suppresses');
    assert.ok(!html.includes('<img src=x>'), 'nothing injects');
  });

  test('the dismiss handler is registered and stamps the device today', () => {
    assert.ok(typeof worshipClick['home-invite-dismiss'] === 'function', 'handler exists');
    assert.ok(
      typeof mergedClickHandlers['home-invite-dismiss'] === 'function',
      'handler is in the delegated table (contracts gate)'
    );
    worshipClick['home-invite-dismiss']({ id: 'hijri' });
    assert.equal(store.getState().settings.dismissedInvites?.hijri, keyOf(new Date()));
    worshipClick['home-invite-dismiss']({ id: '__proto__' });
    worshipClick['home-invite-dismiss']({});
    worshipClick['home-invite-dismiss'](null);
    assert.ok(
      !Object.hasOwn(store.getState().settings.dismissedInvites, '__proto__'),
      'forged ids dispatch nothing'
    );
    store.dispatch(actions.updateSettings({ dismissedInvites: {} }));
    assert.deepEqual(store.getState().settings.dismissedInvites, {}, 'test footprint cleaned');
  });

  test('sanitizeDismissedInvites: well-shaped stamps survive, everything else drops', () => {
    assert.deepEqual(
      sanitizeSettings({ dismissedInvites: { hijri: '2026-10-01', ramadan: '2026-10-02' } })
        .dismissedInvites,
      { hijri: '2026-10-01', ramadan: '2026-10-02' }
    );
    for (const hostile of [
      { friday: 'not-a-date' },
      { friday: '2025-02-30' },
      { friday: 5 },
      { friday: ['2026-10-01'] },
      { nope: '2026-10-01' },
      { __proto__: '2026-10-01' },
      'x',
      [],
    ]) {
      assert.deepEqual(
        sanitizeSettings({ dismissedInvites: hostile }).dismissedInvites,
        {},
        `hostile dropped: ${JSON.stringify(hostile)}`
      );
    }
    assert.deepEqual(DEFAULT_SETTINGS.dismissedInvites, {}, 'fresh installs start un-dismissed');
  });
});

/* ------------------------------------------------------------------ */
/* 5. copy: invitational only, bilingual, no gamification              */
/* ------------------------------------------------------------------ */

const INVITE_KEYS = [
  'home.invite.hijriTitle',
  'home.invite.hijriBody',
  'home.invite.hijriCta',
  'home.invite.fridayTitle',
  'home.invite.fridayBody',
  'home.invite.fridayCta',
  'home.invite.ramadanTitleIn',
  'home.invite.ramadanBodyIn',
  'home.invite.ramadanTitleNear',
  'home.invite.ramadanBodyNear',
  'home.invite.ramadanCta',
];

// The nudge contract's shame list, plus urgency/push vocabulary an
// invitation must never borrow (missed-day counting, rushing, last-chance).
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
  'hurry',
  'urgent',
  'rush',
  'last chance',
  "don't miss",
  'running out',
  'catch up',
  'too late',
  'act now',
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
  'مستعجل',
  'عاجل',
  'أخير',
  'متأخر',
];

describe('item 9: invitational language only', () => {
  test('every invitation key exists in EN+AR with matching placeholders', () => {
    for (const k of INVITE_KEYS) {
      assert.ok(en[k] && ar[k], `${k} missing in en or ar`);
      assert.notEqual(ar[k], en[k], `${k} not translated`);
      const ph = (s) =>
        [...String(s).matchAll(/\{(\w+)\}/g)]
          .map((m) => m[1])
          .sort()
          .join(',');
      assert.equal(ph(ar[k]), ph(en[k]), `${k}: placeholder mismatch`);
    }
  });

  test('no AR Latin leakage in the new keys (placeholders exempt — they are not chrome)', () => {
    for (const k of INVITE_KEYS) {
      const bare = String(ar[k]).replace(/\{[^}]*\}/g, '');
      assert.ok(!/[A-Za-z]/.test(bare), `${k} AR carries Latin: ${ar[k]}`);
    }
  });

  test('no banned shame/urgency vocabulary in any invitation key, EN or AR', () => {
    for (const k of INVITE_KEYS) {
      for (const lang of ['en', 'ar']) {
        const str = (lang === 'en' ? en[k] : ar[k]).toLowerCase();
        for (const w of BANNED_EN) {
          assert.ok(!str.includes(w), `${lang} ${k} contains "${w}": ${str}`);
        }
      }
      for (const w of BANNED_AR) {
        assert.ok(!String(ar[k]).includes(w), `ar ${k} contains "${w}": ${ar[k]}`);
      }
    }
  });

  test('no banned copy in rendered invitations either (both languages, Friday in Ramadan)', () => {
    const hy = toHijri(new Date()).year;
    let d = toGregorian(hy, 9, 1);
    while (d.getDay() !== 5) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    for (const lang of ['en', 'ar']) {
      const html = homeInvitesHTML(inviteState({ lang }), d).toLowerCase();
      for (const w of [...BANNED_EN, ...BANNED_AR]) {
        assert.ok(!html.includes(w.toLowerCase()), `${lang} render contains "${w}"`);
      }
      assert.ok(
        !/streak|confetti|leaderboard|badge|score|shame|xp|level up|reward/i.test(html),
        `${lang}: no gamification vocabulary`
      );
    }
  });

  test('classical need labels untouched: the 12 mood keys still read as needs, not goals', () => {
    for (const mood of MOODS) {
      assert.ok(en[`mood.${mood.id}`] && ar[`mood.${mood.id}`], `mood key missing: ${mood.id}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 6. budgets that must not move                                       */
/* ------------------------------------------------------------------ */

describe('item 9: budgets that must not move', () => {
  test('home.js imports no view — the 19/19 static budget stays untouched', () => {
    const src = readFileSync(join(ROOT, 'js/views/home.js'), 'utf8');
    assert.ok(!src.includes("from '../views/"), 'home reuses domain helpers, not views');
    const renderer = readFileSync(join(ROOT, 'js/app/renderer.js'), 'utf8');
    const staticViews = [...renderer.matchAll(/from\s+['"]\.\.\/views\/([^'"]+)['"]/g)].map(
      (m) => m[1]
    );
    assert.ok(
      staticViews.length <= 19,
      `renderer keeps ≤19 static view imports (found ${staticViews.length})`
    );
  });

  test('no new custom CSS property, logical properties only in the new block', () => {
    const css = readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8');
    const block = css.slice(css.indexOf('.home-invites'));
    assert.ok(block.length > 0, 'the invites stack block exists');
    assert.ok(!/--home-invite/.test(block), 'no new custom property (existing tokens only)');
    for (const bad of [
      'margin-left',
      'margin-right',
      'padding-left',
      'padding-right',
      'left:',
      'right:',
    ]) {
      assert.ok(!block.includes(bad), `no physical property (${bad})`);
    }
  });

  test('no personalization read: invites never touch names, profiles or history', () => {
    // Comments document the absence ("no history read") — scan the code,
    // not the prose.
    const stripComments = (src) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
    const domainSrc = stripComments(
      readFileSync(join(ROOT, 'js/domain/homeInvitations.js'), 'utf8')
    );
    for (const leak of ['profileName', 'profiles', 'history', 'statistics', 'favorites']) {
      assert.ok(!domainSrc.includes(leak), `domain reads no personal data (${leak})`);
    }
    const view = homeInvitesHTML.toString();
    assert.ok(!view.includes('profile'), 'view renders no personal data');
  });
});
