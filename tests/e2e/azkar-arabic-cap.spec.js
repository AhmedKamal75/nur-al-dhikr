import { test, expect } from '@playwright/test';

/**
 * azkar-arabic-cap.spec.js — a dhikr list is for reading on the move, not
 * for three words per line.
 *
 * Phone-QA report (2026-11-23): on the Azkar category list, long adhkar
 * (Ayat al-Kursi) rendered oversized and un-scannable — at the maximum
 * Arabic font scale a single card grew to ~1450px on a 390px phone. The
 * list cap (--fs-arabic-card-list) limits the effective Arabic scale to
 * 1.25 below 560px for scrolling card lists; the mushaf reader, focus and
 * the tasbih stage keep the full range by design.
 *
 * Pins: at scale 1.6 on a phone the card Arabic renders at the capped
 * 35px and the same setting on desktop keeps the full 44.8px; the Quran
 * reader's ayah card keeps the full range on the phone too.
 */

function seed(scale) {
  return (s) => {
    localStorage.setItem(
      'nurAlDhikr:v2:state',
      JSON.stringify({ settings: { language: 'en', themeMode: 'dark', arabicFontScale: s } })
    );
  };
}

test('azkar card Arabic is capped at 1.25x on a phone, full range on desktop', async ({
  browser,
}) => {
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const phoneErrors = [];
  phone.on('pageerror', (e) => phoneErrors.push(String(e)));
  // Playwright serialises the function source — no closures; scale goes as arg.
  await phone.addInitScript(seed(), 1.6);
  await phone.goto('./#/category/morning');
  const phoneArabic = phone.locator('.card__arabic').first();
  await expect(phoneArabic).toBeAttached({ timeout: 20000 });
  const phonePx = parseFloat(await phoneArabic.evaluate((a) => getComputedStyle(a).fontSize));
  // 1.75rem * min(1.6, 1.25) = 35px — the cap, not the raw 44.8px.
  expect(phonePx).toBeGreaterThan(30);
  expect(phonePx).toBeLessThanOrEqual(36);
  expect(phoneErrors).toEqual([]);
  await phone.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.addInitScript(seed(), 1.6);
  await desktop.goto('./#/category/morning');
  const desktopArabic = desktop.locator('.card__arabic').first();
  await expect(desktopArabic).toBeAttached({ timeout: 20000 });
  const desktopPx = parseFloat(await desktopArabic.evaluate((a) => getComputedStyle(a).fontSize));
  // 1.75rem * 1.6 = 44.8px — the full range survives above 560px.
  expect(desktopPx).toBeGreaterThan(40);
  await desktop.close();
});

test('quran reader ayah cards keep the full Arabic range on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(seed(), 1.6);
  await page.goto('./#/quran/2/255');
  const ayah = page.locator('.ayah-card__arabic').first();
  await expect(ayah).toBeAttached({ timeout: 20000 });
  const px = parseFloat(await ayah.evaluate((a) => getComputedStyle(a).fontSize));
  expect(px).toBeGreaterThan(40);
});
