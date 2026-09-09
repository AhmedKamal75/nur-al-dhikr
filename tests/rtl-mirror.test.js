/**
 * rtl-mirror.test.js — F-002/F-006: every hardcoded directional chevron
 * is either mirrored by UI language (isRTL) or explicitly allowlisted
 * with its reason. Book-order page turns (mushaf), surah sequence,
 * media-transport glyphs, and CSS-mirrored links never mirror — the
 * gate pins those exemptions instead of re-flagging them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const readProject = (rel) => readFileSync(ROOT + rel, 'utf8');

function walkJs(dir, out = []) {
  for (const entry of readdirSync(ROOT + dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkJs(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// { file, hook, reason } — hook must appear within ±4 lines of the icon.
const ALLOWLIST = [
  { file: 'js/views/mushafReader.js', hook: 'mushaf-prev', reason: 'book-order page turn' },
  { file: 'js/views/mushafReader.js', hook: 'mushaf-next', reason: 'book-order page turn' },
  { file: 'js/views/playerBar.js', hook: 'player-prev', reason: 'media transport glyph' },
  { file: 'js/views/playerBar.js', hook: 'player-next', reason: 'media transport glyph' },
  { file: 'js/views/quran.js', hook: 'quran.prevSurah', reason: 'surah sequence in mushaf order' },
  { file: 'js/views/quran.js', hook: 'quran.nextSurah', reason: 'surah sequence in mushaf order' },
  {
    file: 'js/ui/recitationConsole.js',
    hook: 'recite-ayah-prev',
    reason: 'ayah sequence in mushaf order',
  },
  {
    file: 'js/ui/recitationConsole.js',
    hook: 'recite-ayah-next',
    reason: 'ayah sequence in mushaf order',
  },
  { file: 'js/views/statistics.js', hook: 'stat-garden-link', reason: 'CSS-mirrored (see below)' },
];

test('F-002: directional chevrons mirror or carry an explicit exemption', () => {
  const offenders = [];
  const files = ['js/views', 'js/ui'].flatMap((d) => walkJs(d));
  for (const f of files) {
    const lines = readProject(f).split('\n');
    lines.forEach((line, idx) => {
      if (!/icon\(['"]chevron(Left|Right)['"]/.test(line)) return;
      if (line.includes('isRTL(')) return;
      const window = lines.slice(Math.max(0, idx - 4), idx + 5).join('\n');
      const allowed = ALLOWLIST.some((a) => a.file === f && window.includes(a.hook));
      if (!allowed) offenders.push(`${f}:${idx + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `unmirrored directional chevrons: ${offenders.join(', ')}`);
});

test('F-006: the CSS mirror the exemption relies on exists', () => {
  const css = readProject('assets/css/cards.css');
  assert.match(css, /\[dir=['"]rtl['"]\]\s*\.stat-garden-link[^}]*scaleX\(-1\)/s);
});

test('F-006: allowlist entries still match live code (no stale exemptions)', () => {
  for (const a of ALLOWLIST) {
    const src = readProject(a.file);
    assert.ok(src.includes(a.hook), `stale exemption: ${a.file} no longer contains ${a.hook}`);
  }
});
