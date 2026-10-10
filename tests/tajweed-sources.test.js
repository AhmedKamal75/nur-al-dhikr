/**
 * tajweed-sources.test.js — no rule may be taught without a citation (v5.17.18)
 *
 * Tajweed rule definitions and study entries evolve; every user-facing
 * rule description is religious teaching, so AGENTS.md §1.1a requires it to
 * name where it came from. The canonical registry and runtime mirror must
 * stay aligned, and contested source claims must explain their uncertainty.
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
  tajweedCitation,
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
  // Compare the complete structures, not only selected citation fields.
  // This catches drift in source topic, alternate works, labels, review
  // caveats, and work metadata (author/title/institution/year/URL) as well
  // as the basic rule-to-work locator.
  assert.deepEqual(TAJWEED_SOURCES, registry.rules, 'rule registry drifted');
  assert.deepEqual(TAJWEED_WORKS, registry.works, 'source/work metadata drifted');
});
test('al-Tamhid source title matches the published Arabic title', () => {
  assert.equal(
    registry.works.tamhid.shortTitle.ar,
    '\u0627\u0644\u062a\u0645\u0647\u064a\u062f \u0641\u064a \u0639\u0644\u0645 \u0627\u0644\u062a\u062c\u0648\u064a\u062f'
  );
  assert.equal(TAJWEED_WORKS.tamhid.shortTitle.ar, registry.works.tamhid.shortTitle.ar);
});

test('tajweedCitation exposes localized alternate source locators', () => {
  const en = tajweedCitation('hamzat_wasl', 'en');
  assert.equal(en.also.length, 1);
  assert.equal(en.also[0].title, TAJWEED_WORKS.tamhid.shortTitle.en);
  assert.equal(en.also[0].author, TAJWEED_WORKS.tamhid.author.en);
  assert.equal(en.also[0].lines, 'ch. 5');
  assert.equal(en.also[0].review, 'sourced');

  const ar = tajweedCitation('hamzat_wasl', 'ar');
  assert.equal(ar.also[0].title, TAJWEED_WORKS.tamhid.shortTitle.ar);
  assert.equal(ar.also[0].author, TAJWEED_WORKS.tamhid.author.ar);
  assert.equal(ar.also[0].lines, 'الفصل 5');
  assert.equal(tajweedCitation('not_a_rule', 'en'), null);
});

test('citation locator labels are localized without changing English references', () => {
  assert.equal(tajweedCitation('hamzat_wasl', 'en').also[0].lines, 'ch. 5');
  assert.equal(tajweedCitation('hamzat_wasl', 'ar').also[0].lines, 'الفصل 5');
  assert.equal(tajweedCitation('makharij_17', 'en').lines, 'ch. 8');
  assert.equal(tajweedCitation('makharij_17', 'ar').lines, 'الفصل 8');
  assert.equal(tajweedCitation('qalqalah', 'en').also[0].lines, 'qalqalah section');
  assert.equal(tajweedCitation('qalqalah', 'ar').also[0].lines, 'باب القلقلة');
});

test('an unattributed rule is reported, not rendered blank', () => {
  assert.deepEqual(uncitedTajweedRules(RULE_IDS), [], 'a shipped rule has no citation');
  // An unknown id must return null so a test can see it, not an empty string
  // that renders as a tidy blank line.
  assert.deepEqual(uncitedTajweedRules(['madd_2', 'not_a_rule']), ['not_a_rule']);
});

test('secondary Tajweed source link has visible and keyboard-focus styling', () => {
  const css = read('assets/css/quran.css');
  assert.match(
    css,
    /\.tajweed-legend__source-link\s*\{[^}]*color:\s*var\(--color-text-secondary\)[^}]*text-decoration:\s*underline dotted/s
  );
  assert.match(css, /\.tajweed-legend__source-link:focus-visible\s*\{/);
});

test('the ʿayn citation exposes its secondary source to the Mushaf legend', () => {
  const citation = tajweedCitation('madd_4_6', 'en');
  assert.ok(citation);
  assert.equal(citation.also.length, 1);
  assert.equal(citation.also[0].title, 'al-Madd wa-l-Qasr (Egyptian Ministry of Awqaf)');
  assert.equal(citation.also[0].author, "A. D. al-Sayyid Isma'il Ali Sulayman");
  assert.equal(
    citation.also[0].url,
    'https://awkafonline.gov.eg/content-sections/116/5024/%D8%A7%D9%84%D9%85%D8%AF-%D9%88%D8%A7%D9%84%D9%82%D8%B5%D8%B1'
  );
  assert.equal(
    tajweedCitation('madd_4_6', 'ar').also[0].title,
    'المد والقصر (وزارة الأوقاف المصرية)'
  );
});

test('Madd al-Lin of ʿAyn cites the Tuhfat verse naming its two faces', () => {
  const entry = registry.rules.madd_4_6;
  assert.equal(entry.work, 'tuhfat-al-atfal');
  assert.equal(entry.lines, '54');
  assert.equal(entry.review, 'contested');
  assert.match(entry.caveat.en, /4 or 6 counts/);
  assert.match(entry.caveat.ar, /أربعًا أو ست/);
  assert.equal(TAJWEED_SOURCES.madd_4_6.lines, '54');
  // `also` entries are citation records, not bare work ids: the alternate
  // carries its own locator and review state so the legend can localize it.
  assert.deepEqual(
    TAJWEED_SOURCES.madd_4_6.also.map((citation) => citation.work),
    ['madd-wa-qasr']
  );
  assert.equal(entry.also[0].work, 'madd-wa-qasr');
  assert.equal(
    registry.works['madd-wa-qasr'].url,
    'https://awkafonline.gov.eg/content-sections/116/5024/%D8%A7%D9%84%D9%85%D8%AF-%D9%88%D8%A7%D9%84%D9%82%D8%B5%D8%B1'
  );
});
