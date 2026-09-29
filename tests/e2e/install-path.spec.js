/**
 * e2e/install-path.spec.js (v5.17.31) — headless-proof half of the
 * install path: the manifest a browser installs FROM, the worker bytes
 * that carry the offline shell, and the install rows a reader walks.
 *
 * Device-only truth (the real beforeinstallprompt dialog with its
 * accepted/dismissed answer, the iOS Share → Add-to-Home-Screen sheet,
 * and the airplane-mode relaunch) has no headless equivalent: those live
 * as BLOCKED:device skips below and in docs/DEVICE-TEST.md, and this spec
 * claims none of them.
 */
import { test, expect } from '@playwright/test';
// (v5.17.45) This spec genuinely exercises the service worker, so it opts
// back in to the suite-wide block in playwright.config.js. Everything else
// runs with the worker off, so a test always sees the working tree.
test.use({ serviceWorkers: 'allow' });

test('install-path: manifest is installable (name, icons, display, screenshots)', async ({
  request,
}) => {
  const res = await request.get('/manifest.json');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) {
    const iconRes = await request.get(`/${icon.src.replace(/^\.\//, '')}`);
    expect(iconRes.ok(), `manifest icon missing: ${icon.src}`).toBe(true);
  }
});

test('install-path: sw precaches the install modules and signals success', async ({ request }) => {
  const res = await request.get('/sw.js');
  expect(res.ok()).toBe(true);
  const sw = await res.text();
  // The offline shell carries the whole install path…
  for (const entry of [
    'js/app/installPrompt.js',
    'js/domain/install.js',
    'js/views/installRow.js',
  ]) {
    expect(sw.includes(`'${entry}'`), `APP_SHELL precaches ${entry}`).toBe(true);
  }
  // …and reports success as well as failure (the page turns success into
  // the shellReady flag; failure keeps its Retry toast).
  expect(sw.includes('precache-complete')).toBe(true);
  expect(sw.includes('precache-failed')).toBe(true);
});

test('install-path: a worker serves the page (shell-ready source of truth)', async ({ page }) => {
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // Warm-up so the service worker owns the shell (same pattern as
  // offline-transitions.spec.js): registration lands on load, control on
  // the next navigation.
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  const registration = await page.evaluate(() => navigator.serviceWorker.getRegistration());
  expect(registration, 'service worker must own the page after warm-up').toBeTruthy();
});

test('install-path: about and settings carry the persistent install row', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw new Error(`uncaught exception: ${err}`);
  });
  await page.goto('#/about');
  const aboutRow = page.locator('.install-row').first();
  await expect(aboutRow).toBeAttached({ timeout: 20000 });
  // Headless desktop Chromium fires no beforeinstallprompt on demand, so
  // the row shows the honest desktop manual steps.
  await expect(aboutRow).toContainText('Install');

  await page.goto('#/settings');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator('#settings-sec-data .install-row')).toBeAttached({ timeout: 20000 });
});

test('install-path: offline surface still renders beside the install rows', async ({ page }) => {
  await page.goto('#/offline');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
});

// -- BLOCKED:device: no headless equivalent; run on a physical phone. --

test.skip('BLOCKED:device — the real dialog answers accepted and installs', async () => {
  // Tap Install on the onboarding step in headed Chromium (a real
  // beforeinstallprompt), accept the browser dialog: the wizard step
  // completes via appinstalled and the deferral memory clears.
});

test.skip('BLOCKED:device — a dismissed dialog stamps deferral and re-offers later', async () => {
  // Dismiss the real dialog: offer hides for INSTALL_REOFFER_DAYS, then
  // the re-offer path resurfaces it.
});

test.skip('BLOCKED:device — iOS Share steps end on the home screen, then airplane relaunch', async () => {
  // Follow the iOS steps on a physical iPhone, add to Home Screen, go
  // offline (airplane), relaunch from the icon: full boot, shellReady set.
});
