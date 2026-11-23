import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: [] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.addInitScript(() => {
  localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: 'en', themeMode: 'dark', prayer: { method: 'MWL', asr: 'Standard', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', locationName: 'Cairo' } } }));
});
await page.goto('http://127.0.0.1:8899/#/prayer', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
// open view menu
await page.locator('[data-action="view-menu"]').first().click({ timeout: 8000 });
await page.waitForTimeout(600);
const menuItems = await page.evaluate(() => [...document.querySelectorAll('.menu [data-action], .sheet [data-action], [role="menu"] [data-action]')].map((e) => ({ a: e.dataset.action, t: e.textContent.trim().slice(0, 50) })));
console.log('menu:', JSON.stringify(menuItems));
await page.screenshot({ path: '/tmp/loc-menu.png' });
// click the location menu item
const loc = page.locator('[data-action="prayer-open-location"]').first();
if (await loc.count()) {
  await loc.click({ timeout: 5000 });
  await page.waitForTimeout(700);
  const modal = await page.evaluate(() => {
    const m = document.querySelector('#panel-profiles-title');
    return { open: !!m, actions: [...document.querySelectorAll('.modal [data-action]')].map((e) => e.dataset.action) };
  });
  console.log('profiles modal:', JSON.stringify(modal));
  await page.screenshot({ path: '/tmp/loc-profiles.png' });
  // open manual location form
  await page.locator('.modal [data-action="prayer-manual-location"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  const form = await page.evaluate(() => !!document.querySelector('form[data-form="prayer-location"]'));
  console.log('manual form open:', form);
  await page.screenshot({ path: '/tmp/loc-form.png' });
  // pick a city and save
  await page.selectOption('form[data-form="prayer-location"] select[name="cityPreset"]', { label: 'Alexandria' }).catch(async () => {
    const opts = await page.evaluate(() => [...document.querySelectorAll('form[data-form="prayer-location"] select[name="cityPreset"] option')].slice(0, 8).map((o) => o.textContent + '=' + o.value));
    console.log('options sample:', JSON.stringify(opts));
  });
  await page.locator('form[data-form="prayer-location"] button[type="submit"]').click();
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('nurAlDhikr:v2:state'))?.settings?.prayer);
  console.log('after save:', JSON.stringify(st));
  await page.screenshot({ path: '/tmp/loc-after.png' });
}
await browser.close();
