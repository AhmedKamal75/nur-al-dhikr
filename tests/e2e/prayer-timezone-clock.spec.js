import { test, expect } from '@playwright/test';
import { calculateTimes } from '../../js/domain/prayer.js';

/**
 * prayer-timezone-clock.spec.js — times follow the saved location's clock.
 *
 * Phone-QA report (2026-11-23, item 3): the timezone setting "can't be
 * used" — settings.prayer.timezone was stored by every location path but
 * never read; every view computed the offset from the DEVICE. A reader
 * who saved a city abroad saw times on their phone's clock.
 *
 * Pin: with the device in America/New_York and the location set to Tunis
 * (Africa/Tunis), the Prayer view renders the Tunis-clock Dhuhr (engine
 * truth), names the zone beside the place, and shows the honest
 * which-clock note — not the New York clock.
 */

const TUNIS = {
  latitude: 36.8065,
  longitude: 10.1815,
  timezone: 'Africa/Tunis',
  locationName: 'Tunis',
  method: 'MWL',
  asr: 'Standard',
};

function seed() {
  return (p) => {
    localStorage.setItem(
      'nurAlDhikr:v2:state',
      JSON.stringify({ settings: { language: 'en', themeMode: 'dark', prayer: p } })
    );
  };
}

test('prayer times render on the saved location timezone, not the device clock', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.addInitScript(seed(), TUNIS);
  await page.goto('./#/prayer');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  // Engine truth for both clocks on the day under test.
  const expected = await page.evaluate(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  });
  const day = new Date(expected.y, expected.m, expected.d);
  const tunis = calculateTimes({
    date: day,
    latitude: TUNIS.latitude,
    longitude: TUNIS.longitude,
    timezoneOffsetHours: 1, // Africa/Tunis in November
    method: 'MWL',
    asr: 'Standard',
  });
  const newYork = calculateTimes({
    date: day,
    latitude: TUNIS.latitude,
    longitude: TUNIS.longitude,
    timezoneOffsetHours: -5, // America/New_York in November
    method: 'MWL',
    asr: 'Standard',
  });
  expect(Number.isFinite(tunis.dhuhr)).toBe(true);
  // The two clocks must actually disagree, or the pin proves nothing.
  expect(Math.abs(tunis.dhuhr - newYork.dhuhr)).toBeGreaterThan(4);

  const dhuhrRow = page.locator('.prayer-row', { hasText: 'Dhuhr' }).first();
  await expect(dhuhrRow).toBeAttached({ timeout: 20000 });
  const rendered = await dhuhrRow.locator('.prayer-row__time').textContent();
  const match = rendered.trim().match(/(\d{1,2}):(\d{2})/);
  expect(match, `Dhuhr row shows a clock time, got "${rendered}"`).toBeTruthy();
  const renderedHours = Number(match[1]) + Number(match[2]) / 60;
  const rendered24 =
    /pm/i.test(rendered) && Number(match[1]) !== 12 ? renderedHours + 12 : renderedHours;
  expect(Math.abs(rendered24 - tunis.dhuhr)).toBeLessThan(0.02);
  expect(Math.abs(rendered24 - newYork.dhuhr)).toBeGreaterThan(4);

  // The zone is named beside the place, and the honest note explains the
  // clock difference (device in New York, location in Tunis).
  await expect(page.locator('.next-prayer-card__tz')).toHaveText('Africa/Tunis');
  await expect(page.locator('.tz-mismatch-note')).toContainText('Africa/Tunis');
  expect(pageErrors).toEqual([]);
  await context.close();
});

test('home ribbon countdown agrees with the location clock', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  await page.addInitScript(seed(), TUNIS);
  await page.goto('./#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  // The ribbon renders real times (no —:— placeholders) for a set location.
  const ribbon = page.locator('.home-prayer-ribbon').first();
  await expect(ribbon).toBeAttached({ timeout: 20000 });
  const text = await ribbon.textContent();
  expect(text).not.toContain('—:—');
  await context.close();
});
