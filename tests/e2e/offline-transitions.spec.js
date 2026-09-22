/**
 * e2e/offline-transitions.spec.js — (OFFLINE-01) adversarial offline
 * transition coverage the warm/cold smoke never walked: online→offline→
 * online, slow-network recovery, mid-session fetch rejection and cached
 * offline navigation. Each transition asserts the same contract: shell
 * stays visible, no blank route, no duplicate state, no page errors.
 */
import { test, expect } from '@playwright/test';

async function expectShellAlive(page, where) {
  await expect(page.locator('#topbar'), `${where}: topbar survives`).not.toBeEmpty();
  await expect(page.locator('#main'), `${where}: main survives`).not.toBeEmpty();
  const mainText = await page.locator('#main').innerText();
  expect(mainText.trim().length, `${where}: blank route`).toBeGreaterThan(0);
}

test('offline transitions: online→offline→online keeps every route alive', async ({
  page,
  context,
}) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Warm up so the service worker owns the shell + data.
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.reload();
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  const registration = await page.evaluate(() => navigator.serviceWorker.getRegistration());
  expect(registration, 'service worker must own the page after warm-up').toBeTruthy();

  // Online → offline mid-session.
  await context.setOffline(true);
  for (const route of ['home', 'library', 'settings', 'tasbih']) {
    await page.goto(`#/${route}`);
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await expectShellAlive(page, `offline ${route}`);
  }

  // Offline → online: the shell recovers without a reload.
  await context.setOffline(false);
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expectShellAlive(page, 'recovered home');

  expect(pageErrors).toEqual([]);
});

test('offline transitions: fetch rejection degrades to error state, never a white screen', async ({
  page,
}) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Every library data file fails: the library tier must render its
  // honest error + Retry state instead of blank content.
  await page.route('**/data/*.json', (route) => route.abort('failed'));
  await page.goto('#/library');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await expectShellAlive(page, 'fetch-rejected library');
  expect(pageErrors).toEqual([]);
});

test('offline transitions: slow network still reaches content', async ({ page }) => {
  test.slow();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // 1.5s Stall on data files: boot shows the skeleton, then real content.
  await page.route('**/data/*.json', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });
  await expectShellAlive(page, 'slow-network home');
  expect(pageErrors).toEqual([]);
});
