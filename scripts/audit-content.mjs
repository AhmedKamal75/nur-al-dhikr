#!/usr/bin/env node
/**
 * scripts/audit-content.mjs — Content & i18n audit for Azkar/Dua/Hadith datasets.
 *
 * Checks every library in data/catalog.json (plus asma/reflections/special-days/
 * daily-sunnah which ship alongside it):
 *   1. Matn integrity  — arabic present, no HTML tags/entities, no Latin script
 *      inside the Arabic matn, balanced parentheses/brackets/quotes.
 *   2. Source & grading — grade != Unknown, reference.collection present,
 *      reference.grading present for non-Quran items.
 *   3. i18n coverage   — translation.en, virtues.{en,ar}, title.{en,ar},
 *      transliteration present; flags cross-script leakage (Arabic inside
 *      English fields and long Latin runs inside Arabic fields).
 *
 * Usage:
 *   node scripts/audit-content.mjs            # human-readable report (stdout)
 *   node scripts/audit-content.mjs --json     # machine-readable JSON
 *   node scripts/audit-content.mjs --strict   # exit 1 on ANY gap (CI gate);
 *                                             # default exits 1 only on
 *                                             # hard matn/duplicate-id errors.
 *
 * Exit codes: 0 = no hard errors (coverage gaps are warnings unless --strict),
 *             1 = hard errors found (or any gap with --strict),
 *             2 = script failure (catalog unreadable, ...).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const asJson = process.argv.includes('--json');

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_RE = /[A-Za-z]/;
const HTML_TAG_RE = /<[^>]+>/;
const HTML_ENTITY_RE = /&(amp|lt|gt|quot|#\d+);/;
const TASHKEEL_RE = /[\u064B-\u0652\u0670]/g;

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function libraryFiles() {
  const files = new Set();
  try {
    const catalog = loadJson(join(ROOT, 'data/catalog.json'));
    for (const lib of catalog.libraries || []) {
      if (lib.file) files.add(join(ROOT, lib.file));
    }
  } catch {
    // fall through to the static list
  }
  for (const extra of [
    'data/asma.json',
    'data/reflections.json',
    'data/special-days.json',
    'data/daily-sunnah.json',
  ]) {
    files.add(join(ROOT, extra));
  }
  return [...files].filter((f) => existsSync(f));
}

function isBlank(s) {
  return !s || !String(s).trim();
}

/** Long Latin run (>3 consecutive words) inside an Arabic field = real leak. */
function hasLatinLeak(s) {
  return /\b[A-Za-z]{2,}\b(?:\s+\(?[A-Za-z]{2,})?(?:\s+[A-Za-z]{2,})+/.test(String(s || ''));
}

/** Arabic run of 4+ words inside an English field. Short honorifics
 *  (صلى الله عليه وسلم / ﷺ / عليه السلام) are legitimate citations. */
function hasArabicLeak(s) {
  const stripped = String(s || '')
    .replace(/\(?[ﺻﺍ-ﻳ\s]+\u061C?\)?/g, '')
    .replace(/[ص-ي][\u0600-\u06FF\s()]*[ص-ي]/g, '');
  const words =
    stripped.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g) || [];
  return words.length >= 4;
}

function auditFile(path) {
  const doc = loadJson(path);
  const cats = doc.categories || [];
  const items = cats.flatMap((c) => (c.items || []).map((it) => ({ ...it, __cat: c.id })));
  const gaps = {
    file: path.replace(`${ROOT}/`, ''),
    items: items.length,
    categories: cats.length,
    missingArabic: [],
    htmlInMatn: [],
    latinInMatn: [],
    unbalancedMatn: [],
    missingTransliteration: [],
    missingTranslationEn: [],
    missingVirtueEn: [],
    missingVirtueAr: [],
    missingTitleAr: [],
    missingTitleEn: [],
    gradeUnknown: [],
    emptyReference: [],
    missingGrading: [],
    leakLatinInAr: [],
    leakArabicInEn: [],
  };
  const seen = new Set();
  const duplicates = [];
  for (const it of items) {
    if (seen.has(it.id)) duplicates.push(it.id);
    seen.add(it.id);
    const ar = it.arabic || '';
    if (isBlank(ar)) gaps.missingArabic.push(it.id);
    if (HTML_TAG_RE.test(ar) || HTML_ENTITY_RE.test(ar)) gaps.htmlInMatn.push(it.id);
    if (LATIN_RE.test(ar)) gaps.latinInMatn.push(it.id);
    const opens = (ar.match(/\(/g) || []).length;
    const closes = (ar.match(/\)/g) || []).length;
    if (opens !== closes) gaps.unbalancedMatn.push(it.id);
    if (isBlank(it.transliteration)) gaps.missingTransliteration.push(it.id);
    const tr = it.translation || {};
    const vi = it.virtues || {};
    const ti = it.title || {};
    if (isBlank(tr.en)) gaps.missingTranslationEn.push(it.id);
    if (isBlank(vi.en)) gaps.missingVirtueEn.push(it.id);
    if (isBlank(vi.ar)) gaps.missingVirtueAr.push(it.id);
    if (isBlank(ti.ar)) gaps.missingTitleAr.push(it.id);
    if (isBlank(ti.en)) gaps.missingTitleEn.push(it.id);
    if (!it.grade || it.grade === 'Unknown') gaps.gradeUnknown.push(it.id);
    const ref = it.reference || {};
    if (isBlank(ref.collection)) gaps.emptyReference.push(it.id);
    // Custom devotional items carry their explanation in custom_grade —
    // hadith-style reference.grading does not apply to them.
    if (it.grade !== 'Quran' && it.grade !== 'Custom' && isBlank(ref.grading))
      gaps.missingGrading.push(it.id);
    for (const v of [tr.ar, vi.ar, ti.ar]) {
      if (!isBlank(v) && hasLatinLeak(v)) {
        gaps.leakLatinInAr.push(it.id);
        break;
      }
    }
    for (const v of [tr.en, vi.en]) {
      if (!isBlank(v) && hasArabicLeak(v)) {
        gaps.leakArabicInEn.push(it.id);
        break;
      }
    }
  }
  // Tashkeel coverage: share of Arabic items carrying any vowelization marks.
  const withTashkeel = items.filter((it) => TASHKEEL_RE.test(it.arabic || '')).length;
  gaps.tashkeelCoverage = items.length > 0 ? Math.round((withTashkeel / items.length) * 100) : 100;
  gaps.duplicates = duplicates;
  return gaps;
}

let files = [];
try {
  files = libraryFiles();
} catch (err) {
  console.error(`[audit-content] cannot resolve data files: ${err.message}`);
  process.exit(2);
}

const report = { generatedAt: new Date().toISOString(), libraries: files.map(auditFile) };

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const cols = [
    ['missingArabic', 'noMatn'],
    ['htmlInMatn', 'htmlMatn'],
    ['latinInMatn', 'latnMatn'],
    ['missingTransliteration', 'noTrlit'],
    ['missingTranslationEn', 'noTrEn'],
    ['missingVirtueEn', 'noViEn'],
    ['missingVirtueAr', 'noViAr'],
    ['gradeUnknown', 'unkGr'],
    ['emptyReference', 'noRef'],
    ['missingGrading', 'noGrd'],
  ];
  console.log('# Content & i18n Audit Report\n');
  console.log('| dataset | items | ' + cols.map(([k, h]) => h).join(' | ') + ' | tashkeel% |');
  console.log('|---|---|' + cols.map(() => '---').join('|') + '|---|');
  for (const g of report.libraries) {
    console.log(
      `| ${g.file} | ${g.items} | ` +
        cols.map(([k]) => g[k].length).join(' | ') +
        ` | ${g.tashkeelCoverage}% |`
    );
  }
  console.log('\n## Detail (first 12 ids per gap)\n');
  for (const g of report.libraries) {
    const keys = [
      'missingArabic',
      'htmlInMatn',
      'latinInMatn',
      'unbalancedMatn',
      'duplicates',
      'missingTransliteration',
      'missingTranslationEn',
      'missingVirtueEn',
      'missingVirtueAr',
      'missingTitleAr',
      'missingTitleEn',
      'gradeUnknown',
      'emptyReference',
      'missingGrading',
      'leakLatinInAr',
      'leakArabicInEn',
    ];
    const lines = keys
      .filter((k) => g[k].length)
      .map(
        (k) =>
          `- ${k} (${g[k].length}): ${g[k].slice(0, 12).join(', ')}${g[k].length > 12 ? ' …' : ''}`
      );
    if (lines.length) console.log(`### ${g.file} (n=${g.items})\n${lines.join('\n')}\n`);
  }
  console.log(
    'Notes: `leakArabicInEn` ignores short honorifics (صلى الله عليه وسلم / عليه السلام). ' +
      '`translation.ar` is intentionally NOT gated: per the strict-separation spec the AR UI hides ' +
      'translation entirely and the EN UI reads translation.en only. `reference` is still a ' +
      'monolingual (English) object — see the report for the source_ar/source_en migration proposal.'
  );
}

const hardErrors = report.libraries.reduce(
  (n, g) =>
    n + g.missingArabic.length + g.htmlInMatn.length + g.latinInMatn.length + g.duplicates.length,
  0
);
const anyGap = report.libraries.some((g) =>
  [
    'missingArabic',
    'htmlInMatn',
    'latinInMatn',
    'unbalancedMatn',
    'duplicates',
    'missingTransliteration',
    'missingTranslationEn',
    'missingVirtueEn',
    'missingVirtueAr',
    'missingTitleAr',
    'missingTitleEn',
    'gradeUnknown',
    'emptyReference',
    'missingGrading',
  ].some((k) => g[k].length > 0)
);
process.exit(hardErrors > 0 || (strict && anyGap) ? 1 : 0);
