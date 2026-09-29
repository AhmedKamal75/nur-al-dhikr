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
    'plan §1.5: follows from LIBRARY (depth of the adhkar browser) — Phase 7 door-or-justify.',
  MOOD: 'plan §1.3/Phase 3: buried browse-by-need, promoted to a filter row — interim internal under LIBRARY.',
  FOCUS: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  COLLECTIONS: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  COLLECTION: 'plan §1.5: follows from COLLECTIONS — Phase 7 door-or-justify.',
  QUIZ: 'plan §2.1/Phase 5: Practise-section member (Tasbih + Tajweed course + Quiz + Mutashabihat).',
  AUDIO: 'plan Phase 7 list: a door, or a documented internal-only decision.',
  ROOTS:
    'plan §1.5 FLAGSHIP (needsDoor): the root index behind per-word study — Phase 1 gives it a door under Qur’an; NOT internal.',
  EDITOR: 'plan §1.5: a tool invoked from content surfaces — internal-only candidate (Phase 7).',
  MUTASHABIHAT: 'plan §2.1/Phase 5: Practise-section member.',
  JOURNAL: 'plan §2.1/Phase 6: You-section member.',
  CERTIFICATE: 'plan §2.2/Phase 6: re-homed out of the daily grid; You-section member.',
  AMBIENT: 'plan Phase 7 list: nightstand display — a door, or documented internal-only.',
  TAJWEED_COURSE:
    'plan §1.5 FLAGSHIP (needsDoor): the entire G-2 course, reachable only by URL/search — Phase 1 gives it a real door; NOT internal.',
};

/** Every VIEWS route → its door (1 tap) or null (orphan today). */
const ROUTE_DOOR_MAP = Object.fromEntries(
  Object.entries(VIEWS).map(([routeKey, routeValue]) => {
    const door = NAV_ENTRIES.find((e) => e.viewKey === routeKey) || null;
    const kidsDoor = !door && KIDS_DOOR_KEYS.has(routeKey);
    return [
      routeKey,
      {
        route: routeValue,
        door: door
          ? { view: door.view, group: door.group, labelKey: door.labelKey, taps: 1 }
          : kidsDoor
            ? { view: routeValue, group: null, labelKey: null, scope: 'kids', taps: 1 }
            : null,
        taps: door || kidsDoor ? 1 : null,
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
        `entries (${census.length}; plan §1.1 says "17" but 6+5+5+3 = 19 — the plan text undercounts, the tree has 19)`,
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
  test('TAJWEED_COURSE sits in the read group (temporary home until Phase 5 Practise)', () => {
    const door = ROUTE_DOOR_MAP.TAJWEED_COURSE.door;
    assert.ok(door, 'TAJWEED_COURSE still has no nav door');
    assert.equal(door.taps, 1);
    assert.equal(door.group, 'nav.group.read');
    assert.equal(door.labelKey, 'nav.tajweedCourse');
  });

  test('ROOTS sits beside the Qur’an doors as their depth (until Phase 2 merges them)', () => {
    const door = ROUTE_DOOR_MAP.ROOTS.door;
    assert.ok(door, 'ROOTS still has no nav door');
    assert.equal(door.taps, 1);
    assert.equal(door.group, 'nav.group.read');
    assert.equal(door.labelKey, 'nav.roots');
  });

  test('Phase 1 closed exactly the two flagship orphans (14 → 12)', () => {
    assert.ok(!ORPHANS.includes('TAJWEED_COURSE'), 'TAJWEED_COURSE is still orphaned');
    assert.ok(!ORPHANS.includes('ROOTS'), 'ROOTS is still orphaned');
    assert.equal(ORPHANS.length, 12, `expected the 12 non-flagship orphans, got ${ORPHANS.length}`);
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
