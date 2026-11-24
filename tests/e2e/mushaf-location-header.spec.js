import { test, expect } from '@playwright/test';

for (const width of [390, 430, 1280]) {
  for (const lang of ['en', 'ar']) {
    test(`Mushaf location and controls stay readable (${lang}, ${width}px)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((language) => {
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark' } })
        );
      }, lang);
      await page.goto('#/mushaf?page=561');
      const title = page.locator('.mushaf-topbar__title');
      await expect(title).toBeVisible({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      const measured = await title.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const header = el.closest('header').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        return {
          clipped: el.scrollWidth > el.clientWidth + 1,
          textFits: [...range.getClientRects()].every(
            (r) => r.left >= box.left - 1 && r.right <= box.right + 1
          ),
          headerFits: header.left >= 0 && header.right <= innerWidth,
          controls: [...el.closest('header').querySelectorAll('.icon-btn')].map((button) => {
            const r = button.getBoundingClientRect();
            return {
              label: button.getAttribute('aria-label'),
              width: r.width,
              height: r.height,
              separate: r.top >= box.bottom - 1 || r.bottom <= box.top + 1,
              left: r.left,
              right: r.right,
            };
          }),
        };
      });
      expect(measured.clipped).toBe(false);
      expect(measured.textFits).toBe(true);
      expect(measured.headerFits).toBe(true);
      expect(measured.controls).toHaveLength(6);
      for (const control of measured.controls) {
        expect(control.label).toBeTruthy();
        expect(control.width).toBeGreaterThanOrEqual(44);
        expect(control.height).toBeGreaterThanOrEqual(44);
        expect(control.left).toBeGreaterThanOrEqual(0);
        expect(control.right).toBeLessThanOrEqual(width);
        if (width <= 560) expect(control.separate).toBe(true);
      }
      for (let i = 1; i < measured.controls.length; i++) {
        const a = measured.controls[i - 1];
        const b = measured.controls[i];
        expect(lang === 'ar' ? b.right <= a.left + 1 : a.right <= b.left + 1).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`location-${lang}-${width}.png`) });
    });
  }
}
