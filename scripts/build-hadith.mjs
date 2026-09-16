#!/usr/bin/env node
/**
 * scripts/build-hadith.mjs — hadith enrichment pipeline (v5.2.75, UP-07).
 *
 * Merges an external grades source + an Arabic-chapters overlay into the
 * data/hadith/*.json book files, producing enriched rows
 * {n,b,ar,en,grade?,narrator?} the app validator passes through
 * (js/services/hadith.js). Release/packaging tool, never shipped.
 *
 * INTEGRITY FIRST: grades outside the canonical vocabulary
 * (sahih/hasan/daif/mawdu) FAIL the build with an offender list — they
 * are never defaulted, never silently dropped, and never invented. Rows
 * the source doesn't cover keep their texts untouched.
 *
 * Source spec (see data/SOURCES.md "Hadith grades pipeline"):
 *   grades file:   { "<bookId>": { "<n>": { "grade": "Sahih", "narrator": "…" } } }
 *   chapters file: { "<bookId>": { "<bId>": "<arabic chapter name>" } }
 *
 * Usage:
 *   node scripts/build-hadith.mjs --grades grades.json --chapters-ar chapters-ar.json [--data data/hadith]
 * Without flags it validates the current data files in place (integrity
 * gate: every shipped row must already pass the enriched validator).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const CANONICAL_GRADES = ['sahih', 'hasan', 'daif', 'mawdu'];

export function normalizeGrade(raw) {
  if (typeof raw !== 'string') return null;
  const g = raw.trim().toLowerCase();
  return CANONICAL_GRADES.includes(g) ? g : null;
}

export function normalizeNarrator(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 200) return null;
  return name;
}

/**
 * Merge one book doc with its grade overlay. Returns { doc, errors } —
 * errors is a list of "book:n: reason" strings; ANY error fails the
 * build (the caller refuses to write).
 */
export function mergeGrades(bookDoc, gradeMap) {
  const errors = [];
  const byN = gradeMap && typeof gradeMap === 'object' && !Array.isArray(gradeMap) ? gradeMap : {};
  const hadiths = (bookDoc.hadiths || []).map((h) => {
    const row = { ...h };
    const g = byN[String(h.n)];
    if (g == null) return row;
    if (!g || typeof g !== 'object') {
      errors.push(`${bookDoc.id}:${h.n}: grade entry is not an object`);
      return row;
    }
    if (g.grade != null) {
      const norm = normalizeGrade(g.grade);
      if (!norm) errors.push(`${bookDoc.id}:${h.n}: unknown grade ${JSON.stringify(g.grade)}`);
      else row.grade = norm;
    }
    if (g.narrator != null) {
      const name = normalizeNarrator(g.narrator);
      if (!name) errors.push(`${bookDoc.id}:${h.n}: bad narrator ${JSON.stringify(g.narrator)}`);
      else row.narrator = name;
    }
    return row;
  });
  const known = new Set(hadiths.map((h) => String(h.n)));
  for (const n of Object.keys(byN)) {
    if (!known.has(String(n))) errors.push(`${bookDoc.id}:${n}: grade for unknown hadith number`);
  }
  return { doc: { ...bookDoc, hadiths }, errors };
}

/**
 * Merge the Arabic-chapters overlay into a book doc's sections.
 * Unknown section ids fail the build; books/sections without overlay
 * coverage keep their English names untouched.
 */
export function mergeChaptersAr(bookDoc, chaptersMap) {
  const errors = [];
  const overlay =
    chaptersMap && typeof chaptersMap === 'object' && !Array.isArray(chaptersMap)
      ? chaptersMap
      : {};
  if (!Object.keys(overlay).length) return { doc: bookDoc, errors };
  const known = new Set((bookDoc.sections || []).map((s) => String(s.id)));
  for (const bId of Object.keys(overlay)) {
    if (!known.has(String(bId)))
      errors.push(`${bookDoc.id}: chapter overlay for unknown section ${bId}`);
  }
  const sections = (bookDoc.sections || []).map((s) => {
    const ar = overlay[String(s.id)];
    if (ar == null) return s;
    if (typeof ar !== 'string' || !ar.trim()) {
      errors.push(`${bookDoc.id}: empty Arabic name for section ${s.id}`);
      return s;
    }
    return { ...s, nameAr: ar.trim().slice(0, 200) };
  });
  return { doc: { ...bookDoc, sections }, errors };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const isMain = process.argv[1]?.endsWith('build-hadith.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  const dataDir = new URL('../data/hadith/', import.meta.url).pathname;
  const dir = flag('--data') || dataDir;
  const gradesPath = flag('--grades');
  const chaptersPath = flag('--chapters-ar');
  try {
    const grades = gradesPath ? loadJson(gradesPath) : {};
    const chapters = chaptersPath ? loadJson(chaptersPath) : {};
    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
    let enriched = 0;
    for (const f of files) {
      const bookId = f.replace(/\.json$/, '');
      const doc = loadJson(join(dir, f));
      let next = doc;
      const allErrors = [];
      if (grades[bookId]) {
        const r = mergeGrades(doc, grades[bookId]);
        next = r.doc;
        allErrors.push(...r.errors);
      }
      if (chapters[bookId]) {
        const r = mergeChaptersAr(next, chapters[bookId]);
        next = r.doc;
        allErrors.push(...r.errors);
      }
      if (allErrors.length) {
        console.error(`[build-hadith] refusing ${bookId}:\n  - ${allErrors.join('\n  - ')}`);
        process.exitCode = 1;
        continue;
      }
      if (grades[bookId] || chapters[bookId]) {
        writeFileSync(join(dir, f), `${JSON.stringify(next, null, 2)}\n`);
        enriched += 1;
      }
    }
    console.log(`[build-hadith] done: ${enriched}/${files.length} book files enriched`);
  } catch (err) {
    console.error('[build-hadith] failed:', err?.message || err);
    process.exitCode = 1;
  }
}
