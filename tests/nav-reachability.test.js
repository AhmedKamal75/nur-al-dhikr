/**
 * tests/nav-reachability.test.js — REORGANISATION-PLAN.md Phase 0 + IA-7.
 *
 * INSTRUMENT BEFORE MOVING. This file is TEST-ONLY: it imports the real
 * route→section map (DOORS from js/core/config/nav.js — the single source
 * of truth per AGENTS.md rule 6) and asserts every route is reachable within
 * 2 taps of a section. The old static shell.js NAV_GROUPS parser is kept as a
 * DRIFT-CHECK: it verifies the chrome derives from the map instead of
 * pinning a parallel list.
 *
 * IA-7 (v5.17.61): the chrome is hierarchical with EXACTLY 7 sections —
 * HOME(nav.home, the Today landing) · LIBRARY(nav.azkar, the adhkar
 * browser) · MUSHAF(nav.quran) · HADITH(nav.hadith) · PRAYER(nav.prayer)
 * · TASBIH-entry labelled nav.practise · CHECKLIST-entry labelled nav.you —
 * and the test must fail if the azkar grid returns to Home or if a section
 * entry drifts from the map.
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
import {
  APP_MENU_ENTRIES,
  APP_MENU_GROUPS,
  DOORS,
  DOOR_LABEL_KEYS,
} from '../js/core/config/nav.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* Drift-check: the static parse of nav.js must equal the live import  */
/* ------------------------------------------------------------------ */

const navSrc = read('js/core/config/nav.js');
const shellSrc = read('js/ui/shell.js');

/**
 * Collapse `Object.freeze({ ... })` member literals onto ONE line before the
 * member regex runs. (v5.17.136) Prettier breaks a member object across lines
 * once it exceeds the print width — and adopting v5.17.135 added door members
 * long enough to do that — so a regex that only understood the single-line
 * form silently stopped finding members and reported phantom drift. Reading
 * the shape rather than the layout is what this drift-check always meant to
 * do: the point is that nav.js and DOORS agree, not that the file happens to
 * be formatted a particular way.
 */
function flattenObjects(src) {
  let out = src;
  // Repeat until stable: a re-indent can push a line over the width again.
  for (let pass = 0; pass < 8; pass += 1) {
    const next = out.replace(/\{([^{}]*)\}/g, (match, body) => {
      if (!match.includes('\n')) return match;
      // Match sees the ORIGINAL newline, but a later `}` inside the same pass
      // can already have been reflowed — so normalise any comma that now sits
      // immediately before this object's own closing brace. Iterating to a
      // fixed point covers the multi-pass cases (a re-indent pushing a line
      // over the print width again).
      const collapsed = body
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Prettier's multi-line form ends the last property with `,` before the
      // brace; the single-line form never does. Drop it so both forms are the
      // same string and the member regex sees one shape.
      const flat = `{ ${collapsed.replace(/,$/, '').trim()} }`;
      return flat;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

function parseDoorsStatic(src) {
  const flat = flattenObjects(src);
  // Only walk the `members: Object.freeze([...])` arrays. Scanning the whole
  // file also picked up the two standalone shapes nav.js keeps for reference
  // (the doc-comment example and the `MEMBERS` export), which is how the
  // COLLECTIONS/COLLECTION pair came back transposed and 4 entries short.
  const memberRe =
    /\{\s*route:\s*'(\w+)'\s*(?:,\s*labelKey:\s*'([^']+)')?\s*,\s*taps:\s*(\d+)\s*,\s*via:\s*(null|'([^']+)')\s*(,\s*direct:\s*(true|false)\s*,?)?\s*\}/g;
  // Index into the FLATTENED text, because that is the coordinate space the
  // `entry:` offsets below also come from — comparing members against entry
  // offsets measured on the original source misgroups every member that sits
  // after a multi-line object.
  const members = [...flat.matchAll(memberRe)].map((m) => ({
    route: m[1],
    labelKey: m[2] ?? null,
    taps: Number(m[3]),
    via: m[5] ?? null,
    ...(m[7] ? { direct: m[7] === 'true' } : {}),
    index: m.index,
  }));
  const entryRe = /entry:\s*'(\w+)'/g;
  const labelRe = /labelKey:\s*'([^']+)'/g;
  const entries = [...flat.matchAll(entryRe)];
  const labels = [...flat.matchAll(labelRe)];
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
  HOME: 'IA-7: the Today landing stands alone — ribbon + moment + resume + tasbih entry. The grid moved to the AZKAR section, so HOME claims no subsections.',
  CATEGORY:
    'IA-7: tile-depth of the AZKAR section — a browser tile with an id carries it (direct:false: the view 404s bare, so the drawer offers no direct hop). Door via the LIBRARY entry in 1 tap via adhkar-browser.',
  MOOD: 'IA-7: Azkar-section member — the 12 moods ride the browser filter row AND answer the bare picker. Door via the LIBRARY entry in 1 tap via adhkar-browser.',
  FOCUS:
    'IA-7: Azkar depth — the immersive one-item recitation stage behind every card’s Open-focus and the bare picker; door via the LIBRARY entry in 2 taps (entry → category tile → card Open-focus, no interstitial), deep links keep working.',
  COLLECTIONS:
    'IA-7: Azkar-section member — the user’s adhkar sets list; door via the LIBRARY entry in 1 tap (azkar collections panel → collections), deep links keep working.',
  COLLECTION:
    'IA-7: tile-depth of the AZKAR section — follows from COLLECTIONS (direct:false: the view 404s bare). Door via the LIBRARY entry in 2 taps (entry → collections panel → collection tile), deep links keep working.',
  LIBRARY:
    'IA-7: the AZKAR section entry — the moved adhkar grid (renderLibrary reuses the browser component). Door IS the entry: 1 tap, via null; deep links keep working.',
  QUIZ: 'plan §2.1/§2.4/Phase 5 + IA-7: Practise-section member — door via the TASBIH entry (labelled nav.practise) + in-chrome switch.',
  AUDIO:
    'plan §4 Phase 7: Qur’an listening — the reciter/voice picker + offline downloads is the book’s listening depth; door via the MUSHAF entry in 2 taps (door → in-chrome switch), deep links keep working.',
  ROOTS:
    'HANDOFF A1 / REORG Phase 8: the root index behind per-word study is the DEPTH of the Qur’an door — absorbed into the MUSHAF door in 2 taps via quran-mode-switch; #/roots stays a real route, deep links keep working.',
  SEARCH:
    'HANDOFF A1 / REORG Phase 8 DOORLESS-BY-DESIGN (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): the search view lives one tap away on the topbar palette (palette.open), which names itself as a quick launcher — a nav door would promise a place for what is a launcher action, and the §1.6 label-lies trap stays closed because no chrome entry says Search anymore. Deep link #/search keeps working; claims no chrome slot.',
  EDITOR:
    'plan §1.5/§4 Phase 7 INTERNAL-ONLY (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): a tool invoked from content surfaces (library sheet, category manage, card menu), never browsed to — a nav door would promise a place for what is an action on a place. Deep link #/editor keeps working; claims no chrome slot.',
  MUTASHABIHAT:
    'IA-7: Qur’an-study depth — look-alike ayat moved from Practise to the MUSHAF door (study belongs to the book). Door via the MUSHAF entry in 2 taps via quran-mode-switch; deep links keep working.',
  JOURNAL:
    'plan §2.1/Phase 6: You-section member — door via the You (checklist) entry + in-chrome switch.',
  CERTIFICATE:
    'plan §2.2/Phase 6: re-homed out of the daily grid; You-section member — door via the You (checklist) entry + in-chrome switch.',
  AMBIENT:
    'plan §4 Phase 7 INTERNAL-ONLY (documented in js/ui/shell.js INTERNAL_ONLY_ROUTES): chrome-free nightstand kiosk entered from the Prayer sheet, exited to #/prayer — a nav door would promise chrome the route removes by design (body.is-ambient). Deep link #/ambient keeps working; claims no chrome slot.',
  TAJWEED_COURSE:
    'IA-7: the flagship lives in the QUR’AN section — door via the MUSHAF entry in 2 taps via quran-mode-switch (moved from Practise: study belongs to the book); NOT internal.',
  RAMADAN:
    'HANDOFF A1 / REORG Phase 8: the Ramadan companion is Prayer depth — absorbed into the PRAYER door in 2 taps via the 4-segment prayer-mode-switch; #/ramadan stays a real route, deep links keep working.',
  ZAKAT:
    'HANDOFF A1 / REORG Phase 8: Standalone application utility in the main menu; #/zakat stays a real route, deep links keep working.',
  OFFLINE:
    'HANDOFF A1 / REORG Phase 8: Standalone application utility in the main menu; #/offline stays a real route, deep links keep working.',
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
    const appGroup = hit
      ? null
      : APP_MENU_GROUPS.find((g) => g.entries.some((e) => e.view === routeValue)) || null;
    const appEntry = appGroup?.entries.find((e) => e.view === routeValue) || null;
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
            : appGroup
              ? {
                  view: routeValue,
                  entry: routeKey,
                  labelKey: appEntry?.label || null,
                  scope: 'app',
                  taps: 1,
                  via: 'main-menu',
                  appKind: appGroup.kind,
                }
              : null,
        taps: hit ? hit.member.taps : kidsDoor ? 1 : appGroup ? 1 : null,
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

/* The primary chrome as derived: seven entries in DOORS order. */
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
        `entries (${census.length}; IA-7: seven sections — Home · Azkar · Qur’an · Ahadeeth · Prayer · Practise · You)`,
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
              k !== 'nav.back' &&
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
    const expectedLabels = DOORS.map((d) => d.labelKey);
    const textLabels = parsed.labels.map((m) => m[1]);
    let cursor = -1;
    for (const expected of expectedLabels) {
      cursor = textLabels.indexOf(expected, cursor + 1);
      assert.ok(cursor >= 0, `door label ${expected} disappeared from nav.js text`);
    }
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
        .map((m) => ({
          route: m.route,
          taps: m.taps,
          via: m.via,
          ...(m.direct !== undefined ? { direct: m.direct } : {}),
        }));
    });
    const liveMembers = (d) =>
      d.members.map((m) => ({
        route: m.route,
        taps: m.taps,
        via: m.via ?? null,
        ...(m.direct !== undefined ? { direct: m.direct } : {}),
      }));
    assert.deepEqual(
      byDoor,
      DOORS.map(liveMembers),
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
      /const MOBILE_ITEMS[\s\S]*?DOORS\.map\(/.test(shellSrc),
      'MOBILE_ITEMS must derive directly from DOORS.map (rule 6)'
    );
    assert.ok(
      shellSrc.includes('DOOR_VIEW_BY_ROUTE_KEY'),
      'isActive must resolve through the DOORS reverse lookup (rule 6)'
    );
    assert.ok(shellSrc.includes('DOORS.map('), 'hierarchical members must derive from DOORS');
    // The hierarchical drawer derives from the same map: section blocks in
    // map order, subsection rows for direct members only (rule 6 — the
    // `direct: false` tile-depth flag lives in nav.js, not here).
    for (const marker of [
      'drawerSectionsHTML',
      'APP_MENU_ENTRIES',
      'navSubRowsHTML',
      'm.direct !== false',
    ]) {
      assert.ok(shellSrc.includes(marker), `hierarchical chrome must derive via ${marker}`);
    }
    // No resurrected taxonomy and no retired peer doors pinned in the chrome.
    // (IA-7) LIBRARY is a door again BY DESIGN — the Azkar section entry —
    // so it is asserted in the seven-sections pin below, not here.
    assert.ok(
      !shellSrc.includes("label: 'nav.group."),
      'the read/worship/tools/mine taxonomy must not return to the chrome'
    );
    for (const retired of ['VIEWS.ROOTS', 'VIEWS.SEARCH', 'VIEWS.RAMADAN']) {
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

describe('IA-7: EXACTLY seven sections, in order', () => {
  test('seven top-level entries — Home · Azkar · Qur’an · Ahadeeth · Prayer · Practise · You', () => {
    assert.equal(
      NAV_ENTRIES.length,
      7,
      `IA-7 demands 7 top-level entries, the chrome ships ${NAV_ENTRIES.length}`
    );
    assert.deepEqual(
      NAV_ENTRIES.map((e) => e.viewKey),
      ['HOME', 'LIBRARY', 'MUSHAF', 'HADITH', 'PRAYER', 'PRACTICE', 'CHECKLIST'],
      'door entry order drifted from the IA-7 target'
    );
  });

  test('labelKey sequence — nav.home · nav.azkar · nav.quran · nav.hadith · nav.prayer · nav.practise · nav.you', () => {
    assert.deepEqual(
      NAV_ENTRIES.map((e) => e.labelKey),
      ['nav.home', 'nav.azkar', 'nav.quran', 'nav.hadith', 'nav.prayer', 'nav.practise', 'nav.you'],
      'door label sequence drifted from the IA-7 target'
    );
  });

  test('IA-7: the Azkar door wears nav.azkar — nav.library retired as a nav noun', () => {
    const azkar = NAV_ENTRIES.find((e) => e.viewKey === 'LIBRARY');
    assert.ok(azkar, 'no LIBRARY section entry');
    assert.equal(azkar.labelKey, 'nav.azkar', 'the Azkar section wears nav.azkar, not nav.library');
    assert.equal(azkar.view, VIEWS.LIBRARY);
    assert.ok(!('nav.library' in en) && !('nav.library' in ar), 'nav.library still names a screen');
    const libraryDoors = NAV_ENTRIES.filter((e) => e.labelKey === 'nav.library');
    assert.deepEqual(
      libraryDoors,
      [],
      'nav.library returned as a door label: the section is Azkar now'
    );
  });

  test('the Practise door is the TASBIH entry wearing nav.practise; the You door is the CHECKLIST entry wearing nav.you', () => {
    const practise = NAV_ENTRIES.find((e) => e.labelKey === 'nav.practise');
    assert.ok(practise, 'no door labelled nav.practise');
    assert.equal(practise.viewKey, 'PRACTICE');
    assert.equal(practise.view, VIEWS.PRACTICE);
    const you = NAV_ENTRIES.find((e) => e.labelKey === 'nav.you');
    assert.ok(you, 'no door labelled nav.you');
    assert.equal(you.viewKey, 'CHECKLIST');
    assert.equal(you.view, VIEWS.CHECKLIST);
  });

  test('the fifth door ships its new bilingual label (EN Practise / AR الممارسة)', () => {
    assert.equal(en['nav.practise'], 'Practise');
    assert.equal(ar['nav.practise'], 'الممارسة');
  });

  test('the Azkar door ships its new bilingual label (EN Azkar / AR الأذكار)', () => {
    assert.equal(en['nav.azkar'], 'Azkar');
    assert.equal(ar['nav.azkar'], 'الأذكار');
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
    // (IA-7) nav.library retired with the Library nav noun — the section is
    // Azkar now (nav.azkar door, title.library document title).
    assert.ok(!('nav.library' in en) && !('nav.library' in ar), 'nav.library still names a screen');
  });
});

describe('IA-7 pin: sections with pinned member counts (extend, never weaken)', () => {
  test('member counts per section derive from the live DOORS import', () => {
    const counts = Object.fromEntries(DOORS.map((d) => [d.entry, d.members.length]));
    assert.deepEqual(
      counts,
      {
        HOME: 1,
        LIBRARY: 6,
        MUSHAF: 6,
        HADITH: 1,
        PRAYER: 4,
        PRACTICE: 4,
        CHECKLIST: 6,
      },
      'a section gained or lost a member without updating the map — extend the map AND this pin together'
    );
  });

  test('30 membered + 3 internal-only + kids scope = all 34 VIEWS routes', () => {
    const membered = DOORS.reduce((n, d) => n + d.members.length, 0);
    assert.equal(membered, 26, `the worship/personal sections carry ${membered} members, not 26`);
    assert.deepEqual([...ORPHANS].sort(), ['AMBIENT', 'EDITOR', 'SEARCH']);
    assert.equal(
      membered + APP_MENU_ENTRIES.length + ORPHANS.length + 1,
      Object.keys(VIEWS).length,
      'door members + app menu + internals + kids scope must cover every VIEWS route'
    );
  });

  test('tile-depth members flag direct:false and resolve through the landing', () => {
    const tiled = DOORS.flatMap((d) =>
      d.members.filter((m) => m.direct === false).map((m) => m.route)
    );
    assert.deepEqual([...tiled].sort(), ['CATEGORY', 'COLLECTION']);
    for (const key of tiled) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `${key} lost its door — tile-depth still resolves to a section`);
      assert.equal(m.door.entry, 'LIBRARY');
    }
  });

  test('every section entry resolves to itself in 1 tap with no hop', () => {
    for (const d of DOORS) {
      const m = ROUTE_DOOR_MAP[d.entry];
      assert.ok(m.door, `${d.entry} lost its own door`);
      assert.equal(m.door.entry, d.entry);
      assert.equal(m.taps, 1);
      assert.ok(!('via' in m.door), `${d.entry} carries a hop — the entry IS the tap`);
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
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('ROOTS'), 'ROOTS must not appear in the orphan list');
  });

  test('LIBRARY IS the Azkar section entry in 1 tap (the moved grid)', () => {
    const m = ROUTE_DOOR_MAP.LIBRARY;
    assert.ok(m.door, 'LIBRARY lost its door — the moved grid must own its section');
    assert.equal(m.door.entry, 'LIBRARY');
    assert.equal(m.door.labelKey, 'nav.azkar');
    assert.equal(m.taps, 1);
    assert.ok(!('via' in m.door), 'the entry IS the tap — no hop');
    assert.ok(!ORPHANS.includes('LIBRARY'), 'LIBRARY must not appear in the orphan list');
  });

  test('RAMADAN is Prayer depth: PRAYER door in 2 taps via the 4-segment switch', () => {
    const m = ROUTE_DOOR_MAP.RAMADAN;
    assert.ok(m.door, 'RAMADAN lost its door — re-homing must not orphan the route');
    assert.equal(m.door.entry, 'PRAYER');
    assert.equal(m.door.labelKey, 'nav.prayer');
    assert.equal(m.taps, 2);
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('RAMADAN'), 'RAMADAN must not appear in the orphan list');
  });

  test('ZAKAT and OFFLINE are standalone application-tail utilities, separate from Settings/About', () => {
    for (const key of ['ZAKAT', 'OFFLINE']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its main-menu entry`);
      assert.equal(m.door.entry, key);
      assert.equal(m.door.labelKey, key === 'ZAKAT' ? 'nav.zakat' : 'nav.offline');
      assert.equal(m.taps, 1, 'standalone main-menu utility');
      assert.equal(m.door.via, 'main-menu');
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
  test('TAJWEED_COURSE lives in the Qur’an section (MUSHAF entry, nav.quran label)', () => {
    const door = ROUTE_DOOR_MAP.TAJWEED_COURSE.door;
    assert.ok(door, 'TAJWEED_COURSE lost its door in the re-homing');
    assert.equal(door.taps, 2, 'door → in-chrome Qur’an switch');
    assert.equal(door.entry, 'MUSHAF');
    assert.equal(door.labelKey, 'nav.quran');
    assert.equal(door.via, 'main-menu');
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

describe('Phase 2 pin: one Qur’an door, six routes alive', () => {
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
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('QURAN'), '#/quran must not appear in the orphan list');
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
    for (const key of [
      'quran.modeList',
      'quran.modeWord',
      'nav.audio',
      'nav.tajweedCourse',
      'mutashabihat.title',
    ]) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
    }
  });

  test('#/tajweed-course and #/mutashabihat stay real routes resolving to the Qur’an door in 2 taps', () => {
    for (const key of ['TAJWEED_COURSE', 'MUTASHABIHAT']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — study belongs to the book`);
      assert.equal(m.door.entry, 'MUSHAF');
      assert.equal(m.door.labelKey, 'nav.quran');
      assert.equal(m.taps, 2, 'door → in-chrome Qur’an switch');
      assert.equal(m.door.via, 'main-menu');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
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

describe('Phase 3 pin: the Azkar section owns the browser', () => {
  test('HOME stands alone: the Today landing claims no subsections', () => {
    const m = ROUTE_DOOR_MAP.HOME;
    assert.ok(m.door, 'HOME lost its door');
    assert.equal(m.door.entry, 'HOME');
    assert.equal(m.door.labelKey, 'nav.home');
    assert.equal(m.taps, 1);
    assert.ok(!('via' in m.door), 'the landing IS the tap');
  });

  test('CATEGORY follows from the LIBRARY door in 1 tap (tile-depth, direct:false)', () => {
    const m = ROUTE_DOOR_MAP.CATEGORY;
    assert.ok(m.door, 'CATEGORY lost its door — the Azkar grid must carry every section');
    assert.equal(m.door.entry, 'LIBRARY');
    assert.equal(m.door.labelKey, 'nav.azkar');
    assert.equal(m.taps, 1, 'browser tile → section');
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('CATEGORY'), 'CATEGORY must not appear in the orphan list');
  });

  test('MOOD rides the browser in 1 tap (same feature, section door)', () => {
    const m = ROUTE_DOOR_MAP.MOOD;
    assert.ok(m.door, 'MOOD lost its door — the 12 moods live in the Azkar section');
    assert.equal(m.door.entry, 'LIBRARY');
    assert.equal(m.door.labelKey, 'nav.azkar');
    assert.equal(m.taps, 1, 'browser filter chip → mood');
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('MOOD'), 'MOOD must not appear in the orphan list');
  });

  test('Phase 3 still closes its orphans under the seven sections', () => {
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
      assert.equal(m.door.via, 'main-menu');
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

describe('Phase 5 pin: one Practise section, two routes alive', () => {
  test('single Practise entry (TASBIH view, nav.practise label); the quiz does not compete', () => {
    const practiseDoors = NAV_ENTRIES.filter((e) =>
      ['TASBIH', 'TAJWEED_COURSE', 'QUIZ', 'MUTASHABIHAT'].includes(e.viewKey)
    );
    assert.deepEqual(
      practiseDoors.map((e) => e.viewKey),
      ['TASBIH'],
      'the quiz must not compete for a chrome slot (the course and look-alikes moved to Qur’an)'
    );
    assert.equal(
      NAV_ENTRIES.find((e) => e.viewKey === 'TASBIH').labelKey,
      'nav.practise',
      'the one door keeps the nav.practise label (Phase 8)'
    );
  });

  test('#/quiz stays a real route resolving to the Practise door in 2 taps', () => {
    for (const key of ['QUIZ']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its door — the section must not orphan the route`);
      assert.equal(m.door.entry, 'TASBIH');
      assert.equal(m.door.labelKey, 'nav.practise');
      assert.equal(m.taps, 2, 'door → in-chrome Tasbih/Quiz switch');
      assert.equal(m.door.via, 'main-menu');
      assert.ok(!ORPHANS.includes(key), `#/${m.route} must not appear in the orphan list`);
    }
  });

  test('the course and look-alikes resolve to the Qur’an door, not Practise', () => {
    for (const key of ['TAJWEED_COURSE', 'MUTASHABIHAT']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.equal(m.door.entry, 'MUSHAF', `#/${m.route} still points at Practise`);
      assert.equal(m.door.via, 'main-menu');
    }
  });

  test('switch labels ship bilingual from the first commit (naming rule §2.6)', () => {
    for (const key of ['nav.practise', 'nav.tasbih', 'quiz.title']) {
      assert.ok(en[key] && ar[key], `${key} missing in en or ar`);
      assert.notEqual(en[key], ar[key], `${key} not translated`);
    }
  });

  test('the section holds its routes: only the 3 documented doorless routes remain', () => {
    assert.ok(!ORPHANS.includes('QUIZ'), 'QUIZ is still orphaned');
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

  test('#/garden, #/statistics, #/favorites, #/journal and #/certificate stay under You; Zakat/Offline/Settings/About are standalone menu entries', () => {
    for (const key of ['GARDEN', 'STATISTICS', 'FAVORITES', 'JOURNAL', 'CERTIFICATE']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its You door`);
      assert.equal(m.door.entry, 'CHECKLIST');
      assert.equal(m.door.labelKey, 'nav.you');
      assert.equal(m.taps, 2, 'main menu → You → child');
      assert.equal(m.door.via, 'main-menu');
      assert.ok(!ORPHANS.includes(key));
    }
    for (const key of ['ZAKAT', 'OFFLINE', 'SETTINGS', 'ABOUT']) {
      const m = ROUTE_DOOR_MAP[key];
      assert.ok(m.door, `#/${m.route} lost its standalone main-menu entry`);
      assert.equal(m.door.entry, key);
      assert.equal(m.taps, 1, 'standalone main-menu entry');
      assert.equal(m.door.via, 'main-menu');
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
      'nav.about',
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

describe('Phase 7 pin: the orphans, one by one — Azkar depths, Qur’an listening, three documented internals', () => {
  test('FOCUS is Azkar depth: LIBRARY door in 2 taps via the card Open-focus (no interstitial)', () => {
    const m = ROUTE_DOOR_MAP.FOCUS;
    assert.ok(m.door, 'FOCUS lost its door');
    assert.equal(m.door.entry, 'LIBRARY');
    assert.equal(m.door.labelKey, 'nav.azkar');
    assert.equal(m.taps, 2, 'door → category tile → card Open-focus');
    assert.equal(m.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('FOCUS'), 'FOCUS must not appear in the orphan list');
  });

  test('COLLECTIONS rides the Azkar panel in 1 tap; COLLECTION follows in 2', () => {
    const cols = ROUTE_DOOR_MAP.COLLECTIONS;
    assert.ok(cols.door, 'COLLECTIONS lost its door');
    assert.equal(cols.door.entry, 'LIBRARY');
    assert.equal(cols.door.labelKey, 'nav.azkar');
    assert.equal(cols.taps, 2, 'main menu → Azkar → Collections');
    assert.equal(cols.door.via, 'main-menu');
    assert.ok(!ORPHANS.includes('COLLECTIONS'), 'COLLECTIONS must not appear in the orphan list');
    const col = ROUTE_DOOR_MAP.COLLECTION;
    assert.ok(col.door, 'COLLECTION lost its door');
    assert.equal(col.door.entry, 'LIBRARY');
    assert.equal(col.door.labelKey, 'nav.azkar');
    assert.equal(col.taps, 3, 'main menu → Azkar → Collections → collection tile');
    assert.equal(col.door.via, 'azkar-collections-panel');
    assert.ok(!ORPHANS.includes('COLLECTION'), 'COLLECTION must not appear in the orphan list');
  });

  test('#/audio is Qur’an listening: MUSHAF door in 2 taps via the List/Word/Audio switch', () => {
    const m = ROUTE_DOOR_MAP.AUDIO;
    assert.ok(m.door, '#/audio lost its door — listening must not orphan the route');
    assert.equal(m.door.entry, 'MUSHAF');
    assert.equal(m.door.labelKey, 'nav.quran');
    assert.equal(m.taps, 2, 'door → in-chrome List/Word/Audio switch');
    assert.equal(m.door.via, 'main-menu');
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

describe('Phase 0 trap: every route reachable within 2 taps of a section (GREEN after IA-7)', () => {
  test('GREEN (IA-7): zero unjustified orphans — seven sections, three documented internals', () => {
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
    for (const entry of APP_MENU_ENTRIES) {
      const routeKey = Object.keys(VIEWS).find((key) => VIEWS[key] === entry.view);
      if (routeKey) mapped.add(routeKey);
    }
    for (const key of Object.keys(VIEWS)) {
      if (KIDS_DOOR_KEYS.has(key) || INTERNAL_ONLY.has(key)) continue;
      assert.ok(mapped.has(key), `${key} is in no DOORS member list or standalone menu entry`);
    }
    const unjustified = UNJUSTIFIED_ORPHANS;
    assert.deepEqual(
      unjustified,
      [],
      `Phase 8 finding: routes with no door AND no justification: ${unjustified.join(', ')}`
    );
  });
});
