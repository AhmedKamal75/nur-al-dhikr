import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePending, remainingAfter, hasResumableWork } from '../js/domain/audioBatch.js';
import { actions, store } from '../js/core/state.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { resumeBannerHTML } from '../js/views/audioManager.js';

describe('NF03-RESUME queue logic', () => {
  test('reconcile drops downloaded + missing, keeps order, dedupes', () => {
    const out = reconcilePending(
      [3, 1, 2, 2, 1, 200, 0, -4],
      'hudhaify',
      ['hudhaify:1', 'other:2'],
      [2]
    );
    assert.deepEqual(out, [3]);
  });

  test('reconcile is hostile-input safe', () => {
    assert.deepEqual(reconcilePending(null, 'x', [], []), []);
    assert.deepEqual(reconcilePending(['a', {}, 5], 'x', null, null), [5]);
    assert.deepEqual(reconcilePending([1, 2], null, [], []), [1, 2]);
  });

  test('remainingAfter drops exactly the finished surah', () => {
    assert.deepEqual(remainingAfter([1, 2, 3], 2), [1, 3]);
    assert.deepEqual(remainingAfter([1], 1), []);
    assert.deepEqual(remainingAfter('junk', 1), []);
  });

  test('hasResumableWork is strict', () => {
    assert.equal(hasResumableWork([4]), true);
    assert.equal(hasResumableWork([]), false);
    assert.equal(hasResumableWork(null), false);
  });
});

describe('NF03-RESUME state + view', () => {
  test('batchResume action is ephemeral and deep-no-ops when equal', () => {
    store.dispatch(actions.setAudioBatchResume(null));
    const before = store.getState();
    store.dispatch(actions.setAudioBatchResume(null));
    assert.equal(store.getState(), before, 'equal resume must no-op (no re-render)');
    store.dispatch(actions.setAudioBatchResume({ moshaf: 'hudhaify', left: 12 }));
    assert.deepEqual(store.getState().audioManager.batchResume, { moshaf: 'hudhaify', left: 12 });
    store.dispatch(actions.setAudioBatchResume({ moshaf: 'hudhaify', left: 12 }));
    assert.deepEqual(store.getState().audioManager.batchResume, { moshaf: 'hudhaify', left: 12 });
    store.dispatch(actions.setAudioBatchResume(null));
    assert.equal(store.getState().audioManager.batchResume, null);
  });

  test('resume banner shows for the selected moshaf with work left', () => {
    const state = {
      settings: { language: 'en' },
      audioManager: { batchResume: { moshaf: 'hudhaify', left: 12 }, batchRunning: false },
    };
    const html = resumeBannerHTML(state, { id: 'hudhaify' }, 'en');
    assert.ok(html.includes('12'), 'banner names the remainder');
    assert.ok(html.includes('audio-download-all'), 'resume reuses Download All');
    assert.ok(html.includes('audio-batch-dismiss'), 'dismiss action present');
  });

  test('resume banner hides for other moshafs, running batches, empty remainders', () => {
    const base = {
      settings: { language: 'en' },
      audioManager: { batchResume: { moshaf: 'hudhaify', left: 12 }, batchRunning: false },
    };
    assert.equal(resumeBannerHTML(base, { id: 'other' }, 'en'), '');
    assert.equal(
      resumeBannerHTML(
        {
          settings: { language: 'en' },
          audioManager: { batchResume: { moshaf: 'h', left: 3 }, batchRunning: true },
        },
        { id: 'h' },
        'en'
      ),
      ''
    );
    assert.equal(
      resumeBannerHTML(
        { settings: { language: 'en' }, audioManager: { batchResume: { moshaf: 'h', left: 0 } } },
        { id: 'h' },
        'en'
      ),
      ''
    );
    assert.equal(resumeBannerHTML(base, null, 'en'), '');
  });

  test('resume copy exists in both languages and differs', () => {
    assert.ok(en['audio.batchResume'] && ar['audio.batchResume']);
    assert.ok(en['audio.batchResumeGo'] && ar['audio.batchResumeGo']);
    assert.notEqual(en['audio.batchResume'], ar['audio.batchResume']);
  });
});
