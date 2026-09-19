/**
 * e2e/player-chrome.spec.js — (v5.12.0) one player, every side: minimize /
 * restore keeps the session, Space / arrows / M drive it, and the bar
 * fades after 5s idle and returns on activity.
 */
import { test, expect } from '@playwright/test';

test('player chrome: minimize, keys, idle fade keep one session', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto('#/mushaf?page=2');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-action="surah-play"]')];
    const b = btns.find((x) => x.dataset.surah === '2') || btns[0];
    b.click();
  });
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 20000 });

  // Minimize → slim pill, session untouched.
  await page.locator('.player-bar--recite [data-action="player-min-toggle"]').first().click();
  await expect(page.locator('.player-bar--min')).toBeVisible({ timeout: 10000 });
  // Restore → full console back.
  await page.locator('.player-bar--min [data-action="player-min-toggle"]').click();
  await expect(page.locator('.player-bar--recite')).toBeVisible({ timeout: 10000 });

  // Drop focus to the page body so Space reaches the player drills, not
  // a focused control (which keeps its native activate, by design).
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const counter = page.locator('.player-bar__ayah-counter').first();
  const before = await counter.textContent();
  // Space pauses and resumes.
  await page.keyboard.press(' ');
  await expect(page.locator('.player-bar--recite [data-action="recite-pause-toggle"]').first()).toHaveAttribute('aria-label', /Play|تشغيل/, { timeout: 10000 });
  await page.keyboard.press(' ');
  // ArrowLeft steps to the next ayah (mushaf order).
  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(async () => counter.textContent(), { timeout: 15000 })
    .not.toBe(before);
  // M mutes (chip presses in).
  await page.keyboard.press('m');
  await expect(page.locator('[data-action="audio-mute-toggle"]').first()).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
  await page.keyboard.press('m');

  // Idle fade: 5s of quiet dims the bar; motion wakes it.
  await page.waitForTimeout(5600);
  await expect(page.locator('body.player-idle')).toBeAttached({ timeout: 5000 });
  await page.mouse.move(300, 300);
  await expect(page.locator('body.player-idle')).toHaveCount(0, { timeout: 5000 });
  expect(pageErrors).toEqual([]);
});
