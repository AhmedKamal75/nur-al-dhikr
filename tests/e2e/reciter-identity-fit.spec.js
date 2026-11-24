import { test, expect } from '@playwright/test';

for (const width of [390, 430, 1280]) {
  for (const lang of ['en', 'ar']) {
    test(`Reciter identities wrap without hiding selection or delete (${lang}, ${width}px)`, async ({
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
              customReciters: [
                {
                  id: 'custom-layout-test',
                  nameEn: 'AAA Long custom voice with a descriptive identifying recording name',
                  nameAr: 'قارئ مخصص باسم طويل لاختبار وضوح الاسم الكامل في قائمة اختيار القراء',
                  rewaya: "Hafs A'n Assem - Murattal",
                  server: 'https://example.com/recordings/',
                },
              ],
            },
          })
        );
      }, lang);
      await page.goto('#/audio');
      await expect(
        page.locator('[data-action="audio-select-moshaf"][data-id="qa-57"]')
      ).toBeAttached({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      const rows = await page.locator('.reciter-row').evaluateAll((elements) =>
        elements.map((row) => {
          const issues = [];
          for (const el of row.querySelectorAll(
            '.reciter-row__name, .reciter-row__badges, .reciter-row__sub'
          )) {
            const box = el.getBoundingClientRect();
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              const range = document.createRange();
              range.selectNodeContents(node);
              if (
                [...range.getClientRects()].some(
                  (r) =>
                    r.left < box.left - 1 ||
                    r.right > box.right + 1 ||
                    r.top < row.getBoundingClientRect().top - 1 ||
                    r.bottom > row.getBoundingClientRect().bottom + 1
                )
              )
                issues.push('ink clip: ' + node.textContent);
            }
          }
          return issues;
        })
      );
      expect(rows.length).toBeGreaterThan(10);
      expect(rows.flat()).toEqual([]);
      const custom = page
        .locator('.reciter-row')
        .filter({ has: page.locator('[data-id="custom-layout-test"]') });
      const select = custom.locator('.reciter-row__main');
      const remove = custom.locator('[data-action="audio-remove-custom"]');
      const a = await select.boundingBox();
      const b = await remove.boundingBox();
      expect(lang === 'ar' ? b.x + b.width <= a.x + 1 : a.x + a.width <= b.x + 1).toBe(true);
      await select.click();
      await expect(custom).toHaveClass(/reciter-row--active/);
      await page.screenshot({ path: testInfo.outputPath(`reciters-${lang}-${width}.png`) });
      await remove.click();
      await expect(custom).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      ).toBeLessThanOrEqual(0);
    });
  }
}

for (const lang of ['en', 'ar']) {
  test(`search marks retain inline name flow (${lang})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language,
              themeMode: 'dark',
              customReciters: [
                {
                  id: 'custom-search-flow',
                  nameEn: 'Abdul Abdul Ahmad',
                  nameAr: 'عبد عبد أحمد',
                  server: 'https://example.com/voice/',
                },
              ],
            },
          })
        ),
      lang
    );
    await page.goto('#/audio');
    const input = page.locator('#audio-search-input');
    const custom = page.locator(
      '[data-action="audio-select-moshaf"][data-id="custom-search-flow"]'
    );
    await expect(custom).toBeAttached({ timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    for (const query of lang === 'en' ? ['Abdul', 'Abdul Ahmad'] : ['عبد', 'عبد أحمد']) {
      await input.fill(query);
      await expect(custom.locator('mark').first()).toBeVisible();
      await expect(custom.locator('.reciter-row__name')).toBeVisible();
      await expect
        .poll(async () =>
          custom.locator('.reciter-row__name').evaluate((el) => el.getBoundingClientRect().width)
        )
        .toBeGreaterThan(0);
      const m = await custom.locator('.reciter-row__name').evaluate((el) => {
        const tops = new Set();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const r = document.createRange();
          r.selectNodeContents(node);
          for (const box of r.getClientRects()) if (box.width) tops.add(Math.round(box.top));
        }
        return {
          lines: tops.size,
          marks: el.querySelectorAll('mark').length,
          bottom: el.getBoundingClientRect().bottom,
          badgeTop: el.nextElementSibling.getBoundingClientRect().top,
        };
      });
      expect(m.marks).toBeGreaterThanOrEqual(2);
      expect(m.lines).toBe(1);
      expect(m.badgeTop).toBeGreaterThanOrEqual(m.bottom - 1);
      await page.screenshot({ path: testInfo.outputPath(`search-${lang}-${query.length}.png`) });
    }
  });
}
