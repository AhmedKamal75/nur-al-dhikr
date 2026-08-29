/**
 * tests/appEntry.test.js — the entry-module link gate (v3.12).
 *
 * v3.10 shipped a broken app: js/app.js imported `resolvePage` from
 * js/mushaf.js, but that export never existed, so the ENTRY MODULE failed
 * to link and the app rendered an empty shell. Every previous import gate
 * exercised the view graph only — app.js itself was never imported by a
 * test, so nothing caught it. This file closes that hole for good.
 *
 * The check runs in a child node process that installs an
 * unhandledRejection handler and then imports the real entry module:
 *   - an import/link failure anywhere in the graph → exit 1, test fails;
 *   - boot() touching the missing DOM (expected under node, see below)
 *     is tolerated → exit 0.
 *
 * Why boot() rejects under node at all: app.js ends with a module-level
 * `boot()` call, and boot() immediately calls mountShell() which needs the
 * DOM. In a browser (the only place the app actually runs) that rejection
 * never happens. The child process asserts exactly the production-relevant
 * property: THE MODULE GRAPH LINKS.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const CHILD_SCRIPT = `
  process.on('unhandledRejection', (err) => {
    const msg = err && err.message ? String(err.message) : String(err);
    if (err instanceof ReferenceError && /document|window|localStorage/.test(msg)) {
      process.exit(0); // boot() without a browser — tolerated, see header
    }
    console.error('UNEXPECTED REJECTION:', msg);
    process.exit(3);
  });
  try {
    await import('./js/app.js');
    // Import resolved; give boot()'s expected DOM rejection a beat to land.
    setTimeout(() => {
      console.error('boot() never ran — module-level call missing?');
      process.exit(4);
    }, 1000);
  } catch (err) {
    console.error('ENTRY LINK FAILURE:', err && err.message);
    process.exit(2);
  }
`;

describe('app entry module links (the v3.10 blank-app regression gate)', () => {
  test('importing js/app.js resolves — every import in the graph exists', async () => {
    const result = await new Promise((resolve) => {
      execFile(
        process.execPath,
        ['--input-type=module', '-e', CHILD_SCRIPT],
        { cwd: ROOT, timeout: 15000 },
        (err, stdout, stderr) => resolve({ code: err && err.code ? err.code : 0, stderr })
      );
    });
    assert.equal(
      result.code,
      0,
      `entry module must link cleanly (exit ${result.code}): ${result.stderr.slice(0, 400)}`
    );
  });
});
