/**
 * rtlCss.test.js — RTL discipline gate.
 *
 * User-facing CSS must use logical properties (margin-inline, padding-inline,
 * inset-inline, text-align: start) so Arabic RTL mirrors correctly. Physical
 * properties are only allowed where position is genuinely physical, each with
 * a documented reason:
 *   - .mushaf-page__corner-* : the four frame corners exist symmetrically;
 *   - .mushaf-fs-tap--*      : fullscreen edge tap zones are screen edges.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_DIR = join(HERE, '..', 'assets', 'css');
const CSS_FILES = readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));

const PHYSICAL_RE =
  /(margin-left|margin-right|padding-left|padding-right|border-left|border-right)\s*:|text-align\s*:\s*(left|right)|(?<![a-zA-Z-])(left|right)\s*:/;

const ALLOWLIST = ['.mushaf-page__corner', '.mushaf-fs-tap--'];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

test('rtl: no undocumented physical properties in app CSS', () => {
  const violations = [];
  for (const file of CSS_FILES) {
    const css = stripComments(readFileSync(join(CSS_DIR, file), 'utf8'));
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim();
      if (ALLOWLIST.some((a) => selector.includes(a))) continue;
      const hit = m[2].match(PHYSICAL_RE);
      if (hit) violations.push(`${file} :: ${selector} :: ${hit[0].trim()}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `physical CSS properties must be logical or allowlisted:\n${violations.join('\n')}`
  );
});
