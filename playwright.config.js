import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright safety net (Phase 1): the defect class unit tests cannot see —
 * cross-module races and lifecycle clobbering in a real DOM — runs here.
 * Unit suite stays `npm test` (node --test tests/*.test.js); these specs
 * are .spec.js so the unit runner never picks them up.
 *
 * (v5.17.2, audit INSTRUMENTATION/BIFOCAL) EVIDENCE_MATRIX=1 expands to the
 * 4-viewport matrix (desktop / phone / phone-landscape / tablet) with full
 * traces retained — the CI `browser-evidence` job archives them per finding.
 */
const EVIDENCE_MATRIX = process.env.EVIDENCE_MATRIX === '1';
// (CROSS-01) CROSS_ENGINE=1 runs the prioritized suite (smoke, audio,
// accessibility-critical routes) on Chromium + Firefox + WebKit. Full
// triple-engine runs stay opt-in: the whole 20+ spec suite × 3 engines
// would triple CI time for routes with no engine-specific surface.
const CROSS_ENGINE = process.env.CROSS_ENGINE === '1';

/**
 * The suite gets its OWN port, and never reuses whatever is listening.
 *
 * (v5.17.65) This used to be 8080 with `reuseExistingServer: !CI`, which is
 * also `npm start` and the port every README/CONTRIBUTING/DEVICE-TEST doc tells
 * the owner to serve on. So `reuseExistingServer` would happily adopt the
 * owner's `python3 -m http.server 8080` — SINGLE-THREADED — and every parallel
 * worker would serialise through it.
 *
 * That is not hypothetical; it is what happened. A full chromium run failed
 * three a11y-matrix tests with "Test timeout of 45000ms exceeded while setting
 * up context" — no colour-contrast violation anywhere, just browsers failing to
 * start. The same six tests passed in isolation in 23s, and the next full run
 * passed. `ss -ltnp | grep 8080` showed a single-threaded server that had been
 * up for hours. The config already documented this trap in a wall of prose
 * above webServer; the cost was still an hour and a false "the suite is flaky"
 * conclusion, twice.
 *
 * A dedicated port removes the failure mode instead of detecting it. Detection
 * was tried first and rejected on evidence: a concurrency probe (N parallel
 * fetches, compare elapsed) does NOT distinguish the two servers here — at
 * N=8 the threaded one measured 5x SLOWER, at N=24 they tied, because
 * per-request overhead dominates a localhost fetch. A timing heuristic that
 * inverts its own answer is worse than no check.
 *
 * 8080 is untouched: that is still the human server.
 */
const E2E_PORT = Number(process.env.E2E_PORT ?? 8123);

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  // (v5.17.45) Parallelism, deliberately measured rather than assumed.
  //
  // This was false, and it cost the suite its single biggest win: splitting
  // a11y-all-routes into one test per route made it SLOWER (3.7m -> 7m) on
  // its own, because 60 tests inside one file still ran one at a time and each
  // paid a fresh app boot. The split is only worth anything once the tests can
  // actually spread across cores.
  //
  // `workers` is pinned rather than left to the CPU default so a run is
  // reproducible on a laptop and on CI, and it is MEASURED rather than
  // guessed. Each worker is a browser process; they all fetch from one static
  // server, and past a point they contend for it:
  //
  //   1 worker  a11y matrix  3.7m  (as one monolithic test, no parallelism)
  //   4 workers a11y matrix  2.8m  67 passing, 0 failing
  //   6 workers a11y matrix  3.4m  FOUR TESTS TIMING OUT at 45s
  //
  // Six is the server's ceiling, not a CPU one, and the symptom is exactly the
  // suite-load flakiness this change set out to remove: routes that are fine
  // alone cannot finish booting when six browsers queue behind the same
  // server. Four is the honest point. `PW_WORKERS` overrides for CI.
  fullyParallel: true,
  workers: Number(process.env.PW_WORKERS ?? 4),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: EVIDENCE_MATRIX ? 'on' : 'retain-on-failure',
    // (v5.17.17) The app prefetches ~1,400 corpus files 15s after boot. For a
    // reader that is invisible and happens once. For this suite it ran in
    // EVERY context, so specs that outlive the 15s mark saturated the one
    // static server between them — three specs failed on timing, and the
    // honest cause was background work, not the specs.
    //
    // So the prefetch is off by default HERE, in the harness, and
    // tests/e2e/offline-essentials.spec.js opts back in because proving the
    // prefetch is its whole job. Nothing in js/ reads this; a reader never
    // sees it. No spec asserts an empty localStorage, and the per-spec
    // addInitScript seeds in this suite merge rather than replace, so
    // seeding one pref here is compatible with them.
    storageState: 'tests/e2e/.state/no-background-prefetch.json',

    // (v5.17.45) NO SERVICE WORKER IN E2E, BY DEFAULT.
    //
    // A cache-first worker in the harness is a trap that costs real time: the
    // worker precaches ~250 shell files, then serves them stale-until-activate,
    // and because there is no skipWaiting (deliberately - see sw.js:304) a
    // fresh test context inherits a worker waiting from a previous run. The
    // symptom is not a failure, it is a LIE: a test asserting on CSS or JS
    // sees the PREVIOUS commit's bytes and passes or fails for the wrong
    // reason.
    //
    // That cost roughly eighteen tool calls and three separate
    // "the browser is serving an old file" investigations before anyone
    // reached for this. What this changes is WHERE BYTES COME FROM - always
    // the working tree, never a precache - and nothing about WHAT IS CHECKED.
    //
    // The three specs that genuinely exercise the worker opt back in with
    // test.use({ serviceWorkers: 'allow' }): offline-essentials,
    // offline-transitions and install-path.
    serviceWorkers: 'block',
  },
  projects: CROSS_ENGINE
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : EVIDENCE_MATRIX
      ? [
          { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
          { name: 'phone', use: { ...devices['Pixel 5'] } },
          { name: 'phone-landscape', use: { viewport: { width: 844, height: 390 } } },
          { name: 'tablet', use: { viewport: { width: 1024, height: 768 } } },
        ]
      : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Threaded, because `python3 -m http.server` is SINGLE-THREADED: four
    // parallel browsers serialise on every data load and starve each other's
    // budgets. The human-facing `npm start` on 8080 stays single-threaded —
    // one reader is fine, and that is not the suite's problem.
    //
    // (v5.17.65) `reuseExistingServer` is now hard false. It used to be
    // `!CI`, which meant the suite adopted whatever was already on the port —
    // including the owner's single-threaded `npm start`. That produced a full
    // run failing three a11y tests on browser startup with no violation at
    // all, while the same tests passed in isolation. See E2E_PORT above for the
    // full account; the short version is that a dedicated port plus never
    // reusing makes the trap structurally impossible instead of merely
    // documented.
    command: `python3 -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; ThreadingHTTPServer(('127.0.0.1', ${E2E_PORT}), SimpleHTTPRequestHandler).serve_forever()"`,
    url: `http://127.0.0.1:${E2E_PORT}`,
    reuseExistingServer: false,
    timeout: 30 * 1000,
  },
});
