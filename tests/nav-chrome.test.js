import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderNav,
  azkarModeSwitchHTML,
  quranModeSwitchHTML,
  prayerModeSwitchHTML,
  practiseModeSwitchHTML,
  youModeSwitchHTML,
  drawerSectionsHTML,
  INTERNAL_ONLY_ROUTES,
} from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';
import { renderAudio } from '../js/views/audioManager.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

/**
 * IA-7 chrome: the Azkar section owns the browser. The LIBRARY route is the
 * section entry wearing nav.azkar; Home is a Today landing with no grid.
 * The in-chrome Azkar hop (browser vs Moods vs Focus vs Collections) rides
 * the existing `.segmented` styling with `navigate` only; tile-depth
 * members (CATEGORY, COLLECTION — their views need an id) resolve through
 * the browser tiles, never a direct hop.
 */
describe('IA-7 chrome: one Azkar section', () => {
  test('rail and drawer expose the Azkar door; the grid no longer renders on Home', async () => {
    const { renderHome } = await import('../js/views/home.js');
    const { renderLibrary } = await import('../js/views/library.js');
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes(`data-view="${VIEWS.LIBRARY}"`), 'azkar entry present');
    const homeHtml = renderHome(stateFor(VIEWS.HOME));
    assert.ok(!homeHtml.includes('home-browser'), 'Home carries no browser grid');
    assert.ok(!homeHtml.includes('category-tile'), 'Home carries no category tiles');
    assert.ok(homeHtml.includes('home-prayer-ribbon'), 'Home keeps the ribbon');
    assert.ok(homeHtml.includes('panel--resume'), 'Home keeps the resume rows');
    assert.ok(
      homeHtml.includes(`data-view="${VIEWS.TASBIH}"`),
      'Home keeps an explicit tasbih entry'
    );
    const libHtml = renderLibrary(stateFor(VIEWS.LIBRARY));
    assert.ok(libHtml.includes('azkar-mode-switch'), 'the Azkar section carries its switch');
    assert.ok(libHtml.includes(en['nav.azkar']), 'the Azkar section wears its name');
  });

  test('active states merged: Azkar depths light the Azkar door', () => {
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.LIBRARY))), [VIEWS.LIBRARY]);
    // Tile-depth members light the entry only (no direct drawer row)…
    for (const view of [VIEWS.CATEGORY, VIEWS.COLLECTION]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.LIBRARY],
        `a deep link into #/${view} lights the Azkar door, not a second entry`
      );
    }
    // …direct members light the entry AND their own drawer row.
    for (const view of [VIEWS.MOOD, VIEWS.FOCUS, VIEWS.COLLECTIONS]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.LIBRARY, view].sort(),
        `a deep link into #/${view} lights the Azkar entry plus its drawer row`
      );
    }
  });

  test('in-chrome Azkar hop links browser, moods, focus and collections with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = azkarModeSwitchHTML(VIEWS.LIBRARY, lang);
      for (const view of [VIEWS.LIBRARY, VIEWS.MOOD, VIEWS.FOCUS, VIEWS.COLLECTIONS]) {
        assert.ok(html.includes(`data-view="${view}"`), `switch carries #/${view} (${lang})`);
      }
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="azkar-'),
        `switch reuses navigate only (${lang})`
      );
      for (const word of ['streak', 'rank', 'leader', 'shame', 'score', 'best']) {
        assert.ok(
          !html.toLowerCase().includes(word),
          `switch carries no gamification copy (${word}, ${lang})`
        );
      }
    }
    for (const view of [VIEWS.LIBRARY, VIEWS.MOOD, VIEWS.FOCUS, VIEWS.COLLECTIONS]) {
      const html = azkarModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
    }
    // Tile-depth views carry no segment: the browser tiles own them.
    for (const view of [VIEWS.CATEGORY, VIEWS.COLLECTION]) {
      assert.ok(
        !azkarModeSwitchHTML(view, 'en').includes('segmented__btn--active'),
        `no segment claims #/${view} — tile-depth resolves through the browser`
      );
    }
  });

  test('Azkar chrome copy is bilingual: section door plus the hop labels', () => {
    for (const key of ['nav.azkar', 'title.mood', 'title.focus', 'title.collections']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
    assert.equal(en['nav.azkar'], 'Azkar');
    assert.equal(ar['nav.azkar'], 'الأذكار');
  });
});

/**
 * IA-7 chrome: the hierarchical drawer (the mobile More-sheet). One block
 * per section from the map, each with its entry plus subsection rows for
 * direct members only — tile-depth members (direct:false) resolve through
 * the section landing, exactly as the map documents.
 */
describe('IA-7 chrome: hierarchical drawer derives from the map', () => {
  test('drawer carries seven section blocks in map order', () => {
    for (const lang of ['en', 'ar']) {
      const html = drawerSectionsHTML(VIEWS.HOME, lang);
      const sections = [...html.matchAll(/data-section="(\w+)"/g)].map((m) => m[1]);
      assert.deepEqual(sections, [
        'HOME',
        'LIBRARY',
        'MUSHAF',
        'HADITH',
        'PRAYER',
        'TASBIH',
        'CHECKLIST',
      ]);
    }
  });

  test('drawer subsection rows link every direct member; tile-depth stays landing-bound', () => {
    const html = drawerSectionsHTML(VIEWS.HOME, 'en');
    // Direct members present as rows…
    for (const view of [
      VIEWS.MOOD,
      VIEWS.FOCUS,
      VIEWS.COLLECTIONS,
      VIEWS.QURAN,
      VIEWS.ROOTS,
      VIEWS.AUDIO,
      VIEWS.TAJWEED_COURSE,
      VIEWS.MUTASHABIHAT,
      VIEWS.QIBLA,
      VIEWS.CALENDAR,
      VIEWS.RAMADAN,
      VIEWS.QUIZ,
    ]) {
      assert.ok(html.includes(`data-view="${view}"`), `drawer rows carry #/${view}`);
    }
    // …tile-depth members offer no direct row (their views 404 bare)…
    assert.equal(
      html.split(`data-view="${VIEWS.CATEGORY}"`).length - 1,
      0,
      'no direct drawer row into bare #/category'
    );
    assert.equal(
      html.split(`data-view="${VIEWS.COLLECTION}"`).length - 1,
      0,
      'no direct drawer row into bare #/collection'
    );
    // …and every row reuses the drawer action only.
    assert.ok(!html.includes('data-action="navigate"'), 'drawer rows go through nav-drawer-go');
    assert.ok(html.includes('data-action="nav-drawer-go"'), 'drawer rows close the drawer');
  });

  test('drawer active states follow the section: member deep links light entry + row', () => {
    const html = drawerSectionsHTML(VIEWS.QURAN, 'en');
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'the Qur’an entry renders');
    const selected = [...html.matchAll(/data-view="([^"]+)"[^>]*aria-current="page"/g)].map(
      (m) => m[1]
    );
    assert.ok(selected.includes(VIEWS.MUSHAF), 'the section entry lights for a member view');
    assert.ok(selected.includes(VIEWS.QURAN), 'the member row lights for its own view');
  });

  test('the drawer renders inside renderNav with all seven entries', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes('nav-drawer__body'), 'drawer body renders');
    for (const view of [
      VIEWS.HOME,
      VIEWS.LIBRARY,
      VIEWS.MUSHAF,
      VIEWS.HADITH,
      VIEWS.PRAYER,
      VIEWS.TASBIH,
      VIEWS.CHECKLIST,
    ]) {
      assert.ok(html.includes(`data-view="${view}"`), `drawer carries #/${view}`);
    }
  });
});

/**
 * REORG Phase 2 locks (supersedes the ORG-02 two-doors ruling) + IA-7: one
 * book, one door, six routes. The classic reader no longer competes for a
 * chrome slot — #/quran stays a real route and lights the mushaf door —
 * and the Tajweed course + look-alike ayat moved here from Practise, so
 * the in-chrome switch carries five modes. ROOTS stays absorbed (HANDOFF
 * A1): #/roots stays a real route and lights the mushaf door.
 */
const stateFor = (activeView) => ({ ...initialState(), activeView });

function activeViews(html) {
  const out = [];
  const re =
    /data-view="([^"]+)"[^>]*aria-current="page"|aria-current="page"[^>]*data-view="([^"]+)"/g;
  for (const m of html.matchAll(re)) out.push(m[1] || m[2]);
  return out;
}

/**
 * Rail-only HTML: the desktop scroller plus the mobile bar, cut before the
 * drawer. IA-7 keeps the rail flat (one tap per section) while the drawer
 * is hierarchical (entries + subsection rows) — so "must not compete"
 * pins read the rail, and drawer rows get their own positive pins.
 */
function railHTML(html) {
  return html.split('nav-drawer')[0];
}

describe('Phase 2 chrome: one Qur’an door', () => {
  test('rail exposes the mushaf door once; no competing reader or roots entry', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
    assert.ok(html.includes(`data-view="${VIEWS.MUSHAF}"`), 'mushaf entry present');
    const quranHits = html.split(`data-view="${VIEWS.QURAN}"`).length - 1;
    assert.equal(quranHits, 0, `reader must not compete in the rail (saw ${quranHits})`);
    const rootsHits = html.split(`data-view="${VIEWS.ROOTS}"`).length - 1;
    assert.equal(rootsHits, 0, `roots must not compete in the rail (saw ${rootsHits})`);
  });

  test('active states merged: member deep links light the entry plus their drawer row', () => {
    // The entry lights in rail + drawer + mobile bar while the member row
    // lights in the drawer, so dedupe: the entry plus the member itself.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.MUSHAF))), [VIEWS.MUSHAF]);
    for (const view of [
      VIEWS.QURAN,
      VIEWS.ROOTS,
      VIEWS.AUDIO,
      VIEWS.TAJWEED_COURSE,
      VIEWS.MUTASHABIHAT,
    ]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.MUSHAF, view].sort(),
        `a deep link into #/${view} lights the Qur’an entry plus its drawer row`
      );
    }
  });

  test('in-chrome switch links list, word, listening, course and look-alikes with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = quranModeSwitchHTML(VIEWS.QURAN, lang);
      for (const view of [
        VIEWS.QURAN,
        VIEWS.ROOTS,
        VIEWS.AUDIO,
        VIEWS.TAJWEED_COURSE,
        VIEWS.MUTASHABIHAT,
      ]) {
        assert.ok(html.includes(`data-view="${view}"`), `switch carries #/${view} (${lang})`);
      }
      assert.ok(
        html.includes('data-action="navigate"') && !html.includes('data-action="quran-'),
        `switch reuses navigate only (${lang})`
      );
    }
    // Active segment follows the route; on the mushaf neither is active.
    for (const view of [
      VIEWS.QURAN,
      VIEWS.ROOTS,
      VIEWS.AUDIO,
      VIEWS.TAJWEED_COURSE,
      VIEWS.MUTASHABIHAT,
    ]) {
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

  test('course and look-alike views render the Qur’an switch (moved from Practise)', async () => {
    const { renderMutashabihat } = await import('../js/views/mutashabihat.js');
    const html = renderMutashabihat({ ...initialState(), activeView: VIEWS.MUTASHABIHAT });
    assert.ok(html.includes('quran-mode-switch'), 'look-alikes carry the Qur’an switch');
    assert.ok(html.includes(`data-view="${VIEWS.TAJWEED_COURSE}"`), 'the switch links the course');
  });

  test('Qur’an chrome copy is bilingual: nav.quran plus the five switch labels', () => {
    assert.ok(en['nav.quran'] && ar['nav.quran']);
    assert.notEqual(en['nav.quran'], ar['nav.quran']);
    for (const key of [
      'quran.modeList',
      'quran.modeWord',
      'nav.audio',
      'nav.tajweedCourse',
      'mutashabihat.title',
    ]) {
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
  test('rail exposes the prayer door once; no competing qibla/calendar/ramadan entry', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
    assert.ok(html.includes(`data-view="${VIEWS.PRAYER}"`), 'prayer entry present');
    const qiblaHits = html.split(`data-view="${VIEWS.QIBLA}"`).length - 1;
    assert.equal(qiblaHits, 0, `qibla must not compete in the rail (saw ${qiblaHits})`);
    const calendarHits = html.split(`data-view="${VIEWS.CALENDAR}"`).length - 1;
    assert.equal(
      calendarHits,
      0,
      `the calendar must not compete in the rail (saw ${calendarHits})`
    );
    const ramadanHits = html.split(`data-view="${VIEWS.RAMADAN}"`).length - 1;
    assert.equal(ramadanHits, 0, `ramadan must not compete in the rail (saw ${ramadanHits})`);
  });

  test('active states merged: member deep links light the entry plus their drawer row', () => {
    // Each destination lights in rail + drawer entry (+ mobile bar where
    // listed) while the member row lights in the drawer, so dedupe to the
    // entry plus the member itself.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.PRAYER))), [VIEWS.PRAYER]);
    for (const view of [VIEWS.QIBLA, VIEWS.CALENDAR, VIEWS.RAMADAN]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.PRAYER, view].sort(),
        `a deep link into #/${view} lights the Prayer entry plus its drawer row`
      );
    }
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
 * REORG Phase 5 locks + IA-7 door label: one Practise section, two modes.
 * Tasbih and the 99 Names quiz live in one section behind the TASBIH entry
 * wearing the nav.practise door label; the Tajweed course and look-alike
 * ayat moved to the Qur’an section (IA-7). #/quiz stays a real route and
 * lights the Practise door, while the in-chrome Tasbih/Quiz switch carries
 * the hop. Arrangement only — the rail carries no ranking or shame copy.
 */
describe('Phase 5 chrome: one Practise section', () => {
  test('rail exposes the Practise door; the quiz does not compete', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
    assert.ok(html.includes(`data-view="${VIEWS.TASBIH}"`), 'practise entry present');
    for (const view of [VIEWS.TAJWEED_COURSE, VIEWS.QUIZ, VIEWS.MUTASHABIHAT]) {
      const hits = html.split(`data-view="${view}"`).length - 1;
      assert.equal(hits, 0, `#/${view} must not compete in the rail (saw ${hits})`);
    }
    const tasbihHits = html.split(`data-view="${VIEWS.TASBIH}"`).length - 1;
    assert.ok(tasbihHits >= 1, `practise keeps its door in the rail (saw ${tasbihHits})`);
    // The door promises the activity (nav.practise), not the counting tool.
    assert.ok(
      html.includes(`<span class="nav__label">${en['nav.practise']}</span>`),
      'door carries the nav.practise label'
    );
  });

  test('active states merged: the quiz deep link lights the entry plus its drawer row', () => {
    // The entry lights in rail + drawer (+ mobile bar where listed) while
    // the member row lights in the drawer: entry plus member itself.
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.TASBIH))), [VIEWS.TASBIH]);
    assert.deepEqual(
      distinct(renderNav(stateFor(VIEWS.QUIZ))),
      [VIEWS.QUIZ, VIEWS.TASBIH].sort(),
      'a deep link into #/quiz lights the Practise entry plus its drawer row'
    );
  });

  test('in-chrome switch links tasbih and quiz with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = practiseModeSwitchHTML(VIEWS.TASBIH, lang);
      for (const view of [VIEWS.TASBIH, VIEWS.QUIZ]) {
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
    for (const view of [VIEWS.TASBIH, VIEWS.QUIZ]) {
      const html = practiseModeSwitchHTML(view, 'en');
      const activeCount = html.split('segmented__btn--active').length - 1;
      assert.equal(activeCount, 1, `exactly one segment active on #/${view}`);
      assert.ok(html.includes(`data-view="${view}"`), `the #/${view} segment is the active one`);
    }
  });

  test('Practise chrome copy is bilingual: door label, entry segment, quiz, section name', () => {
    for (const key of ['nav.practise', 'nav.tasbih', 'quiz.title', 'practise.label']) {
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
  test('rail exposes the You door; section members do not compete', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
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
      assert.equal(hits, 0, `#/${view} must not compete in the rail (saw ${hits})`);
    }
    const youHits = html.split(`data-view="${VIEWS.CHECKLIST}"`).length - 1;
    assert.ok(youHits >= 1, `You keeps its door in the rail (saw ${youHits})`);
    // The door promises the person, not the old tracker noun.
    assert.ok(
      html.includes(`<span class="nav__label">${en['nav.you']}</span>`),
      'door carries the nav.you label'
    );
  });

  test('active states merged: section deep links light the entry plus their drawer row', () => {
    // The entry lights in rail + drawer (+ mobile bar where listed) while
    // the member row lights in the drawer: entry plus member itself.
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
        [VIEWS.CHECKLIST, view].sort(),
        `a deep link into #/${view} lights the You entry plus its drawer row`
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
 * IA-7 locks: seven sections, hierarchical drawer. FOCUS, MOOD and
 * COLLECTIONS resolve to the LIBRARY (Azkar) door with drawer rows;
 * CATEGORY and COLLECTION are tile-depth (entry lights, no row); AUDIO,
 * TAJWEED_COURSE and MUTASHABIHAT resolve to the MUSHAF (Qur'an) door;
 * QUIZ resolves to TASBIH (Practise); EDITOR, AMBIENT and SEARCH stay
 * doorless ON PURPOSE as documented internals (js/ui/shell.js
 * INTERNAL_ONLY_ROUTES). Arrangement only — no route, view, handler or
 * data change; renderer static budget stays 19/19; the switches reuse
 * navigate only; every segment keeps its 44px target; no gamification
 * copy; bilingual from the first commit.
 */
describe('IA-7 chrome: Azkar depths, Qur’an study, three documented internals', () => {
  test('no new rail entries: the rail exposes exactly the 7 IA-7 sections', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
    for (const view of [
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
      assert.equal(hits, 0, `#/${view} must not compete in the rail (saw ${hits})`);
    }
    for (const view of [
      VIEWS.HOME,
      VIEWS.LIBRARY,
      VIEWS.MUSHAF,
      VIEWS.HADITH,
      VIEWS.PRAYER,
      VIEWS.TASBIH,
      VIEWS.CHECKLIST,
    ]) {
      assert.ok(html.includes(`data-view="${view}"`), `section #/${view} present`);
    }
  });

  test('the seven sections wear the IA-7 labels in order', () => {
    const html = railHTML(renderNav(stateFor(VIEWS.HOME)));
    const labels = [...html.matchAll(/<span class="nav__label">([^<]+)<\/span>/g)].map((m) => m[1]);
    const railLabels = labels.slice(0, 7);
    assert.deepEqual(railLabels, [
      en['nav.home'],
      en['nav.azkar'],
      en['nav.quran'],
      en['nav.hadith'],
      en['nav.prayer'],
      en['nav.practise'],
      en['nav.you'],
    ]);
  });

  test('active states: Azkar depths light LIBRARY, study lights the Qur’an door', () => {
    const distinct = (html) => [...new Set(activeViews(html))].sort();
    // Tile-depth: entry only.
    for (const view of [VIEWS.CATEGORY, VIEWS.COLLECTION]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.LIBRARY],
        `a deep link into #/${view} lights the Azkar section, not a second entry`
      );
    }
    // Direct members: entry plus drawer row.
    for (const view of [VIEWS.FOCUS, VIEWS.COLLECTIONS, VIEWS.MOOD]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.LIBRARY, view].sort(),
        `a deep link into #/${view} lights the Azkar entry plus its drawer row`
      );
    }
    // Exactly one distinct door per route — LIBRARY resolves to itself.
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.CATEGORY))), [VIEWS.LIBRARY]);
    assert.deepEqual(distinct(renderNav(stateFor(VIEWS.LIBRARY))), [VIEWS.LIBRARY]);
    for (const view of [VIEWS.AUDIO, VIEWS.TAJWEED_COURSE, VIEWS.MUTASHABIHAT]) {
      assert.deepEqual(
        distinct(renderNav(stateFor(view))),
        [VIEWS.MUSHAF, view].sort(),
        `a deep link into #/${view} lights the Qur’an entry plus its drawer row`
      );
    }
  });

  test('Qur’an switch carries list, word, listening, course and look-alikes with no new actions', () => {
    for (const lang of ['en', 'ar']) {
      const html = quranModeSwitchHTML(VIEWS.AUDIO, lang);
      for (const view of [
        VIEWS.QURAN,
        VIEWS.ROOTS,
        VIEWS.AUDIO,
        VIEWS.TAJWEED_COURSE,
        VIEWS.MUTASHABIHAT,
      ]) {
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
    for (const view of [
      VIEWS.QURAN,
      VIEWS.ROOTS,
      VIEWS.AUDIO,
      VIEWS.TAJWEED_COURSE,
      VIEWS.MUTASHABIHAT,
    ]) {
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
    for (const key of [
      'nav.home',
      'nav.azkar',
      'nav.quran',
      'quran.modeList',
      'quran.modeWord',
      'nav.audio',
    ]) {
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
