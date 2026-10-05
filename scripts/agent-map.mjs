#!/usr/bin/env node
/**
 * scripts/agent-map.mjs — GENERATOR for docs/AGENT-MAP.md (the agent map).
 *
 * Scans js/ + data/*.json and emits a what-and-where map: for every file
 * its subsystem, one-line job, exported functions (+ JSDoc first lines),
 * data-action surfaces emitted/handled, i18n keys touched and routes
 * touched — grouped by subsystem with a reverse index (job keywords,
 * actions and exports back to files).
 *
 * Plain node, no dependencies: `node scripts/agent-map.mjs`.
 * Output is deterministic (sorted, no timestamps) so regeneration is
 * byte-identical; tests/agent-map.test.js pins that.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
/**
 * TWO outputs, because one was unreadable.
 *
 * The single original file grew to ~530 KB / 7,600 lines: a per-file dump plus
 * three reverse indexes (action, export, job keyword). It is authoritative and
 * nobody can read it — an agent handed a context budget opens it, drowns, and
 * goes back to grepping, which is the exact failure this map was commissioned
 * to stop.
 *
 * So: OUT is the INDEX an agent actually reads (spine + counts + pointers,
 * bounded by tests/agent-map.test.js so it cannot regrow), and FULL_OUT is the
 * exhaustive dump, read only when a task names a specific file or action.
 * Both are generated from the same scan, so they cannot disagree.
 */
const OUT = path.join(ROOT, 'docs', 'AGENT-MAP.md');
const FULL_OUT = path.join(ROOT, 'docs', 'agent-map-full.md');

/** Emitted actions with no static handler; each needs a reason. */
const ALLOWLIST = [
  // No entries: every static data-action currently resolves to a click
  // handler, a change/input registry selector, or an events.js special.
  // If a genuinely dynamic surface (e.g. data-action="${...}") ever needs
  // a static entry, add { action, reason } here — never silently.
];

/** Recursively collect files with one of the given extensions, sorted. */
function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Scan source into per-line-start brace depths, tolerating line/block
 * comments, ' " ` strings (with ${} code spans) and /regex/ literals.
 * Returns depths plus two masked variants:
 * - code: comments blanked, strings INTACT (for content extraction:
 *   data-action, t(), VIEWS, data-view).
 * - bare: comments AND strings blanked (for structural parsing:
 *   handler-table keys, exports — no false positives from prose).
 */
function scan(src) {
  const depths = new Map();
  let code = '';
  let bare = '';
  let depth = 0;
  let i = 0;
  let line = 1;
  let mode = null; // null | 'line' | 'block' | "'" | '"' | '`'
  const tplStack = [];
  let lastSig = ''; // last significant code char (for regex detection)
  let lastWord = ''; // trailing identifier chars before current position
  depths.set(1, 0);
  const newline = () => {
    line += 1;
    depths.set(line, depth);
    code += '\n';
    bare += '\n';
    lastSig = '\n';
  };
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1] ?? '';
    if (mode === null) {
      if (c === '/' && d === '/') {
        mode = 'line';
        code += '  ';
        bare += '  ';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        mode = 'block';
        code += '  ';
        bare += '  ';
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        mode = c;
        code += c;
        bare += ' ';
        lastWord = '';
        i += 1;
        continue;
      }
      if (c === '/' && '=(,:[!&|?;{}+\n'.includes(lastSig) && d !== '/' && d !== '*') {
        const wordOk =
          /^(return|typeof|case|in|of|do|else|yield|await|void|delete|instanceof)$/.test(lastWord);
        const charOk = '=(,:[!&|?;{}+\n'.includes(lastSig);
        if (charOk || wordOk) {
          // Try to consume a regex literal: / body / flags
          let j = i + 1;
          let inClass = false;
          let closed = false;
          while (j < src.length) {
            const rc = src[j];
            if (rc === '\\') {
              j += 2;
              continue;
            }
            if (rc === '\n') break;
            if (rc === '[') inClass = true;
            else if (rc === ']') inClass = false;
            else if (rc === '/' && !inClass) {
              closed = true;
              break;
            }
            j += 1;
          }
          if (closed) {
            let k = j + 1;
            while (k < src.length && /[a-z]/.test(src[k])) k += 1;
            const chunk = src.slice(i, k);
            const masked = chunk
              .split('\n')
              .map((l) => ' '.repeat(l.length))
              .join('\n');
            code += masked;
            bare += masked;
            i = k;
            lastSig = 'x';
            lastWord = '';
            continue;
          }
        }
      }
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (tplStack.length > 0 && depth === tplStack[tplStack.length - 1]) {
          tplStack.pop();
          mode = '`';
        }
      }
      if (c === '\n') {
        newline();
        i += 1;
        continue;
      }
      code += c;
      bare += c;
      if (/\s/.test(c)) {
        if (c !== '\n') lastSig = lastSig === '\n' ? '\n' : lastSig;
      } else {
        lastSig = c;
        lastWord = /[A-Za-z0-9_$]/.test(c) ? lastWord + c : '';
      }
      i += 1;
    } else if (mode === 'line') {
      if (c === '\n') {
        mode = null;
        newline();
      } else {
        code += ' ';
        bare += ' ';
      }
      i += 1;
    } else if (mode === 'block') {
      if (c === '*' && d === '/') {
        mode = null;
        code += '  ';
        bare += '  ';
        i += 2;
        continue;
      }
      if (c === '\n') newline();
      else {
        code += ' ';
        bare += ' ';
      }
      i += 1;
    } else {
      const q = mode;
      if (c === '\\') {
        code += src.slice(i, i + 2);
        bare += '  ';
        i += 2;
        continue;
      }
      if (c === q) {
        mode = null;
        code += c;
        bare += ' ';
        i += 1;
        continue;
      }
      if (q === '`' && c === '$' && d === '{') {
        tplStack.push(depth);
        depth += 1;
        code += '${';
        bare += '${';
        lastSig = '{';
        lastWord = '';
        mode = null;
        i += 2;
        continue;
      }
      if (c === '\n') newline();
      else {
        code += c;
        bare += ' ';
      }
      i += 1;
    }
  }
  return { depths, code, bare };
}

/** Top-level keys of `export const NAME = { ... }` in a scanned file. */
function blockKeys(fileLines, depths, src, constName) {
  const m = src.match(new RegExp(`export const ${constName}\\s*=\\s*\\{`));
  if (!m) return [];
  const braceLine = src.slice(0, m.index + m[0].length - 1).split('\n').length;
  const base = (depths.get(braceLine) ?? 0) + 1;
  const keys = [];
  for (let ln = braceLine + 1; ln <= fileLines.length; ln += 1) {
    const dl = depths.get(ln);
    if (dl === undefined) continue;
    // The block has ended: anything at a shallower depth belongs to a
    // later top-level form (helpers, other handler tables). Stop here —
    // collecting past this point is how change-registry { sel, run }
    // entries once polluted the click-handler list.
    if (dl < base) break;
    if (dl === base) {
      const km = fileLines[ln - 1].match(/^\s*['"`]?([A-Za-z0-9_-]+)['"`]?\s*:/);
      if (km) keys.push(km[1]);
    }
  }
  return keys;
}

/** One-line job from the file's header comment. */
function headerJob(src) {
  let block = null;
  const head = src.replace(/^\uFEFF/, '').replace(/^\s+/, '');
  if (head.startsWith('/**') || head.startsWith('/*')) {
    const end = head.indexOf('*/');
    if (end > 0) block = head.slice(0, end);
  } else if (head.startsWith('//')) {
    block = head
      .split('\n')
      .filter((l) => l.trimStart().startsWith('//'))
      .join('\n');
  }
  if (!block) return '(no header comment)';
  const lines = block
    .split('\n')
    .map((l) =>
      l
        .trim()
        .replace(/^\*\s?/, '')
        .replace(/^\/\/\s?/, '')
        .trim()
    )
    .filter((l) => l.length > 0 && l !== '/' && l !== '/**');
  if (lines.length === 0) return '(empty header comment)';
  let start = 0;
  const fileToken = lines[0].match(
    /^[A-Za-z0-9_@./-]+\.(js|mjs|json)\s*(\([^)]*\))?\s*(—|--|–|:)?\s*(.*)$/
  );
  if (fileToken) {
    if (fileToken[4]) lines[0] = fileToken[4];
    else start = 1;
  }
  const jobLines = lines.slice(start, start + 3);
  if (jobLines.length === 0) return '(header names file only — no job line)';
  return truncate(jobLines.join(' '), 200);
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** First content line of a JSDoc block (skips @tags when prose follows). */
function docFirstLine(block) {
  const lines = block
    .replace(/^\/\*\*\s?/, '')
    .split('\n')
    .map((l) =>
      l
        .trim()
        .replace(/^\*\s?/, '')
        .replace(/\s*\*\/\s*$/, '')
        .trim()
    )
    .filter((l) => l.length > 0);
  if (lines.length === 0) return '';
  const prose = lines.find((l) => !l.startsWith('@'));
  return truncate(prose ?? lines[0], 120);
}

/** Exported names with kinds and JSDoc first lines. */
function fileExports(src) {
  const out = [];
  const re =
    /export\s+(async\s+function\s+(\w+)|function\s+(\w+)|const\s+(\w+)|class\s+(\w+)|default\b|\{([^}]*)\})/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[2] || m[3]) {
      out.push({ name: m[2] ?? m[3], kind: 'function', doc: jsdocBefore(src, m.index) });
    } else if (m[4]) {
      const after = src.slice(re.lastIndex, re.lastIndex + 40);
      const kind = /^\s*=\s*\{/.test(after)
        ? 'object'
        : /^\s*=\s*(\(|async\s*\(|async\s+\w|\(?[A-Za-z0-9_{[$][^=]*=>)/.test(after)
          ? 'function'
          : 'const';
      out.push({ name: m[4], kind, doc: jsdocBefore(src, m.index) });
    } else if (m[5]) {
      out.push({ name: m[5], kind: 'class', doc: jsdocBefore(src, m.index) });
    } else if (m[0].endsWith('default')) {
      out.push({ name: 'default', kind: 'default', doc: jsdocBefore(src, m.index) });
    } else if (m[6] !== undefined) {
      for (const part of m[6].split(',')) {
        const t = part.trim();
        if (!t) continue;
        const am = t.match(/^(\w+)\s+as\s+(\w+)$/);
        out.push({ name: am ? am[2] : t, kind: 're-export', doc: '' });
      }
    }
  }
  return out;
}

/** JSDoc block immediately preceding index (whitespace only between). */
function jsdocBefore(src, index) {
  const before = src.slice(0, index).trimEnd();
  if (!before.endsWith('*/')) return '';
  const start = before.lastIndexOf('/**');
  if (start < 0) return '';
  return docFirstLine(before.slice(start));
}

/** Static data-action="..." values (skips ${} templates). */
function emittedActions(code) {
  const found = new Set();
  const re = /data-action\s*=\s*(['"`])((?:(?!\1)[^$`{}])*?)\1/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const v = m[2].trim();
    if (!v || /\s/.test(v) || v.includes('$') || v.includes('{')) continue;
    found.add(v);
  }
  return [...found].sort();
}

/** Static t('key') / t("key") keys. */
function i18nKeys(code) {
  const found = new Set();
  const re = /\bt\(\s*(['"`])((?:(?!\1)[^$`\\{}])*?)\1/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const v = m[2].trim();
    if (!v || /\s/.test(v) || v.includes('$') || v.includes('{')) continue;
    found.add(v);
  }
  return [...found].sort();
}

/** Routes: VIEWS.NAME refs, #/route literals, data-view values. */
function routeRefs(code) {
  const found = new Set();
  for (const m of code.matchAll(/VIEWS\.([A-Z0-9_]+)/g)) found.add(`VIEWS.${m[1]}`);
  for (const m of code.matchAll(/#\/([a-z0-9][a-z0-9-]*)/g)) found.add(`#/${m[1]}`);
  for (const m of code.matchAll(/data-view\s*=\s*(['"`])((?:(?!\1)[^$`{}])*?)\1/g)) {
    const v = m[2].trim();
    if (v && !/\s/.test(v) && !v.includes('$')) found.add(`view:${v}`);
  }
  return [...found].sort();
}

/** change/input registry selectors: sel: '[data-action="x"]' etc. */
function registryActions(code) {
  const found = new Set();
  for (const m of code.matchAll(/sel\s*:\s*(['"`])((?:(?!\1).)*?)\1/g)) {
    for (const a of m[2].matchAll(/data-action="([^"]+)"/g)) found.add(a[1]);
  }
  return [...found].sort();
}

/** Subsystem bucket for a js/ relative path. */
function subsystem(rel) {
  const parts = rel.split('/');
  if (parts[0] !== 'js') return 'data';
  if (parts[1] === 'app.js') return 'app';
  if (parts[1] === 'views') return 'views';
  if (parts[1] === 'domain') return 'domain';
  if (parts[1] === 'ui') return 'ui';
  if (parts[1] === 'services') return 'services';
  if (parts[1] === 'app' && parts[2] === 'handlers') return 'app/handlers';
  if (parts[1] === 'app') return 'app';
  if (parts[1] === 'core' && parts.length > 3) return `core/${parts[2]}`;
  return 'core';
}

const SUBSYSTEM_BLURBS = {
  app: 'wiring + event handlers: boot, render dispatch, delegation, feature runners.',
  'app/handlers': 'feature-scoped click-handler maps merged by app/events.js.',
  core: 'state container, hash router, config, i18n, storage, schema, utils.',
  'core/config': 'routes (views.js), chrome doors (nav.js), defaults, sanitizer.',
  'core/state': 'store + reducer + slices + selectors + persistence restore.',
  'core/i18n': 'bilingual dictionaries (en/ar).',
  'core/idb': 'IndexedDB open helpers.',
  domain: 'pure logic: no DOM, no store; core-only imports (compass sensor excepted).',
  services: 'side-effect owners: audio, notifications, persistence helpers.',
  ui: 'dumb chrome primitives: toasts, modals, cards, shells.',
  views: 'pure state→HTML templates + their pure helpers.',
  data: 'offline-first corpora consumed by domain/app layers.',
};

/** md-safe inline text (no backticks/pipes/asterisks/newlines). */
function safe(s) {
  return String(s).replace(/[`|*]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * A GFM table padded the way `prettier --parser markdown` pads one, because
 * `npm run check` runs `prettier --check` over docs/*.md and the generator's
 * output has to survive it. The rule is width = max(3, longest cell), every
 * cell padded to that width, delimiter row all dashes. Derived empirically
 * (prettier 3.9) rather than by shelling out to prettier, so the generator
 * stays plain-node and deterministic with no dependency.
 */
function mdTable(headers, rows) {
  const all = [headers, ...rows];
  const widths = headers.map((_, i) => Math.max(3, ...all.map((r) => String(r[i] ?? '').length)));
  const line = (cells) =>
    `| ${widths.map((w, i) => String(cells[i] ?? '').padEnd(w)).join(' | ')} |`;
  return [line(headers), `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`, ...rows.map(line)];
}

/* ------------------------------------------------------------------ *
 * The spine: route -> section -> view module, DERIVED from the sources
 * that already own it (AGENTS.md rule 6).
 *
 * views.js owns the route ids, nav.js owns the seven sections, renderer.js
 * owns which module renders each route (and whether it is eager or lazy).
 * Nothing here is pinned: if the chrome gains an eighth section or a route
 * moves, the index moves with it on the next run. A hand-kept route table
 * would be a second thing to forget, which is how this file became
 * unreadable in the first place.
 *
 * Every parser degrades LOUDLY. A silent partial parse is worse than a
 * missing one: an index that confidently lists 30 of 34 routes is read as
 * "the other four do not exist".
 * ------------------------------------------------------------------ */

/** Extract a balanced `{...}` / `[...]` block starting at `openIdx`. */
function blockAt(src, openIdx) {
  const open = src[openIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = openIdx; i < src.length; i += 1) {
    if (src[i] === open) depth += 1;
    else if (src[i] === close) {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return null;
}

/** VIEWS: the route-id -> route-value map from core/config/views.js. */
function parseViews(src) {
  const at = src.indexOf('VIEWS = Object.freeze(');
  if (at < 0) return null;
  const block = blockAt(src, src.indexOf('{', at));
  if (!block) return null;
  const out = new Map();
  for (const m of block.matchAll(/([A-Z_][A-Z0-9_]*)\s*:\s*'([^']+)'/g)) out.set(m[1], m[2]);
  return out.size > 0 ? out : null;
}

/**
 * DOORS: the section map from core/config/nav.js, in chrome order.
 *
 * `problems` is collected, not thrown: the caller reports every structural
 * complaint at once, because an agent fixing chrome needs the whole list, not
 * the first one it tripped over.
 */
function parseDoors(src, views, problems) {
  const at = src.indexOf('DOORS = Object.freeze(');
  if (at < 0) return null;
  const block = blockAt(src, src.indexOf('[', at));
  if (!block) return null;
  const chunks = block.split(/entry:\s*'/).slice(1);
  const doors = [];
  for (const chunk of chunks) {
    const key = chunk.slice(0, chunk.indexOf("'"));
    const viewKey = chunk.match(/view:\s*VIEWS\.([A-Z_][A-Z0-9_]*)/)?.[1];
    const labelKey = chunk.match(/labelKey:\s*'([^']+)'/)?.[1];
    const icon = chunk.match(/icon:\s*'([^']+)'/)?.[1];
    if (!viewKey || !views.has(viewKey)) return null;
    // A section's entry IS its own route. Renaming one without the other
    // produces a chrome entry that links somewhere nobody declared, and the
    // index would print it as fact — so this is checked, not assumed. It also
    // keeps the index honest when a test compares it against nav.js: a
    // test that regenerates both sides together cannot catch a bad rename,
    // because both move in lockstep. This check can.
    if (key !== viewKey) {
      problems.push(
        `nav.js section ${key} declares entry: '${key}' but view: VIEWS.${viewKey} — ` +
          "a section's entry must be its own route"
      );
    }
    if (!views.has(key)) {
      problems.push(`nav.js section entry '${key}' is not a key in VIEWS (views.js)`);
    }
    const members = [];
    // Members are written with their fields in ANY order
    // (`{ route: 'MOOD', labelKey: 'title.mood', taps: 1, via: 'main-menu' }`),
    // so match the object literal and read each field out of it. The previous
    // pattern demanded `taps` immediately after `route`, which silently matched
    // NOTHING for every member that declares a labelKey first — those routes
    // were dropped from the spine entirely, along with their labels.
    for (const m of chunk.matchAll(/\{\s*route:\s*'([A-Z_][A-Z0-9_]*)'([^}]*)\}/g)) {
      const rest = m[2];
      const taps = /taps:\s*(\d+)/.exec(rest)?.[1];
      if (taps == null) continue; // not a member row
      const via = /via:\s*(null|'([^']+)')/.exec(rest);
      members.push({
        route: m[1],
        taps: Number(taps),
        via: via?.[2] ?? null,
        // A member may carry its OWN label key (title.mood, nav.audio,
        // quiz.title, ...). Dropping it meant the spine printed only the
        // section's key, so most chrome label keys never appeared in the index
        // at all — the map an agent reads to find a label could not tell them
        // the label existed.
        labelKey: /labelKey:\s*'([^']+)'/.exec(rest)?.[1],
        // Tile-depth members answer a bare link with an honest 404, so the
        // drawer offers no direct row for them.
        direct: !/direct:\s*false/.test(rest),
      });
    }
    doors.push({ entry: key, viewKey, view: views.get(viewKey), labelKey, icon, members });
  }
  return doors.length > 0 ? doors : null;
}

/**
 * renderer.js: which module renders each route, eager vs lazy. Static routes
 * resolve through the top-of-file import statements; lazy routes carry their
 * module path in the dynamic import() right in the table entry.
 */
function parseRouteModules(src) {
  const imported = new Map();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.\.\/views\/[^']+)'/g)) {
    for (const name of m[1].split(',')) {
      const id = name
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (id) imported.set(id, m[2]);
    }
  }
  const eager = new Map();
  const lazy = new Map();
  const staticAt = src.indexOf('VIEW_TABLE = {');
  if (staticAt > 0) {
    const block = blockAt(src, src.indexOf('{', staticAt)) ?? '';
    for (const m of block.matchAll(/\[VIEWS\.([A-Z_][A-Z0-9_]*)\]:\s*([A-Za-z0-9_$]+)/g)) {
      const mod = imported.get(m[2]);
      if (mod) eager.set(m[1], mod.replace('../views/', 'js/views/'));
    }
  }
  const lazyAt = src.indexOf('LAZY_VIEW_LOADERS = {');
  if (lazyAt > 0) {
    // Entries can wrap onto the next line, so match across newlines.
    const rest = src.slice(lazyAt);
    for (const m of rest.matchAll(
      /\[VIEWS\.([A-Z_][A-Z0-9_]*)\]:\s*\(\)\s*=>\s*(?:\n\s*)?import\('\.\.\/views\/([^']+)'\)/g
    )) {
      lazy.set(m[1], `js/views/${m[2]}`);
    }
  }
  return { eager, lazy };
}

/** The full spine, or an explicit failure the caller must surface. */
function buildSpine() {
  const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
  const problems = [];
  let views;
  let doors;
  let modules;
  try {
    views = parseViews(read('js/core/config/views.js'));
    if (!views) problems.push('could not parse VIEWS from js/core/config/views.js');
    doors = parseDoors(read('js/core/config/nav.js'), views ?? new Map(), problems);
    if (!doors) problems.push('could not parse DOORS from js/core/config/nav.js');
    modules = parseRouteModules(read('js/app/renderer.js'));
    if (modules.eager.size + modules.lazy.size === 0) {
      problems.push('could not parse view tables from js/app/renderer.js');
      modules = { eager: new Map(), lazy: new Map() };
    }
  } catch (err) {
    problems.push(`spine build threw: ${String(err)}`);
    return {
      ok: false,
      problems,
      views: new Map(),
      doors: [],
      modules: { eager: new Map(), lazy: new Map() },
    };
  }
  const placed = new Set(doors.flatMap((d) => d.members.map((m) => m.route)));
  const orphans = [...views.keys()].filter((k) => !placed.has(k));
  return { ok: problems.length === 0, problems, views, doors, modules, orphans };
}

function backtickList(items) {
  if (items.length === 0) return '—';
  return items.map((x) => `\`${safe(x)}\``).join(', ');
}

function main() {
  const jsFiles = walk(path.join(ROOT, 'js'), ['.js']);
  const dataFiles = readdirSync(path.join(ROOT, 'data'))
    .sort()
    .filter((n) => n.endsWith('.json') && !n.endsWith('.gz'))
    .map((n) => path.join(ROOT, 'data', n));

  const entries = [];
  for (const full of jsFiles) {
    const rel = path.relative(ROOT, full).replaceAll(path.sep, '/');
    const src = readFileSync(full, 'utf8');
    const { depths, code, bare } = scan(src);
    // Handler-table keys are string literals themselves, so match them on
    // `code` (comments masked, strings intact); exports stay on `bare`
    // (no false positives from prose that mentions the word "export").
    const lines = code.split('\n');
    const isHandler = rel.startsWith('js/app/handlers/');
    const isForms = rel === 'js/app/forms.js';
    const isEvents = rel === 'js/app/events.js';
    const handledClick = isHandler ? blockKeys(lines, depths, src, 'clickHandlers') : [];
    const handledForms = isForms ? blockKeys(lines, depths, src, 'formHandlers') : [];
    const handledChange = isHandler ? registryActions(code) : [];
    const specials = [];
    if (isEvents) {
      for (const m of code.matchAll(/action\s*===\s*['"`]([a-z0-9][a-z0-9-]*)['"`]/g)) {
        specials.push(m[1]);
      }
    }
    entries.push({
      rel,
      sub: subsystem(rel),
      job: headerJob(src),
      exports: fileExports(bare),
      emits: emittedActions(code),
      emitsDynamic: /data-action\s*=\s*["'`][^"'`]*\$\{/.test(code),
      handlesClick: [...handledClick].sort(),
      handlesForms: [...handledForms].sort(),
      handlesChange: [...handledChange].sort(),
      specials: [...new Set(specials)].sort(),
      i18n: i18nKeys(code),
      routes: routeRefs(code),
    });
  }

  if (entries.length !== jsFiles.length) {
    console.error(`agent-map: coverage failure (${entries.length}/${jsFiles.length})`);
    process.exit(1);
  }

  // Data files: role + shape (top-level keys or item count).
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(path.join(ROOT, 'data', 'catalog.json'), 'utf8'));
  } catch {
    catalog = null;
  }
  const libByFile = new Map();
  for (const lib of catalog?.libraries ?? []) {
    if (lib.file) libByFile.set(path.basename(lib.file), lib.id);
  }
  const dataEntries = dataFiles.map((full) => {
    const rel = path.relative(ROOT, full).replaceAll(path.sep, '/');
    const raw = readFileSync(full, 'utf8');
    let shape = 'unparsed';
    let role = 'corpus';
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) {
        shape = `array[${json.length}]`;
      } else if (json && typeof json === 'object') {
        const keys = Object.keys(json);
        shape = `object{${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ` +${keys.length - 8} more` : ''}}`;
        if (typeof json.schema_version !== 'undefined') shape += ` schema_v${json.schema_version}`;
      }
    } catch {
      shape = 'unparsed JSON';
    }
    const base = path.basename(rel);
    if (libByFile.has(base)) role = `library:${libByFile.get(base)} (see data/catalog.json)`;
    else if (base === 'catalog.json') role = 'index of library corpora';
    else if (base === 'manifest.json')
      role = 'generated integrity manifest (scripts/data-manifest.mjs)';
    else if (base === 'mushaf-meta.json') role = 'mushaf page inventory';
    else if (base === 'quran-meta.json') role = 'surah metadata (names, ayah counts)';
    else if (base === 'prayer-methods.json') role = 'calculation-method presets + provenance';
    else if (base === 'reciters.json' || base === 'audio-providers.json')
      role = 'audio source registry';
    else if (base === 'tafsir-editions.json') role = 'tafsir edition registry';
    entries.push({ rel, sub: 'data', job: role, data: true, shape });
    return { rel, role, shape };
  });

  // Tests appendix: header job + js/ modules pinned (what each test covers).
  const testFiles = walk(path.join(ROOT, 'tests'), ['.test.js']).filter(
    (f) => !f.includes(`${path.sep}e2e${path.sep}`)
  );
  const testEntries = testFiles.map((full) => {
    const rel = path.relative(ROOT, full).replaceAll(path.sep, '/');
    const src = readFileSync(full, 'utf8');
    const pins = new Set();
    for (const m of src.matchAll(/from\s*['"`]([^'"`]+)['"`]/g)) {
      const spec = m[1];
      if (spec.startsWith('../js/') || spec.startsWith('./helpers/')) pins.add(spec);
    }
    return { rel, job: headerJob(src), pins: [...pins].sort() };
  });

  // Reverse indexes.
  const byActionEmit = new Map();
  const byActionHandle = new Map();
  for (const e of entries) {
    if (e.data) continue;
    for (const a of e.emits) {
      if (!byActionEmit.has(a)) byActionEmit.set(a, []);
      byActionEmit.get(a).push(e.rel);
    }
    for (const a of [...e.handlesClick, ...e.handlesChange, ...e.specials]) {
      if (!byActionHandle.has(a)) byActionHandle.set(a, []);
      byActionHandle.get(a).push(e.rel);
    }
    for (const a of e.handlesForms) {
      const key = `form:${a}`;
      if (!byActionHandle.has(key)) byActionHandle.set(key, []);
      byActionHandle.get(key).push(e.rel);
    }
  }
  const byExport = new Map();
  for (const e of entries) {
    if (e.data) continue;
    for (const x of e.exports) {
      if (!byExport.has(x.name)) byExport.set(x.name, []);
      byExport.get(x.name).push(e.rel);
    }
  }
  const STOP = new Set(
    'the a an and are for from with that this these those into only when where which while what your you all any each every both few more most other some such than then there their they them its his her she him not but also just about into over after before between under than via pure stays keeps makes takes uses used using view state data app file module handler render'.split(
      ' '
    )
  );
  const byKeyword = new Map();
  for (const e of entries) {
    if (e.data) continue;
    const words = new Set(
      (e.job + ' ' + e.exports.map((x) => x.name).join(' '))
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOP.has(w))
    );
    for (const w of words) {
      if (!byKeyword.has(w)) byKeyword.set(w, []);
      byKeyword.get(w).push(e.rel);
    }
  }

  const allowSet = new Set(ALLOWLIST.map((a) => a.action));
  const unresolved = [...byActionEmit.keys()]
    .filter((a) => !byActionHandle.has(a) && !allowSet.has(a))
    .sort();
  if (unresolved.length > 0) {
    console.error(`agent-map: ${unresolved.length} emitted actions resolve nowhere:`);
    for (const a of unresolved)
      console.error(`  ${a} (emitted by ${(byActionEmit.get(a) ?? []).join(', ')})`);
    process.exit(1);
  }

  // ---------------------------------------------------------------- index
  // The file an agent actually reads. Spine first, then the lookup tables,
  // then pointers into the exhaustive dump. Deliberately small: the byte
  // budget is enforced by tests/agent-map.test.js, so this cannot quietly
  // regrow into the unreadable wall it replaced.
  const spine = buildSpine();
  const jsCount = entries.filter((e) => !e.data).length;
  const I = [];
  I.push('# AGENT-MAP — the project in one page');
  I.push('');
  I.push(
    'GENERATED — do not hand-edit. Regenerate with `node scripts/agent-map.mjs` (plain node, no args).'
  );
  I.push('');
  I.push(
    'Read this file first. It is deliberately short: the spine, the lookup tables and the ' +
      'counted inventories. For one specific module’s exports, one `data-action`’s handler, or ' +
      'one keyword’s owners, read the exhaustive dump next.'
  );
  I.push('');
  I.push(
    `- js modules: ${jsCount} — data files: ${dataEntries.length} — tests: ${testEntries.length}`
  );
  I.push(
    `- exhaustive dump: \`docs/agent-map-full.md\` (${entries.length + testEntries.length} entries)`
  );
  I.push('');

  I.push('## 1. The spine: chrome section → routes → view module');
  I.push('');
  I.push(
    'Seven sections own the chrome. Each row is derived from `js/core/config/nav.js` (DOORS), ' +
      'whose route ids come from `js/core/config/views.js` (VIEWS) and whose view modules come ' +
      'from `js/app/renderer.js` (VIEW_TABLE eager / LAZY_VIEW_LOADERS lazy). Nothing below is ' +
      'pinned here — change the source and regenerate.'
  );
  I.push('');
  if (!spine.ok) {
    I.push('> **SPINE UNAVAILABLE.** The generator could not read the source of truth:');
    for (const p of spine.problems) I.push(`> - ${p}`);
    I.push('>');
    I.push('> The rest of this index is still accurate, but do NOT trust the table below until');
    I.push(
      '> this is fixed — an index that lists 30 of 34 routes reads as "the rest do not exist".'
    );
  } else {
    const spineRows = [];
    spine.doors.forEach((d, i) => {
      for (const m of d.members) {
        const mod = spine.modules.eager.get(m.route) ?? spine.modules.lazy.get(m.route);
        const eager = spine.modules.eager.has(m.route);
        // prettier rewrites *x* to _x_ inside a table cell, so emit the form it wants.
        const routeCell = `${m.route}${m.direct ? '' : ' _(tile-depth)_'}`;
        // When a member names its own label, show it: the section key alone
        // hides that e.g. the QURAN section's word-by-word mode is labelled
        // `quran.modeWord`, not the section's own key.
        const ownLabel =
          m.labelKey && m.labelKey !== d.labelKey ? ` _(${safe(m.labelKey)})_` : '';
        spineRows.push([
          String(i + 1),
          `\`${safe(d.labelKey ?? '—')}\``,
          `\`${safe(d.entry)}\` → \`#/${safe(d.view)}\``,
          `${routeCell}${ownLabel}${mod ? ` → \`${safe(mod)}\`${eager ? '' : ' _(lazy)_'}` : ' → **UNMAPPED**'}`,
          String(m.taps),
          m.via ? `\`${m.via}\`` : '— (is the tap)',
        ]);
      }
    });
    I.push(
      ...mdTable(
        ['#', 'section (label key)', 'entry route', 'routes under it', 'tap', 'via'],
        spineRows
      )
    );
    I.push('');
    I.push(
      `_(tile-depth)_ members need a parameter, so a bare link answers an honest 404 and the ` +
        `drawer offers no direct row for them — the section landing's own tiles carry them. ` +
        `_(lazy)_ routes are \`import()\`-ed on first visit, not statically imported.`
    );
  }
  I.push('');
  if (spine.orphans && spine.orphans.length > 0) {
    I.push(
      `Routes in VIEWS claimed by no section: ${spine.orphans.map((o) => `\`${o}\``).join(', ')}. ` +
        `Deep-linkable but not in the chrome — each needs its justification in ` +
        '`tests/nav-reachability.test.js` or it is an orphan bug.'
    );
    I.push('');
  }
  I.push('## 2. Where to make a change');
  I.push('');
  I.push(
    ...mdTable(
      ['If you are adding…', 'It lives in', 'And you must also…'],
      [
        [
          'a route',
          '`js/core/config/views.js` (VIEWS)',
          'add it to `VIEW_TABLE` or `LAZY_VIEW_LOADERS` in `js/app/renderer.js`, then to a `DOORS` section in `js/core/config/nav.js`',
        ],
        [
          'a chrome section',
          '`js/core/config/nav.js` (DOORS)',
          'nothing pins it elsewhere — `js/ui/shell.js` derives from it',
        ],
        [
          'a `data-action`',
          'the emitting view/ui',
          'add the handler to the matching map in `js/app/handlers/*.js`, and an allowlist entry in `tests/mushaf-reorg.test.js`',
        ],
        [
          'an i18n key',
          '`js/core/i18n/en.js` **and** `js/core/i18n/ar.js`',
          'one language is a failing gate',
        ],
        [
          'a settings key',
          'the view that renders it',
          'add it to `js/core/config/sanitize.js` or it dies on reload',
        ],
        [
          'a CSS custom property',
          '`assets/css/variables.css`',
          'it must resolve, or `tests/cssDesign.test.js` fails',
        ],
        [
          'a file under `js/`',
          'anywhere',
          'add it to `APP_SHELL` in `sw.js`, then re-stamp the shell snapshot',
        ],
      ]
    )
  );
  I.push('');
  I.push('## 3. Conventions');
  I.push('');
  I.push('`js/views/*.js` pure state→HTML templates; `js/domain/*.js` pure logic;');
  I.push('`js/app/**/*.js` wiring + handlers; `js/core/**` state/router/config/i18n/storage;');
  I.push('`js/ui/*.js` dumb chrome primitives; `js/services/*.js` side-effect owners.');
  I.push('');
  I.push('## 4. Inventory by subsystem');
  I.push('');
  const subs2 = [...new Set(entries.map((e) => e.sub))].sort();
  I.push(
    ...mdTable(
      ['subsystem', 'what lives there', 'modules', 'where in the dump'],
      subs2.map((sub) => {
        const n = entries.filter((x) => x.sub === sub).length;
        // data/ is a sibling of js/, not a child of it.
        const dir = sub === 'data' ? 'data/' : `js/${sub}`;
        return [
          `\`${dir}\``,
          safe(SUBSYSTEM_BLURBS[sub] ?? ''),
          String(n),
          `[open](agent-map-full.md#${sub})`,
        ];
      })
    )
  );
  I.push('');
  I.push('## 5. Lookup tables (counts; open the dump for the rows)');
  I.push('');
  I.push(
    `- \`data-action\` values emitted anywhere: **${byActionEmit.size}** — every one resolves to a handler (see the Allowlist section of the dump).`
  );
  I.push(
    `- files that handle at least one click/change/form action: **${
      entries.filter(
        (e) =>
          (e.handlesClick?.length ?? 0) +
            (e.handlesChange?.length ?? 0) +
            (e.handlesForms?.length ?? 0) >
          0
      ).length
    }** of ${jsCount}.`
  );
  I.push(`- exported symbols: **${byExport.size}**.`);
  I.push(
    `- i18n keys touched by js/: **${new Set(entries.flatMap((e) => e.i18n)).size}** of the two dictionaries.`
  );
  I.push('');
  I.push('## 6. When you need the exhaustive dump');
  I.push('');
  I.push('Read `docs/agent-map-full.md` when the task names a specific module, a specific');
  I.push('`data-action`, or a specific exported symbol. It has, per file: header job, every');
  I.push('export with its first doc line, actions emitted, actions handled, i18n keys, routes');
  I.push('touched — plus three reverse indexes and a per-test list of what each test pins.');
  I.push('');
  I.push('Do **not** load the whole dump to answer "where does X live" — the tables above and a');
  I.push('targeted grep answer that in one hop. Loading 530 KB to find one file is how an agent');
  I.push('starts guessing instead of looking.');
  I.push('');

  writeFileSync(OUT, `${I.join('\n').replace(/\n+$/, '')}\n`);

  // ------------------------------------------------------------- full dump
  const L = [];
  L.push('# AGENT-MAP (full) — every file, every export, every action');
  L.push('');
  L.push(
    'GENERATED — do not hand-edit. Regenerate with `node scripts/agent-map.mjs` (plain node, no args).'
  );
  L.push('');
  L.push(
    `This is the exhaustive dump. For the one-page version — chrome spine, where-to-change ` +
      `table, counted inventory — read \`docs/AGENT-MAP.md\` instead. This file is ~530 KB by ` +
      `design; it is meant to be searched for one named thing, not read end to end.`
  );
  L.push('');
  L.push(
    `- js modules: ${entries.filter((e) => !e.data).length} — data files: ${dataEntries.length} — tests: ${testEntries.length}`
  );
  L.push('');
  L.push('Conventions: `js/views/*.js` pure state→HTML templates; `js/domain/*.js` pure logic;');
  L.push('`js/app/**/*.js` wiring + handlers; `js/core/**` state/router/config/i18n/storage;');
  L.push('`js/ui/*.js` dumb chrome primitives; `js/services/*.js` side-effect owners.');
  L.push('');

  const subs = [...new Set(entries.map((e) => e.sub))].sort();
  for (const sub of subs) {
    L.push(`## ${sub}`);
    L.push('');
    if (SUBSYSTEM_BLURBS[sub]) L.push(`_${SUBSYSTEM_BLURBS[sub]}_`);
    if (SUBSYSTEM_BLURBS[sub]) L.push('');
    for (const e of entries.filter((x) => x.sub === sub)) {
      L.push(`### \`${e.rel}\``);
      L.push('');
      L.push(`job: ${safe(e.job) || '(no header comment)'}`);
      if (e.data) {
        L.push('');
        L.push(`- shape: \`${safe(e.shape)}\``);
        L.push('');
        continue;
      }
      L.push('');
      if (e.exports.length > 0) {
        L.push(
          `- exports: ${e.exports.map((x) => `\`${safe(x.name)}\` (${x.kind}${x.doc ? ` — ${safe(x.doc)}` : ''})`).join(', ')}`
        );
      } else {
        L.push('- exports: —');
      }
      L.push(
        `- emits: ${backtickList(e.emits)}${e.emitsDynamic ? ' (+ dynamic `data-action="${...}"`)' : ''}`
      );
      const handled = [
        ...e.handlesClick.map((a) => `\`${safe(a)}\``),
        ...e.handlesChange.map((a) => `\`${safe(a)}\` (change/input)`),
        ...e.specials.map((a) => `\`${safe(a)}\` (events.js special)`),
        ...e.handlesForms.map((a) => `\`form:${safe(a)}\``),
      ];
      L.push(`- handles: ${handled.length > 0 ? handled.join(', ') : '—'}`);
      const i18nShown = e.i18n.slice(0, 20);
      L.push(
        `- i18n: ${backtickList(i18nShown)}${e.i18n.length > 20 ? ` (+${e.i18n.length - 20} more)` : ''}`
      );
      L.push(`- routes: ${backtickList(e.routes)}`);
      L.push('');
    }
  }

  L.push('## Reverse index: action → files');
  L.push('');
  for (const a of [...byActionEmit.keys()].sort()) {
    const emit = (byActionEmit.get(a) ?? []).map((f) => `\`${f}\``).join(', ');
    const hand = (byActionHandle.get(a) ?? []).map((f) => `\`${f}\``).join(', ');
    L.push(`- \`${safe(a)}\`: emitted by ${emit || '—'}; handled in ${hand || '—'}`);
  }
  L.push('');
  L.push('## Reverse index: export → file');
  L.push('');
  for (const name of [...byExport.keys()].sort()) {
    L.push(`- \`${safe(name)}\`: ${(byExport.get(name) ?? []).map((f) => `\`${f}\``).join(', ')}`);
  }
  L.push('');
  L.push('## Reverse index: job keyword → files');
  L.push('');
  for (const w of [...byKeyword.keys()].sort()) {
    L.push(`- \`${w}\`: ${(byKeyword.get(w) ?? []).map((f) => `\`${f}\``).join(', ')}`);
  }
  L.push('');
  L.push('## Tests: what each pins');
  L.push('');
  L.push('Each unit test file, its header job, and the `js/` modules it imports (its pins).');
  L.push('');
  for (const t of testEntries) {
    L.push(
      `- \`${t.rel}\` — ${safe(t.job)}${t.pins.length > 0 ? ` (pins: ${t.pins.map((p) => `\`${safe(p)}\``).join(', ')})` : ' (pins: —)'}`
    );
  }
  L.push('');
  L.push('## Allowlist');
  L.push('');
  if (ALLOWLIST.length === 0) {
    L.push('No allowlisted actions: every static `data-action` resolves to a handler above.');
  } else {
    for (const a of ALLOWLIST) L.push(`- \`${safe(a.action)}\` — ${safe(a.reason)}`);
  }
  L.push('');

  writeFileSync(FULL_OUT, `${L.join('\n').replace(/\n+$/, '')}\n`);
  const indexBytes = Buffer.byteLength(readFileSync(OUT));
  console.log(
    `agent-map: ${entries.filter((e) => !e.data).length} js files + ${dataEntries.length} data files + ` +
      `${testEntries.length} tests → docs/agent-map-full.md; index → docs/AGENT-MAP.md ` +
      `(${(indexBytes / 1024).toFixed(1)} KB)`
  );
  if (!spine.ok) {
    console.error('agent-map: SPINE INCOMPLETE — docs/AGENT-MAP.md section 1 is a failure notice:');
    for (const p of spine.problems) console.error(`  ${p}`);
    process.exit(1);
  }
}

main();
