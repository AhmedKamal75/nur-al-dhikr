/**
 * tajweed-sources.test.js — no rule may be taught without a citation (v5.17.18)
 *
 * The app teaches 20 tajweed rules with a one-sentence description each and
 * no source field. A rule description is religious teaching, so AGENTS.md
 * §1.1a requires it to name where it came from. This is the cheap way to
 * satisfy that: attach a citation to each rule rather than rewriting prose
 * that was already correct.
 *
 * The registry is data/tajweed-sources.json. This test is what stops a
 * future rule from shipping unattributed — the failure that is invisible in
 * a screenshot and fatal to the app's central claim.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { TAJWEED_RULES, TAJWEED_FAMILIES } from '../js/domain/tajweed.js';
import {
  TAJWEED_SOURCES,
  TAJWEED_WORKS,
  uncitedTajweedRules,
} from '../js/domain/tajweedSources.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const registry = JSON.parse(read('data/tajweed-sources.json'));
const RULE_IDS = TAJWEED_RULES.map((r) => r.id);

test('every rule the app teaches has a citation', () => {
  const missing = RULE_IDS.filter((id) => !registry.rules[id]);
  assert.deepEqual(
    missing,
    [],
    `uncited rules would be religious teaching with no source: ${missing.join(', ')}`
  );
});

test('no citation points at a work the registry does not define', () => {
  const dangling = [];
  const check = (entry, where) => {
    if (!entry) return;
    if (!registry.works[entry.work]) dangling.push(`${where} -> ${entry.work}`);
  };
  for (const [id, entry] of Object.entries(registry.rules)) {
    check(entry, id);
    for (const [i, also] of (entry.also || []).entries()) check(also, `${id}.also[${i}]`);
  }
  assert.deepEqual(dangling, [], 'every work must exist in `works`');
});

test('every citation carries a locator and a review state', () => {
  for (const [id, entry] of Object.entries(registry.rules)) {
    assert.equal(typeof entry.work, 'string', `${id} has no work`);
    assert.ok(String(entry.lines || '').length > 0, `${id} has no line locator`);
    assert.ok(
      ['sourced', 'contested'].includes(entry.review),
      `${id} has an unknown review state: ${entry.review}`
    );
    // A contested rule must say WHY, or the UI shows a warning with no content.
    if (entry.review === 'contested') {
      assert.ok(
        entry.caveat?.en && entry.caveat?.ar,
        `${id} is contested but explains no disagreement`
      );
    }
  }
});

test('bilingual everywhere a human reads it', () => {
  for (const [id, entry] of Object.entries(registry.rules)) {
    if (!entry.caveat) continue;
    assert.ok(entry.caveat.en && entry.caveat.ar, `${id} caveat is not bilingual`);
    if (entry.label) assert.ok(entry.label.en && entry.label.ar, `${id} label is not bilingual`);
  }
  for (const [id, work] of Object.entries(registry.works)) {
    assert.ok(work.author?.en && work.author?.ar, `${id} author is not bilingual`);
    assert.ok(work.shortTitle?.en && work.shortTitle?.ar, `${id} title is not bilingual`);
  }
});

test('Arabic strings contain no Latin words', () => {
  // Two separate authoring mistakes shipped an English word into an Arabic
  // string, both times from a long hand-written literal. Cheap to catch.
  const offenders = [];
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
      return;
    }
    if (typeof node !== 'string') return;
    if (!/[؀-ۿ]/.test(node)) return;
    const latin = node.match(/[A-Za-z]{3,}/g);
    if (latin) offenders.push(`${path}: ${latin.join(', ')}`);
  };
  walk(registry, 'tajweed-sources');
  assert.deepEqual(offenders, [], 'Latin words inside an Arabic string');
});

test('the palette is not described as an official standard', () => {
  // This one exists because the code claimed a "standard chart" in five
  // places, two of them user-facing. Research found no such published
  // standard, so a user told these are standard colours will trust them for
  // something they are not.
  const paletteNote = registry.palette.note.toLowerCase();
  assert.ok(
    paletteNote.includes('own convention') && paletteNote.includes('not a published standard'),
    'the registry must state the palette is ours, not an authority’s'
  );
  assert.ok(registry.palette.lpmq?.url, 'the one citable convention is recorded');

  const source = read('js/domain/tajweed.js');
  assert.equal(
    /standard chart/.test(source),
    false,
    'tajweed.js still claims a "standard chart" that does not exist'
  );
  for (const rule of TAJWEED_RULES) {
    for (const lang of ['en', 'ar']) {
      assert.equal(
        /standard chart|المخطط المعياري/.test(rule.desc[lang] || ''),
        false,
        `${rule.id}.desc.${lang} claims a false authority`
      );
    }
  }
});

test('family names are not attributed to an unnamed authority either', () => {
  for (const family of TAJWEED_FAMILIES) {
    for (const lang of ['en', 'ar']) {
      assert.equal(
        /standard chart|المخطط المعياري/.test(family.desc?.[lang] || ''),
        false,
        `${family.id}.desc.${lang} claims a false authority`
      );
    }
  }
});

test('the runtime module mirrors the canonical JSON exactly', () => {
  // The JSON is canonical; the JS module is what ships, because the legend
  // and Settings need the citation synchronously and offline. Two copies
  // means two things that can drift, so drift is a failing test.
  assert.deepEqual(
    Object.keys(TAJWEED_SOURCES).sort(),
    Object.keys(registry.rules).sort(),
    'rule sets differ'
  );
  assert.deepEqual(Object.keys(TAJWEED_WORKS).sort(), Object.keys(registry.works).sort());
  for (const [id, entry] of Object.entries(registry.rules)) {
    const mod = TAJWEED_SOURCES[id];
    assert.equal(mod.work, entry.work, `${id} work drifted`);
    assert.equal(mod.lines, entry.lines, `${id} lines drifted`);
    assert.equal(mod.review, entry.review, `${id} review state drifted`);
    assert.deepEqual(mod.caveat || null, entry.caveat || null, `${id} caveat drifted`);
    // (v5.17.32) Spread positions carry a bilingual display label the
    // course view renders instead of a classifier-rule chip. Same drift
    // rule as everything else in this registry.
    assert.deepEqual(mod.label || null, entry.label || null, `${id} label drifted`);
  }
});

test('an unattributed rule is reported, not rendered blank', () => {
  assert.deepEqual(uncitedTajweedRules(RULE_IDS), [], 'a shipped rule has no citation');
  // An unknown id must return null so a test can see it, not an empty string
  // that renders as a tidy blank line.
  assert.deepEqual(uncitedTajweedRules(['madd_2', 'not_a_rule']), ['not_a_rule']);
});
