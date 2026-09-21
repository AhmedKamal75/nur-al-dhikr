/**
 * tests/orphan-actions.test.js (v5.13.0, V15)
 * Every static data-action emitted by js/views + js/ui + js/app must
 * resolve somewhere: the click delegation table, a change/input registry
 * entry, or the explicit allowlist (hold-gestures, overlay dismiss).
 * Dynamic `data-action="${...}"` template sites bypass grep by design
 * and are covered by the mushaf-reorg inventory instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mergedClickHandlers, changeRegistry, inputRegistry } from '../js/app/events.js';

const ALLOWLIST = new Set([
  'kids-exit-hold', // hold-2s gesture tracked in events.js, not a click
  'modal-close-overlay', // overlay dismiss short-circuit in events.js
]);

test('no orphan data-action: every static action resolves', () => {
  const out = execSync(
    'grep -rhoE \'data-action="[^"]+"\' js/views js/ui js/app --include="*.js" | sort -u',
    { encoding: 'utf8' }
  );
  const actions = [...new Set([...out.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]))].filter(
    // Dynamic template sites (data-action="${...}") bypass static grep by
    // design — covered by the mushaf-reorg inventory, not this registry.
    (a) => !a.includes('${') && !a.includes(' ') && !a.includes('?') && !a.includes('<')
  );
  assert.ok(actions.length > 200, `expected a real census, got ${actions.length}`);
  const changeSels = [...(changeRegistry || []), ...(inputRegistry || [])].map((r) => r?.sel || '');
  const missing = actions.filter((a) => {
    if (ALLOWLIST.has(a)) return false;
    if (mergedClickHandlers[a]) return false;
    if (changeSels.some((s) => s.includes(`"${a}"`))) return false;
    return true;
  });
  assert.deepEqual(missing, [], `orphan data-actions with no handler: ${missing.join(', ')}`);
});
