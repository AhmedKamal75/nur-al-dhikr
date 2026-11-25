import { test, expect } from '@playwright/test';
for (const language of ['en', 'ar'])
  for (const kind of ['item', 'category', 'library']) {
    test(`custom ${kind} dirty exit preserves live form (${language})`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 320, height: 844 });
      await page.addInitScript(
        (language) =>
          localStorage.setItem(
            'nurAlDhikr:v2:state',
            JSON.stringify({ settings: { language, reduceMotion: true, themeMode: 'dark' } })
          ),
        language
      );
      await page.goto('#/editor');
      await expect(page.locator('[data-action="editor-new-library"]').first()).toBeVisible({
        timeout: 20000,
      });
      const open = async (scope = 'custom') =>
        page.evaluate(
          async ({ kind, language, scope }) => {
            const v = await import('/js/views/editor.js');
            const { openModal } = await import('/js/ui/modal.js');
            const opts = { lang: language, scope, libraryId: 'custom', categoryId: 'cat' };
            const html =
              kind === 'item'
                ? v.buildItemForm(
                    { id: 'it', title: { en: 'Before' }, arabic: '', repetitions: 3 },
                    opts
                  )
                : kind === 'category'
                  ? v.buildCategoryForm({ ...opts, category: { name: { en: 'Before' } } })
                  : v.buildLibraryForm({
                      ...opts,
                      library: { name: { en: 'Before' } },
                    });
            openModal(html);
          },
          { kind, language, scope }
        );
      await open();
      const form = page.locator(`form[data-form="${kind}"]`);
      const field = form.locator('input').first();
      // Unchanged form closes without asking.
      await page.locator('.modal__close').click();
      await expect(form).toHaveCount(0);
      await open();
      await field.fill('Changed text');
      await field.evaluate((el) => {
        el.focus();
        el.setSelectionRange(2, 6);
        el.closest('.modal__body').scrollTop = 37;
      });
      const scroll = await page.locator('.modal__body').evaluate((el) => el.scrollTop);
      await page.keyboard.press('Escape');
      const prompt = page.locator('.editor-discard');
      await expect(prompt).toBeVisible();
      const keep = prompt.locator('button').first();
      await expect(keep).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath(`discard-${kind}-${language}.png`) });
      // Enter activates default Keep editing, not discard.
      await page.keyboard.press('Enter');
      await expect(prompt).toHaveCount(0);
      await expect(field).toHaveValue('Changed text');
      await expect(field).toBeFocused();
      expect(await field.evaluate((el) => [el.selectionStart, el.selectionEnd])).toEqual([2, 6]);
      expect(await page.locator('.modal__body').evaluate((el) => el.scrollTop)).toBe(scroll);
      // X asks, Escape from the choice keeps work.
      await page.locator('.modal__close').click();
      await expect(prompt).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(field).toBeVisible();
      // Cancel asks too, discard is the sole destructive choice.
      await form.locator('[data-action="modal-close"]').click();
      await expect(prompt).toBeVisible();
      await prompt.locator('button').last().click();
      await expect(form).toHaveCount(0);
      // Reverting to original values removes dirtiness.
      await open();
      await field.fill('Temporary');
      await field.fill('Before');
      await page.keyboard.press('Escape');
      await expect(form).toHaveCount(0);
      // Bundled override forms are deliberately outside this opt-in.
      await open('builtin');
      await field.fill('Other');
      await page.keyboard.press('Escape');
      await expect(form).toHaveCount(0);
      // Replacing an editor removes old listeners.
      await open();
      await field.fill('Dirty');
      await page.evaluate(async () => {
        (await import('/js/ui/modal.js')).openModal('<h2 id="other">Other</h2>');
      });
      await page.keyboard.press('Escape');
      await expect(page.locator('#other')).toHaveCount(0);
    });
  }

test('custom save succeeds without discard prompt and invalid item remains editable', async ({
  page,
}) => {
  await page.goto('#/editor');
  await expect(page.locator('[data-action="editor-new-library"]').first()).toBeVisible({
    timeout: 20000,
  });
  await page.locator('[data-action="editor-new-library"]').first().click();
  await page.locator('[name="nameEn"]').fill('Test custom library');
  await page.locator('form[data-form="library"] [type="submit"]').click();
  await expect(page.locator('form[data-form="library"]')).toHaveCount(0);
  await expect(page.locator('.editor-discard')).toHaveCount(0);
  await page.locator('[data-action="editor-new-category"]').first().click();
  await page.locator('[name="nameEn"]').fill('Test category');
  await page.locator('form[data-form="category"] [type="submit"]').click();
  await expect(page.locator('form[data-form="category"]')).toHaveCount(0);
  await page.locator('[data-action="editor-new-item"]').first().click();
  const form = page.locator('form[data-form="item"]');
  await form.locator('[name="titleEn"]').fill('Saved custom item');
  await form.locator('[name="notes"]').fill('A user-authored note');
  await form.locator('[type="submit"]').click();
  await expect(form).toHaveCount(0);
  await expect(page.locator('.editor-discard')).toHaveCount(0);
  await page.locator('[data-action="editor-new-item"]').first().click();
  await form.locator('[name="notes"]').fill('Unsaved note');
  await form.locator('[type="submit"]').click();
  await expect(form).toBeVisible();
  await expect(form.locator('[name="notes"]')).toHaveValue('Unsaved note');
  await expect(page.locator('.editor-discard')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.editor-discard')).toBeVisible();
});
