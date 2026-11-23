import { test, expect } from '@playwright/test';

for (const width of [390, 430, 1280]) {
  for (const lang of ['en', 'ar']) {
    test(`Home prayer ribbon ink fits each cell (${lang}, ${width}px)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((language) => {
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language,
              themeMode: 'dark',
              prayer: {
                method: 'MWL',
                asr: 'Standard',
                latitude: 30.0444,
                longitude: 31.2357,
                timezone: 'Africa/Cairo',
                locationName: 'Cairo',
              },
            },
          })
        );
      }, lang);
      await page.goto('#/home');
      await expect(page.locator('.home-prayer-ribbon__time').first()).toBeVisible({
        timeout: 20000,
      });
      await expect(page.locator('.home-prayer-ribbon__time').first()).not.toContainText('—');
      await page.evaluate(() => document.fonts.ready);
      // Element boxes can fit while nowrap text paints past them. Measure
      // actual text fragments, including the noon clock's longer hour field.
      const cells = await page.locator('.home-prayer-ribbon__cell').evaluateAll((elements) =>
        elements.map((cell) => {
          const bounds = cell.getBoundingClientRect();
          const fragments = [];
          for (const selector of ['.home-prayer-ribbon__time', '.home-prayer-ribbon__name']) {
            const el = cell.querySelector(selector);
            const range = document.createRange();
            range.selectNodeContents(el);
            for (const r of range.getClientRects()) {
              fragments.push({
                text: el.textContent,
                inside:
                  r.left >= bounds.left - 1 &&
                  r.right <= bounds.right + 1 &&
                  r.top >= bounds.top - 1 &&
                  r.bottom <= bounds.bottom + 1,
              });
            }
          }
          return fragments;
        })
      );
      expect(cells).toHaveLength(6);
      for (const fragments of cells) {
        expect(fragments.length).toBeGreaterThanOrEqual(2);
        for (const fragment of fragments) expect(fragment.inside, fragment.text).toBe(true);
      }
      await page.screenshot({ path: testInfo.outputPath(`ribbon-${lang}-${width}.png`) });
    });
  }
}
