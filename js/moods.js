/**
 * moods.js
 * "Browse by need" — curated cross-library collections that meet a person
 * where they are ("I'm anxious", "I need forgiveness", "I'm traveling").
 *
 * Every mood matches BOTH:
 *  - whole categories from the bundled libraries (the core material), and
 *  - item tags anywhere in the index (which pulls in cross-library items —
 *    a prophet's dua tagged tawakkul, a reflection tagged heart — without
 *    duplicating anything, since the item index is keyed by id).
 *
 * Pure data + one matcher. No DOM, no state imports — trivially testable,
 * and the test suite runs it against the REAL data files to guarantee no
 * mood ever renders empty.
 */

/**
 * @param {string} id i18n key is `mood.<id>`
 * @param {string} icon icons.js name
 * @param {string[]} categories bundled category ids to include wholesale
 * @param {string[]} tags lowercase tags matched against item.tags
 */
export const MOODS = Object.freeze(
  [
    {
      id: 'anxious',
      icon: 'heart-pulse',
      categories: ['anxiety-distress', 'man-yaduni-ch08'],
      tags: ['anxiety', 'distress', 'worry', 'tawakkul'],
    },
    {
      id: 'forgiveness',
      icon: 'droplet',
      categories: ['forgiveness', 'man-yaduni-ch02'],
      tags: ['forgiveness', 'repentance', 'sin'],
    },
    {
      id: 'grateful',
      icon: 'heart',
      categories: ['gratitude', 'man-yaduni-ch01'],
      tags: ['gratitude', 'praise', 'thanks'],
    },
    {
      id: 'healing',
      icon: 'hands',
      categories: ['sickness-shifa', 'man-yaduni-ch09'],
      tags: ['healing', 'shifa', 'sickness'],
    },
    {
      id: 'protection',
      icon: 'shield',
      categories: ['protection-ruqyah', 'man-yaduni-ch14'],
      tags: ['protection', 'refuge', 'ruqyah'],
    },
    {
      id: 'provision',
      icon: 'coins',
      categories: ['knowledge-rizq', 'work-trade', 'man-yaduni-ch11'],
      tags: ['provision', 'rizq', 'debt', 'work'],
    },
    {
      id: 'decisions',
      icon: 'target',
      categories: ['decisions-istikharah', 'guidance', 'man-yaduni-ch04'],
      tags: ['guidance', 'istikhara', 'steadfastness'],
    },
    {
      id: 'patience',
      icon: 'prayer-rug',
      categories: ['patience', 'faith'],
      tags: ['patience', 'trials', 'sabr'],
    },
    {
      id: 'family',
      icon: 'home',
      categories: ['marriage-family', 'home-mosque', 'man-yaduni-ch10'],
      tags: ['family', 'children', 'marriage', 'parents'],
    },
    { id: 'travel', icon: 'compass', categories: ['travel'], tags: ['travel', 'journey'] },
    { id: 'sleep', icon: 'bed', categories: ['sleep'], tags: ['sleep', 'night'] },
    { id: 'heart', icon: 'sparkle', categories: ['man-yaduni-ch05'], tags: ['heart', 'tazkiyah'] },
  ].map(Object.freeze)
);

export function moodById(id) {
  return MOODS.find((m) => m.id === id) || null;
}

/**
 * All index entries matching a mood, in index order (which is library →
 * category → item order for bundled content — the same browsing order the
 * Library view uses).
 *
 * @param {object} mood a MOODS entry
 * @param {object} itemIndex { itemId: { item, category, document } }
 * @returns {Array<{item, category, document}>}
 */
export function itemsForMood(mood, itemIndex) {
  if (!mood || !itemIndex || typeof itemIndex !== 'object') return [];
  const cats = new Set(mood.categories || []);
  const tags = new Set((mood.tags || []).map((tg) => String(tg).toLowerCase()));
  const out = [];
  for (const entry of Object.values(itemIndex)) {
    if (!entry?.item || !entry?.category) continue;
    if (cats.has(entry.category.id)) {
      out.push(entry);
      continue;
    }
    const itemTags = Array.isArray(entry.item.tags) ? entry.item.tags : [];
    if (itemTags.some((tg) => tags.has(String(tg).toLowerCase()))) out.push(entry);
  }
  return out;
}

/** Count of matching items for a mood, without materializing the array twice in templates. */
export function moodCount(mood, itemIndex) {
  return itemsForMood(mood, itemIndex).length;
}
