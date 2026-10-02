/**
 * The agent map is generated, not hand-written: scripts/agent-map.mjs walks
 * js/ + data/*.json and emits TWO files.
 *
 *   docs/AGENT-MAP.md        the index an agent actually reads (spine, lookup
 *                            tables, pointers). Byte-capped below.
 *   docs/agent-map-full.md   the exhaustive dump: every file, every export,
 *                            three reverse indexes.
 *
 * It was one file. At 529 KB / 7,668 lines nobody could read it, an agent
 * opened it, drowned, and went back to grepping — the exact failure the map
 * was commissioned to stop. The split is enforced here, not by good
 * intentions: these tests pin full coverage and resolvable actions in the
 * dump, and pin the INDEX SMALL so it cannot quietly regrow.
 *
 * The spine is derived, never pinned: it is parsed from core/config/views.js
 * (VIEWS), core/config/nav.js (DOORS) and app/renderer.js (the eager/lazy
 * view tables). AGENTS.md rule 6 — derive from the single source of truth. A
 * hand-kept route table would be a second thing to forget.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAP = path.join(ROOT, 'docs', 'AGENT-MAP.md');
const FULL = path.join(ROOT, 'docs', 'agent-map-full.md');
const GEN = path.join(ROOT, 'scripts', 'agent-map.mjs');

/**
 * The index is for reading inside a context budget, so its size is a
 * correctness property, not a style preference. 24 KB is roughly four times
 * today's 8.9 KB: enough headroom for a few more sections, far too little to
 * hold the dump. Raise it deliberately or not at all.
 */
const MAX_INDEX_BYTES = 24 * 1024;

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

const rel = (full) => path.relative(ROOT, full).replaceAll(path.sep, '/');
/** The index an agent reads. */
const md = () => readFileSync(MAP, 'utf8');
/** The exhaustive dump. Per-file `###` entries and the reverse indexes live here. */
const full = () => readFileSync(FULL, 'utf8');

/** Backticked tokens on md bullet lines starting with the given label. */
function bullets(text, label) {
  const found = [];
  for (const m of text.matchAll(new RegExp(`^- ${label}: (.*)$`, 'gm'))) {
    for (const t of m[1].matchAll(/`([^`]+)`/g)) {
      const v = t[1].trim();
      if (!v || v === '—' || /\s|\$|\{|\}/.test(v)) continue;
      found.push(v);
    }
  }
  return found;
}

/** Static data-action="..." values straight from sources (no parser). */
function emittedFromSources() {
  const found = new Set();
  for (const full of walk(path.join(ROOT, 'js'), ['.js'])) {
    const src = readFileSync(full, 'utf8');
    for (const m of src.matchAll(/data-action\s*=\s*(['"`])(.*?)\1/g)) {
      const v = m[2].trim();
      if (!v || /\s|\$|\{|\}/.test(v)) continue;
      found.add(v);
    }
  }
  return found;
}

describe('agent-map', () => {
  test('every js/ module file appears in the dump', () => {
    const text = full();
    const listed = new Set([...text.matchAll(/^### `(.+?)`$/gm)].map((m) => m[1]));
    const missing = walk(path.join(ROOT, 'js'), ['.js'])
      .map(rel)
      .filter((r) => !listed.has(r));
    assert.deepEqual(missing, [], `js files missing from map: ${missing.join(', ')}`);
  });

  test('every data/*.json file appears in the dump', () => {
    const text = full();
    const listed = new Set([...text.matchAll(/^### `(.+?)`$/gm)].map((m) => m[1]));
    const files = readdirSync(path.join(ROOT, 'data'))
      .sort()
      .filter((n) => n.endsWith('.json') && !n.endsWith('.gz'))
      .map((n) => `data/${n}`);
    const missing = files.filter((r) => !listed.has(r));
    assert.deepEqual(missing, [], `data files missing from map: ${missing.join(', ')}`);
  });

  test('header counts match the tree (both files are freshly generated)', () => {
    const text = full();
    const m = text.match(/^- js modules: (\d+) — data files: (\d+) — tests: (\d+)$/m);
    assert.ok(m, 'map header counts line present');
    assert.equal(Number(m[1]), walk(path.join(ROOT, 'js'), ['.js']).length, 'js count');
    assert.equal(
      Number(m[2]),
      readdirSync(path.join(ROOT, 'data')).filter((n) => n.endsWith('.json') && !n.endsWith('.gz'))
        .length,
      'data count'
    );
  });

  test('map emits match sources exactly (nothing missed, nothing invented)', () => {
    const fromMap = new Set(bullets(full(), 'emits'));
    const fromSrc = emittedFromSources();
    const missed = [...fromSrc].filter((a) => !fromMap.has(a));
    const invented = [...fromMap].filter((a) => !fromSrc.has(a));
    assert.deepEqual(missed, [], `emitted actions missing from map: ${missed.join(', ')}`);
    assert.deepEqual(invented, [], `map lists actions no source emits: ${invented.join(', ')}`);
  });

  test('every data-action in the dump resolves to a handler or the allowlist', () => {
    const text = full();
    const emitted = new Set(bullets(text, 'emits'));
    const handled = new Set(bullets(text, 'handles').filter((a) => !a.startsWith('form:')));
    const allowSection = text.slice(text.indexOf('## Allowlist'));
    const allowlisted = new Set();
    if (!allowSection.includes('No allowlisted actions')) {
      for (const m of allowSection.matchAll(/^- `([^`]+)` — /gm)) {
        allowlisted.add(m[1]);
      }
    }
    assert.ok(
      allowlisted.size <= 12,
      `allowlist must stay small and justified, found ${allowlisted.size}`
    );
    for (const a of allowlisted) {
      assert.ok(emitted.has(a), `allowlisted action ${a} is stale (nothing emits it)`);
    }
    const dead = [...emitted].filter((a) => !handled.has(a) && !allowlisted.has(a));
    assert.deepEqual(dead, [], `actions with no handler: ${dead.join(', ')}`);
  });

  test('spot checks: known actions resolve to their owner files', () => {
    const text = full();
    for (const [action, owner] of [
      ['navigate', 'js/app/handlers/navigation.js'],
      ['tasbih-tap', 'js/app/handlers/tasbih.js'],
      ['surah-play', 'js/app/handlers/quranAudio.js'],
    ]) {
      const line = text.split('\n').find((l) => l.startsWith(`- \`${action}\`:`));
      assert.ok(line, `reverse index has ${action}`);
      assert.ok(line.includes(`\`${owner}\``), `${action} handled in ${owner}: ${line}`);
    }
  });

  test('both files regenerate byte-identical (deterministic)', () => {
    const beforeIndex = readFileSync(MAP);
    const beforeFull = readFileSync(FULL);
    execFileSync('node', [GEN], { cwd: ROOT, stdio: 'pipe' });
    assert.ok(
      beforeIndex.equals(readFileSync(MAP)),
      'regeneration changed docs/AGENT-MAP.md (the index)'
    );
    assert.ok(
      beforeFull.equals(readFileSync(FULL)),
      'regeneration changed docs/agent-map-full.md (the dump)'
    );
  });
});

describe('agent-map index (the readable one)', () => {
  test('the index stays small enough for an agent to actually read', () => {
    const bytes = statSync(MAP).size;
    assert.ok(
      bytes <= MAX_INDEX_BYTES,
      `docs/AGENT-MAP.md is ${(bytes / 1024).toFixed(1)} KB, over the ${MAX_INDEX_BYTES / 1024} KB cap. ` +
        'Move detail into docs/agent-map-full.md — the index is for reading, the dump is for searching. ' +
        'A larger index means nobody reads it and everyone greps again.'
    );
    // And the split must actually be a split.
    const dumpBytes = statSync(FULL).size;
    assert.ok(
      dumpBytes > bytes * 4,
      `the dump (${dumpBytes}B) should dwarf the index (${bytes}B); if they converged, the ` +
        'index has absorbed the dump and is unreadable again'
    );
  });

  test('the index points at the dump, and the dump back at the index', () => {
    assert.match(md(), /docs\/agent-map-full\.md/, 'index names the dump');
    assert.match(full(), /docs\/AGENT-MAP\.md/, 'dump names the index');
  });

  test('the spine derived every section and route from source', () => {
    const text = md();
    assert.ok(
      !text.includes('SPINE UNAVAILABLE'),
      'the generator could not read the route/section source of truth — the index says so and ' +
        'the generator exits non-zero'
    );
    const navSrc = readFileSync(path.join(ROOT, 'js/core/config/nav.js'), 'utf8');
    const sections = [...navSrc.matchAll(/^\s{4}entry:\s*'(\w+)'/gm)].map((m) => m[1]);
    assert.ok(sections.length > 0, 'nav.js exposes sections to compare against');
    const body = text.slice(text.indexOf('## 1.'), text.indexOf('## 2.'));
    for (const entry of sections) {
      assert.ok(body.includes(`\`${entry}\``), `spine omits section entry ${entry}`);
    }
    // Every label key the chrome uses must appear, in both the spine and the dump.
    const labels = [...navSrc.matchAll(/labelKey:\s*'([^']+)'/g)].map((m) => m[1]);
    for (const label of new Set(labels)) {
      assert.ok(body.includes(label), `spine omits chrome label ${label}`);
    }
  });

  test('the spine maps every route to a view module or admits it does not', () => {
    const text = md();
    const body = text.slice(text.indexOf('## 1.'), text.indexOf('## 2.'));
    assert.ok(
      !body.includes('**UNMAPPED**'),
      'a route in a chrome section has no view module in renderer.js — either the VIEW_TABLE / ' +
        'LAZY_VIEW_LOADERS entry is missing or the generator cannot parse it'
    );
    const viewsSrc = readFileSync(path.join(ROOT, 'js/core/config/views.js'), 'utf8');
    const at = viewsSrc.indexOf('VIEWS = Object.freeze(');
    const block = viewsSrc.slice(at, viewsSrc.indexOf('});', at));
    const routeKeys = [...block.matchAll(/([A-Z_][A-Z0-9_]*)\s*:\s*'[^']+'/g)].map((m) => m[1]);
    for (const key of routeKeys) {
      assert.ok(body.includes(key), `spine omits route ${key} (claimed by no section?)`);
    }
  });

  test('every subsystem link in the index has an anchor in the dump', () => {
    const index = md();
    const dump = full();
    const anchors = [...index.matchAll(/\[open\]\(agent-map-full\.md#([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(
      anchors.length >= 8,
      `expected a subsystem link per directory, found ${anchors.length}`
    );
    const dumpHeadings = new Set([...dump.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()));
    for (const a of anchors) {
      assert.ok(dumpHeadings.has(a), `index links to #${a}, which is not a heading in the dump`);
    }
  });

  test('the index names the real source of truth for each change type', () => {
    const text = md();
    // Each of these is a place an agent gets it wrong because the rule lives
    // only in a document it may not have read. Naming them here is the point
    // of the index.
    for (const src of [
      'js/core/config/views.js',
      'js/core/config/nav.js',
      'js/app/renderer.js',
      'js/core/i18n/en.js',
      'js/core/i18n/ar.js',
      'js/core/config/sanitize.js',
      'assets/css/variables.css',
      'sw.js',
      'js/app/handlers/',
    ]) {
      assert.ok(text.includes(src), `index does not name ${src} as a source of truth`);
    }
  });
});
