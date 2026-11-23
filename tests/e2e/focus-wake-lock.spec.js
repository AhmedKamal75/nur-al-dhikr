import { test, expect } from '@playwright/test';

function setup(language) {
  localStorage.setItem(
    'nurAlDhikr:v2:state',
    JSON.stringify({
      settings: { language, themeMode: 'dark', reduceMotion: true },
      collections: [
        { id: 'wake-test', name: 'Reading', items: ['adh-mor-001', 'adh-eve-001'], createdAt: 1 },
      ],
    })
  );
  window.wakeRequests = [];
  window.wakeSentinels = [];
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: () =>
        new Promise((resolve, reject) => window.wakeRequests.push({ resolve, reject })),
    },
  });
  window.grantWake = (index) => {
    const s = new EventTarget();
    s.released = false;
    s.release = () => {
      s.released = true;
      s.dispatchEvent(new Event('release'));
      return Promise.resolve();
    };
    window.wakeSentinels[index] = s;
    window.wakeRequests[index].resolve(s);
  };
  window.setVisible = (visible) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: visible ? 'visible' : 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  };
}
for (const lang of ['en', 'ar']) {
  test(`Focus wake lock truthful state and late grant lifecycle (${lang})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(setup, lang);
    await page.goto('./#/focus?id=morning&subId=adh-mor-001');
    const toggle = page.locator('[data-action="focus-wake-toggle"]');
    const status = page.locator('.focus__wake-status');
    await expect(toggle).toBeVisible({ timeout: 20000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => wakeRequests.length)).toBe(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toHaveText(
      lang === 'en' ? 'Asking the browser...' : 'جارٍ طلب الإذن من المتصفح...'
    );
    await page.evaluate(() => grantWake(0));
    await expect(status).toHaveText(lang === 'en' ? 'Screen kept awake' : 'الشاشة باقية مضاءة');
    await page.screenshot({ path: testInfo.outputPath(`wake-phone-${lang}.png`) });
    await page.evaluate(() => setVisible(false));
    expect(await page.evaluate(() => wakeSentinels[0].released)).toBe(true);
    await page.evaluate(() => setVisible(true));
    expect(await page.evaluate(() => wakeRequests.length)).toBe(2);
    await page.locator('[data-action="focus-exit"]').click();
    await page.evaluate(() => grantWake(1));
    await expect.poll(() => page.evaluate(() => wakeSentinels[1].released)).toBe(true);
    await page.goto('./#/collection/wake-test');
    await page.locator('[data-action="collection-session-start"]').click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await page.evaluate(() => grantWake(2));
    await page.locator('[data-action="focus-adjacent"][data-dir="1"]').click();
    await expect(page.locator('.focus')).toHaveAttribute('data-item-id', 'adh-eve-001');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => wakeRequests.length)).toBe(3);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`wake-desktop-${lang}.png`) });
    await toggle.click();
    expect(await page.evaluate(() => wakeSentinels[2].released)).toBe(true);
    await toggle.click();
    await page.evaluate(() => wakeRequests[3].reject(new Error('Denied')));
    await expect(status).toHaveText(
      lang === 'en'
        ? 'Browser did not allow it, screen may sleep'
        : 'لم يسمح المتصفح بذلك؛ قد تنطفئ الشاشة'
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
