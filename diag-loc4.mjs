import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.addInitScript(() => {
  localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: 'en', themeMode: 'dark', prayer: { method: 'MWL', asr: 'Standard', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', locationName: 'Cairo' } } }));
});
await page.goto('http://127.0.0.1:8899/#/prayer', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.locator('[data-action="view-menu"]').first().click({ timeout: 8000 });
await page.waitForTimeout(600);
await page.locator('[data-action="prayer-open-location"]').first().click({ timeout: 5000 });
await page.waitForTimeout(700);
await page.locator('.modal [data-action="prayer-manual-location"], [data-action="prayer-manual-location"]').first().click({ timeout: 5000 });
await page.waitForTimeout(700);
// pick Tunis (valid preset) by value
await page.selectOption('form[data-form="prayer-location"] select[name="cityPreset"]', 'tunis');
await page.locator('form[data-form="prayer-location"] button[type="submit"]').click();
await page.waitForTimeout(1200);
const st = await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('nurAlDhikr:v2:state'))?.settings?.prayer;
  const place = document.body.textContent.includes('Tunis');
  return { lat: p?.latitude, lng: p?.longitude, tz: p?.timezone, name: p?.locationName, placeShown: place };
});
console.log('after Tunis save:', JSON.stringify(st));
// Now the times shown: do they use Tunis tz or device tz? Page text near Dhuhr
const times = await page.evaluate(() => [...document.querySelectorAll('[class*="prayer"] time, .prayer-card time, time')].slice(0, 8).map((t) => t.textContent.trim()));
console.log('rendered times:', JSON.stringify(times));
await page.screenshot({ path: '/tmp/loc-tunis.png' });
await browser.close();
