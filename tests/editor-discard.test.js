import test from 'node:test';
import assert from 'node:assert/strict';
import { buildItemForm, buildCategoryForm, buildLibraryForm } from '../js/views/editor.js';
import { installEditorDiscardGuard } from '../js/ui/editorDiscardGuard.js';
test('discard marker is opt-in for all custom authoring builders only', () => {
  for (const scope of ['custom', 'builtin']) {
    const forms = [
      buildItemForm({ title: {}, repetitions: 3 }, { scope }),
      buildCategoryForm({ scope }),
      buildLibraryForm({ scope }),
    ];
    for (const html of forms)
      assert.equal(html.includes('data-editor-discard-guard'), scope === 'custom');
  }
});
test('unguarded modals add no listeners or behavior', () => {
  let called = false;
  const dispose = installEditorDiscardGuard(
    { querySelector: () => null },
    {
      close: () => {
        called = true;
      },
    }
  );
  dispose();
  assert.equal(called, false);
});
