/**
 * tests/arabic-typeface.test.js — the Arabic reading-text typeface choice
 * (v5.17.16).
 *
 * The Mushaf has always had a typeface choice. The adhkar, the duas and the
 * reader did not: Arabic reading text outside the Mushaf was locked to one
 * Amiri-first stack, so a reader who prefers a Medina-print Naskh or a
 * modern face had no way to choose. Three properties make this safe to ship:
 *
 *  1. **Zero new bytes.** Every family is already bundled (Amiri, Amiri Quran,
 *     Scheherazade New — all OFL, all already in APP_SHELL) or is the device's
 *     own font. A new typeface would cost install size on a 3G phone for a
 *     preference.
 *  2. **The Mushaf is untouched.** It always sets --mushaf-font-family and
 *     quran.css prefers it, so a page of the Qur'an can never inherit this
 *     choice. A reader who changes this must still see the mushaf they chose.
 *  3. **The default changes nothing.** 'amiri' reproduces the previously
 *     hard-coded stack byte for byte, so an upgrade is visually a no-op.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ARABIC_TEXT_FONTS,
  DEFAULT_ARABIC_TEXT_FONT,
  DEFAULT_SETTINGS,
} from '../js/core/config.js';
import { sanitizeSettings } from '../js/core/config/sanitize.js';
import { renderSettings } from '../js/views/settings.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const vars = readFileSync(join(ROOT, 'assets/css/variables.css'), 'utf8');
const quranCss = readFileSync(join(ROOT, 'assets/css/quran.css'), 'utf8');

describe('the typeface list is honest and complete', () => {
  test('four real choices, each named in both languages', () => {
    assert.equal(ARABIC_TEXT_FONTS.length, 4);
    for (const f of ARABIC_TEXT_FONTS) {
      assert.ok(f.id, 'has an id');
      assert.ok(f.name?.en && f.name?.ar, `${f.id} is named in both languages`);
      assert.ok(f.sub?.en && f.sub?.ar, `${f.id} has a bilingual description`);
      assert.ok(f.family && f.family.length > 8, `${f.id} has a family stack`);
    }
  });

  test('every bundled family is actually declared as an @font-face', () => {
    // A choice that names a font we do not ship is a lie: it silently falls
    // back and the reader sees no change with no explanation.
    const bundled = ['Amiri', 'Amiri Quran', 'Scheherazade New'];
    const declared = [...vars.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]);
    for (const family of bundled) {
      assert.ok(declared.includes(family), `${family} has an @font-face`);
    }
  });

  test('the default is the default, and it is a member of the list', () => {
    assert.equal(DEFAULT_ARABIC_TEXT_FONT, 'amiri');
    assert.equal(DEFAULT_SETTINGS.arabicFont, 'amiri');
    assert.ok(ARABIC_TEXT_FONTS.some((f) => f.id === DEFAULT_SETTINGS.arabicFont));
  });

  test('the default reproduces the previously hard-coded stack, so upgrades are invisible', () => {
    const fallback = vars
      .match(/--font-arabic:\s*([^;]+);/)[1]
      .replace(/\s+/g, ' ')
      .trim();
    const chosen = ARABIC_TEXT_FONTS.find((f) => f.id === 'amiri')
      .family.replace(/\s+/g, ' ')
      .trim();
    assert.equal(chosen, fallback, 'the default and the base token are the same stack');
  });
});

describe('the preference is an enum, never a raw font string', () => {
  test('valid ids survive; everything else degrades to the default', () => {
    for (const f of ARABIC_TEXT_FONTS) {
      assert.equal(sanitizeSettings({ arabicFont: f.id }).arabicFont, f.id);
    }
    for (const hostile of ['__proto__', 'Cairo; } body { display: none', 'serif', '', null, 42]) {
      assert.equal(
        sanitizeSettings({ arabicFont: hostile }).arabicFont,
        'amiri',
        `${String(hostile)} must not survive`
      );
    }
  });
});

describe('CSS: one override, applied by attribute, mushaf untouched', () => {
  test('every id has a matching attribute block', () => {
    for (const f of ARABIC_TEXT_FONTS) {
      assert.ok(vars.includes(`[data-arabic-font='${f.id}']`), `${f.id} has a CSS block`);
    }
  });

  test('the reading surfaces read the reading token, with the base as fallback', () => {
    const consumers = readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8');
    assert.ok(consumers.includes('var(--font-arabic-reading, var(--font-arabic))'));
    // Nothing may read the reading token WITHOUT a fallback: a browser that
    // never saw the attribute would otherwise render Arabic in no font at all.
    const bare = vars.split('font-family:').filter((d) => d.includes('var(--font-arabic-reading)'));
    assert.equal(bare.length, 0, 'no consumer reads the reading token bare');
  });

  test('the Mushaf keeps its own font and never inherits this choice', () => {
    // Plain string checks, not regex literals: this file is generated and a
    // stray escape here fails to parse the whole suite.
    assert.ok(
      quranCss.includes('var(--mushaf-font-family, var(--font-arabic))'),
      'mushaf prefers its own family'
    );
    assert.ok(
      !vars.includes('[data-mushaf-font][data-arabic-font]'),
      'no rule couples the two choices'
    );
  });
});

describe('the control is reachable and bilingual', () => {
  const html = (lang = 'en', arabicFont = 'amiri') => {
    const b = initialState();
    return renderSettings({
      ...b,
      settings: { ...b.settings, language: lang, arabicFont },
    });
  };

  test('four options render, the chosen one is announced as selected', () => {
    const out = html('en', 'scheherazade');
    assert.equal((out.match(/data-key="arabicFont"/g) || []).length, 4);
    assert.ok(
      out.includes(
        'data-key="arabicFont" data-value="scheherazade" role="radio" aria-checked="true"'
      ),
      'the selected typeface is the checked one'
    );
  });

  test('it is a radiogroup with a label, not a bare pile of buttons', () => {
    const out = html();
    assert.ok(out.includes('role="radiogroup"'));
    // Two controls live in this panel — the Arabic SIZE slider and the new
    // typeface picker — so their label ids must not collide, and the group
    // must point at its own.
    assert.ok(out.includes('id="arabic-font-scale-label"'), 'the size slider keeps its label');
    assert.ok(out.includes('id="arabic-typeface-label"'), 'the typeface picker has its own');
    assert.notEqual(
      out.indexOf('id="arabic-typeface-label"'),
      out.indexOf('id="arabic-font-scale-label"'),
      'distinct ids'
    );
    assert.ok(out.includes('aria-labelledby="arabic-typeface-label"'));
  });

  test('the label exists in both languages', () => {
    assert.ok(en['settings.arabicTypeface'], 'EN label');
    assert.ok(ar['settings.arabicTypeface'], 'AR label');
    assert.notEqual(en['settings.arabicTypeface'], ar['settings.arabicTypeface']);
  });

  test('the family stack is escaped into the preview, never interpolated raw', () => {
    const out = html();
    // The stack comes from our own frozen config, but it lands in a style
    // attribute, so it must still be escaped at the sink.
    assert.ok(
      !/style="font-family:[^"]*["']/.test(out.split('data-key="arabicFont"')[0] + ''),
      'no unescaped quote in the stack'
    );
  });
});
