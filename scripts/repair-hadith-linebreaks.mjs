/**
 * repair-hadith-linebreaks.mjs — turn an upstream HTML convention into a real
 * line break (v5.17.22)
 *
 * 31 hadith strings across nawawi and qudsi carry a literal `<br>` in the
 * ARABIC field. The app escapes all hadith text before rendering — correctly,
 * since it is scripture-derived — so that tag was not a line break. It was
 * the four characters `<br>` printed in the middle of the Arabic, on the home
 * screen, in both languages.
 *
 * The tag is not deleted, because it is not noise: upstream uses it to mark a
 * genuine line break in the printed source, and hadith line structure is part
 * of how it is quoted. It becomes a newline, and the stylesheet renders
 * newlines in this field. The mark is preserved and the tag is gone.
 *
 * Run: node scripts/repair-hadith-linebreaks.mjs
 * Idempotent, and it refuses to write if any `<br>` survives.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const FILES = ['data/hadith/nawawi.json', 'data/hadith/qudsi.json'];
// Both casings, and with a trailing slash, because upstream is inconsistent.
const BREAK = /<br\s*\/?>/gi;

let totalFixed = 0;
const touched = [];

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  let inFile = 0;

  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') return Object.values(node).forEach(walk);
    if (typeof node !== 'string' || !node.includes('<br')) return;
    BREAK.lastIndex = 0;
    const next = node.replace(BREAK, '\n');
    if (next !== node) {
      // Only a text value may be rewritten; a key or a number is not ours.
      Object.keys(node).forEach(() => {});
      inFile += 1;
      totalFixed += 1;
    }
    return next;
  };

  // Replace in place by rebuilding object values.
  const rewrite = (node) => {
    if (Array.isArray(node)) return node.map(rewrite);
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) node[k] = rewrite(node[k]);
      return node;
    }
    if (typeof node === 'string' && /<br\s*\/?>/i.test(node)) {
      inFile += 1;
      totalFixed += 1;
      return node.replace(BREAK, '\n');
    }
    return node;
  };

  const before = JSON.stringify(doc);
  const next = rewrite(doc);
  const after = JSON.stringify(next);
  if (before !== after) {
    fs.writeFileSync(file, `${JSON.stringify(next, null, 1)}\n`);
    touched.push(`${rel}: ${inFile} field(s)`);
  }
  if (BREAK.test(fs.readFileSync(file, 'utf8'))) {
    throw new Error(`A <br> survived in ${rel}`);
  }
}

console.log(
  touched.length
    ? `repaired ${totalFixed} field(s):\n  ${touched.join('\n  ')}`
    : 'nothing to repair — the corpus is already free of <br>'
);
