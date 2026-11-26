import { test, expect } from '@playwright/test';
import { en } from '../../js/core/i18n/en.js';
import { ar } from '../../js/core/i18n/ar.js';

for (const language of ['en', 'ar'])
  for (const fontScale of [1, 2]) {
    test(`Zakat inline notes visible and associated (${language}, ${fontScale * 100}% text)`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.addInitScript(
        ({ language, fontScale }) => {
          localStorage.setItem(
            'nurAlDhikr:v2:state',
            JSON.stringify({
              settings: {
                language,
                fontScale,
                reduceMotion: true,
                themeMode: language === 'ar' ? 'light' : 'dark',
              },
            })
          );
        },
        { language, fontScale }
      );
      await page.goto('#/zakat');
      const cash = page.locator('[data-field="cash"]');
      await expect(cash).toBeVisible({ timeout: 20000 });
      const dict = language === 'ar' ? ar : en;
      const fields = [
        'cash',
        'goldGrams',
        'silverGrams',
        'investments',
        'businessGoods',
        'receivables',
        'otherAssets',
        'liabilities',
      ];
      for (const id of fields) {
        const input = page.locator(`[data-field="${id}"]`);
        const note = page.locator(`#zakat-note-${id}`);
        await expect(input).toHaveAccessibleName(dict[`zakat.${id}`], { exact: true });
        await expect(input).toHaveAccessibleDescription(dict[`zakat.note.${id}`], { exact: true });
        await expect(note).toBeVisible();
        await expect(note).toHaveText(dict[`zakat.note.${id}`]);
        expect(await note.evaluate((el) => el.closest('label'))).toBeNull();
        await input.scrollIntoViewIfNeeded();
        const rects = await input.evaluate((el) => {
          const note = document.getElementById(el.getAttribute('aria-describedby'));
          const a = el.getBoundingClientRect(),
            b = note.getBoundingClientRect();
          return {
            inputBottom: a.bottom,
            noteTop: b.top,
            noteLeft: b.left,
            noteRight: b.right,
            width: innerWidth,
          };
        });
        expect(rects.noteTop).toBeGreaterThanOrEqual(rects.inputBottom);
        expect(rects.noteLeft).toBeGreaterThanOrEqual(0);
        expect(rects.noteRight).toBeLessThanOrEqual(rects.width);
      }
      await cash.focus();
      await page.keyboard.type('50000');
      await expect(cash).toHaveValue('50000');
      await expect(cash).toBeFocused();
      await expect(cash).toHaveAccessibleDescription(dict['zakat.note.cash'], { exact: true });
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-field="goldGrams"]')).toBeFocused();
      await page.keyboard.type('10');
      await expect(page.locator('[data-field="goldGrams"]')).toHaveValue('10');
      const sample = page.locator('[data-field="investments"]').locator('..');
      await sample.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await sample.screenshot({ path: testInfo.outputPath(`notes-${language}-${fontScale}.png`) });
      await page.locator('.zakat-secondary-disclosure > summary').first().focus();
      await page.keyboard.press('Enter');
      const fitr = page.locator('[data-bind="zakat-fitr-per"]');
      await expect(fitr).toBeVisible();
      await expect(fitr).toHaveAccessibleDescription(dict['zakat.note.fitrPer'], { exact: true });
      await expect(page.locator('#zakat-note-fitrPer')).toBeVisible();
      const fitrField = fitr.locator('..');
      await fitrField.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await fitrField.screenshot({
        path: testInfo.outputPath(`fitr-${language}-${fontScale}.png`),
      });
      await expect(page.locator('.view--zakat > .view__meta')).toHaveText(dict['zakat.disclaimer']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false
      );
    });
  }
