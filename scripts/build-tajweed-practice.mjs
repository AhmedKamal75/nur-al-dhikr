#!/usr/bin/env node
/** Build the full Quranic Tajweed quiz corpus from the app's deterministic classifier. */
import { readFile, writeFile } from 'node:fs/promises';
import { classifyAyahTajweed, TAJWEED_RULES } from '../js/domain/tajweed.js';

const ROOT = new URL('..', import.meta.url);
const outUrl = new URL('./data/tajweed-practice.json', ROOT);
const byRule = Object.fromEntries(TAJWEED_RULES.map((r) => [r.id, []]));
const seenByRule = Object.fromEntries(TAJWEED_RULES.map((r) => [r.id, new Set()]));
const mixed = [];
const mixedSeen = new Set();
let ayahs = 0;

for (let s = 1; s <= 114; s += 1) {
  const doc = JSON.parse(await readFile(new URL(`./data/quran/${s}.json`, ROOT), 'utf8'));
  for (const ayah of doc.ayahs || []) {
    ayahs += 1;
    const perWord = classifyAyahTajweed(String(ayah.text || ''));
    const found = [];
    for (const rule of TAJWEED_RULES) {
      let firstWord = 0;
      let count = 0;
      for (const w of perWord) {
        const hits = w.spans.filter((sp) => sp.rule === rule.id);
        if (hits.length) {
          if (!firstWord) firstWord = w.wordIndex;
          count += hits.length;
        }
      }
      if (!firstWord) continue;
      const row = { s, a: Number(ayah.number), w: firstWord, c: count };
      const key = `${s}:${ayah.number}`;
      if (!seenByRule[rule.id].has(key)) {
        seenByRule[rule.id].add(key);
        byRule[rule.id].push(row);
      }
      found.push(row);
    }
    if (found.length && !mixedSeen.has(`${s}:${ayah.number}`)) {
      mixedSeen.add(`${s}:${ayah.number}`);
      mixed.push({ s, a: Number(ayah.number), w: found[0].w, c: found.reduce((n, r) => n + r.c, 0) });
    }
  }
}

const levels = { 1: {}, 2: {}, 3: {} };
for (const rule of TAJWEED_RULES) {
  const rows = byRule[rule.id];
  if (!rows.length) throw new Error(`classifier produced no rows for ${rule.id}`);
  levels[1][rule.id] = rows.slice(0, Math.min(10, rows.length));
  levels[2][rule.id] = rows.slice(0, Math.min(25, rows.length));
  levels[3][rule.id] = rows;
}

const coverage = Object.fromEntries(
  TAJWEED_RULES.map((r) => [r.id, { ayahs: byRule[r.id].length, spans: byRule[r.id].reduce((n, x) => n + x.c, 0) }])
);

const payload = {
  schemaVersion: '2.0',
  generatedFrom: 'data/quran/*.json + js/domain/tajweed.js',
  corpus: { surahs: 114, ayahs, ruleCount: TAJWEED_RULES.length, mixedAyahs: mixed.length },
  coverage,
  levels,
  byRule,
  mixed,
};
await writeFile(outUrl, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`tajweed-practice: ${ayahs} ayahs, ${TAJWEED_RULES.length} rules, ${mixed.length} mixed rows`);
for (const rule of TAJWEED_RULES) console.log(`${rule.id}: ${coverage[rule.id].ayahs} ayahs / ${coverage[rule.id].spans} spans`);
