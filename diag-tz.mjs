import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const lang of ['en', 'ar']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
  await page.addInitScript((p) => {
    localStorage.setItem('nurAlDhikr:v2:state', JSON.stringify({ settings: { language: p.lang, themeMode: 'dark', prayer: { method: 'MWL', asr: 'Standard', latitude: 36.8065, longitude: 10.1815, timezone: 'Africa/Tunis', locationName: p.lang === 'ar' ? 'تونس' : 'Tunis' } } }));
  }, { lang });
  await page.goto('http://127.0.0.1:8899/#/prayer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const info = await page.evaluate(() => ({
    tz: document.querySelector('.next-prayer-card__tz')?.textContent,
    note: document.querySelector('.tz-mismatch-note')?.textContent.trim().slice(0, 90),
    dhuhr: [...document.querySelectorAll('.prayer-row__time')][2]?.textContent.trim(),
  }));
  console.log(lang, JSON.stringify(info));
  await page.screenshot({ path: `/tmp/tz-${lang}.png` });
  await ctx.close();
}
await browser.close();
