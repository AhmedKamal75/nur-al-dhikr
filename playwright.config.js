import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright safety net (Phase 1): the defect class unit tests cannot see —
 * cross-module races and lifecycle clobbering in a real DOM — runs here.
 * Unit suite stays `npm test` (node --test tests/*.test.js); these specs
 * are .spec.js so the unit runner never picks them up.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
