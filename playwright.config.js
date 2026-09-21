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
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: EVIDENCE_MATRIX ? 'on' : 'retain-on-failure',
  },
  projects: EVIDENCE_MATRIX
    ? [
        { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 5'] } },
        { name: 'phone-landscape', use: { viewport: { width: 844, height: 390 } } },
        { name: 'tablet', use: { viewport: { width: 1024, height: 768 } } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // (v5.17.2, matrix) threaded: `python3 -m http.server` is
    // single-threaded, so 4 parallel matrix browsers serialize on data
    // loads and starve each other's 30s budgets (phone timeouts). The
    // user-facing `npm start` stays single-threaded — one user is fine.
    command:
      'python3 -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; ThreadingHTTPServer((\'127.0.0.1\', 8080), SimpleHTTPRequestHandler).serve_forever()"',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
