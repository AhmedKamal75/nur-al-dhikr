/**
 * tests/library-jump.test.js — (v5.2.88, P2) library section jump chips:
 * one chip per rendered section, targets matching section ids, EN+AR
 * labels, sticky-row CSS with topbar-offset landings.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderLibrary } from '../js/views/library.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { processDocument } from '../js/core/schema.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = join(import.meta.dirname, '..');
const loadDoc = (f) => processDocument(JSON.parse(readFileSync(join(ROOT, f), 'utf8'))).value;
const adhkar = loadDoc('data/adhkar.json');
const duas = loadDoc('data/duas.json');

const libState = (ids, lang = 'en') => ({
  settings: { ...DEFAULT_SETTINGS, language: lang, contentPrefs: {} },
  library: {
    documents: { adhkar, duas },
    order: ids,
    itemIndex: {},
  },
  customContent: {},
  ui: { contentManage: false },
});

describe('library jump chips', () => {
  test('i18n keys exist in both languages with matching placeholders', () => {
    assert.equal(typeof en['library.jump'], 'string');
    assert.equal(typeof ar['library.jump'], 'string');
    assert.ok(en['library.jumpToSection'].includes('{name}'));
    assert.ok(ar['library.jumpToSection'].includes('{name}'));
  });

  test('two libraries render chips whose targets match section ids', () => {
    const html = renderLibrary(libState(['adhkar', 'duas']));
    assert.match(html, /class="library-jump"/, 'chips row renders');
    assert.match(html, /role="navigation"/, 'row is landmarked');
    for (const id of ['adhkar', 'duas']) {
      assert.ok(html.includes(`id="lib-section-${id}"`), `section id for ${id}`);
      assert.ok(
        html.includes(`data-action="library-jump" data-target="lib-section-${id}"`),
        `chip targets ${id}`
      );
    }
  });

  test('a single library renders no chips row (nothing to jump between)', () => {
    const html = renderLibrary(libState(['adhkar']));
    assert.doesNotMatch(html, /class="library-jump"/);
    assert.ok(html.includes('id="lib-section-adhkar"'), 'section id still present');
  });

  test('AR labels render in Arabic', () => {
    const html = renderLibrary(libState(['adhkar', 'duas'], 'ar'));
    assert.ok(html.includes('انتقل إلى'), 'AR jump labels render');
  });

  test('CSS pins the sticky row + topbar-offset landings', () => {
    const css = readFileSync(join(ROOT, 'assets/css/cards.css'), 'utf8');
    const jump = /\.library-jump\s*\{[\s\S]*?\}/.exec(css)?.[0] || '';
    assert.match(jump, /position:\s*sticky/);
    assert.match(jump, /top:\s*var\(--topbar-height\)/);
    assert.match(css, /\.library-section\s*\{[\s\S]*?scroll-margin-top/);
  });
});
