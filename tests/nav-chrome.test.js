import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderNav,
  quranModeSwitchHTML,
  prayerModeSwitchHTML,
  practiseModeSwitchHTML,
  youModeSwitchHTML,
  INTERNAL_ONLY_ROUTES,
} from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { renderAudio } from '../js/views/audioManager.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/**
 * REORG Phase 2 locks (supersedes the ORG-02 two-doors ruling) + Phase 8
 * absorption: one book, one door. The classic reader no longer competes
 * for a chrome slot — #/quran stays a real route and lights the mushaf
 * door, while the in-chrome List/Word/Audio switch carries the hop. ROOTS
 * is absorbed into the same door (HANDOFF A1): #/roots stays a real route
 * and lights the mushaf door in 2 taps via the switch.
 */
const stateFor = (activeView) => ({ ...initialState(), activeView });

function activeViews(html) {
  const out = [];
  const re =
    /data-view="([^"]+)"[^>]*aria-current="page"|aria-current="page"[^>]*data-view="([^"]+)"/g;
  for (const m of html.matchAll(re)) out.push(m[1] || m[2]);
  return out;
}

describe('Phase 2 chrome: one Qur’an door', () => {
  test('rail and drawer expose the mushaf door once each; no competing reader or roots entry', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'mushaf entry present');
    const quranHits = html.split(`data-view="${VIEWS.QURAN}"`).length - 1;
    assert.equal(quranHits, 0, `reader must not compete in the chrome (saw ${quranHits})`);
    const rootsHits = html.split(`data-view="${VIEWS.ROOTS}"`).length - 1;
    assert.equal(rootsHits, 0, `roots must not compete in the chrome (saw ${rootsHits})`);
  });

  test('active states merged: #/quran and #/roots deep links light the mushaf door', () => {
    // Each destination lights in rail + drawer + mobile bar, so dedupe:
    // exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.MUSHAF))), [VIEWS.MUSHAF]);
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.QURAN))),
      [VIEWS.MUSHAF],
      'a deep link into #/quran lights the Qur’an door, not a second entry'
    );
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.ROOTS))),
      [VIEWS.MUSHAF],
      'a deep link into #/roots lights the Qur’an door, not a second entry'
    );
  });

  test('in-chrome switch links list reading and word study with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = quranModeSwitchHTML(VIEWS.QURAN, lang);
      assert.ok(
        html.includes(`data-view="${VIEWS.QURAN}"`) && html.includes(`data-view="${VIEWS.ROOTS}"`),
        `switch carries both modes (${lang})`
      );
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="quran-'),
        `switch reuses navigate only (${lang})`
      );
    }
    // Active segment follows the route; on the mushaf neither is active.
    assert.ok(
      quranModeSwitchHTML(VIEWS.QURAN, 'en').includes('segmented__btn--active'),
      'list segment active on #/quran'
    );
    assert.ok(
      quranModeSwitchHTML(VIEWS.ROOTS, 'en').includes('segmented__btn--active'),
      'word segment active on #/roots'
    );
    assert.ok(
      !quranModeSwitchHTML(VIEWS.MUSHAF, 'en').includes('segmented__btn--active'),
      'the book is the door — no segment claims it'
    );
  });

  test('Qur’an chrome copy is bilingual: nav.quran plus the switch labels', () => {
    assert.ok(en['nav.quran'] && ar['nav.quran']);
    assert.notEqual(en['nav.quran'], ar['nav.quran']);
    for (const key of ['quran.modeList', 'quran.modeWord']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });
});

/**
 * REORG Phase 4 locks + Phase 8 absorption: one Prayer door. Times +
 * qibla + Hijri calendar + the Ramadan companion live in one section;
 * the calendar is a tab, not a peer door. #/qibla, #/calendar and
 * #/ramadan stay real routes and light the prayer door, while the
 * in-chrome Times/Qibla/Calendar/Ramadan switch carries the hop.
 * Arrangement only — no capability change.
 */
describe('Phase 4 chrome: one Prayer door', () => {
  test('rail and drawer expose the prayer door once each; no competing qibla/calendar/ramadan entry', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.PRAYER}"`), 'prayer entry present');
    const qiblaHits = html.split(`data-view="${VIEWS.QIBLA}"`).length - 1;
    assert.equal(qiblaHits, 0, `qibla must not compete in the chrome (saw ${qiblaHits})`);
    const calendarHits = html.split(`data-view="${VIEWS.CALENDAR}"`).length - 1;
    assert.equal(
      calendarHits,
      0,
      `the calendar must not compete in the chrome (saw ${calendarHits})`
    );
    const ramadanHits = html.split(`data-view="${VIEWS.RAMADAN}"`).length - 1;
    assert.equal(ramadanHits, 0, `ramadan must not compete in the chrome (saw ${ramadanHits})`);
  });

  test('active states merged: #/qibla, #/calendar and #/ramadan deep links light the prayer door', () => {
    // Each destination lights in rail + drawer + mobile bar, so dedupe:
    // exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.PRAYER))), [VIEWS.PRAYER]);
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.QIBLA))),
      [VIEWS.PRAYER],
      'a deep link into #/qibla lights the Prayer door, not a second entry'
    );
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.CALENDAR))),
      [VIEWS.PRAYER],
      'a deep link into #/calendar lights the Prayer door, not a second entry'
    );
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.RAMADAN))),
      [VIEWS.PRAYER],
      'a deep link into #/ramadan lights the Prayer door, not a second entry'
    );
  });

  test('in-chrome switch links times, qibla, calendar and ramadan with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = prayerModeSwitchHTML(VIEWS.PRAYER, lang);
      assert.ok(
        html.includes(`data-view="${VIEWS.PRAYER}"`) &&
          html.includes(`data-view="${VIEWS.QIBLA}"`) &&
          html.includes(`data-view="${VIEWS.CALENDAR}"`) &&
          html.includes(`data-view="${VIEWS.RAMADAN}"`),
        `switch carries all four modes (${lang})`
      );
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="prayer-'),
        `switch reuses navigate only (${lang})`
      );
    }
    // The active segment follows the route — exactly one claims each view.
    for (const view of [VIEWS.PRAYER, VIEWS.QIBLA, VIEWS.CALENDAR, VIEWS.RAMADAN]) {
      const html = prayerModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
  });

  test('Prayer chrome copy is bilingual: the four reused nav labels', () => {
    for (const key of ['nav.prayer', 'nav.qibla', 'nav.calendar', 'nav.ramadan']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });
});

/**
 * REORG Phase 5 locks + Phase 8 door label: one Practise section. Tasbih,
 * the Tajweed course, the 99 Names quiz and look-alike ayat live in one
 * section behind the TASBIH entry wearing the nav.practise door label;
 * the course's Phase 1 read-group door was temporary and is re-homed here.
 * #/tajweed-course, #/quiz and #/mutashabihat stay real routes and light
 * the Practise door, while the in-chrome Tasbih/Course/Quiz/Look-alike
 * switch (the §2.4 stage rail) carries the hop. Arrangement only — the
 * course progress model, every handler and every data file are untouched,
 * and the rail carries no ranking or shame copy (adab).
 */
describe('Phase 5 chrome: one Practise section', () => {
  test('rail and drawer expose the Practise door; course/quiz/look-alikes do not compete', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.TASBIH}"`), 'practise entry present');
    for (const view of [VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      const hits = html.split(`data-view="${view}"`).length - 1;
      assert.equal(hits, 0, `#/${view} must not compete in the chrome (saw ${hits})`);
    }
    const tasbihHits = html.split(`data-view="${VIEWS.TASBIH}"`).length - 1;
    assert.ok(tasbihHits >= 2, `practise keeps its door in rail and drawer (saw ${tasbihHits})`);
    // The door promises the activity (nav.practise), not the counting tool.
    assert.ok(
      html.includes(`<span class="nav__label">${en['nav.practise']}</span>`),
      'door carries the nav.practise label'
    );
  });

  test('active states merged: course/quiz/look-alike deep links light the Practise door', () => {
    // Each destination lights in rail + drawer (+ mobile bar where listed),
    // so dedupe: exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.TASBIH))), [VIEWS.TASBIH]);
    for (const view of [VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.TASBIH],
        `a deep link into #/${view} lights the Practise door, not a second entry`
      );
    }
  });

  test('in-chrome switch links tasbih, course, quiz and look-alikes with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = practiseModeSwitchHTML(VIEWS.TASBIH, lang);
      for (const view of [VIEWS.TASBIH, VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
        assert.ok(html.includes(`data-view="${view}"`), `switch carries #/${view} (${lang})`);
      }
      assert.ok(
        html.includes('data-action="navigate"') &&
          !html.includes('data-action="practise-') &&
          !html.includes('data-action="tajweed-') &&
          !html.includes('data-action="quiz-') &&
          !html.includes('data-action="mutashabihat-'),
        `switch reuses navigate only (${lang})`
      );
      // Adab: the rail is a door, never a scoreboard — no ranking/shame copy.
      for (const word of ['streak', 'rank', 'leader', 'shame', 'score', 'best']) {
        assert.ok(
          !html.toLowerCase().includes(word),
          `switch carries no gamification copy (${word}, ${lang})`
        );
      }
    }
    // The active segment follows the route — exactly one claims each view.
    for (const view of [VIEWS.TASBIH, VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      const html = practiseModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
  });

  test('Practise chrome copy is bilingual: door label, entry segment, reused labels, section name', () => {
    for (const key of [
      'nav.practise',
      'nav.tasbih',
      'nav.tajweedCourse',
      'quiz.title',
      'mutashabihat.title',
      'practise.label',
    ]) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
    assert.equal(en['nav.practise'], 'Practise');
    assert.equal(ar['nav.practise'], 'الممارسة');
  });
});

/**
 * REORG Phase 6 locks + Phase 8 absorption: one You section, ten modes.
 * Garden, Checklist, Statistics, Favorites, Journal, Certificate, Zakat,
 * Offline library, Settings and About collapse behind a single nav.you
 * door (the checklist view — it carries today, streaks and the section
 * entry); the other nine stay real routes and light the You door, while
 * the in-chrome switch carries the hop. 'Garden' and 'Checklist' retire
 * as nav nouns (§2.6 rule 1: a label is a thing, not a metaphor); the
 * plant visual survives only as a treatment inside the Growth view.
 * a label is a thing, not a metaphor); the plant visual survives only
 * as a treatment inside the Growth view. The §1.6 Search/palette
 * mismatch closes by repointing: nav Search navigates to the search
 * view. Arrangement only — every handler, every data file and the
 * renderer static budget (19/19) are untouched, and the rail carries no
 * ranking or shame copy (adab).
 */
describe('Phase 6 chrome: one You section', () => {
  test('rail and drawer expose the You door; section members do not compete', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.CHECKLIST}"`), 'You door present');
    for (const view of [
      VIEWS.GARDEN,
      VIEWS.STATISTICS,
      VIEWS.FAVORITES,
      VIEWS.SETTINGS,
      VIEWS.ABOUT,
      VIEWS.ZAKAT,
      VIEWS.OFFLINE,
    ]) {
      const hits = html.split(`data-view="${view}"`).length - 1;
      assert.equal(hits, 0, `#/${view} must not compete in the chrome (saw ${hits})`);
    }
    const youHits = html.split(`data-view="${VIEWS.CHECKLIST}"`).length - 1;
    assert.ok(youHits >= 2, `You keeps its door in rail and drawer (saw ${youHits})`);
    // The door promises the person, not the old tracker noun.
    assert.ok(
      html.includes(`<span class="nav__label">${en['nav.you']}</span>`),
      'door carries the nav.you label'
    );
  });

  test('active states merged: section deep links light the You door', () => {
    // Each destination lights in rail + drawer (+ mobile bar where listed),
    // so dedupe: exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.CHECKLIST))), [VIEWS.CHECKLIST]);
    for (const view of [
      VIEWS.GARDEN,
      VIEWS.STATISTICS,
      VIEWS.FAVORITES,
      VIEWS.JOURNAL,
      VIEWS.CERTIFICATE,
      VIEWS.ZAKAT,
      VIEWS.OFFLINE,
      VIEWS.SETTINGS,
      VIEWS.ABOUT,
    ]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.CHECKLIST],
        `a deep link into #/${view} lights the You door, not a second entry`
      );
    }
  });

  test('in-chrome switch links all ten section modes with no new actions', () => {
    const members = [
      VIEWS.CHECKLIST,
      VIEWS.GARDEN,
      VIEWS.FAVORITES,
      VIEWS.JOURNAL,
      VIEWS.STATISTICS,
      VIEWS.CERTIFICATE,
      VIEWS.ZAKAT,
      VIEWS.OFFLINE,
      VIEWS.SETTINGS,
      VIEWS.ABOUT,
    ];
    for (const lang of ['en', 'ar']) {
      const html = youModeSwitchHTML(VIEWS.CHECKLIST, lang);
      for (const view of members) {
        assert.ok(html.includes(`data-view="${view}"`), `switch carries #/${view} (${lang})`);
      }
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="you-'),
        `switch reuses navigate only (${lang})`
      );
      // Adab: the rail is a door, never a scoreboard — no ranking/shame copy.
      for (const word of ['streak', 'rank', 'leader', 'shame', 'score', 'best']) {
        assert.ok(
          !html.toLowerCase().includes(word),
          `switch carries no gamification copy (${word}, ${lang})`
        );
      }
    }
    // The active segment follows the route — exactly one claims each view.
    for (const view of members) {
      const html = youModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
  });

  test('You chrome copy is bilingual: door, renamed entries, reused labels, absorbed members', () => {
    for (const key of [
      'nav.you',
      'you.myAdhkar',
      'you.growth',
      'nav.favorites',
      'journal.title',
      'nav.statistics',
      'certificate.title',
      'nav.zakat',
      'nav.offline',
      'nav.settings',
      'you.about',
    ]) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('naming pass: no retired metaphor/tutorial noun survives in either dictionary', () => {
    for (const key of ['nav.garden', 'nav.checklist', 'checklist.title', 'garden.title']) {
      assert.ok(!(key in en) && !(key in ar), `${key} still names a screen`);
    }
  });
});

/**
 * REORG Phase 7 locks + Phase 8 six-door cut: the orphans, one by one,
 * then the filing cabinet comes down. FOCUS, COLLECTIONS and COLLECTION
 * resolve to the HOME (Adhkar) door; AUDIO resolves to the MUSHAF (Qur'an)
 * door via the extended List/Word/Audio switch; LIBRARY resolves to HOME
 * behind the grid's all-view; EDITOR, AMBIENT and SEARCH stay doorless ON
 * PURPOSE as documented internals (js/ui/shell.js INTERNAL_ONLY_ROUTES).
 * Arrangement only — no route, view, handler or data change; renderer
 * static budget stays 19/19; the switches reuse navigate only; every
 * segment keeps its 44px target; no gamification copy; bilingual from the
 * first commit.
 */
describe('Phase 7 chrome: Adhkar depths, Qur’an listening, three documented internals', () => {
  test('no new chrome entries: the rail exposes exactly the 6 Phase 8 doors', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    for (const view of [
      VIEWS.LIBRARY,
      VIEWS.FOCUS,
      VIEWS.COLLECTIONS,
      VIEWS.COLLECTION,
      VIEWS.AUDIO,
      VIEWS.ROOTS,
      VIEWS.QURAN,
      VIEWS.QIBLA,
      VIEWS.CALENDAR,
      VIEWS.RAMADAN,
      VIEWS.TAJWEED_COURSE,
      VIEWS.QUIZ,
      VIEWS.MUTASHABIHAT,
      VIEWS.GARDEN,
      VIEWS.STATISTICS,
      VIEWS.FAVORITES,
      VIEWS.JOURNAL,
      VIEWS.CERTIFICATE,
      VIEWS.ZAKAT,
      VIEWS.OFFLINE,
      VIEWS.SETTINGS,
      VIEWS.ABOUT,
      VIEWS.SEARCH,
      VIEWS.EDITOR,
      VIEWS.AMBIENT,
    ]) {
      const hits = html.split(`data-view="${view}"`).length - 1;
      assert.equal(hits, 0, `#/${view} must not compete in the chrome (saw ${hits})`);
    }
    for (const view of [
      VIEWS.HOME,
      VIEWS.MUSHAF,
      VIEWS.HADITH,
      VIEWS.PRAYER,
      VIEWS.TASBIH,
      VIEWS.CHECKLIST,
    ]) {
      assert.ok(html.includes(`data-view="${view}"`), `door #/${view} present`);
    }
  });

  test('the six doors wear the A1 labels in order', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    const labels = [...html.matchAll(/<span class="nav__label">([^<]+)<\/span>/g)].map((m) => m[1]);
    const railLabels = labels.slice(0, 6);
    assert.deepEqual(railLabels, [
      en['nav.home'],
      en['nav.quran'],
      en['nav.hadith'],
      en['nav.prayer'],
      en['nav.practise'],
      en['nav.you'],
    ]);
  });

  test('active states: Adhkar depths light HOME, listening lights the Qur’an door', () => {
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    for (const view of [VIEWS.FOCUS, VIEWS.COLLECTIONS, VIEWS.COLLECTION]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.HOME],
        `a deep link into #/${view} lights the Adhkar door, not a second entry`
      );
    }
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.AUDIO))),
      [VIEWS.MUSHAF],
      'a deep link into #/audio lights the Qur’an door, not a second entry'
    );
    // Exactly one distinct door per route — LIBRARY resolves to HOME behind
    // the grid's all-view.
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.CATEGORY))), [VIEWS.HOME]);
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.LIBRARY))), [VIEWS.HOME]);
  });

  test('Qur’an switch carries list, word and listening with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = quranModeSwitchHTML(VIEWS.AUDIO, lang);
      for (const view of [VIEWS.QURAN, VIEWS.ROOTS, VIEWS.AUDIO]) {
        assert.ok(html.includes(`data-view="${view}"`), `switch carries #/${view} (${lang})`);
      }
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="quran-'),
        `switch reuses navigate only (${lang})`
      );
      for (const word of ['streak', 'rank', 'leader', 'shame', 'score', 'best']) {
        assert.ok(
          !html.toLowerCase().includes(word),
          `switch carries no gamification copy (${word}, ${lang})`
        );
      }
    }
    for (const view of [VIEWS.QURAN, VIEWS.ROOTS, VIEWS.AUDIO]) {
      const html = quranModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
    assert.ok(
      !quranModeSwitchHTML(VIEWS.MUSHAF, 'en').includes('segmented__btn--active'),
      'the book is the door — no segment claims it'
    );
  });

  test('the audio view renders the Qur’an switch with the listening segment active', () => {
    const html = renderAudio({ ...initialState(), activeView: VIEWS.AUDIO });
    assert.ok(html.includes('quran-mode-switch'), 'audio view carries the Qur’an switch');
    assert.ok(html.includes(`data-view="${VIEWS.AUDIO}"`), 'switch links listening');
    assert.ok(html.includes(`data-view="${VIEWS.QURAN}"`), 'switch links list reading');
    assert.ok(html.includes('segmented__btn--active'), 'the listening segment claims #/audio');
  });

  test('Phase 7 chrome copy is bilingual: reused labels only, no new key', () => {
    for (const key of ['nav.home', 'nav.quran', 'quran.modeList', 'quran.modeWord', 'nav.audio']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('EDITOR, AMBIENT and SEARCH are documented internals with no chrome claim', () => {
    assert.deepEqual(
      [...Object.keys(INTERNAL_ONLY_ROUTES)].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      'exactly the three kiosk/tool/launcher routes are internal-only'
    );
    for (const key of ['EDITOR', 'AMBIENT', 'SEARCH']) {
      assert.ok(
        INTERNAL_ONLY_ROUTES[key] && INTERNAL_ONLY_ROUTES[key].length > 40,
        `${key} carries no recorded justification`
      );
    }
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.EDITOR))),
      [],
      'no door lights for #/editor'
    );
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.AMBIENT))),
      [],
      'no door lights for #/ambient'
    );
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.SEARCH))),
      [],
      'no door lights for #/search'
    );
  });
});
