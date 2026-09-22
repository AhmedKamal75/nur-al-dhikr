import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// The retired crescent+star identity pair (SYM-01). The inline topbar SVG
// carried exactly these two paths: a crescent (M20 13.2A8.2…) plus a
// four-point star spark (17.2 4.6…). Either one reappearing in the brand
// slot is a regression.
const CRESCENT_MARKERS = ['M20 13.2A8.2', '17.2 4.6l.7 1.7'];

describe('SYM-01 identity: no crescent/star brand mark', () => {
  test('topbar brand routes through the canonical rayah glyph', () => {
    const shell = read('js/ui/shell.js');
    assert.ok(
      shell.includes('topbar__brand-icon') && shell.includes("icon('rayah'"),
      'topbar brand must render icon(rayah) inside .topbar__brand-icon'
    );
    for (const m of CRESCENT_MARKERS) {
      assert.ok(!shell.includes(m), `retired crescent path fragment still in shell.js: ${m}`);
    }
  });

  test('no retired crescent path pair anywhere in shipped source', () => {
    for (const f of ['index.html', 'sw.js', 'js/ui/shell.js', 'js/core/icons.js']) {
      const src = read(f);
      for (const m of CRESCENT_MARKERS) {
        assert.ok(!src.includes(m), `retired crescent marker in ${f}: ${m}`);
      }
    }
  });

  test('every manifest/shortcut icon file exists in the replacement family', () => {
    const manifest = JSON.parse(read('manifest.json'));
    const all = [
      ...manifest.icons.map((i) => i.src),
      ...manifest.shortcuts.flatMap((s) => (s.icons || []).map((i) => i.src)),
      'assets/icons/apple-touch-icon.png',
      'favicon.ico',
    ];
    for (const src of new Set(all)) {
      assert.ok(existsSync(join(ROOT, src)), `identity asset missing: ${src}`);
    }
  });

  test('replacement PNGs are not the retired crescent family (magic + size sanity)', () => {
    // The retired family shipped 18–19 small files with the old artwork;
    // the rayah replacements are freshly generated (see scripts note in
    // SYM-01 commit). PNG magic must hold and icon-512 must be a real file.
    const buf = readFileSync(join(ROOT, 'assets/icons/icon-512.png'));
    assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.ok(buf.length > 500, 'icon-512.png looks truncated');
    const ico = readFileSync(join(ROOT, 'favicon.ico'));
    assert.equal(ico[0], 0, 'favicon.ico must be a real ICO container');
    assert.equal(ico[2], 1, 'favicon.ico type must be 1 (icon)');
  });
});
