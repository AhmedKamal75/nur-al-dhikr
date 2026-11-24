import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function drag(page, client, points, { release = true } = {}) {
  const x = points[0];
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: 360 }],
  });
  const samples = [];
  for (const next of points.slice(1)) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: next, y: 360 }],
    });
    await page.waitForTimeout(40);
    samples.push(
      await page.evaluate(() => {
        const box = (s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, width: r.width, page: el.dataset.page };
        };
        return {
          outgoing: box('.mushaf-drag-outgoing'),
          incoming: box('.mushaf-drag-incoming'),
          hash: location.hash,
        };
      })
    );
  }
  if (release) await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return samples;
}

for (const lang of ['en', 'ar']) {
  test(`physical paper follows finger and commits exact adjacent pages (${lang})`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language, themeMode: 'dark' } })
        ),
      lang
    );
    await page.goto('#/mushaf?page=4');
    await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { ensureMushafNavigationPages } = await import('/js/app/lazyData.js');
      await ensureMushafNavigationPages(3);
      await ensureMushafNavigationPages(5);
    });
    const client = await page.context().newCDPSession(page);
    const samples = await drag(page, client, [80, 100, 140, 180, 220], { release: false });
    samples.shift(); // Chromium first crosses its native touch slop before dispatching move.
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      expect(s.outgoing).toBeTruthy();
      expect(s.incoming.page).toBe('5');
      expect(s.outgoing.x - s.incoming.x).toBeCloseTo(s.outgoing.width, 0);
      expect(s.hash).toContain('page=4');
      if (i) expect(s.outgoing.x).toBeGreaterThan(samples[i - 1].outgoing.x + 20);
    }
    await page.screenshot({ path: testInfo.outputPath(`mid-drag-${lang}.png`) });
    const before = samples.at(-1).outgoing.x;
    await page.evaluate(() => {
      window.__releaseFrames = [];
      const original = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        window.__releaseFrames.push(frames);
        return original.call(this, frames, options);
      };
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const frames = await page.evaluate(() => window.__releaseFrames);
    expect(frames[0][0].transform).toBe(`translateX(${before - 12}px)`);
    expect(frames[1][0].transform).toBe(
      `translateX(${before - 12 - samples.at(-1).outgoing.width}px)`
    );
    await expect(page).toHaveURL(/page=5/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    const back = await drag(page, client, [280, 250, 210, 160]);
    expect(back.at(-1).incoming.page).toBe('4');
    await expect(page).toHaveURL(/page=4/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    // Slow short pull cancels; reversal follows the actual finger, not its initial intent.
    await drag(page, client, [150, 165, 175]);
    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/page=4/);
    const reversed = await drag(page, client, [180, 230, 200, 150, 100]);
    expect(reversed.at(-1).incoming.page).toBe('3');
    await expect(page).toHaveURL(/page=3/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/page=4/);
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/page=3/);
    await page.locator('.mushaf-nav [data-action="mushaf-next"]').click();
    await expect(page).toHaveURL(/page=4/);
    await page.goto('#/mushaf?page=1');
    await expect(page.locator('.mushaf-book')).toBeVisible();
    await drag(page, client, [270, 230, 180, 120]);
    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/page=1/);
    await page.goto('#/mushaf?page=604');
    await expect(page.locator('.mushaf-book')).toBeVisible();
    await drag(page, client, [80, 120, 170, 220]);
    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/page=604/);
  });
}

for (const reduced of [true, false]) {
  test(`swipe cancellation and motion preference (${reduced ? 'reduced' : 'animated'})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('#/mushaf?page=4');
    await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
    await page.evaluate(async () => {
      const { ensureMushafNavigationPages } = await import('/js/app/lazyData.js');
      await ensureMushafNavigationPages(5);
    });
    const client = await page.context().newCDPSession(page);
    await drag(page, client, [80, 110, 150, 200]);
    await expect(page).toHaveURL(/page=5/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    // A native cancellation is not a completed turn.
    await drag(page, client, [80, 110, 150, 200], { release: false });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    await expect(page).toHaveURL(/page=5/);
    // A route exit while a finger is down removes its temporary papers.
    await drag(page, client, [80, 110, 150, 200], { release: false });
    await page.evaluate(() => {
      location.hash = '#/home';
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page).toHaveURL(/home/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/is-mushaf-dragging/);
  });
}

test('vertical scroll, pinch and animation-off preserve navigation', async ({ page }) => {
  await page.goto('#/mushaf?page=4');
  await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 180, y: 400 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 182, y: 330 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page).toHaveURL(/page=4/);
  await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  const scaleBefore = await page.evaluate(async () => {
    const { store } = await import('/js/core/state.js');
    return store.getState().settings.mushafPrefs.fontScale;
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 130, y: 360 },
      { x: 230, y: 360 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 120, y: 360 },
      { x: 240, y: 360 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 110, y: 360 },
      { x: 250, y: 360 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page).toHaveURL(/page=4/);
  await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
  const scaleAfter = await page.evaluate(async () => {
    const { store } = await import('/js/core/state.js');
    return store.getState().settings.mushafPrefs.fontScale;
  });
  expect(scaleAfter).toBeGreaterThan(scaleBefore);
  await page.evaluate(async () => {
    const { store, actions } = await import('/js/core/state.js');
    store.dispatch(actions.updateMushafPrefs({ pageFlipAnimation: false }));
  });
  await drag(page, client, [80, 110, 150, 200]);
  await expect(page).toHaveURL(/page=5/);
  await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
});

test('a missing adjacent page never substitutes another page during drag', async ({ page }) => {
  await page.route('**/data/mushaf/5.json*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.abort();
  });
  await page.goto('#/mushaf?page=4');
  await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
  const client = await page.context().newCDPSession(page);
  await drag(page, client, [80, 110, 150, 200]);
  await page.waitForTimeout(350);
  await expect(page).toHaveURL(/page=4/);
  await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
});

test('fullscreen paper follows the finger and rapid second gestures cannot double-commit', async ({
  page,
}, testInfo) => {
  await page.goto('#/mushaf?page=4');
  await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
  await page.locator('[data-action="mushaf-toggle-fullscreen"]').click();
  await expect(page.locator('body')).toHaveClass(/is-mushaf-fullscreen/);
  await page.evaluate(async () => {
    const { ensureMushafNavigationPages } = await import('/js/app/lazyData.js');
    await ensureMushafNavigationPages(5);
  });
  const client = await page.context().newCDPSession(page);
  const samples = await drag(page, client, [80, 110, 150, 200], { release: false });
  expect(samples.at(-1).incoming.page).toBe('5');
  await page.screenshot({ path: testInfo.outputPath('fullscreen-mid-drag.png') });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 80, y: 360 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 200, y: 360 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page).toHaveURL(/page=5/);
  await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
});

for (const language of ['en', 'ar']) {
  test(`fullscreen drag preserves fitted font, lines and vertical geometry (${language})`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (lang) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({ settings: { language: lang, themeMode: 'dark' } })
        ),
      language
    );
    await page.goto('#/mushaf?page=4');
    await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-action="mushaf-toggle-fullscreen"]').click();
    await expect(page.locator('body')).toHaveClass(/is-mushaf-fullscreen/);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const { ensureMushafNavigationPages } = await import('/js/app/lazyData.js');
      await ensureMushafNavigationPages(5);
      const { refreshMushafFit } = await import('/js/app/autoFit.js');
      refreshMushafFit();
    });
    const geometry = async (selector) =>
      page.locator(selector).evaluate((el) => {
        const text = el.querySelector('.mushaf-page__text');
        const r = text.getBoundingClientRect();
        const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
        const tops = new Set();
        let node;
        while ((node = walker.nextNode())) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects())
            if (rect.width > 0) tops.add(Math.round(rect.top));
        }
        return {
          font: parseFloat(getComputedStyle(text).fontSize),
          top: r.top,
          height: r.height,
          scroll: text.scrollHeight,
          lines: tops.size,
        };
      });
    await page.waitForTimeout(450); // Let the fullscreen entrance finish before measuring its fixed geometry.
    const before = await geometry('#main .mushaf-book');
    const client = await page.context().newCDPSession(page);
    await drag(page, client, [80, 110, 150, 200], { release: false });
    const outgoing = await geometry('.mushaf-drag-outgoing');
    const incoming = await geometry('.mushaf-drag-incoming');
    for (const key of ['font', 'top', 'height', 'scroll', 'lines'])
      expect(outgoing[key], `outgoing ${key}`).toBeCloseTo(before[key], 0);
    expect(incoming.scroll).toBeLessThanOrEqual(incoming.height + 1);
    await page.screenshot({ path: testInfo.outputPath(`fitted-mid-${language}.png`) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page).toHaveURL(/page=5/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    const settled = await geometry('#main .mushaf-book');
    for (const key of ['font', 'top', 'height', 'scroll', 'lines'])
      expect(settled[key], `incoming/settled ${key}`).toBeCloseTo(incoming[key], 0);
  });
}

for (const mode of ['windowed', 'manual', 'madinah']) {
  test(`drag retains paper context and scrolled geometry (${mode})`, async ({ page }, testInfo) => {
    await page.addInitScript(
      (paper) =>
        localStorage.setItem(
          'nurAlDhikr:v2:state',
          JSON.stringify({
            settings: {
              language: 'ar',
              themeMode: 'light',
              mushafPrefs: {
                paper,
                font: 'scheherazade',
                fontScale: 1.3,
                lineSpacing: 1.1,
                autoFit: false,
              },
            },
          })
        ),
      mode === 'madinah' ? 'madinah' : 'night'
    );
    await page.goto('#/mushaf?page=4');
    await expect(page.locator('.mushaf-book')).toBeVisible({ timeout: 20000 });
    if (mode === 'manual') {
      await page.locator('[data-action="mushaf-toggle-fullscreen"]').click();
      await expect(page.locator('body')).toHaveClass(/is-mushaf-fullscreen/);
      await page.waitForTimeout(450);
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      const { ensureMushafNavigationPages } = await import('/js/app/lazyData.js');
      await ensureMushafNavigationPages(5);
      if (document.body.classList.contains('is-mushaf-fullscreen')) {
        const { refreshMushafFit } = await import('/js/app/autoFit.js');
        refreshMushafFit();
        document.querySelector('.mushaf-page__text').scrollTop = 90;
      } else window.scrollTo(0, 180);
    });
    const measure = async (selector) =>
      page.locator(selector).evaluate((el) => {
        const text = el.querySelector('.mushaf-page__text'),
          marker = el.querySelector('.mushaf-ayah__marker');
        const c = getComputedStyle(text),
          r = text.getBoundingClientRect();
        return {
          font: c.fontSize,
          spacing: c.wordSpacing,
          line: c.lineHeight,
          color: c.color,
          top: r.top,
          height: r.height,
          scroll: text.scrollTop,
          marker: getComputedStyle(marker).backgroundColor,
        };
      });
    const before = await measure('#main .mushaf-book');
    const client = await page.context().newCDPSession(page);
    await drag(page, client, [80, 110, 150, 200], { release: false });
    const outgoing = await measure('.mushaf-drag-outgoing');
    const incoming = await measure('.mushaf-drag-incoming');
    for (const key of ['font', 'spacing', 'line', 'color', 'marker', 'scroll'])
      expect(outgoing[key], key).toBe(before[key]);
    expect(outgoing.top).toBeCloseTo(before.top, 0);
    expect(outgoing.height).toBeCloseTo(before.height, 0);
    await page.screenshot({ path: testInfo.outputPath(`context-${mode}.png`) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page).toHaveURL(/page=5/);
    await expect(page.locator('.mushaf-drag-stage')).toHaveCount(0);
    const settled = await measure('#main .mushaf-book');
    for (const key of ['font', 'spacing', 'line', 'color', 'marker', 'height'])
      expect(settled[key], key).toBe(incoming[key]);
  });
}
