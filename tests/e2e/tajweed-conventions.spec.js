import { test, expect } from '@playwright/test';

for (const lang of ['en', 'ar']) {
  test(`convention selection persists without losing overrides (${lang})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((language) => {
      if (localStorage.getItem('convention-seeded')) return;
      localStorage.setItem('convention-seeded', '1');
      localStorage.setItem(
        'nurAlDhikr:v2:state',
        JSON.stringify({
          settings: {
            language,
            themeMode: 'dark',
            tajweedPrefs: { rules: { ghunnah: false }, colors: { nasal: '#123456' } },
          },
        })
      );
    }, lang);
    await page.goto('./#/quran');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    const open = () =>
      page.evaluate(async () => {
        const { clickHandlers } = await import('/js/app/handlers/quran.js');
        clickHandlers['tajweed-open-settings']();
      });
    await open();
    const dam = page.locator(
      '[data-action="tajweed-set-convention"][data-convention="dar-al-maarifah"]'
    );
    const lpmq = page.locator('[data-action="tajweed-set-convention"][data-convention="lpmq"]');
    await expect(dam).toHaveAttribute('aria-pressed', 'true');
    await lpmq.click();
    await expect(lpmq).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('[data-action="tajweed-toggle-rule"][data-rule="ghunnah"]')
    ).toHaveAttribute('aria-pressed', 'false');
    await page.locator('.tajweed-convention summary').click();
    await expect(page.locator('.tajweed-convention')).toContainText(
      lang === 'en' ? 'do not replace learning with a teacher' : 'ولا تغني عن التعلم'
    );
    await page.screenshot({ path: testInfo.outputPath(`convention-phone-${lang}.png`) });
    await page.reload();
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    await open();
    await expect(lpmq).toHaveAttribute('aria-pressed', 'true');
    await dam.click();
    await expect(dam).toHaveAttribute('aria-pressed', 'true');
    const settings = await page.evaluate(
      async () => (await import('/js/core/state.js')).store.getState().settings
    );
    expect(settings.tajweedPrefs.rules.ghunnah).toBe(false);
    expect(settings.tajweedPrefs.colors.nasal).toBe('#123456');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`convention-desktop-${lang}.png`) });
  });
}
