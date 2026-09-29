/**
 * tests/nav-reachability.test.js — REORGANISATION-PLAN.md Phase 0.
 *
 * INSTRUMENT BEFORE MOVING. This file is TEST-ONLY: it parses (never edits)
 * js/ui/shell.js NAV_GROUPS, js/core/config/views.js VIEWS and the nav.*
 * labels in js/core/i18n/en.js + ar.js, then asserts every route is reachable
 * within 2 taps of a door from a machine-readable route→door map.
 *
 * It MUST FAIL today: 14 of 34 routes have no nav door (plan §1.5). The
 * failure output IS the orphan list. Later phases turn it green by adding
 * doors (Phase 1: TAJWEED_COURSE + ROOTS) or documented internal-only
 * decisions (Phase 7) — never by editing this trap to expect orphans.
 *
 * Renderer budget note (task brief): plan §6 says "22/22" but the enforced
 * gate is 19/19 (tests/startup-budget.test.js:48, MAX_STATIC_VIEW_IMPORTS).
 * Nothing here touches the renderer.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { VIEWS } from '../js/core/config.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* Source parsing (static — the chrome as shipped, not a copy of it)   */
/* ------------------------------------------------------------------ */

/** Slice a top-level `[...]` block starting at `marker` (bracket-balanced). */
function extractArrayBlock(src, marker) {
  const at = src.indexOf(marker);
  assert.ok(at >= 0, `marker not found: ${marker}`);
  const open = src.indexOf('[', at);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth += 1;
    else if (src[i] === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced block at marker: ${marker}`);
}

const ENTRY_RE =
  /\{\s*view:\s*VIEWS\.(\w+)\s*,\s*icon:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'(?:\s*,\s*action:\s*'([^']+)')?\s*\}/g;
const GROUP_RE = /label:\s*'(nav\.group\.\w+)'/g;

function parseNavGroups(src) {
  const block = extractArrayBlock(src, 'const NAV_GROUPS =');
  const groups = [...block.matchAll(GROUP_RE)];
  const entries = [...block.matchAll(ENTRY_RE)].map((m) => {
    const groupIdx = groups.reduce((acc, g, i) => (g.index < m.index ? i : acc), 0);
    return {
      viewKey: m[1],
      view: VIEWS[m[1]],
      icon: m[2],
      labelKey: m[3],
      action: m[4] || null,
      group: groups[groupIdx]?.[1] || null,
    };
  });
  return { block, groups: groups.map((g) => g[1]), entries };
}

const shellSrc = read('js/ui/shell.js');
const { groups: NAV_GROUP_LABELS, entries: NAV_ENTRIES } = parseNavGroups(shellSrc);
const kidsBlock = extractArrayBlock(shellSrc, 'const KIDS_NAV_ITEMS =');
const KIDS_ENTRIES = [...kidsBlock.matchAll(ENTRY_RE)].map((m) => ({
  viewKey: m[1],
  view: VIEWS[m[1]],
  labelKey: m[3],
  scope: 'kids',
}));

const DOOR_KEYS = new Set(NAV_ENTRIES.map((e) => e.viewKey));
const KIDS_DOOR_KEYS = new Set(KIDS_ENTRIES.map((e) => e.viewKey));

/* ------------------------------------------------------------------ */
/* Machine-readable route→door map                                     */
/* ------------------------------------------------------------------ */

/**
 * INTERNAL_JUSTIFICATIONS — plan §1.5 + §4 Phase 7 claims for the doorless
 * routes. A justification is NOT a door: Phase 0 stays strict (every entry
 * below still fails the reachability assertion until a real door lands or
 * Phase 7 records the internal-only decision). `needsDoor: true` marks the
 * two flagships §1.5 calls out as NOT legitimately deep.
 */
const INTERNAL_JUSTIFICATIONS = {
  CATEGORY:
    'plan §2.2/Phase 3: the adhkar browser grid IS home (0 taps) — CATEGORY follows from the HOME door in 1 tap via adhkar-browser; keeps its Library depth too.',
  MOOD: 'plan §1.3/§2.2/Phase 3: the 12 moods are a filter row above the home grid — same feature, front door, 1 tap via adhkar-browser.',
  FOCUS: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  COLLECTIONS: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  COLLECTION: 'plan §1.5: follows from COLLECTIONS — Phase 7 door-or-justify.',
  QUIZ: 'plan §2.1/§2.4/Phase 5: Practise-section member — door via the TASBIH entry + in-chrome switch.',
  AUDIO: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  ROOTS:
    'plan §1.5 FLAGSHIP (needsDoor): the root index behind per-word study — Phase 1 gives it a door under Qur’an; NOT internal.',
  EDITOR: 'plan §1.5: a tool invoked from content surfaces — internal-only candidate (Phase 7).',
  MUTASHABIHAT:
    'plan §2.1/§2.4/Phase 5: Practise-section member — door via the TASBIH entry + in-chrome switch.',
  JOURNAL: 'plan §2.1/Phase 6: You-section member.',
  CERTIFICATE: 'plan §2.2/Phase 6: re-homed out of the daily grid; You-section member.',
  AMBIENT: 'plan Phase 7 list: nightstand display — a door, or documented internal-only.',
  TAJWEED_COURSE:
    'plan §1.5 FLAGSHIP (needsDoor): the entire G-2 course, reachable only by URL/search — Phase 1 gives it a real door (temporary read-group home); Phase 5 re-homes it into the Practise section via the TASBIH entry + in-chrome switch; NOT internal.',
};

/** Every VIEWS route → its door (1 tap) or null (orphan today). */
const ROUTE_DOOR_MAP = Object.fromEntries(
  Object.entries(VIEWS).map(([routeKey, routeValue]) => {
    const direct = NAV_ENTRIES.find((e) => e.viewKey === routeKey) || null;
    // (REORG Phase 2) merged Qur'an door: #/quran stays a real route and
    // resolves to the mushaf entry in 2 taps (door → in-chrome List/Word
    // switch). taps: 2 keeps the ≤2-taps assertion meaningful instead of
    // laundering the merge into a fake orphan.
    let door = direct;
    let taps = direct ? 1 : null;
    let via = null;
    if (!door && routeKey === 'QURAN') {
      const mushaf = NAV_ENTRIES.find((e) => e.viewKey === 'MUSHAF');
      if (mushaf) {
        door = mushaf;
        taps = 2;
        via = 'quran-mode-switch';
      }
    }
    // (REORG Phase 4) merged Prayer door: #/qibla and #/calendar stay
    // real routes and resolve to the prayer entry in 2 taps (door →
    // in-chrome Times/Qibla/Calendar switch). taps: 2 keeps the ≤2-taps
    // assertion meaningful instead of laundering the merge into a fake
    // orphan. RAMADAN keeps its own door, so it never aliases here.
    if (!door && (routeKey === 'QIBLA' || routeKey === 'CALENDAR')) {
      const prayer = NAV_ENTRIES.find((e) => e.viewKey === 'PRAYER');
      if (prayer) {
        door = prayer;
        taps = 2;
        via = 'prayer-mode-switch';
      }
    }
    // (REORG Phase 5) one Practise section: #/quiz, #/mutashabihat and
    // #/tajweed-course stay real routes and resolve to the tasbih entry
    // in 2 taps (door → in-chrome Tasbih/Course/Quiz/Look-alike switch).
    // taps: 2 keeps the ≤2-taps assertion meaningful instead of laundering
    // the merge into a fake orphan. TASBIH keeps its own door as the entry.
    if (
      !door &&
      (routeKey === 'QUIZ' || routeKey === 'MUTASHABIHAT' || routeKey === 'TAJWEED_COURSE')
    ) {
      const tasbih = NAV_ENTRIES.find((e) => e.viewKey === 'TASBIH');
      if (tasbih) {
        door = tasbih;
        taps = 2;
        via = 'practise-mode-switch';
      }
    }
    // (REORG Phase 3) Home IS the adhkar browser: the category grid (0
    // taps — it is home) and the 12-mood filter row above it put CATEGORY
    // and MOOD one tap from the HOME door. Both keep their Library depth
    // too; the map records the front door.
    if (!door && (routeKey === 'CATEGORY' || routeKey === 'MOOD')) {
      const home = NAV_ENTRIES.find((e) => e.viewKey === 'HOME');
      if (home) {
        door = home;
        taps = 1;
        via = 'adhkar-browser';
      }
    }
    const kidsDoor = !door && KIDS_DOOR_KEYS.has(routeKey);
    return [
      routeKey,
      {
        route: routeValue,
        door: door
          ? {
              view: door.view,
              group: door.group,
              labelKey: door.labelKey,
              taps,
              ...(via ? { via } : {}),
            }
          : kidsDoor
            ? { view: routeValue, group: null, labelKey: null, scope: 'kids', taps: 1 }
            : null,
        taps: door || kidsDoor ? taps || 1 : null,
        internalJustification: INTERNAL_JUSTIFICATIONS[routeKey] || null,
      },
    ];
  })
);

const ORPHANS = Object.entries(ROUTE_DOOR_MAP)
  .filter(([, m]) => m.door === null)
  .map(([k]) => k);

/* ------------------------------------------------------------------ */
/* Nav census (output + mismatch trap)                                 */
/* ------------------------------------------------------------------ */

function buildCensus() {
  return NAV_ENTRIES.map((e) => ({
    group: e.group,
    viewKey: e.viewKey,
    destination: `#/${e.view}`,
    labelKey: e.labelKey,
    en: en[e.labelKey] ?? null,
    ar: ar[e.labelKey] ?? null,
    action: e.action || (e.viewKey === 'SEARCH' ? 'navigate*' : 'navigate'),
    primaryBehaviour: e.action || 'navigate',
  }));
}

/** Entries whose primary tap behaviour is not "go to the labelled view". */
function findLabelDestinationMismatches() {
  return NAV_ENTRIES.filter(
    (e) => e.action && e.action !== 'navigate' && e.action !== 'nav-drawer-go'
  ).map((e) => ({
    viewKey: e.viewKey,
    labelKey: e.labelKey,
    en: en[e.labelKey],
    ar: ar[e.labelKey],
    action: e.action,
    href: `#/${e.view}`,
  }));
}

describe('Phase 0 census: nav entries, labels, destinations', () => {
  test('census output (informational — prints the chrome as shipped)', () => {
    const census = buildCensus();
    console.log(
      [
        'NAV CENSUS',
        `groups (${NAV_GROUP_LABELS.length}): ${NAV_GROUP_LABELS.join(', ')}`,
        `entries (${census.length}; plan §1.1 says "17" but 6+5+5+3 = 19 — the plan text undercounts; the tree had 19 at Phase 0, then −1 Phase 2 reader, −2 Phase 4 qibla/calendar, −1 Phase 5 course = 17)`,
        `routes (VIEWS): ${Object.keys(VIEWS).length}`,
        ...census.map(
          (c) =>
            `  [${c.group}] ${c.viewKey} -> ${c.destination} label=${c.labelKey} en=${JSON.stringify(c.en)} ar=${JSON.stringify(c.ar)} behaviour=${c.primaryBehaviour}`
        ),
        `kids-scope doors: ${KIDS_ENTRIES.map((e) => e.viewKey).join(', ')}`,
        `orphans (${ORPHANS.length}): ${ORPHANS.join(' ')}`,
        `i18n nav.* entry-labels with no nav entry (orphan-route labels): ${Object.keys(en)
          .filter(
            (k) =>
              k.startsWith('nav.') &&
              !k.startsWith('nav.group.') &&
              !['nav.back', 'nav.more'].includes(k) &&
              !census.some((c) => c.labelKey === k)
          )
          .join(
            ', '
          )} (other nav.* keys — nav.group.*, nav.back, nav.more — are chrome, not entries)`,
      ].join('\n')
    );
    assert.ok(census.length > 0, 'census parsed zero entries — parser broke');
  });

  test('every nav labelKey exists in BOTH languages (naming rule §2.6: bilingual from the first commit)', () => {
    const missing = NAV_ENTRIES.filter((e) => !(en[e.labelKey] && ar[e.labelKey])).map(
      (e) => `${e.viewKey}:${e.labelKey}`
    );
    assert.deepEqual(missing, [], `nav labels missing in en or ar: ${missing.join(', ')}`);
  });

  test('FAIL (Phase 0 §1.6): label-vs-destination mismatches — SEARCH says Search, opens the command palette', () => {
    const mismatches = findLabelDestinationMismatches();
    assert.deepEqual(
      mismatches,
      [],
      `label lies about behaviour (plan §1.6, naming rule §2.6.2): ${JSON.stringify(mismatches, null, 2)}`
    );
  });
});

describe('Phase 1 pin: the flagships have a front door', () => {
  test('TAJWEED_COURSE re-homed to the Practise section in Phase 5 (its read-group door was temporary)', () => {
    const door = ROUTE_DOOR_MAP.TAJWEED_COURSE.door;
    assert.ok(door, 'TAJWEED_COURSE lost its door in the re-homing');
    assert.equal(door.taps, 2, 'door → in-chrome Tasbih/Course/Quiz/Look-alike switch');
    assert.equal(door.group, 'nav.group.tools');
    assert.equal(door.labelKey, 'nav.tasbih');
    assert.equal(door.via, 'practise-mode-switch');
  });

  test('ROOTS sits beside the Qur’an doors as their depth (until Phase 2 merges them)', () => {
    const door = ROUTE_DOOR_MAP.ROOTS.door;
    assert.ok(door, 'ROOTS still has no nav door');
    assert.equal(door.taps, 1);
    assert.equal(door.group, 'nav.group.read');
    assert.equal(door.labelKey, 'nav.roots');
  });

  test('Phase 1 closed exactly the two flagship orphans (14 → 12, then 10 after Phase 3, then 8 after Phase 5)', () => {
    assert.ok(!ORPHANS.includes('TAJWEED_COURSE'), 'TAJWEED_COURSE is still orphaned');
    assert.ok(!ORPHANS.includes('ROOTS'), 'ROOTS is still orphaned');
    assert.equal(ORPHANS.length, 8, `expected the 8 remaining orphans, got ${ORPHANS.length}`);
  });
});

describe('Phase 2 pin: one Qur’an door, both routes alive', () => {
  test('single nav.quran entry opens the mushaf; no competing reader entry', () => {
    const bookDoors = NAV_ENTRIES.filter((e) => e.viewKey === 'MUSHAF' || e.viewKey === 'QURAN');
    assert.deepEqual(
      bookDoors.map((e) => e.viewKey),
      ['MUSHAF'],
      'the reader must not compete for a chrome slot'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'MUSHAF').labelKey,
      'nav.quran',
      'the one door keeps the nav.quran label'
    );
  });

  test('#/quran stays a real route resolving to the Qur’an door in 2 taps', () => {
    const m = ROUTE_DOOR_MAP.QURAN;
    assert.ok(m.door, '#/quran lost its door — the merge must not orphan the route');
    assert.equal(m.door.group, 'nav.group.read');
    assert.equal(m.door.labelKey, 'nav.quran');
    assert.equal(m.taps, 2, 'door → in-chrome List/Word switch');
    assert.equal(m.door.via, 'quran-mode-switch');
    assert.ok(!ORPHANS.includes('QURAN'), '#/quran must not appear in the orphan list');
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
    for (const key of ['quran.modeList', 'quran.modeWord']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
    }
  });

  test('the merge adds no orphan: 8 remain for Phases 6–7 (10 until Phase 5)', () => {
    assert.equal(ORPHANS.length, 8, `expected the 8 remaining orphans, got ${ORPHANS.length}`);
  });
});

describe('Phase 3 pin: the Adhkar front page is home', () => {
  test('CATEGORY follows from the HOME door in 1 tap (the grid is home)', () => {
    const m = ROUTE_DOOR_MAP.CATEGORY;
    assert.ok(m.door, 'CATEGORY lost its door — the home grid must carry every section');
    assert.equal(m.door.group, 'nav.group.read');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 1, 'home tile → section');
    assert.equal(m.door.via, 'adhkar-browser');
    assert.ok(!ORPHANS.includes('CATEGORY'), 'CATEGORY must not appear in the orphan list');
  });

  test('MOOD rides the home filter row in 1 tap (same feature, front door)', () => {
    const m = ROUTE_DOOR_MAP.MOOD;
    assert.ok(m.door, 'MOOD lost its door — the 12 moods are a filter row above the home grid');
    assert.equal(m.door.group, 'nav.group.read');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 1, 'home filter chip → mood');
    assert.equal(m.door.via, 'adhkar-browser');
    assert.ok(!ORPHANS.includes('MOOD'), 'MOOD must not appear in the orphan list');
  });

  test('Phase 3 closes two more orphans (12 → 10, then 8 after Phase 5)', () => {
    assert.ok(!ORPHANS.includes('CATEGORY'), 'CATEGORY is still orphaned');
    assert.ok(!ORPHANS.includes('MOOD'), 'MOOD is still orphaned');
    assert.equal(ORPHANS.length, 8, `expected the 8 Phases-6–7 orphans, got ${ORPHANS.length}`);
  });
});

describe('Phase 4 pin: one Prayer door, three routes alive', () => {
  test('single nav.prayer entry; qibla and calendar no longer compete for a chrome slot', () => {
    const prayerDoors = NAV_ENTRIES.filter((e) =>
      ['PRAYER', 'QIBLA', 'CALENDAR'].includes(e.viewKey)
    );
    assert.deepEqual(
      prayerDoors.map((e) => e.viewKey),
      ['PRAYER'],
      'qibla and the calendar must not compete for a chrome slot'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'PRAYER').labelKey,
      'nav.prayer',
      'the one door keeps the nav.prayer label'
    );
  });

  test('#/qibla and #/calendar stay real routes resolving to the Prayer door in 2 taps', () => {
    for (const key of ['QIBLA', 'CALENDAR']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the merge must not orphan the route`);
      assert.equal(m.door.group, 'nav.group.worship');
      assert.equal(m.door.labelKey, 'nav.prayer');
      assert.equal(m.taps, 2, 'door → in-chrome Times/Qibla/Calendar switch');
      assert.equal(m.door.via, 'prayer-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('switch labels reuse the bilingual nav entries (naming rule §2.6)', () => {
    for (const key of ['nav.prayer', 'nav.qibla', 'nav.calendar']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('the merge adds no orphan: 8 remain for Phases 6–7 (10 until Phase 5)', () => {
    assert.equal(ORPHANS.length, 8, `expected the 8 remaining orphans, got ${ORPHANS.length}`);
  });
});

describe('Phase 5 pin: one Practise section, four routes alive', () => {
  test('single tasbih entry; the course no longer competes for a chrome slot', () => {
    const practiseDoors = NAV_ENTRIES.filter((e) =>
      ['TASBIH', 'TAJWEED_COURSE', 'QUIZ', 'MUTASHABIHAT'].includes(e.viewKey)
    );
    assert.deepEqual(
      practiseDoors.map((e) => e.viewKey),
      ['TASBIH'],
      'the course, quiz and look-alikes must not compete for a chrome slot'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'TASBIH').labelKey,
      'nav.tasbih',
      'the one door keeps the nav.tasbih label'
    );
  });

  test('#/tajweed-course, #/quiz and #/mutashabihat stay real routes resolving to the Tasbih door in 2 taps', () => {
    for (const key of ['TAJWEED_COURSE', 'QUIZ', 'MUTASHABIHAT']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the section must not orphan the route`);
      assert.equal(m.door.group, 'nav.group.tools');
      assert.equal(m.door.labelKey, 'nav.tasbih');
      assert.equal(m.taps, 2, 'door → in-chrome Tasbih/Course/Quiz/Look-alike switch');
      assert.equal(m.door.via, 'practise-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
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

  test('the section closes two orphans: 8 remain for Phases 6–7', () => {
    assert.ok(!ORPHANS.includes('QUIZ'), 'QUIZ is still orphaned');
    assert.ok(!ORPHANS.includes('MUTASHABIHAT'), 'MUTASHABIHAT is still orphaned');
    assert.ok(!ORPHANS.includes('TAJWEED_COURSE'), 'TAJWEED_COURSE is still orphaned');
    assert.equal(ORPHANS.length, 8, `expected the 8 remaining orphans, got ${ORPHANS.length}`);
  });
});

describe('Phase 0 trap: every route reachable within 2 taps of a door', () => {
  test('FAIL (Phase 0): orphan routes with no nav door', () => {
    const detail = ORPHANS.map(
      (k) =>
        `${k} (internal-candidate: ${INTERNAL_JUSTIFICATIONS[k] || 'NO justification recorded — a finding per Phase 7'})`
    );
    assert.deepEqual(
      ORPHANS,
      [],
      `orphan routes reachable only by URL/search/palette — give each a door (Phases 1–6) or a documented internal-only decision (Phase 7):\n  ${detail.join('\n  ')}`
    );
  });

  test('route→door map covers all 34 VIEWS routes (no silent additions)', () => {
    assert.equal(
      Object.keys(ROUTE_DOOR_MAP).length,
      Object.keys(VIEWS).length,
      'map drifted from VIEWS — a route was added without updating the map'
    );
    const unjustified = ORPHANS.filter((k) => !INTERNAL_JUSTIFICATIONS[k]);
    assert.deepEqual(
      unjustified,
      [],
      `Phase 7 finding: routes with no door AND no justification: ${unjustified.join(', ')}`
    );
  });
});
