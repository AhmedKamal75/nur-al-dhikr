import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reciterCatalogPage, searchReciters } from '../js/services/audioCatalog.js';
import { initialState } from '../js/core/state/initial.js';
import { reduce } from '../js/core/state/reducer.js';
const entries = Array.from({ length: 121 }, (_, i) => ({
  id: `r${i}`,
  nameEn: `Reader ${i}`,
  nameAr: `أَحْمَد ${i}`,
  source: 'custom',
}));
test('catalog pages cover zero, exact boundary, next batch and deduped active row', () => {
  assert.deepEqual(reciterCatalogPage([], null), { rows: [], pinned: null, shown: 0, total: 0 });
  assert.equal(reciterCatalogPage(entries.slice(0, 60), entries[0]).pinned, null);
  const first = reciterCatalogPage(entries, entries[120]);
  assert.equal(first.shown, 60);
  assert.equal(first.total, 121);
  assert.equal(first.pinned.id, 'r120');
  assert.equal(reciterCatalogPage(entries, entries[120], 120).shown, 120);
  assert.equal(reciterCatalogPage(entries, entries[120], 180).pinned, null);
  assert.equal(reciterCatalogPage([...entries, entries[0]], null, 180).total, 121);
});
test('Arabic normalization uses same totals and page rows as quick filter', () => {
  const hits = searchReciters('احمد', entries);
  assert.equal(hits.filter((e) => e.source === 'custom').length, 121);
  assert.equal(reciterCatalogPage(hits, null).total, hits.length);
});
test('expansion only changes ephemeral window; query changes reset it', () => {
  const state = initialState();
  const before = structuredClone(state);
  const expanded = reduce(state, { type: 'AUDIO_CATALOG_EXPAND', count: 120 });
  assert.deepEqual(expanded, {
    ...before,
    audioManager: { ...before.audioManager, visibleCount: 120 },
  });
  assert.equal(
    reduce(expanded, { type: 'AUDIO_MANAGER_QUERY', query: 'abc' }).audioManager.visibleCount,
    60
  );
  assert.equal(reduce(expanded, { type: 'AUDIO_MANAGER_QUERY', query: '' }), expanded);
});

test('exact boundary has no expansion control; pinned selection does not change matching total', async () => {
  const { renderAudio } = await import('../js/views/audioManager.js');
  const s = initialState();
  s.settings.customReciters = entries.slice(0, 60);
  s.audioManager.catalogReady = true;
  assert.match(renderAudio(s), /Showing 60 of 60/);
  assert.doesNotMatch(renderAudio(s), /data-action="audio-catalog-more"/);
  s.settings.audio.moshafId = 'r59';
  s.audioManager.query = 'no-match';
  assert.match(renderAudio(s), /Showing 0 of 0/);
  assert.match(renderAudio(s), /Selected reciter \(outside shown results\)/);
  assert.equal((renderAudio(s).match(/data-action="audio-select-moshaf"/g) || []).length, 1);
});
