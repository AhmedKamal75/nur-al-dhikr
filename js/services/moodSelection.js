/** Temporary Browse by need selection. Uses the existing read-visibility contract. */
import { itemsForMood, moodById } from '../domain/moods.js';
import { collectionSessionEntries } from './focusQueue.js';
import { VIEWS } from '../core/config.js';

export function moodEntries(state) {
  const mood = moodById(String(state.activeParams?.id || ''));
  const matches = itemsForMood(mood, state.library?.itemIndex);
  return collectionSessionEntries(state, { items: matches.map((e) => e.item.id) });
}

export function selectedMoodIds(state) {
  const selection = state.moodSelection;
  if (state.activeView !== VIEWS.MOOD || !selection || selection.moodId !== state.activeParams?.id)
    return [];
  const wanted = new Set(selection.ids);
  return moodEntries(state)
    .map((e) => e.item.id)
    .filter((id) => wanted.has(id));
}
