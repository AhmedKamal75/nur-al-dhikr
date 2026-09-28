/**
 * mushafBismillah.test.js — the Bismillah is a *header* for every surah
 * that opens with one, and that is not every surah.
 *
 * The guard that decides this used to exclude only At-Tawbah, so Al-Fatiha
 * printed its opening Basmala twice: once in the unnumbered gilt header band
 * and again as the numbered verse 1. It is the most-read page in the mushaf
 * and the most-read surah, and no test in the tree could have caught it.
 *
 * This pins the rule against the DATA rather than against the source string,
 * because the data is the ground truth here: data/mushaf/1.json carries the
 * Basmala as verse 1 and has no separate header entry. A test that only
 * grepped the guard would have kept passing while the page stayed wrong.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BISMILLAH_AR } from '../js/domain/tajweed.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
const page = (n) => JSON.parse(src(`data/mushaf/${n}.json`));

/** Strip Arabic diacritics and unify alef so two orthographies of the same
 * phrase compare equal. The header constant is Uthmani (sukun on the seen),
 * the mushaf text is a slightly different mark set; comparing them as raw
 * codepoints would report a difference that is not one. */
const bare = (t) =>
  t
    .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
const BASMALA_MARK = bare('\u0628\u0650\u0633\u0652\u0645\u0650');

/** The chapter that starts on this page, if any. */
const openerOf = (doc) => doc.chapters.find((c) => c.startsHere) ?? null;
/** Does this chapter's first verse begin with the Basmala? */
const opensWithBasmala = (chapter) => bare(chapter?.verses?.[0]?.text ?? '').includes(BASMALA_MARK);

test('Al-Fatiha prints the Basmala exactly once, as ayah 1', () => {
  // Ground truth: on the printed page the Basmala IS the verse, not a header.
  const fatiha = openerOf(page(1));
  assert.equal(fatiha.number, 1, 'page 1 should open Al-Fatiha');
  assert.ok(
    opensWithBasmala(fatiha),
    'Al-Fatiha verse 1 is expected to be the Basmala in the source data'
  );

  // And the renderer must therefore not add a header on top of it.
  const reader = src('js/views/mushafReader.js');
  const guard = reader.match(/const showBismillah\s*=\s*([^;]+);/s)?.[1] ?? '';
  assert.match(
    guard,
    /chapter\.number\s*!==\s*1/,
    'the Bismillah header guard must skip Al-Fatiha, or the Basmala prints twice'
  );
});

test('At-Tawbah still prints no Basmala', () => {
  const tawba = openerOf(page(187));
  assert.equal(tawba.number, 9, 'page 187 should open At-Tawbah');
  const guard = src('js/views/mushafReader.js').match(/const showBismillah\s*=\s*([^;]+);/s)?.[1];
  assert.match(guard ?? '', /chapter\.number\s*!==\s*9/);
});

test('every other surah that starts on a page still gets its header Basmala', () => {
  // The exclusion must stay narrow. A guard that dropped chapter 2 or 3 as
  // collateral would also "pass" the first two tests while silently removing
  // the header from surahs that genuinely need it.
  const guard = src('js/views/mushafReader.js').match(/const showBismillah\s*=\s*([^;]+);/s)?.[1];
  assert.match(guard ?? '', /chapter\.startsHere/);
  const excluded = [...(guard ?? '').matchAll(/chapter\.number\s*!==\s*(\d+)/g)].map((m) =>
    Number(m[1])
  );
  assert.deepEqual(
    [...excluded].sort((a, b) => a - b),
    [1, 9],
    'only Al-Fatiha (verse) and At-Tawbah (none) may be excluded from the header'
  );

  // The three real cases, stated from the data rather than assumed. The two
  // excluded surahs are excluded for OPPOSITE reasons, which is exactly why
  // a single "is this surah special" flag was the wrong shape.
  const fatiha = openerOf(page(1));
  const baqara = openerOf(page(2));
  const tawba = openerOf(page(187));
  assert.ok(opensWithBasmala(fatiha), 'Al-Fatiha: verse 1 IS the Basmala -> no header');
  assert.ok(
    !opensWithBasmala(baqara),
    'Al-Baqarah: verse 1 is the Baqarah -> a header Basmala is correct'
  );
  assert.ok(
    !opensWithBasmala(tawba),
    'At-Tawbah: verse 1 is Barāʾah, and there is no Basmala at all -> no header'
  );
});

test('the header text and the verse text are the same words', () => {
  // If these ever drift, the duplicate would come back wearing a different
  // spelling and the guard above would look fine while the page was wrong.
  // Imported, not regexed: the constant is stored as \uXXXX escapes, so a
  // source-level match would have found nothing and quietly passed.
  assert.ok(
    bare(BISMILLAH_AR).includes(BASMALA_MARK),
    'BISMILLAH_AR should be the Basmala, so the header and verse agree'
  );
  const fatihaV1 = openerOf(page(1)).verses[0].text;
  assert.ok(
    bare(BISMILLAH_AR).startsWith(bare(fatihaV1).slice(0, 12)),
    'the printed header and Al-Fatiha verse 1 should be the same phrase'
  );
});
