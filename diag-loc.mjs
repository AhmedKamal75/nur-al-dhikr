import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 140)); });
await page.addInitScript(() => {
  localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: 'en', themeMode: 'dark', prayer: { method: 'MWL', asr: 'Standard', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', locationName: 'Cairo' } } }));
});
await page.goto('http://127.0.0.1:8899/#/prayer', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
// What location affordances exist when location is set?
const affordances = await page.evaluate(() => [...document.querySelectorAll('[data-action*="location"], [data-action*="city"]')].map((e) => ({ a: e.dataset.action, visible: !!e.offsetParent, text: e.textContent.trim().slice(0, 40) })));
console.log(JSON.stringify(affordances, null, 1));
// Open the manual-location modal
const btn = page.locator('[data-action="prayer-manual-location"]').first();
await btn.click({ timeout: 8000 });
await page.waitForTimeout(800);
const modal = await page.evaluate(() => ({ open: !!document.querySelector('.editor-form[data-form="prayer-location"]') }));
console.log('modal open:', JSON.stringify(modal));
await page.screenshot({ path: '/tmp/loc-modal.png' });
await browser.close();
