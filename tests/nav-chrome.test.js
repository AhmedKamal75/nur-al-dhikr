import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderNav,
  quranModeSwitchHTML,
  prayerModeSwitchHTML,
  practiseModeSwitchHTML,
  youModeSwitchHTML,
} from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/**
 * REORG Phase 2 locks (supersedes the ORG-02 two-doors ruling): one book,
 * one door. The classic reader no longer competes for a chrome slot —
 * #/quran stays a real route and lights the mushaf door, while the
 * in-chrome List/Word switch carries the hop. ROOTS keeps its Phase 1
 * door as the Qur'an depth.
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
  test('rail and drawer expose the mushaf door once each; no competing reader entry', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'mushaf entry present');
    const quranHits = html.split(`data-view="${VIEWS.QURAN}"`).length - 1;
    assert.equal(quranHits, 0, `reader must not compete in the chrome (saw ${quranHits})`);
    const rootsHits = html.split(`data-view="${VIEWS.ROOTS}"`).length - 1;
    assert.ok(rootsHits >= 2, `roots depth keeps its door in rail and drawer (saw ${rootsHits})`);
  });

  test('active states merged: #/quran deep link lights the mushaf door; roots keeps its own', () => {
    // Each destination lights in rail + drawer + mobile bar, so dedupe:
    // exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.MUSHAF))), [VIEWS.MUSHAF]);
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.QURAN))),
      [VIEWS.MUSHAF],
      'a deep link into #/quran lights the Qur’an door, not a second entry'
    );
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.ROOTS))), [VIEWS.ROOTS]);
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
 * REORG Phase 4 locks: one Prayer door. Times + qibla + Hijri calendar
 * live in one section; the calendar is a tab, not a peer door. #/qibla
 * and #/calendar stay real routes and light the prayer door, while the
 * in-chrome Times/Qibla/Calendar switch carries the hop. RAMADAN keeps
 * its own door. Arrangement only — no capability change.
 */
describe('Phase 4 chrome: one Prayer door', () => {
  test('rail and drawer expose the prayer door once each; no competing qibla/calendar entry', () => {
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
    assert.ok(
      ramadanHits >= 2,
      `ramadan keeps its own door in rail and drawer (saw ${ramadanHits})`
    );
  });

  test('active states merged: #/qibla and #/calendar deep links light the prayer door', () => {
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
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.RAMADAN))), [VIEWS.RAMADAN]);
  });

  test('in-chrome switch links times, qibla and calendar with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = prayerModeSwitchHTML(VIEWS.PRAYER, lang);
      assert.ok(
        html.includes(`data-view="${VIEWS.PRAYER}"`) &&
          html.includes(`data-view="${VIEWS.QIBLA}"`) &&
          html.includes(`data-view="${VIEWS.CALENDAR}"`),
        `switch carries all three modes (${lang})`
      );
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="prayer-'),
        `switch reuses navigate only (${lang})`
      );
    }
    // The active segment follows the route — exactly one claims each view.
    for (const view of [VIEWS.PRAYER, VIEWS.QIBLA, VIEWS.CALENDAR]) {
      const html = prayerModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
  });

  test('Prayer chrome copy is bilingual: the three reused nav labels', () => {
    for (const key of ['nav.prayer', 'nav.qibla', 'nav.calendar']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });
});

/**
 * REORG Phase 5 locks: one Practise section. Tasbih, the Tajweed course,
 * the 99 Names quiz and look-alike ayat live in one section behind a
 * single nav.tasbih door; the course's Phase 1 read-group door was
 * temporary and is re-homed here. #/tajweed-course, #/quiz and
 * #/mutashabihat stay real routes and light the tasbih door, while the
 * in-chrome Tasbih/Course/Quiz/Look-alike switch (the §2.4 stage rail)
 * carries the hop. Arrangement only — the course progress model, every
 * handler and every data file are untouched, and the rail carries no
 * ranking or shame copy (adab).
 */
describe('Phase 5 chrome: one Practise section', () => {
  test('rail and drawer expose the tasbih door; course/quiz/look-alikes do not compete', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.TASBIH}"`), 'tasbih entry present');
    for (const view of [VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      const hits = html.split(`data-view="${view}"`).length - 1;
      assert.equal(hits, 0, `#/${view} must not compete in the chrome (saw ${hits})`);
    }
    const tasbihHits = html.split(`data-view="${VIEWS.TASBIH}"`).length - 1;
    assert.ok(tasbihHits >= 2, `tasbih keeps its door in rail and drawer (saw ${tasbihHits})`);
  });

  test('active states merged: course/quiz/look-alike deep links light the tasbih door', () => {
    // Each destination lights in rail + drawer (+ mobile bar where listed),
    // so dedupe: exactly one DISTINCT active destination per view.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.TASBIH))), [VIEWS.TASBIH]);
    for (const view of [VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.TASBIH],
        `a deep link into #/${view} lights the Tasbih door, not a second entry`
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

  test('Practise chrome copy is bilingual: reused labels plus the section name', () => {
    for (const key of [
      'nav.tasbih',
      'nav.tajweedCourse',
      'quiz.title',
      'mutashabihat.title',
      'practise.label',
    ]) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });
});

/**
 * REORG Phase 6 locks: one You section, and the naming pass. Garden,
 * Checklist, Statistics, Favorites, Journal, Certificate, Settings and
 * About collapse behind a single nav.you door (the checklist view — it
 * carries today, streaks and the section entry); the other seven stay
 * real routes and light the You door, while the in-chrome switch carries
 * the hop. 'Garden' and 'Checklist' retire as nav nouns (§2.6 rule 1:
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

  test('in-chrome switch links all eight section modes with no new actions', () => {
    const members = [
      VIEWS.CHECKLIST,
      VIEWS.GARDEN,
      VIEWS.FAVORITES,
      VIEWS.JOURNAL,
      VIEWS.STATISTICS,
      VIEWS.CERTIFICATE,
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

  test('You chrome copy is bilingual: door, renamed entries, reused labels', () => {
    for (const key of [
      'nav.you',
      'you.myAdhkar',
      'you.growth',
      'nav.favorites',
      'journal.title',
      'nav.statistics',
      'certificate.title',
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
