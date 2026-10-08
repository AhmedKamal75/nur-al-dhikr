/**
 * e2e/navigation-shell.spec.js — hostile navigation contracts for PR #4.
 *
 * Covers the concrete owner findings:
 *   - desktop rail collapse/expand is reachable;
 *   - parent menu labels navigate while the adjacent summary owns disclosure;
 *   - mobile drawer opens/closes honestly and keeps its trigger state synced;
 *   - the mobile active underline remains a restrained, anchored indicator.
 */
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
  const expandedWidth = await page
    .locator('#bottomnav')
    .evaluate((el) => getComputedStyle(el).width);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'false');

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'true');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  const collapsed = await page.locator('#bottomnav').evaluate((el) => ({
    width: parseFloat(getComputedStyle(el).width),
    railVar: parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sidenav-width-collapsed')
        .trim()
    ),
  }));
  expect(collapsed.railVar).toBeGreaterThan(0);
  await expect
    .poll(async () =>
      page.locator('#bottomnav').evaluate((el) => parseFloat(getComputedStyle(el).width))
    )
    .toBeCloseTo(collapsed.railVar, 0);

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'false');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('navigation shell: parent section names navigate and summaries only disclose', async ({
  page,
}) => {
  await boot(page, 1440, 900);

  const links = await page
    .locator('#bottomnav .nav__scroller .nav__section-link')
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => node.getAttribute('href')).filter(Boolean)),
    ]);
  expect(links.length).toBeGreaterThanOrEqual(3);

  for (const href of links) {
    await page.goto('#/home');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

    const link = page.locator('#bottomnav .nav__scroller .nav__section-link[href="' + href + '"]');
    await expect(link).toBeVisible();
    await link.click();

    const expectedHash = new URL(href, page.url()).hash;
    await expect.poll(() => new URL(page.url()).hash).toBe(expectedHash);
    await expect(
      page.locator(
        '#bottomnav .nav__scroller .nav__section-link[aria-current="page"][href="' + href + '"]'
      )
    ).toBeVisible();
  }

  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  // (v5.17.137) The disclosure now wraps ONLY the sub-list; the section name is
  // a sibling <a> so it stays visible and tappable while collapsed (a closed
  // <details> hides every child but its summary).
  // (v5.17.137) Pin ONE section by its stable data-section, never by
  // `:not([open])`: that filter matches "some closed section", so the moment
  // this one opens the locator silently re-resolves to a different element and
  // the assertion then reads someone else's state.
  const sectionId = await page
    .locator('#bottomnav .nav__scroller div.nav__section details.nav__section-details')
    .evaluateAll((nodes) => nodes.map((n) => n.closest('.nav__section')?.dataset.section))
    .then((ids) => ids.find(Boolean));
  const closed = page.locator(
    `#bottomnav .nav__scroller div.nav__section[data-section="${sectionId}"] details.nav__section-details`
  );
  await expect(closed).toBeVisible();
  await expect(closed, 'this section starts collapsed').not.toHaveAttribute('open', '');
  const summary = closed.locator('summary.nav__section-toggle');
  await expect(summary).toHaveAttribute('aria-controls', /nav-sub-/);

  await summary.click();
  await expect(closed).toHaveAttribute('open', '');
  await expect(closed.locator('.nav__item--sub').first()).toBeVisible();

  await summary.click();
  await expect(closed).not.toHaveAttribute('open', '');
});

test('navigation shell: desktop child and application-tail links all route', async ({ page }) => {
  await boot(page, 1440, 900);

  const hrefs = await page
    .locator('#bottomnav .nav__scroller a.nav__item[href]')
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => node.getAttribute('href')).filter(Boolean)),
    ]);
  expect(hrefs.length).toBeGreaterThanOrEqual(15);

  for (const href of hrefs) {
    await page.goto('#/home');
    await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });
    const link = page.locator('#bottomnav .nav__scroller a.nav__item[href="' + href + '"]').first();
    const section = link.locator('xpath=ancestor::details[1]');
    if (await section.count()) {
      const open = await section.getAttribute('open');
      if (open === null) {
        await section.locator('summary.nav__section-toggle').click();
        await expect(section).toHaveAttribute('open', '');
      }
    }
    await expect(link).toBeVisible();
    await link.click();
    const expectedHash = new URL(href, page.url()).hash;
    await expect.poll(() => new URL(page.url()).hash).toBe(expectedHash);
  }
});

test('navigation shell: mobile drawer and active underline remain honest', async ({ page }) => {
  await boot(page, 393, 852);

  const trigger = page.locator('.topbar__menu');
  const drawer = page.locator('#nav-drawer');
  await expect(trigger).toHaveAttribute('aria-controls', 'nav-drawer');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(drawer).toBeHidden();

  await trigger.click();
  await expect(page.locator('body')).toHaveClass(/nav-drawer-open/);
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  const drawerLink = drawer.locator('.nav__section-link').first();
  await expect(drawerLink).toBeVisible();
  const drawerHref = await drawerLink.getAttribute('href');
  await drawerLink.click();
  await expect(page.locator('body')).not.toHaveClass(/nav-drawer-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => new URL(page.url()).hash).toBe(drawerHref);

  await trigger.click();
  await expect(drawer).toBeVisible();

  const close = drawer.locator('[data-action="nav-drawer-close"]');
  await close.click();
  await expect(page.locator('body')).not.toHaveClass(/nav-drawer-open/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.click();
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  const active = page.locator('.nav-mobile-bar__item[aria-current="page"]').first();
  await expect(active).toBeVisible();
  const underline = await active.evaluate((el) => {
    const style = getComputedStyle(el, '::after');
    return {
      position: getComputedStyle(el).position,
      content: style.content,
      left: style.left,
      right: style.right,
      bottom: style.bottom,
      height: style.height,
      width: style.width,
    };
  });
  expect(underline.position).toBe('relative');
  expect(underline.content).toBe('""');
  expect(parseFloat(underline.left)).toBeGreaterThan(0);
  expect(parseFloat(underline.right)).toBeGreaterThan(0);
  expect(underline.bottom).toBe('2px');
  expect(underline.height).toBe('2px');
});
