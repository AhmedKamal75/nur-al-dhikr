/**
 * tests/adhkar-session.test.js — merged-plan item 5 (v5.17.52), permanent.
 *
 * Adhkar session player + progressive disclosure:
 *
 * 1. Disclosure render — translation/virtue/grade/transliteration ride ONE
 *    collapsed <details> shared by the card and Focus (Arabic first, always
 *    visible). An explicit `Unknown` grade stays in the open header, never
 *    hidden; a source-backed grade rows inside; missing/malformed grades
 *    render nowhere.
 * 2. Session progress — the play-through-category queue reuses the
 *    category's own done-today math over the same visible items prev/next
 *    walks (x of n), with a plain completion line and no celebration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { cardHTML, disclosureHTML } from '../js/ui/card.js';
import { renderFocus } from '../js/views/focus.js';
import { renderCategory } from '../js/views/category.js';
import { firstPendingItem, listCompletion } from '../js/domain/reflections.js';
import { gradeStateOf } from '../js/domain/grades.js';
import { dateKey } from '../js/core/utils.js';
import { DEFAULT_SETTINGS } from '../js/core/config.js';
import { initialState } from '../js/core/state/initial.js';

const TODAY = dateKey(new Date());

const ITEM_FULL = {
  id: 'sess-full-1',
  category_id: 'cat-sess',
  repetitions: 3,
  grade: 'Sahih',
  arabic: 'سُبْحَانَ اللَّهِ',
  transliteration: 'Subhanallah.',
  title: { en: 'Glorification', ar: 'تسبيح' },
  translation: { en: 'Glory be to Allah.', ar: 'سبحان الله' },
  virtues: { en: 'A palm tree is planted.', ar: 'تُغرس له نخلة.' },
  reference: { collection: 'Sahih Muslim', hadith: '2722' },
};

const ITEM_UNKNOWN = {
  ...ITEM_FULL,
  id: 'sess-unknown-1',
  grade: 'Unknown',
};

const CAT = {
  id: 'cat-sess',
  name: { en: 'Session', ar: 'جلسة' },
  color: 'emerald',
  items: [
    { ...ITEM_FULL, id: 'sess-a', order: 1 },
    { ...ITEM_UNKNOWN, id: 'sess-b', order: 2 },
  ],
};

const DOC = { metadata: { id: 'adhkar', name: { en: 'Adhkar', ar: 'أذكار' } }, categories: [CAT] };

function focusState({ lang = 'en', counters = {}, subId = 'sess-a' } = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, language: lang },
    activeView: 'focus',
    activeParams: { id: 'cat-sess', subId },
    library: { documents: { adhkar: DOC }, itemIndex: {} },
    customContent: {},
    counters,
    favorites: [],
    speakingItemId: null,
    dhikrAudioItemId: null,
    byHeart: null,
    byHeartRecords: {},
  };
}

function categoryState({ lang = 'en', counters = {} } = {}) {
  const base = initialState();
  return {
    ...base,
    settings: { ...base.settings, language: lang },
    activeView: 'category',
    activeParams: { id: 'cat-sess' },
    library: { ...base.library, documents: { adhkar: DOC } },
    customContent: {},
    counters,
  };
}

const doneToday = (id) => ({
  [id]: { count: 3, target: 3, completedCycles: 1, lastCompletedDay: TODAY },
});

/* ------------------------------------------------------------------ */
/* 1. disclosureHTML: one collapsed block, honest grades                */
/* ------------------------------------------------------------------ */

test('disclosure: EN rows sit collapsed behind a labelled summary', () => {
  const html = disclosureHTML(ITEM_FULL, 'en', { prefix: 'card' });
  assert.match(html, /<details class="disclosure card__disclosure">/);
  assert.ok(!/\bopen\b/.test(html.split('>')[0]), 'collapsed by default — no open attribute');
  assert.match(html, /<summary class="disclosure__summary">Details<\/summary>/);
  assert.ok(html.includes('Subhanallah.'), 'transliteration rows inside');
  assert.ok(html.includes('Glory be to Allah.'), 'translation rows inside');
  assert.ok(html.includes('A palm tree is planted.'), 'virtue rows inside');
  assert.ok(
    html.includes('سُبْحَانَ اللَّهِ') === false,
    'Arabic stays out — it leads the open layout'
  );
});

test('disclosure: a valid grade rows inside, never in the open', () => {
  assert.equal(gradeStateOf('Sahih'), 'valid');
  const html = disclosureHTML(ITEM_FULL, 'en', { prefix: 'card' });
  assert.ok(html.includes('chip--grade-sahih'), 'source-backed grade rows inside the details');
});

test('disclosure: Unknown never hides — no grade row, caller keeps the chip open', () => {
  assert.equal(gradeStateOf('Unknown'), 'unknown');
  const html = disclosureHTML(ITEM_UNKNOWN, 'en', { prefix: 'card' });
  assert.ok(!html.includes('chip--grade'), 'no grade row inside for Unknown');
  const card = cardHTML(ITEM_UNKNOWN, null, { lang: 'en' });
  const openPart = card.slice(0, card.indexOf('<details'));
  assert.ok(
    openPart.includes('chip--grade-unknown'),
    'Unverified chip stays visible in the open header'
  );
  assert.ok(!/<details[^>]*\bopen\b/.test(card), 'still collapsed by default');
});

test('disclosure: missing/malformed grades render nowhere', () => {
  for (const grade of [null, '', 'Almost-Sahih']) {
    const html = disclosureHTML({ ...ITEM_FULL, grade }, 'en', { prefix: 'card' });
    assert.ok(!html.includes('chip--grade'), `nothing renders for ${JSON.stringify(grade)}`);
  }
});

test('disclosure: AR hides translit/translation, keeps the Arabic virtue', () => {
  const html = disclosureHTML(ITEM_FULL, 'ar', { prefix: 'focus' });
  assert.match(html, /<details class="disclosure focus__disclosure">/);
  assert.ok(!/\bopen\b/.test(html.split('>')[0]), 'collapsed by default in AR too');
  assert.match(html, /<summary class="disclosure__summary">التفاصيل<\/summary>/);
  assert.ok(!html.includes('Subhanallah.'), 'no transliteration in AR');
  assert.ok(!html.includes('Glory be to Allah.'), 'no English translation in AR');
  assert.ok(html.includes('تُغرس له نخلة.'), 'Arabic virtue rows inside');
});

test('disclosure: empty items emit no hollow block, toggles hide rows', () => {
  assert.equal(disclosureHTML({ id: 'x', arabic: 'نص' }, 'en'), '', 'no rows, no details');
  const off = disclosureHTML(ITEM_FULL, 'en', {
    showTransliteration: false,
    showTranslation: false,
    showVirtues: false,
    showGrade: false,
  });
  assert.equal(off, '', 'hidden fields leave no hollow disclosure');
});

/* ------------------------------------------------------------------ */
/* card + Focus integration                                             */
/* ------------------------------------------------------------------ */

test('card: Arabic and provenance stay open, supplements collapse', () => {
  const html = cardHTML(ITEM_FULL, null, { lang: 'en' });
  const openPart = html.slice(0, html.indexOf('<details'));
  assert.ok(openPart.includes('سُبْحَانَ اللَّهِ'), 'Arabic first, always visible');
  assert.ok(!openPart.includes('chip--grade-sahih'), 'valid grade not in the open header');
  assert.ok(html.includes('Sahih Muslim'), 'provenance stays open, never disclosed away');
  assert.ok(html.includes('<details'), 'supplements collapse behind one tap');
});

test('focus: stage keeps Arabic + position, session progress rides below', () => {
  const html = renderFocus(focusState());
  assert.ok(html.includes('سُبْحَانَ اللَّهِ'), 'Arabic leads the stage');
  assert.ok(html.includes('<details'), 'translation/virtue/grade collapse');
  assert.ok(!/<details[^>]*\bopen\b/.test(html), 'collapsed by default');
  assert.match(
    html,
    /<span class="focus__position" dir="ltr">1 \/ 2<\/span>/,
    'queue position x of n'
  );
  assert.ok(html.includes('0 of 2 done today'), 'session progress reuses the done-today math');
  assert.ok(!html.includes('focus__complete'), 'no completion line mid-session');
  assert.match(
    html,
    /data-action="navigate"[^>]*aria-label="Previous"/,
    'prev reuses the focus stage'
  );
  assert.match(html, /data-action="navigate"[^>]*aria-label="Next"/, 'next reuses the focus stage');
});

test('focus: Unknown grade stays visible while details stay collapsed', () => {
  const html = renderFocus(focusState({ subId: 'sess-b' }));
  const openPart = html.slice(0, html.indexOf('<details'));
  assert.ok(openPart.includes('chip--grade-unknown'), 'Unverified chip plainly visible');
  assert.ok(!/<details[^>]*\bopen\b/.test(html), 'details still collapsed');
});

test('focus: AR session line is Arabic, with no leaked English rows', () => {
  const html = renderFocus(focusState({ lang: 'ar' }));
  assert.ok(!html.includes('Subhanallah.'), 'no transliteration in AR focus');
  assert.ok(!html.includes('Glory be to Allah.'), 'no English translation in AR focus');
  assert.ok(html.includes('أُنجز 0 من 2 اليوم'), 'session progress in Arabic');
});

test('focus: a finished pass states completion plainly — no celebration', () => {
  const counters = { ...doneToday('sess-a'), ...doneToday('sess-b') };
  const html = renderFocus(focusState({ counters }));
  assert.ok(html.includes('2 of 2 done today'), 'full session progress');
  assert.match(
    html,
    /<p class="focus__complete">This section is complete for today\.<\/p>/,
    'plain completion line'
  );
  assert.ok(!/confetti|celebrat|streak|trophy|🎉/i.test(html), 'no gamification anywhere in Focus');
  assert.match(html, /aria-label="Next"/, 'prev/next still walk the finished queue');
});

/* ------------------------------------------------------------------ */
/* 2. session math + queue entry                                        */
/* ------------------------------------------------------------------ */

test('firstPendingItem: resumes at the first item not done today', () => {
  const items = CAT.items;
  assert.equal(firstPendingItem(items, {}, TODAY)?.id, 'sess-a', 'fresh pass starts at the head');
  assert.equal(
    firstPendingItem(items, doneToday('sess-a'), TODAY)?.id,
    'sess-b',
    'a done head is skipped'
  );
  assert.equal(
    firstPendingItem(items, { ...doneToday('sess-a'), ...doneToday('sess-b') }, TODAY),
    null,
    'all-done returns null (caller restarts at the head)'
  );
  assert.equal(firstPendingItem([], {}, TODAY), null, 'empty list is null, not a crash');
  assert.equal(
    firstPendingItem(items, null, TODAY)?.id,
    'sess-a',
    'hostile counters degrade to head'
  );
  assert.equal(
    firstPendingItem(items, doneToday('sess-a'), '2000-01-01')?.id,
    'sess-a',
    'yesterday’s stamps do not count'
  );
});

test('session progress: listCompletion counts done-today over the queue', () => {
  assert.deepEqual(listCompletion(CAT.items, {}, TODAY), { done: 0, total: 2, pct: 0 });
  assert.deepEqual(listCompletion(CAT.items, doneToday('sess-a'), TODAY), {
    done: 1,
    total: 2,
    pct: 50,
  });
  assert.deepEqual(
    listCompletion(CAT.items, { ...doneToday('sess-a'), ...doneToday('sess-b') }, TODAY),
    { done: 2, total: 2, pct: 100 }
  );
});

test('category: the session button enters Focus at the first pending item', () => {
  const fresh = renderCategory(categoryState());
  assert.match(
    fresh,
    /data-action="session-start"[^>]*data-item-id="sess-a"/,
    'fresh pass starts at the head'
  );
  const resumed = renderCategory(categoryState({ counters: doneToday('sess-a') }));
  assert.match(
    resumed,
    /data-action="session-start"[^>]*data-item-id="sess-b"/,
    'a done head resumes at the next item'
  );
  assert.ok(fresh.includes('Read through in Focus'), 'EN entry label');
  const ar = renderCategory(categoryState({ lang: 'ar' }));
  assert.ok(ar.includes('قراءة متتابعة في وضع التركيز'), 'AR entry label');
});
