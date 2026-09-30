/**
 * tests/nav-reachability.test.js — REORGANISATION-PLAN.md Phase 0 + Phase 8.
 *
 * INSTRUMENT BEFORE MOVING. This file is TEST-ONLY: it imports the real
 * route→door map (DOORS from js/core/config/nav.js — the single source of
 * truth per AGENTS.md rule 6) and asserts every route is reachable within
 * 2 taps of a door. The old static shell.js NAV_GROUPS parser is kept as a
 * DRIFT-CHECK: it verifies the chrome derives from the map instead of
 * pinning a parallel list.
 *
 * Phase 8 (HANDOFF PART A1): the chrome is flat with EXACTLY 6 doors —
 * HOME(nav.home) · MUSHAF(nav.quran) · HADITH(nav.hadith) · PRAYER(nav.prayer)
 * · TASBIH-entry labelled nav.practise · CHECKLIST-entry labelled nav.you —
 * and the test must fail if nav.library returns as a door.
 *
 * Renderer budget note: the enforced gate is 19/19
 * (tests/startup-budget.test.js:48, MAX_STATIC_VIEW_IMPORTS). Nothing here
 * touches the renderer.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { VIEWS } from '../js/core/config.js';
import { DOORS, DOOR_LABEL_KEYS } from '../js/core/config/nav.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* Drift-check: the static parse of nav.js must equal the live import  */
/* ------------------------------------------------------------------ */

const navSrc = read('js/core/config/nav.js');
const shellSrc = read('js/ui/shell.js');

function parseDoorsStatic(src) {
  const entryRe = /entry:\s*'(\w+)'/g;
  const labelRe = /labelKey:\s*'([^']+)'/g;
  const memberRe = /\{\s*route:\s*'(\w+)'\s*,\s*taps:\s*(\d+)\s*,\s*via:\s*(null|'([^']+)')\s*\}/g;
  const entries = [...src.matchAll(entryRe)];
  const labels = [...src.matchAll(labelRe)];
  const members = [...src.matchAll(memberRe)].map((m) => ({
    route: m[1],
    taps: Number(m[2]),
    via: m[4] ?? null,
    index: m.index,
  }));
  return { entries, labels, members };
}

const parsed = parseDoorsStatic(navSrc);

/** Kids-scope doors, parsed from the chrome (unchanged scope). */
const ENTRY_RE =
  /\{\s*view:\s*VIEWS\.(\w+)\s*,\s*icon:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'(?:\s*,\s*action:\s*'([^']+)')?\s*\}/g;
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
const kidsBlock = extractArrayBlock(shellSrc, 'const KIDS_NAV_ITEMS =');
const KIDS_ENTRIES = [...kidsBlock.matchAll(ENTRY_RE)].map((m) => ({
  viewKey: m[1],
  view: VIEWS[m[1]],
  labelKey: m[3],
  scope: 'kids',
}));
const KIDS_DOOR_KEYS = new Set(KIDS_ENTRIES.map((e) => e.viewKey));

/* ------------------------------------------------------------------ */
/* Machine-readable route→door map, built FROM the real DOORS import    */
/* ------------------------------------------------------------------ */

/**
 * INTERNAL_JUSTIFICATIONS — plan §1.5 + §4 Phase 7 + Phase 8 claims for
 * the doorless-by-design routes and every absorbed member. A justification
 * is NOT a door: doorless routes fail the reachability assertion unless
 * they carry a documented internal-only decision (Phase 7) or resolve
 * through a door's in-chrome switch (Phases 2–6, 8).
 */
const INTERNAL_JUSTIFICATIONS = {
  CATEGORY:
    'plan §2.2/Phase 3: the adhkar browser grid IS home (0 taps) — CATEGORY follows from the HOME door in 1 tap via adhkar-browser; keeps its Library depth too.',
  MOOD: 'plan §1.3/§2.2/Phase 3: the 12 moods are a filter row above the home grid — same feature, front door, 1 tap via adhkar-browser.',
  FOCUS:
    'plan §4 Phase 7: Adhkar depth — the immersive one-item recitation stage behind every card’s Open-focus; door via the HOME entry in 2 taps (door → category tile → card Open-focus, no interstitial), deep links keep working.',
  COLLECTIONS:
    'plan §4 Phase 7: Adhkar depth — the user’s adhkar sets; door via the HOME entry in 1 tap (home collections panel → collections), deep links keep working.',
  COLLECTION:
    'plan §1.5/§4 Phase 7: follows from COLLECTIONS — door via the HOME entry in 2 taps (door → collections panel → collection tile), deep links keep working.',
  LIBRARY:
    'HANDOFF A1 / REORG Phase 8: the grid is home, so Library was a second door to the tiles already on screen — retired as a door. #/library stays a real route behind the grid’s all-view and resolves to the HOME door in 2 taps via home-all-view; deep links keep working.',
  QUIZ: 'plan §2.1/§2.4/Phase 5: Practise-section member — door via the TASBIH entry (labelled nav.practise) + in-chrome switch.',
  AUDIO:
    'plan §4 Phase 7: Qur’an listening — the reciter/voice picker + offline downloads is the book’s listening depth; door via the MUSHAF entry in 2 taps (door → in-chrome List/Word/Audio switch), deep links keep working.',
  ROOTS:
    'HANDOFF A1 / REORG Phase 8: the root index behind per-word study is the DEPTH of the Qur’an door — absorbed into the MUSHAF door in 2 taps via quran-mode-switch; #/roots stays a real route, deep links keep working.',
  SEARCH:
    'HANDOFF A1 / REORG Phase 8 DOORLESS-BY-DESIGN (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): the search view lives one tap away on the topbar palette (palette.open), which names itself as a quick launcher — a nav door would promise a place for what is a launcher action, and the §1.6 label-lies trap stays closed because no chrome entry says Search anymore. Deep link #/search keeps working; claims no chrome slot.',
  EDITOR:
    'plan §1.5/§4 Phase 7 INTERNAL-ONLY (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): a tool invoked from content surfaces (library sheet, category manage, card menu), never browsed to — a nav door would promise a place for what is an action on a place. Deep link #/editor keeps working; claims no chrome slot.',
  MUTASHABIHAT:
    'plan §2.1/§2.4/Phase 5: Practise-section member — door via the TASBIH entry (labelled nav.practise) + in-chrome switch.',
  JOURNAL:
    'plan §2.1/Phase 6: You-section member — door via the You (checklist) entry + in-chrome switch.',
  CERTIFICATE:
    'plan §2.2/Phase 6: re-homed out of the daily grid; You-section member — door via the You (checklist) entry + in-chrome switch.',
  AMBIENT:
    'plan §4 Phase 7 INTERNAL-ONLY (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): chrome-free nightstand kiosk entered from the Prayer sheet, exited to #/prayer — a nav door would promise chrome the route removes by design (body.is-ambient). Deep link #/ambient keeps working; claims no chrome slot.',
  TAJWEED_COURSE:
    'plan §1.5/§2.4/Phase 5 + Phase 8: the G-2 flagship lives in the Practise section — door via the TASBIH entry (labelled nav.practise) in 2 taps via practise-mode-switch; NOT internal.',
  RAMADAN:
    'HANDOFF A1 / REORG Phase 8: the Ramadan companion is Prayer depth — absorbed into the PRAYER door in 2 taps via the 4-segment prayer-mode-switch; #/ramadan stays a real route, deep links keep working.',
  ZAKAT:
    'HANDOFF A1 / REORG Phase 8: You-section member beside settings, where storage belongs — door via the You (checklist) entry in 2 taps via the 10-segment you-mode-switch; #/zakat stays a real route, deep links keep working.',
  OFFLINE:
    'HANDOFF A1 / REORG Phase 8: You-section member beside settings, where storage belongs — door via the You (checklist) entry in 2 taps via the 10-segment you-mode-switch; #/offline stays a real route, deep links keep working.',
};

/**
 * (REORG Phase 7 + Phase 8) routes that stay doorless ON PURPOSE. A route
 * with no door and no entry here is a finding; a route with no door and an
 * entry here is a documented internal-only decision (plan §4 Phase 7). The
 * trap below asserts ZERO unjustified orphans — the three entries here are
 * the only doorless routes allowed to remain.
 */
const INTERNAL_ONLY = new Set(['EDITOR', 'AMBIENT', 'SEARCH']);

/** Every VIEWS route → its door from the real DOORS map (1–2 taps) or null. */
const ROUTE_DOOR_MAP = Object.fromEntries(
  Object.entries(VIEWS).map(([routeKey, routeValue]) => {
    let hit = null;
    for (const d of DOORS) {
      const m = d.members.find((x) => x.route === routeKey);
      if (m) {
        hit = { door: d, member: m };
        break;
      }
    }
    const kidsDoor = !hit && KIDS_DOOR_KEYS.has(routeKey);
    return [
      routeKey,
      {
        route: routeValue,
        door: hit
          ? {
              view: hit.door.view,
              entry: hit.door.entry,
              labelKey: hit.door.labelKey,
              taps: hit.member.taps,
              ...(hit.member.via ? { via: hit.member.via } : {}),
            }
          : kidsDoor
            ? { view: routeValue, entry: routeKey, labelKey: null, scope: 'kids', taps: 1 }
            : null,
        taps: hit ? hit.member.taps : kidsDoor ? 1 : null,
        internalJustification: INTERNAL_JUSTIFICATIONS[routeKey] || null,
      },
    ];
  })
);

const ORPHANS = Object.entries(ROUTE_DOOR_MAP)
  .filter(([, m]) => m.door === null)
  .map(([k]) => k);

/**
 * UNJUSTIFIED_ORPHANS is the finding list: doorless AND with no documented
 * internal-only decision. The trap below asserts this is empty.
 */
const UNJUSTIFIED_ORPHANS = ORPHANS.filter(
  (k) => !INTERNAL_ONLY.has(k) || !INTERNAL_JUSTIFICATIONS[k]
);

/* The flat chrome as derived: six entries in DOORS order. */
const NAV_ENTRIES = DOORS.map((d) => ({
  viewKey: d.entry,
  view: d.view,
  icon: d.icon,
  labelKey: d.labelKey,
}));

/* ------------------------------------------------------------------ */
/* Nav census (output + mismatch trap)                                 */
/* ------------------------------------------------------------------ */

function buildCensus() {
  return NAV_ENTRIES.map((e) => ({
    viewKey: e.viewKey,
    destination: `#/${e.view}`,
    labelKey: e.labelKey,
    en: en[e.labelKey] ?? null,
    ar: ar[e.labelKey] ?? null,
    action: 'navigate',
    primaryBehaviour: 'navigate',
  }));
}

describe('Phase 0 census: nav entries, labels, destinations', () => {
  test('census output (informational — prints the chrome as shipped)', () => {
    const census = buildCensus();
    console.log(
      [
        'NAV CENSUS',
        `entries (${census.length}; Phase 8/A1: flat six doors — Home · Qur’an · Ahadeeth · Prayer · Practise · You)`,
        `routes (VIEWS): ${Object.keys(VIEWS).length}`,
        ...census.map(
          (c) =>
            `  ${c.viewKey} -> ${c.destination} label=${c.labelKey} en=${JSON.stringify(c.en)} ar=${JSON.stringify(c.ar)} behaviour=${c.primaryBehaviour}`
        ),
        `kids-scope doors: ${KIDS_ENTRIES.map((e) => e.viewKey).join(', ')}`,
        `orphans (${ORPHANS.length}): ${ORPHANS.join(' ')}`,
        `i18n nav.* entry-labels with no nav entry (retired-door/segment labels): ${Object.keys(en)
          .filter(
            (k) =>
              k.startsWith('nav.') &&
              !k.startsWith('nav.group.') &&
              !['nav.back', 'nav.more'].includes(k) &&
              !census.some((c) => c.labelKey === k)
          )
          .join(
            ', '
          )} (retired door keys stay as segment/view labels by design — zero drift; nav.group.* retired with the flat chrome)`,
      ].join('\n')
    );
    assert.ok(census.length > 0, 'census parsed zero entries — map broke');
  });

  test('every nav labelKey exists in BOTH languages (naming rule §2.6: bilingual from the first commit)', () => {
    const missing = NAV_ENTRIES.filter((e) => !(en[e.labelKey] && ar[e.labelKey])).map(
      (e) => `${e.viewKey}:${e.labelKey}`
    );
    assert.deepEqual(missing, [], `nav labels missing in en or ar: ${missing.join(', ')}`);
  });

  test('CLOSED (Phase 6 §1.6, Phase 8): no label-vs-destination mismatches — no chrome entry opens the palette', () => {
    const mismatches = NAV_ENTRIES.filter((e) => e.labelKey === 'nav.search').map((e) => ({
      viewKey: e.viewKey,
      labelKey: e.labelKey,
    }));
    assert.deepEqual(
      mismatches,
      [],
      `a chrome entry still promises Search while opening something else (plan §1.6, naming rule §2.6.2): ${JSON.stringify(mismatches, null, 2)}`
    );
  });
});

describe('Rule 6 drift-check: the test reads the real map, the parser proves it', () => {
  test('js/core/config/nav.js parses to exactly the imported DOORS (no shadow copy)', () => {
    assert.equal(
      parsed.entries.length,
      DOORS.length,
      `static parse found ${parsed.entries.length} doors, import has ${DOORS.length}`
    );
    assert.deepEqual(
      parsed.entries.map((m) => m[1]),
      DOORS.map((d) => d.entry),
      'door entry order drifted between the file text and the import'
    );
    assert.deepEqual(
      parsed.labels.map((m) => m[1]),
      DOORS.map((d) => d.labelKey),
      'door labelKey order drifted between the file text and the import'
    );
    assert.deepEqual(
      DOOR_LABEL_KEYS,
      DOORS.map((d) => d.labelKey),
      'DOOR_LABEL_KEYS must mirror DOORS order'
    );
    // Members per door, in order (grouped by entry position in the source).
    const byDoor = parsed.entries.map((e, i) => {
      const start = e.index;
      const end = parsed.entries[i + 1]?.index ?? Infinity;
      return parsed.members
        .filter((m) => m.index > start && m.index < end)
        .map((m) => ({ route: m.route, taps: m.taps, via: m.via }));
    });
    assert.deepEqual(
      byDoor,
      DOORS.map((d) => d.members.map((m) => ({ route: m.route, taps: m.taps, via: m.via }))),
      'door members drifted between the file text and the import'
    );
  });

  test('the chrome derives from DOORS (no parallel static pin in shell.js)', () => {
    assert.ok(
      shellSrc.includes("from '../core/config/nav.js'") ||
        shellSrc.includes('from "../core/config/nav.js"'),
      'shell.js must import DOORS from js/core/config/nav.js'
    );
    assert.ok(shellSrc.includes('DOORS.map('), 'NAV_GROUPS must derive from DOORS.map (rule 6)');
    assert.ok(
      shellSrc.includes('DOORS.slice('),
      'MOBILE_ITEMS must derive from DOORS.slice (rule 6)'
    );
    assert.ok(
      shellSrc.includes('DOOR_VIEW_BY_ROUTE_KEY'),
      'isActive must resolve through the DOORS reverse lookup (rule 6)'
    );
    for (const marker of ['DOORS.find(', 'switchRoutes(']) {
      assert.ok(shellSrc.includes(marker), `mode-switch members must derive via ${marker}`);
    }
    // No resurrected taxonomy and no retired peer doors pinned in the chrome.
    assert.ok(
      !shellSrc.includes("label: 'nav.group."),
      'the read/worship/tools/mine taxonomy must not return to the chrome'
    );
    for (const retired of ['VIEWS.LIBRARY', 'VIEWS.ROOTS', 'VIEWS.SEARCH', 'VIEWS.RAMADAN']) {
      assert.ok(
        !shellSrc.includes(`{ view: ${retired}`),
        `${retired} must not return as a chrome entry`
      );
    }
    for (const retired of ['VIEWS.ZAKAT', 'VIEWS.OFFLINE']) {
      assert.ok(
        !shellSrc.includes(`{ view: ${retired}`),
        `${retired} must not return as a chrome entry`
      );
    }
  });
});

describe('HANDOFF PART A1: EXACTLY six flat doors, in order', () => {
  test('six top-level entries — Home · Qur’an · Ahadeeth · Prayer · Practise · You', () => {
    assert.equal(
      NAV_ENTRIES.length,
      6,
      `A1 demands 6 top-level entries, the chrome ships ${NAV_ENTRIES.length}`
    );
    assert.deepEqual(
      NAV_ENTRIES.map((e) => e.viewKey),
      ['HOME', 'MUSHAF', 'HADITH', 'PRAYER', 'TASBIH', 'CHECKLIST'],
      'door entry order drifted from the A1 target'
    );
  });

  test('labelKey sequence — nav.home · nav.quran · nav.hadith · nav.prayer · nav.practise · nav.you', () => {
    assert.deepEqual(
      NAV_ENTRIES.map((e) => e.labelKey),
      ['nav.home', 'nav.quran', 'nav.hadith', 'nav.prayer', 'nav.practise', 'nav.you'],
      'door label sequence drifted from the A1 target'
    );
  });

  test('A1 verbatim: fail if nav.library returns', () => {
    const libraryDoors = NAV_ENTRIES.filter(
      (e) => e.viewKey === 'LIBRARY' || e.labelKey === 'nav.library'
    );
    assert.deepEqual(
      libraryDoors,
      [],
      'fail if nav.library returns (A1): the grid is home — a second door to the tiles is the redundancy the reorganisation was meant to remove'
    );
  });

  test('the Practise door is the TASBIH entry wearing nav.practise; the You door is the CHECKLIST entry wearing nav.you', () => {
    const practise = NAV_ENTRIES.find((e) => e.labelKey === 'nav.practise');
    assert.ok(practise, 'no door labelled nav.practise');
    assert.equal(practise.viewKey, 'TASBIH');
    assert.equal(practise.view, VIEWS.TASBIH);
    const you = NAV_ENTRIES.find((e) => e.labelKey === 'nav.you');
    assert.ok(you, 'no door labelled nav.you');
    assert.equal(you.viewKey, 'CHECKLIST');
    assert.equal(you.view, VIEWS.CHECKLIST);
  });

  test('the fifth door ships its new bilingual label (EN Practise / AR الممارسة)', () => {
    assert.equal(en['nav.practise'], 'Practise');
    assert.equal(ar['nav.practise'], 'الممارسة');
  });

  test('the retired taxonomy stays retired in both dictionaries', () => {
    for (const key of [
      'nav.group.read',
      'nav.group.worship',
      'nav.group.tools',
      'nav.group.mine',
    ]) {
      assert.ok(!(key in en) && !(key in ar), `${key} returned with the taxonomy`);
    }
  });

  test('retired door keys stay as segment/view labels — zero drift, both languages', () => {
    for (const key of [
      'nav.library',
      'nav.roots',
      'nav.tasbih',
      'nav.ramadan',
      'nav.zakat',
      'nav.offline',
      'nav.search',
    ]) {
      assert.ok(
        en[key] && ar[key],
        `${key} drifted — retired doors keep their keys in both languages`
      );
    }
  });
});

describe('Phase 8 pin: absorbed members resolve through their doors in ≤2 taps', () => {
  test('ROOTS is Qur’an depth: MUSHAF door in 2 taps via the List/Word/Audio switch', () => {
    const m = ROUTE_DOOR_MAP.ROOTS;
    assert.ok(m.door, 'ROOTS lost its door — absorption must not orphan the route');
    assert.equal(m.door.entry, 'MUSHAF');
    assert.equal(m.door.labelKey, 'nav.quran');
    assert.equal(m.taps, 2);
    assert.equal(m.door.via, 'quran-mode-switch');
    assert.ok(!ORPHANS.includes('ROOTS'), 'ROOTS must not appear in the orphan list');
  });

  test('LIBRARY follows from the HOME door in 2 taps (the grid’s all-view)', () => {
    const m = ROUTE_DOOR_MAP.LIBRARY;
    assert.ok(m.door, 'LIBRARY lost its door — the route stays behind the grid’s all-view');
    assert.equal(m.door.entry, 'HOME');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 2);
    assert.equal(m.door.via, 'home-all-view');
    assert.ok(!ORPHANS.includes('LIBRARY'), 'LIBRARY must not appear in the orphan list');
  });

  test('RAMADAN is Prayer depth: PRAYER door in 2 taps via the 4-segment switch', () => {
    const m = ROUTE_DOOR_MAP.RAMADAN;
    assert.ok(m.door, 'RAMADAN lost its door — re-homing must not orphan the route');
    assert.equal(m.door.entry, 'PRAYER');
    assert.equal(m.door.labelKey, 'nav.prayer');
    assert.equal(m.taps, 2);
    assert.equal(m.door.via, 'prayer-mode-switch');
    assert.ok(!ORPHANS.includes('RAMADAN'), 'RAMADAN must not appear in the orphan list');
  });

  test('ZAKAT and OFFLINE are You depth: CHECKLIST door in 2 taps via the 10-segment switch', () => {
    for (const key of ['ZAKAT', 'OFFLINE']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — re-homing must not orphan the route`);
      assert.equal(m.door.entry, 'CHECKLIST');
      assert.equal(m.door.labelKey, 'nav.you');
      assert.equal(m.taps, 2, 'door → in-chrome You switch');
      assert.equal(m.door.via, 'you-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('SEARCH is doorless-by-design: no door, palette justification recorded', () => {
    const m = ROUTE_DOOR_MAP.SEARCH;
    assert.equal(m.door, null, '#/search must claim no chrome slot');
    assert.ok(ORPHANS.includes('SEARCH'), 'SEARCH must appear in the orphan list');
    assert.ok(INTERNAL_ONLY.has('SEARCH'), 'SEARCH has no internal-only decision');
    assert.ok(
      INTERNAL_JUSTIFICATIONS.SEARCH && INTERNAL_JUSTIFICATIONS.SEARCH.includes('palette'),
      'SEARCH still carries a placeholder instead of the palette decision'
    );
    assert.ok(!UNJUSTIFIED_ORPHANS.includes('SEARCH'), 'SEARCH must not be an unjustified orphan');
  });
});

describe('Phase 1 pin: the flagships have a front door', () => {
  test('TAJWEED_COURSE lives in the Practise section (TASBIH entry, nav.practise label)', () => {
    const door = ROUTE_DOOR_MAP.TAJWEED_COURSE.door;
    assert.ok(door, 'TAJWEED_COURSE lost its door in the re-homing');
    assert.equal(door.taps, 2, 'door → in-chrome Tasbih/Course/Quiz/Look-alike switch');
    assert.equal(door.entry, 'TASBIH');
    assert.equal(door.labelKey, 'nav.practise');
    assert.equal(door.via, 'practise-mode-switch');
  });

  test('ROOTS sits in the Qur’an door as its depth (Phase 8 absorption)', () => {
    const door = ROUTE_DOOR_MAP.ROOTS.door;
    assert.ok(door, 'ROOTS still has no nav door');
    assert.equal(door.taps, 2);
    assert.equal(door.entry, 'MUSHAF');
    assert.equal(door.labelKey, 'nav.quran');
  });

  test('Phase 8 leaves only the 3 documented doorless routes', () => {
    assert.ok(!ORPHANS.includes('TAJWEED_COURSE'), 'TAJWEED_COURSE is still orphaned');
    assert.ok(!ORPHANS.includes('ROOTS'), 'ROOTS is still orphaned');
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      `Phase 8 leaves only the 3 documented doorless routes, got ${ORPHANS.length}`
    );
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
    assert.equal(m.door.entry, 'MUSHAF');
    assert.equal(m.door.labelKey, 'nav.quran');
    assert.equal(m.taps, 2, 'door → in-chrome List/Word switch');
    assert.equal(m.door.via, 'quran-mode-switch');
    assert.ok(!ORPHANS.includes('QURAN'), '#/quran must not appear in the orphan list');
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
    for (const key of ['quran.modeList', 'quran.modeWord', 'nav.audio']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
    }
  });

  test('the merge adds no orphan: only the 3 documented doorless routes remain', () => {
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      `expected only the 3 documented doorless routes, got ${ORPHANS.length}`
    );
  });
});

describe('Phase 3 pin: the Adhkar front page is home', () => {
  test('CATEGORY follows from the HOME door in 1 tap (the grid is home)', () => {
    const m = ROUTE_DOOR_MAP.CATEGORY;
    assert.ok(m.door, 'CATEGORY lost its door — the home grid must carry every section');
    assert.equal(m.door.entry, 'HOME');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 1, 'home tile → section');
    assert.equal(m.door.via, 'adhkar-browser');
    assert.ok(!ORPHANS.includes('CATEGORY'), 'CATEGORY must not appear in the orphan list');
  });

  test('MOOD rides the home filter row in 1 tap (same feature, front door)', () => {
    const m = ROUTE_DOOR_MAP.MOOD;
    assert.ok(m.door, 'MOOD lost its door — the 12 moods are a filter row above the home grid');
    assert.equal(m.door.entry, 'HOME');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 1, 'home filter chip → mood');
    assert.equal(m.door.via, 'adhkar-browser');
    assert.ok(!ORPHANS.includes('MOOD'), 'MOOD must not appear in the orphan list');
  });

  test('Phase 3 still closes its orphans under the flat chrome', () => {
    assert.ok(!ORPHANS.includes('CATEGORY'), 'CATEGORY is still orphaned');
    assert.ok(!ORPHANS.includes('MOOD'), 'MOOD is still orphaned');
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      `Phase 8 leaves only the 3 documented doorless routes, got ${ORPHANS.length}`
    );
  });
});

describe('Phase 4 pin: one Prayer door, four routes alive', () => {
  test('single nav.prayer entry; qibla, calendar and ramadan no longer compete for a chrome slot', () => {
    const prayerDoors = NAV_ENTRIES.filter((e) =>
      ['PRAYER', 'QIBLA', 'CALENDAR', 'RAMADAN'].includes(e.viewKey)
    );
    assert.deepEqual(
      prayerDoors.map((e) => e.viewKey),
      ['PRAYER'],
      'qibla, the calendar and ramadan must not compete for a chrome slot'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'PRAYER').labelKey,
      'nav.prayer',
      'the one door keeps the nav.prayer label'
    );
  });

  test('#/qibla, #/calendar and #/ramadan stay real routes resolving to the Prayer door in 2 taps', () => {
    for (const key of ['QIBLA', 'CALENDAR', 'RAMADAN']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the merge must not orphan the route`);
      assert.equal(m.door.entry, 'PRAYER');
      assert.equal(m.door.labelKey, 'nav.prayer');
      assert.equal(m.taps, 2, 'door → in-chrome Times/Qibla/Calendar/Ramadan switch');
      assert.equal(m.door.via, 'prayer-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('switch labels reuse the bilingual nav entries (naming rule §2.6)', () => {
    for (const key of ['nav.prayer', 'nav.qibla', 'nav.calendar', 'nav.ramadan']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('the merge adds no orphan: only the 3 documented doorless routes remain', () => {
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      `expected only the 3 documented doorless routes, got ${ORPHANS.length}`
    );
  });
});

describe('Phase 5 pin: one Practise section, four routes alive', () => {
  test('single Practise entry (TASBIH view, nav.practise label); course/quiz/look-alikes do not compete', () => {
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
      'nav.practise',
      'the one door keeps the nav.practise label (Phase 8)'
    );
  });

  test('#/tajweed-course, #/quiz and #/mutashabihat stay real routes resolving to the Practise door in 2 taps', () => {
    for (const key of ['TAJWEED_COURSE', 'QUIZ', 'MUTASHABIHAT']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the section must not orphan the route`);
      assert.equal(m.door.entry, 'TASBIH');
      assert.equal(m.door.labelKey, 'nav.practise');
      assert.equal(m.taps, 2, 'door → in-chrome Tasbih/Course/Quiz/Look-alike switch');
      assert.equal(m.door.via, 'practise-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
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
  });

  test('the section holds its routes: only the 3 documented doorless routes remain', () => {
    assert.ok(!ORPHANS.includes('QUIZ'), 'QUIZ is still orphaned');
    assert.ok(!ORPHANS.includes('MUTASHABIHAT'), 'MUTASHABIHAT is still orphaned');
    assert.ok(!ORPHANS.includes('TAJWEED_COURSE'), 'TAJWEED_COURSE is still orphaned');
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      `Phase 8 leaves only the 3 documented doorless routes, got ${ORPHANS.length}`
    );
  });
});

describe('Phase 6 pin: one You section, ten routes alive', () => {
  test('single You door; section members do not compete for a chrome slot', () => {
    const youDoors = NAV_ENTRIES.filter((e) =>
      ['CHECKLIST', 'GARDEN', 'STATISTICS', 'FAVORITES', 'SETTINGS', 'ABOUT'].includes(e.viewKey)
    );
    assert.deepEqual(
      youDoors.map((e) => e.viewKey),
      ['CHECKLIST'],
      'the section members must not compete for a chrome slot'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'CHECKLIST').labelKey,
      'nav.you',
      'the one door keeps the nav.you label, not the retired Checklist noun'
    );
  });

  test('#/garden, #/statistics, #/favorites, #/journal, #/certificate, #/zakat, #/offline, #/settings and #/about stay real routes resolving to the You door in 2 taps', () => {
    for (const key of [
      'GARDEN',
      'STATISTICS',
      'FAVORITES',
      'JOURNAL',
      'CERTIFICATE',
      'ZAKAT',
      'OFFLINE',
      'SETTINGS',
      'ABOUT',
    ]) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the section must not orphan the route`);
      assert.equal(m.door.entry, 'CHECKLIST');
      assert.equal(m.door.labelKey, 'nav.you');
      assert.equal(m.taps, 2, 'door → in-chrome You switch');
      assert.equal(m.door.via, 'you-mode-switch');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('the checklist route keeps its own door in 1 tap (it IS the section entry)', () => {
    const m = ROUTE_DOOR_MAP.CHECKLIST;
    assert.ok(m.door, '#/checklist lost its door');
    assert.equal(m.door.entry, 'CHECKLIST');
    assert.equal(m.door.labelKey, 'nav.you');
    assert.equal(m.taps, 1);
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
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

  test('the naming pass retires the metaphor/tutorial nouns from every dictionary', () => {
    for (const key of [
      'nav.garden',
      'nav.checklist',
      'checklist.title',
      'garden.title',
      'title.garden',
      'title.checklist',
    ]) {
      // title.* are per-route document titles, not nav nouns: they track
      // the rename (Growth / My adhkar) instead of retiring.
      if (key.startsWith('title.')) {
        assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      } else {
        assert.ok(!(key in en) && !(key in ar), `${key} still names a screen`);
      }
    }
    assert.equal(en['title.garden'], en['you.growth']);
    assert.equal(en['title.checklist'], en['you.myAdhkar']);
  });

  test('the section holds its routes: only the 3 documented doorless routes remain', () => {
    assert.ok(!ORPHANS.includes('JOURNAL'), 'JOURNAL is still orphaned');
    assert.ok(!ORPHANS.includes('CERTIFICATE'), 'CERTIFICATE is still orphaned');
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      'only the 3 documented doorless routes (AMBIENT, EDITOR, SEARCH) may remain doorless'
    );
  });
});

describe('Phase 7 pin: the orphans, one by one — absorbed depths, three documented internals', () => {
  test('FOCUS is Adhkar depth: HOME door in 2 taps via the card Open-focus (no interstitial)', () => {
    const m = ROUTE_DOOR_MAP.FOCUS;
    assert.ok(m.door, 'FOCUS lost its door');
    assert.equal(m.door.entry, 'HOME');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 2, 'door → category tile → card Open-focus');
    assert.equal(m.door.via, 'adhkar-browser');
    assert.ok(!ORPHANS.includes('FOCUS'), 'FOCUS must not appear in the orphan list');
  });

  test('COLLECTIONS rides the home panel in 1 tap; COLLECTION follows in 2', () => {
    const cols = ROUTE_DOOR_MAP.COLLECTIONS;
    assert.ok(cols.door, 'COLLECTIONS lost its door');
    assert.equal(cols.door.entry, 'HOME');
    assert.equal(cols.door.labelKey, 'nav.home');
    assert.equal(cols.taps, 1, 'home collections panel → collections');
    assert.equal(cols.door.via, 'home-collections-panel');
    assert.ok(!ORPHANS.includes('COLLECTIONS'), 'COLLECTIONS must not appear in the orphan list');
    const col = ROUTE_DOOR_MAP.COLLECTION;
    assert.ok(col.door, 'COLLECTION lost its door');
    assert.equal(col.door.entry, 'HOME');
    assert.equal(col.door.labelKey, 'nav.home');
    assert.equal(col.taps, 2, 'home → collections → collection tile');
    assert.equal(col.door.via, 'home-collections-panel');
    assert.ok(!ORPHANS.includes('COLLECTION'), 'COLLECTION must not appear in the orphan list');
  });

  test('#/audio is Qur’an listening: MUSHAF door in 2 taps via the List/Word/Audio switch', () => {
    const m = ROUTE_DOOR_MAP.AUDIO;
    assert.ok(m.door, '#/audio lost its door — listening must not orphan the route');
    assert.equal(m.door.entry, 'MUSHAF');
    assert.equal(m.door.labelKey, 'nav.quran');
    assert.equal(m.taps, 2, 'door → in-chrome List/Word/Audio switch');
    assert.equal(m.door.via, 'quran-mode-switch');
    assert.ok(!ORPHANS.includes('AUDIO'), '#/audio must not appear in the orphan list');
  });

  test('switch labels reuse the bilingual nav entries (naming rule §2.6)', () => {
    for (const key of ['quran.modeList', 'quran.modeWord', 'nav.audio']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('EDITOR, AMBIENT and SEARCH stay doorless ON PURPOSE — documented internals, not findings', () => {
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      'only the 3 documented internals may remain doorless'
    );
    for (const key of ['EDITOR', 'AMBIENT', 'SEARCH']) {
      assert.ok(INTERNAL_ONLY.has(key), `${key} has no internal-only decision`);
      assert.ok(
        INTERNAL_JUSTIFICATIONS[key] &&
          !INTERNAL_JUSTIFICATIONS[key].includes('a door, or a documented'),
        `${key} still carries the Phase 0 placeholder instead of the recorded decision`
      );
    }
  });

  test('zero unjustified orphans: every doorless route is justified', () => {
    assert.deepEqual(
      [...UNJUSTIFIED_ORPHANS].sort(),
      [],
      `Phase 8 finding: routes with no door AND no justification: ${UNJUSTIFIED_ORPHANS.join(', ')}`
    );
  });
});

describe('Phase 0 trap: every route reachable within 2 taps of a door (GREEN after Phase 8)', () => {
  test('GREEN (Phase 8): zero unjustified orphans — six doors, three documented internals', () => {
    const detail = ORPHANS.map(
      (k) =>
        `${k} (internal-only: ${INTERNAL_JUSTIFICATIONS[k] || 'NO justification recorded — a finding per Phase 7'})`
    );
    assert.deepEqual(
      UNJUSTIFIED_ORPHANS,
      [],
      `orphan routes reachable only by URL/search/palette with no door AND no justification — give each a door or a documented internal-only decision (Phase 7):\n  ${detail.join('\n  ')}`
    );
    // The only doorless routes left are the three documented internals.
    assert.deepEqual(
      [...ORPHANS].sort(),
      ['AMBIENT', 'EDITOR', 'SEARCH'],
      'doorless beyond the documented internals'
    );
  });

  test('route→door map covers all VIEWS routes from the real DOORS import (no silent additions)', () => {
    assert.equal(
      Object.keys(ROUTE_DOOR_MAP).length,
      Object.keys(VIEWS).length,
      'map drifted from VIEWS — a route was added without updating the map'
    );
    const mapped = new Set();
    for (const d of DOORS) for (const m of d.members) mapped.add(m.route);
    for (const key of Object.keys(VIEWS)) {
      if (KIDS_DOOR_KEYS.has(key) || INTERNAL_ONLY.has(key)) continue;
      assert.ok(mapped.has(key), `${key} is in VIEWS but in no DOORS member list`);
    }
    const unjustified = UNJUSTIFIED_ORPHANS;
    assert.deepEqual(
      unjustified,
      [],
      `Phase 8 finding: routes with no door AND no justification: ${unjustified.join(', ')}`
    );
  });
});
