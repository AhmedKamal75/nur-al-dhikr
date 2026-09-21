/**
 * tests/helpers/seedMode.mjs — seed-bundle detection for the corpus gates.
 *
 * The seed archive (built by scripts/build-seed-bundle.mjs, documented in
 * data/SEED-README.md) ships 3 full surahs + seed sample libraries instead
 * of the full 114/6,236 corpora. Gates that count the FULL corpus cannot
 * run there; they must skip LOUDLY with an explicit message rather than
 * fail with ENOENT noise or, worse, silently pass a weakened assertion.
 * Every gate that consults this helper states what it skips and why.
 *
 * Detection: the presence of data/seed.json — written by the seed builder,
 * never committed to the full repository.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SEED_FILE = path.join(ROOT, 'data/seed.json');

function detectSeedMode() {
  if (!existsSync(SEED_FILE)) return false;
  try {
    const doc = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
    return doc && doc.seed === true && typeof doc.version === 'string';
  } catch {
    return false;
  }
}

export const SEED_MODE = detectSeedMode();

export const SEED_SKIP_MSG =
  'SEED MODE: full corpus not bundled in this archive (see data/SEED-README.md) — ' +
  'full-corpus gate skipped loudly, seed-integrity gates run in tests/seedBundle.test.js';

/** Loud skip for a node:test context. */
export function skipIfSeed(t) {
  if (SEED_MODE) {
    t.skip(SEED_SKIP_MSG);
    return true;
  }
  return false;
}
