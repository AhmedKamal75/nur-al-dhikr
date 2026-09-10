/**
 * view-boundary.test.js — F-013 prerequisite, permanent.
 *
 * The Mushaf view is the heaviest module in the app, and five app-layer
 * modules used to import it just to set two one-shot animation tokens —
 * which made lazy-loading the view impossible (importing the tokens
 * parsed the whole book). The tokens now live in the neutral
 * js/ui/readingTokens.js (both layers may import ui/), and this gate
 * pins that direction:
 * 1. single ownership — the token state is declared exactly once, in
 *    the neutral module, never in the view;
 * 2. no app-layer module statically imports the tokens (or anything
 *    token-shaped) from views/mushafReader.js ever again;
 * 3. consume-once semantics — set, read, read-again-is-null, reset.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  setFlipDirection,
  consumeFlipDirection,
  setFullscreenAnim,
  consumeFullscreenAnim,
  resetReadingTokensForTests,
} from '../js/ui/readingTokens.js';

const ROOT = new URL('..', import.meta.url).pathname;
const readProject = (rel) => readFileSync(ROOT + rel, 'utf8');

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

test('view boundary: animation tokens are owned by ui/readingTokens.js only', () => {
  const tokens = stripComments(readProject('js/ui/readingTokens.js'));
  assert.match(tokens, /let flipDirection/, 'neutral module declares flipDirection');
  assert.match(tokens, /let fullscreenAnim/, 'neutral module declares fullscreenAnim');
  const view = stripComments(readProject('js/views/mushafReader.js'));
  assert.doesNotMatch(view, /let flipDirection/, 'view must not re-declare flipDirection');
  assert.doesNotMatch(view, /let fullscreenAnim/, 'view must not re-declare fullscreenAnim');
});

test('view boundary: no app-layer module imports tokens from the Mushaf view', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const f of readdirSync(ROOT + dir)) {
      const p = join(dir, f);
      if (statSync(ROOT + p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!f.endsWith('.js')) continue;
      const src = stripComments(readProject(p));
      for (const m of src.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*views\/mushafReader\.js)['"]/g
      )) {
        const names = m[1].split(',').map((s) => s.trim());
        if (names.includes('setFlipDirection') || names.includes('setFullscreenAnim')) {
          offenders.push(`${p} imports tokens from the view`);
        }
      }
    }
  };
  walk('js/app');
  assert.deepEqual(offenders, [], `token edge regressed into the view: ${offenders.join(', ')}`);
});

test('view boundary: tokens are consume-once with a test reset', () => {
  resetReadingTokensForTests();
  assert.equal(consumeFlipDirection(), null, 'fresh flip token is null');
  assert.equal(consumeFullscreenAnim(), null, 'fresh fullscreen token is null');
  setFlipDirection('next');
  setFullscreenAnim('in');
  assert.equal(consumeFlipDirection(), 'next', 'flip token reads once');
  assert.equal(consumeFullscreenAnim(), 'in', 'fullscreen token reads once');
  assert.equal(consumeFlipDirection(), null, 'flip token consumed');
  assert.equal(consumeFullscreenAnim(), null, 'fullscreen token consumed');
  setFlipDirection('prev');
  resetReadingTokensForTests();
  assert.equal(consumeFlipDirection(), null, 'reset clears the flip token');
});
