import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript((s) => {
  localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: 'ar', themeMode: 'dark', arabicFontScale: s, elderMode: true } }));
}, 1.0);
await page.goto('http://127.0.0.1:8899/#/category/morning', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
const px = await page.locator('.card__arabic').first().evaluate((a) => getComputedStyle(a).fontSize);
console.log('elder phone card arabic:', px);
await page.screenshot({ path: '/tmp/elder-phone-ar.png' });
await browser.close();
