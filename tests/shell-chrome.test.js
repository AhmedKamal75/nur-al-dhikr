/**
 * tests/shell-chrome.test.js — static-shell + sheet-host contracts
 * (v5.12.0 hostile review):
 *  1. the skip link exists and the renderer localizes it on boot (H1 —
 *     the static English text is the no-JS fallback only);
 *  2. #playerbar ships a first-paint landmark (L1);
 *  3. every viewSheet() carries the h2 its labelledBy promises, and every
 *     openModal call in viewMenus.js passes a labelledBy (M4 — a sheet
 *     rendered outside a labelled host would ship untrapped/unlabelled).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { viewSheet } from '../js/ui/viewSheet.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('static shell landmarks (index.html)', () => {
  test('skip link targets #main; playerbar ships a first-paint region', () => {
    const html = read('index.html');
    assert.match(html, /<a class="skip-link" href="#main">/, 'skip link present');
    assert.match(
      html,
      /<div id="playerbar" role="region" aria-label="[^"]+">/,
      'playerbar is a named region before JS mounts'
    );
  });

  test('renderer localizes the skip link on every render', () => {
    const src = read('js/app/renderer.js');
    assert.ok(
      src.includes("t('common.skipToContent'"),
      'boot render replaces the static fallback with the UI language'
    );
  });
});

describe('viewSheet host contract (M4)', () => {
  test('viewSheet() h2 id matches its labelledBy', () => {
    const html = viewSheet({
      titleKey: 'common.close',
      lang: 'en',
      labelledBy: 'modal-title-view-sheet',
      groups: [{ labelKey: null, rows: [] }],
    });
    assert.match(html, /<h2 id="modal-title-view-sheet">/, 'label target exists');
  });

  test('every viewMenus openModal() passes a labelledBy', () => {
    const src = read('js/app/handlers/viewMenus.js');
    const missing = [];
    let from = 0;
    for (;;) {
      const at = src.indexOf('openModal(', from);
      if (at < 0) break;
      // Balance parens from the call's opening bracket (templates may nest).
      let depth = 0;
      let i = at + 'openModal'.length;
      let end = -1;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '(') depth += 1;
        else if (c === ')') {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      assert.ok(end > at, 'openModal call parses');
      if (!src.slice(at, end).includes('labelledBy')) {
        const line = src.slice(0, at).split('\n').length;
        missing.push(`viewMenus.js:${line}`);
      }
      from = end;
    }
    assert.deepEqual(missing, [], 'all modal opens are labelled');
  });
});
