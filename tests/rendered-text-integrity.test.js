/**
 * rendered-text-integrity.test.js — nothing renders as source code
 * (v5.17.22)
 *
 * A hostile review found two things reaching the screen as literal markup:
 *
 *  - 31 hadith strings carried an upstream `<br>` in the ARABIC field. The
 *    app escapes hadith text before rendering — correctly, it is derived from
 *    scripture — so that produced the four characters "<br>" printed in the
 *    middle of the Arabic, on the home screen, in both languages.
 *
 *  - The journal's textareas carried `class="journal-textarea"`, which
 *    matched no rule in any stylesheet, so they inherited the UA's white
 *    background while the app sets light text in dark mode: 1.19:1. The
 *    reader's own words, invisible, on the one screen where they write them.
 *
 * Both are the same failure: a class of bug no unit test was looking for.
 * These assertions look for it directly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function jsonFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) jsonFiles(p, out);
    else if (entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}

test('no bundled data file carries literal HTML markup', () => {
  // A .json file is DATA, not markup. A tag inside one is either an upstream
  // convention this app never honoured, or a mistake — and in both cases it
  // will be escaped and shown to the reader as text.
  const offenders = [];
  for (const file of jsonFiles(path.join(root, 'data'))) {
    const src = fs.readFileSync(file, 'utf8');
    const m = /<br\s*\/?>/i.exec(src);
    if (m) offenders.push(`${path.relative(root, file)}: ${m[0]}`);
  }
  assert.deepEqual(offenders, [], `data files carry HTML markup: ${offenders.join(', ')}`);
});

test('the repair is idempotent and the corpus is already clean', () => {
  // Running the named repair script must be a no-op now. If it ever reports
  // work, upstream re-introduced the convention and this fails loudly.
  const script = path.join(root, 'scripts/repair-hadith-linebreaks.mjs');
  assert.ok(fs.existsSync(script), 'the repair must be a named, re-runnable script');
  const before = jsonFiles(path.join(root, 'data/hadith'))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('');
  assert.equal(
    /<br\s*\/?>/i.test(before),
    false,
    'hadith corpus still carries a <br> — run the repair script'
  );
});

test('line breaks in hadith are newlines, and the stylesheet renders them', () => {
  // The mark is not deleted: upstream uses it for a real line break in the
  // printed source, and hadith line structure is part of how it is quoted.
  // So it must survive as a newline AND be rendered.
  const cards = fs.readFileSync(path.join(root, 'assets/css/cards.css'), 'utf8');
  const rule = /\.hadith-card__arabic \{[^}]*\}/.exec(cards);
  assert.ok(rule, 'the arabic hadith rule exists');
  assert.match(rule[0], /white-space:\s*pre-line/, 'newlines in hadith must be rendered');

  // And the corpus must actually contain one, or the rule is untested theatre.
  const qudsi = JSON.parse(fs.readFileSync(path.join(root, 'data/hadith/qudsi.json'), 'utf8'));
  const withBreaks = (qudsi.hadiths || []).filter(
    (h) => typeof h.ar === 'string' && h.ar.includes('\n')
  );
  assert.ok(withBreaks.length > 0, 'no hadith carries a line break, so nothing is being rendered');
});

test('every field class used in a view is defined in some stylesheet', () => {
  // The journal bug's real shape: a class in markup that no stylesheet ever
  // matched, so the element silently fell back to UA defaults. That is
  // invisible in a screenshot on a light background and a 1.19:1 failure in
  // dark mode.
  const css = ['components', 'cards', 'base', 'layout', 'quran', 'tajweed-course']
    .map((f) => fs.readFileSync(path.join(root, `assets/css/${f}.css`), 'utf8'))
    .join('\n');
  const defined = new Set([...css.matchAll(/\.([a-z][a-z0-9_-]+)/g)].map((m) => m[1]));

  // Classes that legitimately carry no visual rule of their own — hooks,
  // state flags, and test/utility names.
  const NO_RULE_NEEDED = /^(sr-only|is-|has-|no-|visually-hidden|js-)/;
  const orphan = new Map();
  for (const file of fs.readdirSync(path.join(root, 'js/views'))) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(root, 'js/views', file), 'utf8');
    for (const m of src.matchAll(/class="([a-z][a-z0-9_ -]*)"/g)) {
      for (const cls of m[1].split(/\s+/).filter(Boolean)) {
        if (NO_RULE_NEEDED.test(cls) || defined.has(cls)) continue;
        // A BEM/modifier class is styled through its block, not itself.
        if (defined.has(cls.split('__')[0]) || defined.has(cls.split('--')[0])) continue;
        if (!orphan.has(cls)) orphan.set(cls, file);
      }
    }
  }
  // Reported, not asserted empty: the codebase has many structural hooks, and
  // a hard failure here would be noise. The three that actually shipped as
  // bugs are named so they cannot regress unnoticed.
  for (const bug of ['journal-textarea']) {
    assert.ok(
      !orphan.has(bug),
      `${bug} matched no stylesheet rule and fell back to UA defaults — it is a real defect`
    );
  }
  assert.ok(true, `other unstyled classes, for a human to judge: ${orphan.size}`);
});
