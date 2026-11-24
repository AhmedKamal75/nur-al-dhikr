import { test, expect } from '@playwright/test';
for (const lang of ['en', 'ar']) {
  test(`all expanded sidebar sections keep full labels and keyboard disclosure (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark', reduceMotion: true } })
        ),
      lang
    );
    await page.goto('#/journal');
    const sections = page.locator('#bottomnav .nav__scroller .nav__section');
    await expect(sections.first()).toBeVisible({ timeout: 20000 });
    expect(await sections.count()).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < (await sections.count()); i++) {
      const section = sections.nth(i),
        details = section.locator('details'),
        toggle = section.locator('summary'),
        link = section.locator('.nav__section-link');
      if ((await details.getAttribute('open')) !== null) {
        await toggle.click();
        await expect(details).not.toHaveAttribute('open', '');
      }
      await page.waitForTimeout(100);
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      const fit = await section.evaluate((el) => {
        const link = el.querySelector('.nav__section-link'),
          label = link.querySelector('.nav__label'),
          sub = el.querySelector('.nav__sub'),
          toggle = el.querySelector('summary');
        const l = link.getBoundingClientRect(),
          s = sub.getBoundingClientRect(),
          t = toggle.getBoundingClientRect(),
          section = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(label);
        return {
          labelFits: [...range.getClientRects()].every(
            (b) => b.left >= l.left && b.right <= l.right
          ),
          subBelow: s.top >= Math.max(l.bottom, t.bottom) - 1,
          subWidth: s.width,
          sectionWidth: section.width,
          headerAligned: Math.abs(l.top - t.top) < 1,
          noOverlap: l.right <= t.left + 1 || t.right <= l.left + 1,
        };
      });
      expect(fit.labelFits).toBe(true);
      expect(fit.subBelow).toBe(true);
      expect(fit.subWidth).toBeGreaterThan(fit.sectionWidth - 3);
      expect(fit.headerAligned).toBe(true);
      expect(fit.noOverlap).toBe(true);
      await expect(link).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`section-${i}-${lang}.png`),
        animations: 'disabled',
      });
      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(details).not.toHaveAttribute('open', '');
      await expect(link).toBeVisible();
    }
    await page.locator('.topbar__menu').click();
    await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'true');
    await expect(sections.first().locator('.nav__section-link')).toBeVisible();
    await page.locator('.topbar__menu').click();
    await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed', 'false');
    await expect(
      page.locator('#bottomnav .nav__scroller .nav__section-link .nav__label').first()
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.topbar__menu').click();
    const drawer = page.locator('#nav-drawer');
    await expect(drawer).toBeVisible();
    const mobileSections = drawer.locator('.nav__section');
    for (let i = 0; i < (await mobileSections.count()); i++) {
      const section = mobileSections.nth(i),
        details = section.locator('details'),
        toggle = section.locator('summary');
      if ((await details.getAttribute('open')) === null) await toggle.click();
      const valid = await section.evaluate((el) => {
        const l = el.querySelector('.nav__section-link').getBoundingClientRect(),
          s = el.querySelector('.nav__sub').getBoundingClientRect(),
          t = el.querySelector('summary').getBoundingClientRect();
        return (
          s.top >= Math.max(l.bottom, t.bottom) - 1 &&
          s.width >= el.getBoundingClientRect().width - 3 &&
          (l.right <= t.left + 1 || t.right <= l.left + 1)
        );
      });
      expect(valid).toBe(true);
      await toggle.click();
    }
    await page.screenshot({
      path: testInfo.outputPath(`drawer-${lang}.png`),
      animations: 'disabled',
    });
  });
}
