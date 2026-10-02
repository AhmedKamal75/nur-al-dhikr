/**
 * The agent map is generated, not hand-written: scripts/agent-map.mjs walks
 * js/ + data/*.json and emits docs/AGENT-MAP.md. These tests pin the three
 * properties that make the map trustworthy: full coverage, resolvable
 * actions, and byte-identical regeneration (determinism).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAP = path.join(ROOT, 'docs', 'AGENT-MAP.md');
const GEN = path.join(ROOT, 'scripts', 'agent-map.mjs');

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
const md = () => readFileSync(MAP, 'utf8');

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
  test('every js/ module file appears in the map', () => {
    const text = md();
    const listed = new Set([...text.matchAll(/^### `(.+?)`$/gm)].map((m) => m[1]));
    const missing = walk(path.join(ROOT, 'js'), ['.js'])
      .map(rel)
      .filter((r) => !listed.has(r));
    assert.deepEqual(missing, [], `js files missing from map: ${missing.join(', ')}`);
  });

  test('every data/*.json file appears in the map', () => {
    const text = md();
    const listed = new Set([...text.matchAll(/^### `(.+?)`$/gm)].map((m) => m[1]));
    const files = readdirSync(path.join(ROOT, 'data'))
      .sort()
      .filter((n) => n.endsWith('.json') && !n.endsWith('.gz'))
      .map((n) => `data/${n}`);
    const missing = files.filter((r) => !listed.has(r));
    assert.deepEqual(missing, [], `data files missing from map: ${missing.join(', ')}`);
  });

  test('map header counts match the tree (map is freshly generated)', () => {
    const text = md();
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
    const fromMap = new Set(bullets(md(), 'emits'));
    const fromSrc = emittedFromSources();
    const missed = [...fromSrc].filter((a) => !fromMap.has(a));
    const invented = [...fromMap].filter((a) => !fromSrc.has(a));
    assert.deepEqual(missed, [], `emitted actions missing from map: ${missed.join(', ')}`);
    assert.deepEqual(invented, [], `map lists actions no source emits: ${invented.join(', ')}`);
  });

  test('every data-action in the map resolves to a handler or the allowlist', () => {
    const text = md();
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
    const text = md();
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

  test('map regenerates byte-identical (deterministic)', () => {
    const before = readFileSync(MAP);
    execFileSync('node', [GEN], { cwd: ROOT, stdio: 'pipe' });
    const after = readFileSync(MAP);
    assert.ok(before.equals(after), 'regeneration changed docs/AGENT-MAP.md');
  });
});
