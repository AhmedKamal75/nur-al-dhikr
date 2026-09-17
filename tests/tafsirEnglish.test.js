/**
 * tests/tafsirEnglish.test.js — item 20 (English tafsir) gates:
 *  1. the en-mukhtasar catalog entry is bundled with names, slug and an
 *     explicit lang marker (neighbors and defaults untouched);
 *  2. all 114 files exist, parse as non-empty [{ayah, text}] lists, and
 *     cover exactly the 6,236 ayahs (per-surah keys 1..N per quran-meta);
 *  3. the English formatter escapes and paragraphs without inventing
 *     Arabic section structure; language detection is explicit-only;
 *  4. the panel renders English bodies LTR and Arabic bodies unchanged.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  buildTafsirPanel,
  editionBodyHTML,
  formatEnglishCommentary,
  isEnglishEdition,
} from '../js/views/tafsirPanel.js';
import { SEED_MODE, SEED_SKIP_MSG } from './helpers/seedMode.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJSON = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const CATALOG = readJSON('data/tafsir-editions.json').editions;
const EN = CATALOG.find((e) => e.id === 'en-mukhtasar');

describe('catalog: en-mukhtasar entry', () => {
  test('bundled with names, slug and lang marker', () => {
    assert.ok(EN, 'entry present');
    assert.equal(EN.bundled, true);
    assert.equal(EN.slug, 'en-tafsir-al-mukhtasar');
    assert.equal(EN.lang, 'en');
    assert.ok(EN.nameEn && EN.nameAr && EN.authorEn && EN.authorAr, 'bilingual credits');
  });

  test('neighbors and defaults untouched', () => {
    const ids = CATALOG.map((e) => e.id);
    assert.ok(
      ids.indexOf('en-mukhtasar') === ids.indexOf('mukhtasar') + 1,
      'rides beside its Arabic twin'
    );
    assert.equal(
      CATALOG.filter((e) => e.bundled)[0].id,
      'muyassar',
      'default search edition unchanged'
    );
  });
});

describe('bundled files: 114 surahs, 6,236 ayahs', () => {
  test('every file parses as a non-empty [{ayah, text}] list', (t) => {
    // SEED MODE ships the bundled editions for the seed surahs only. The
    // full-corpus coverage gate lives in the full repo. Skipped loudly.
    if (SEED_MODE) {
      t.skip(SEED_SKIP_MSG);
      return;
    }
    const files = readdirSync(path.join(ROOT, 'data/tafsir/en-mukhtasar')).filter((f) =>
      f.endsWith('.json')
    );
    assert.equal(files.length, 114, 'one file per surah');
    let total = 0;
    for (let n = 1; n <= 114; n += 1) {
      const rows = readJSON(`data/tafsir/en-mukhtasar/${n}.json`);
      assert.ok(Array.isArray(rows) && rows.length > 0, `surah ${n} non-empty`);
      for (const r of rows) {
        assert.ok(r && Number.isFinite(r.ayah), `surah ${n}: numeric ayah`);
        assert.ok(typeof r.text === 'string' && r.text.trim(), `surah ${n}: real text`);
      }
      total += rows.length;
    }
    assert.equal(total, 6236, 'the whole Qur’an is covered');
  });

  test('per-surah ayah keys run 1..N per quran-meta', (t) => {
    if (SEED_MODE) {
      t.skip(SEED_SKIP_MSG);
      return;
    }
    const meta = readJSON('data/quran-meta.json');
    for (const s of meta.surahs) {
      const rows = readJSON(`data/tafsir/en-mukhtasar/${s.number}.json`);
      const keys = rows.map((r) => r.ayah).sort((a, b) => a - b);
      assert.equal(keys.length, s.ayahCount, `surah ${s.number} complete`);
      assert.equal(keys[0], 1, `surah ${s.number} starts at 1`);
      assert.equal(keys[keys.length - 1], s.ayahCount, `surah ${s.number} ends at N`);
    }
  });
});

describe('English formatter: paragraphs, no invented structure', () => {
  test('escapes and paragraphs', () => {
    assert.equal(formatEnglishCommentary(''), '');
    assert.equal(formatEnglishCommentary(null), '');
    const html = formatEnglishCommentary('First para.\n\nSecond <b>para</b>.');
    assert.ok(html.includes('<p>First para.</p>'), 'paragraph split');
    assert.ok(html.includes('&lt;b&gt;'), 'markup escaped, never passed through');
    assert.doesNotMatch(html, /<h3/, 'no section headers synthesized');
  });

  test('Arabic section prose would misfire — English skips that pass', () => {
    const tricky = 'A note:\n* See: the mercy verse.';
    const html = formatEnglishCommentary(tricky);
    assert.doesNotMatch(html, /<h3/, 'asterisk prose stays literal');
    assert.ok(html.includes('See:'), 'text preserved verbatim');
  });

  test('isEnglishEdition is explicit-only', () => {
    assert.equal(isEnglishEdition({ lang: 'en' }), true);
    assert.equal(isEnglishEdition({}), false);
    assert.equal(isEnglishEdition({ lang: 'ar' }), false);
    assert.equal(isEnglishEdition({ lang: 'EN' }), false, 'case-sensitive by design');
    assert.equal(isEnglishEdition(null), false);
  });
});

describe('panel renders per-edition direction', () => {
  function panelState(activeId, text) {
    return {
      settings: { language: 'en', mushafPrefs: {} },
      tafsirEditions: {
        editions: [
          {
            id: 'mukhtasar',
            nameEn: 'Al-Mukhtasar',
            nameAr: 'المختصر',
            authorEn: 'A',
            authorAr: 'أ',
            bundled: true,
          },
          {
            id: 'en-mukhtasar',
            nameEn: 'Al-Mukhtasar (English)',
            nameAr: 'المختصر (إنجليزي)',
            authorEn: 'T',
            authorAr: 'ت',
            bundled: true,
            lang: 'en',
          },
        ],
      },
      tafsir: {
        'en-mukhtasar': { 1: { 1: 'English words here.' } },
        mukhtasar: { 1: { 1: 'كلمات عربية.' } },
      },
    };
  }

  test('English body is LTR with plain paragraphs', () => {
    const html = buildTafsirPanel(panelState(), 1, 1, 'en-mukhtasar');
    assert.ok(html.includes('dir="ltr" lang="en"'), 'LTR body');
    assert.ok(html.includes('<p>English words here.</p>'), 'plain paragraph');
  });

  test('Arabic body keeps RTL commentary formatting', () => {
    const html = buildTafsirPanel(panelState(), 1, 1, 'mukhtasar');
    assert.ok(html.includes('dir="rtl" lang="ar"'), 'RTL body preserved');
  });

  test('editionBodyHTML unit matrix', () => {
    assert.ok(editionBodyHTML({ lang: 'en' }, 'Hi').includes('dir="ltr"'), 'english edition');
    assert.ok(editionBodyHTML({}, 'x').includes('dir="rtl"'), 'unknown defaults to Arabic');
    assert.ok(editionBodyHTML(null, 'x').includes('dir="rtl"'), 'hostile defaults to Arabic');
  });
});
