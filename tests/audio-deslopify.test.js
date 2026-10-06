import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/views/audioManager.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/deslopify.css'), 'utf8');

test('Audio keeps reciter search/selection and the selected moshaf surface as the visible work', () => {
  assert.match(src, /<div class="search-bar audio-search">/);
  assert.match(src, /<section class="panel panel--dl">/);
  assert.doesNotMatch(
    src,
    /<section class="panel">\s*<div class="panel__header"><h2>\$\{t\('audio\.playbackDefaults'/
  );
});

test('Audio secondary authoring/download surfaces use one progressive-disclosure grammar', () => {
  assert.ok((src.match(/audio-secondary-disclosure/g) || []).length >= 8);
  assert.match(src, /audio-secondary-disclosure__summary.*audio\.verseVoices/s);
  assert.match(src, /audio-secondary-disclosure__summary.*audio\.versePacks/s);
  assert.match(src, /audio-secondary-disclosure__summary.*audio\.customTitle/s);
  assert.match(src, /audio-secondary-disclosure__summary.*playlist\.title/s);
  assert.match(css, /\.view--audio \.audio-secondary-disclosure/);
});
