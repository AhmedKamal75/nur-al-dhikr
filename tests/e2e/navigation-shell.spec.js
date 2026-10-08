import { test, expect } from '@playwright/test';

async function boot(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
  await expect(page.locator('.topbar__menu')).toBeVisible({ timeout: 10000 });
}

test('navigation shell: desktop rail collapse and expand are reachable', async ({ page }) => {
  await boot(page, 1440, 900);
  const toggle = page.locator('.topbar__menu');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'false');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('navigation shell: parent section links navigate while summaries disclose', async ({ page }) => {
  await boot(page, 1440, 900);
  const link = page.locator('#bottomnav .nav__scroller .nav__section-link').first();
  const href = await link.getAttribute('href');
  await link.click();
  await expect.poll(() => new URL(page.url()).hash).toBe(new URL(href, page.url()).hash);
  await page.goto('#/home');
  const closed = page.locator('#bottomnav details.nav__section:not([open])').first();
  await expect(closed).toBeVisible();
  const summary = closed.locator('summary.nav__section-toggle');
  await summary.click();
  await expect(closed).toHaveAttribute('open', '');
  await summary.click();
  await expect(closed).not.toHaveAttribute('open', '');
});

test('navigation shell: mobile drawer trigger and active underline stay honest', async ({ page }) => {
  await boot(page, 393, 852);
  const trigger = page.locator('.topbar__menu');
  const drawer = page.locator('#nav-drawer');
  await expect(trigger).toHaveAttribute('aria-controls', 'nav-drawer');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const active = page.locator('.nav-mobile-bar__item[aria-current="page"]').first();
  const underline = await active.evaluate((el) => {
    const style = getComputedStyle(el, '::after');
    return { position: getComputedStyle(el).position, content: style.content, left: style.left, right: style.right, bottom: style.bottom, height: style.height };
  });
  expect(underline.position).toBe('relative');
  expect(underline.content).toBe('""');
  expect(parseFloat(underline.left)).toBeGreaterThan(0);
  expect(parseFloat(underline.right)).toBeGreaterThan(0);
  expect(underline.bottom).toBe('2px');
  expect(underline.height).toBe('2px');
});
