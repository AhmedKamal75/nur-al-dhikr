import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.addInitScript(() => {
  localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: 'en', themeMode: 'dark', prayer: { method: 'MWL', asr: 'Standard', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo', locationName: 'Cairo' } } }));
});
await page.goto('http://127.0.0.1:8899/#/prayer', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem('nurAlDhikr:v2:state') || 'null');
  return {
    storedPrayer: st?.settings?.prayer,
    bodyClasses: document.body.className,
    hash: location.hash,
    sections: [...document.querySelectorAll('.view')].map((v) => v.className),
    allActions: [...new Set([...document.querySelectorAll('[data-action]')].map((e) => e.dataset.action))].slice(0, 30),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
