import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('Focus preserves the completed count visually during the auto-advance handoff', () => {
  const src = read('../js/views/focus.js');
  assert.match(src, /const justCompleted = wasJustCompleted\(item\.id\)/);
  assert.match(src, /const displayCount = justCompleted \? counter\.target : counter\.count/);
  assert.match(
    src,
    /const pct = Math\.min\(100, Math\.round\(\(displayCount \/ Math\.max\(1, counter\.target\)\) \* 100\)\)/
  );
  assert.match(src, /String\(displayCount\).*focusDone/);
  assert.match(src, /count: displayCount, target: counter\.target/);
});

test('Focus completion state is derived from the transient completion stamp as well as live count', () => {
  const src = read('../js/views/focus.js');
  assert.match(src, /const focusDone = justCompleted \|\| counter\.count >= counter\.target/);
});
