/**
 * tests/e2e/listen-all.spec.js — (v5.17.179, C18) "Listen to all" on the
 * adhkar category view, in a real DOM with a deterministic speech engine.
 *
 * Headless browsers ship speechSynthesis without voices and never fire
 * utterance events, so the spec installs a controllable stand-in before
 * the app boots: it records every spoken text, honours pause/cancel like
 * a real engine, and ends the current utterance only when the test says
 * so (window.__ttsEnd()). Everything else — store, handlers, arbitration,
 * rendering — is the app's own code.
 *
 * Covered: list ordering, hidden-item skip, one read per item with a
 * clean finish, pause/resume/stop, the current card's playing highlight,
 * any other Listen tap ending the session, stop-on-navigate, and the
 * phone layout in EN + AR.
 */
import { test, expect } from '@playwright/test';
import { en } from '../../js/core/i18n/en.js';
import { ar } from '../../js/core/i18n/ar.js';

const PHONE = { width: 390, height: 844 };
// The second item of the morning category in data/adhkar.json — hidden in
// the seeded prefs to prove the chain skips exactly what the list skips.
const HIDDEN_ID = 'adh-mor-003a';

async function stubSpeech(page) {
  await page.addInitScript(() => {
    const log = [];
    const synth = {
      speaking: false,
      paused: false,
      _current: null,
      getVoices: () => [],
      speak(u) {
        log.push(u.text);
        synth._current = u;
        synth.speaking = true;
        synth.paused = false;
      },
      cancel() {
        synth.speaking = false;
        synth.paused = false;
        synth._current = null;
      },
      pause() {
        if (synth.speaking) synth.paused = true;
      },
      resume() {
        synth.paused = false;
      },
    };
    window.__ttsLog = log;
    window.__ttsEnd = () => {
      const u = synth._current;
      synth._current = null;
      synth.speaking = false;
      if (u && u.onend) u.onend();
    };
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.onend = null;
        this.onerror = null;
      }
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
  });
}

async function seed(page, language, { hide = false } = {}) {
  await stubSpeech(page);
  await page.addInitScript(
    ({ language, hide, hiddenId }) => {
      localStorage.setItem(
        'nurAlDhikr:v2:state',
        JSON.stringify({
          settings: {
            language,
            reduceMotion: true,
            themeMode: language === 'ar' ? 'light' : 'dark',
            ...(hide ? { contentPrefs: { hiddenItems: { [hiddenId]: true } } } : {}),
          },
        })
      );
    },
    { language, hide, hiddenId: HIDDEN_ID }
  );
}

/** The visible morning-adhkar queue and its spoken texts, from live state. */
async function expectedQueue(page) {
  return page.evaluate(async () => {
    const { store } = await import('/js/core/state.js');
    const { visibleCategoryItems } = await import('/js/services/contentPrefs.js');
    const st = store.getState();
    const doc = st.library.documents.adhkar;
    const cat = doc.categories.find((c) => c.id === 'morning');
    return visibleCategoryItems(st, cat).map((it) => ({
      id: it.id,
      text: it.transliteration || it.arabic,
    }));
  });
}

const ttsLog = (page) => page.evaluate(() => window.__ttsLog.slice());
const bar = (page) => page.locator('.listen-all-bar');
const startButton = (page) => page.locator('[data-action="listen-all-start"]');
const progressText = (dict, n, total) =>
  dict['category.listenAllProgress'].replace('{n}', String(n)).replace('{total}', String(total));

for (const language of ['en', 'ar']) {
  test(`Listen to all: order, skip, highlight, pause/stop (${language}, phone)`, async ({
    page,
  }, testInfo) => {
    const dict = language === 'ar' ? ar : en;
    await page.setViewportSize(PHONE);
    await seed(page, language, { hide: true });
    await page.goto('./#/category/morning');
    const start = startButton(page);
    await expect(start).toBeVisible({ timeout: 20000 });
    await expect(start).toContainText(dict['category.listenAll']);

    const queue = await expectedQueue(page);
    expect(queue.length).toBeGreaterThan(5);
    expect(queue.some((it) => it.id === HIDDEN_ID)).toBe(false);
    const total = queue.length;

    await start.click();
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toContainText(progressText(dict, 1, total));
    expect(await ttsLog(page)).toEqual([queue[0].text]);
    // The current card keeps its usual playing highlight.
    const currentCard = page.locator(`article.card[data-item-id="${queue[0].id}"]`);
    await expect(currentCard.locator('[data-action="toggle-speech"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.screenshot({ path: testInfo.outputPath(`listen-all-bar-${language}.png`) });

    // Two advances land in list order and the counter follows.
    await page.evaluate(() => window.__ttsEnd());
    await expect(bar(page)).toContainText(progressText(dict, 2, total));
    await page.evaluate(() => window.__ttsEnd());
    await expect(bar(page)).toContainText(progressText(dict, 3, total));
    expect(await ttsLog(page)).toEqual(queue.slice(0, 3).map((it) => it.text));

    // Pause, honestly reported; resume continues the same utterance.
    const pauseBtn = bar(page).locator('[data-action="listen-all-toggle-pause"]');
    await pauseBtn.click();
    await expect(pauseBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(pauseBtn).toContainText(dict['category.listenAllResume']);
    expect(await page.evaluate(() => window.speechSynthesis.paused)).toBe(true);
    await pauseBtn.click();
    await expect(pauseBtn).toHaveAttribute('aria-pressed', 'false');

    // Run the remaining items: one read each, in order, hidden never read.
    // The third item is still speaking, so end utterances until the chain
    // finishes on its own (last onEnd closes the session).
    for (let i = 0; i < total + 2 && (await bar(page).count()) > 0; i++) {
      await page.evaluate(() => window.__ttsEnd());
    }
    await expect(bar(page)).toHaveCount(0);
    await expect(startButton(page)).toBeVisible();
    const log = await ttsLog(page);
    expect(log).toEqual(queue.map((it) => it.text));
    expect(new Set(log).size).toBe(log.length);
    expect(log).not.toContain(queue.find((it) => it.id === HIDDEN_ID)?.text);

    // Restart and stop mid-session: the bar leaves, the engine silences.
    await startButton(page).click();
    await expect(bar(page)).toBeVisible();
    await bar(page).locator('[data-action="listen-all-stop"]').click();
    await expect(bar(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
    expect(
      await page.evaluate(async () => {
        const { store } = await import('/js/core/state.js');
        const st = store.getState();
        return st.listenAll === null && st.speakingItemId === null;
      })
    ).toBe(true);

    // No horizontal overflow on a phone in either language.
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false
    );
  });
}

test('another Listen tap ends the session (current item stops, another item goes solo)', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await seed(page, 'en');
  await page.goto('./#/category/morning');
  await startButton(page).click({ timeout: 20000 });
  await expect(bar(page)).toBeVisible();
  const queue = await expectedQueue(page);

  // Tapping Listen on a DIFFERENT card ends the session and speaks it alone.
  const otherCard = page.locator(`article.card[data-item-id="${queue[1].id}"]`);
  await otherCard.locator('[data-action="toggle-speech"]').click();
  await expect(bar(page)).toHaveCount(0);
  expect(
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      return store.getState().listenAll === null;
    })
  ).toBe(true);
  const log1 = await ttsLog(page);
  expect(log1[log1.length - 1]).toBe(queue[1].text);
  expect(
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      return store.getState().speakingItemId;
    })
  ).toBe(queue[1].id);

  // Tapping the solo-speaking card's Listen stops it outright.
  await otherCard.locator('[data-action="toggle-speech"]').click();
  expect(
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      return store.getState().speakingItemId === null;
    })
  ).toBe(true);

  // Tapping the item the SESSION is reading is a stop, not a solo restart.
  await startButton(page).click();
  await expect(bar(page)).toBeVisible();
  const before = (await ttsLog(page)).length;
  const firstCard = page.locator(`article.card[data-item-id="${queue[0].id}"]`);
  await firstCard.locator('[data-action="toggle-speech"]').click();
  await expect(bar(page)).toHaveCount(0);
  expect(await ttsLog(page)).toHaveLength(before);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
});

test('route change stops the session', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await seed(page, 'en');
  await page.goto('./#/category/morning');
  await startButton(page).click({ timeout: 20000 });
  await expect(bar(page)).toBeVisible();
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(true);

  await page.locator('a.back-link', { hasText: en['nav.azkar'] }).click();
  await expect(page.locator('.view--category')).toHaveCount(0);
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
  expect(
    await page.evaluate(async () => {
      const { store } = await import('/js/core/state.js');
      const st = store.getState();
      return st.listenAll === null && st.speakingItemId === null;
    })
  ).toBe(true);

  // Nothing resumes behind the back button either.
  await page.goBack();
  await expect(startButton(page)).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
});
