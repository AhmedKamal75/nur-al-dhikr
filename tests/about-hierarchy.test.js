import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAbout } from '../js/views/about.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'assets/css/deslopify.css'), 'utf8');

const state = {
  settings: { language: 'en' },
  library: {
    documents: {
      core: {
        metadata: { name: { en: 'Core', ar: 'الأساس' }, source: { en: 'Local', ar: 'محلي' } },
      },
    },
  },
  customContent: {},
  install: { shellReady: true, installed: false, promptReady: false },
};

test('About keeps identity and capabilities visible while secondary material is disclosed', () => {
  const html = renderAbout(state, { install: { platform: 'desktop' } });
  assert.match(html, /class="about-hero"/);
  assert.match(html, /What you can do here/);
  assert.equal((html.match(/class="panel about-disclosure"/g) || []).length, 4);
  assert.match(html, /<summary class="about-disclosure__summary">Feature guide/);
  assert.match(html, /<summary class="about-disclosure__summary">Privacy/);
  assert.match(html, /<summary class="about-disclosure__summary">Sources/);
  assert.match(html, /<summary class="about-disclosure__summary">Offline/);
});

test('About secondary disclosures are collapsed by default in Arabic too', () => {
  const ar = renderAbout(
    { ...state, settings: { language: 'ar' } },
    { install: { platform: 'desktop' } }
  );
  assert.equal((ar.match(/class="panel about-disclosure"/g) || []).length, 4);
  assert.doesNotMatch(ar, /<details[^>]* open/);
  assert.match(ar, /المصادر|الخصوصية|غير متصل/);
  assert.match(CSS, /:root\[dir='rtl'\] \.view--about \.about-disclosure__summary::before/);
  assert.match(
    CSS,
    /:root\[dir='rtl'\] \.view--about \.about-disclosure\[open\] \.about-disclosure__summary::before/
  );
});
