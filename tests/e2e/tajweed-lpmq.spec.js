import { test, expect } from '@playwright/test';

for (const lang of ['en', 'ar']) {
  test(`LPMQ corpus treatment, course and all quiz modes (${lang})`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((language) => {
      if (localStorage.getItem('lpmq-seeded')) return;
      localStorage.setItem('lpmq-seeded', '1');
      localStorage.setItem(
        'nurAlDhikr:v2:state',
        JSON.stringify({
          settings: {
            language,
            themeMode: 'dark',
            tajweedConvention: 'lpmq',
            mushafPrefs: { tajweedColoring: true },
          },
        })
      );
    }, lang);
    await page.goto('./#/mushaf?page=37');
    const marks = page.locator('.tajweed--idgham_mutajanisayn');
    await expect(marks.first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: testInfo.outputPath(`lpmq-reader-phone-${lang}.png`) });
    for (const mode of ['find-spans', 'find-word', 'classify']) {
      const result = await page.evaluate(async (answerMode) => {
        const { clickHandlers } = await import('/js/app/handlers/quran.js');
        await clickHandlers['practice-start']({ rule: 'idgham_mutajanisayn', mode: answerMode });
        const { rt } = await import('/js/app/rt.js');
        const s = rt.practiceSession;
        return {
          mode: s.mode,
          count: s.questions?.length,
          targets: s.questions?.[0]?.targets?.length,
          correct: s.questions?.[0]?.correctAnswer,
        };
      }, mode);
      expect(result.count).toBeGreaterThan(0);
      if (mode === 'classify') expect(result.correct).toBe('idgham_mutajanisayn');
      else expect(result.targets).toBeGreaterThan(0);
      await expect(page.locator('[data-modal-panel]')).toBeVisible();
      if (mode === 'classify') {
        await expect(page.locator('.tajweed-practice__ayah mark')).toHaveCount(1);
        expect(
          await page
            .locator('.tajweed-practice__options')
            .evaluate((el) => getComputedStyle(el).display)
        ).toBe('grid');
      }
      await page.waitForTimeout(500);
      await page.screenshot({ path: testInfo.outputPath(`lpmq-${mode}-${lang}.png`) });
    }
    await page.evaluate(async () => {
      const engine = await import('/js/app/practice.js');
      const { rt } = await import('/js/app/rt.js');
      while (rt.practiceSession.qIndex < rt.practiceSession.questions.length - 1) {
        engine.answerClassify(
          rt.practiceSession.questions[rt.practiceSession.qIndex].correctAnswer
        );
        engine.advanceClassifyRound();
      }
      engine.answerClassify(rt.practiceSession.questions[rt.practiceSession.qIndex].correctAnswer);
      engine.advanceClassifyRound();
    });
    await expect(page.locator('.practice-summary__score')).toContainText('5/5');
    await page.evaluate(async () => (await import('/js/ui/modal.js')).closeModal());
    await page.goto('./#/tajweed-course');
    await expect(
      page.locator('[data-action="practice-lesson"][data-rule="idgham_mutajanisayn"]')
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`lpmq-course-phone-${lang}.png`) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`lpmq-course-desktop-${lang}.png`) });
    await page.evaluate(async () => {
      const { store, actions } = await import('/js/core/state.js');
      store.dispatch(actions.updateSettings({ tajweedConvention: 'dar-al-maarifah' }));
    });
    await expect(
      page.locator('[data-action="practice-lesson"][data-rule="idgham_mutajanisayn"]')
    ).toHaveCount(0);
    await page.goto('./#/mushaf?page=37');
    await expect(page.locator('.mushaf-page-wrap').first()).toBeVisible({ timeout: 20000 });
    await expect(marks).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
