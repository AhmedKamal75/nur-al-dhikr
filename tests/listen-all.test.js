/**
 * tests/listen-all.test.js — (v5.17.179, C18) "Listen to all" on the
 * adhkar category view, first slice.
 *
 * What is pinned here:
 *  1. Session engine (js/app/listenAll.js) against a stubbed
 *     speechSynthesis: list order, one read per item, vanishing items
 *     skipped, pause/resume honesty, stop, and a full pass ending clean.
 *  2. One voice at a time: claimSpeaker displacing 'speech' clears the
 *     session, and the session never touches counters/targets/stats.
 *  3. Wiring: stateSub stops the session on NAVIGATE, toggle-speech ends
 *     it on any other Listen tap, the start handler resolves the queue
 *     with the same visibleCategoryItems math the view renders with.
 *  4. Rendering: the category view shows the start control when idle and
 *     the inline "Listening n of total" bar with pause/stop while a
 *     session runs — EN + AR — and hides it in manage mode.
 *  5. Strings exist in both languages; the session slice stays ephemeral
 *     (never in PERSISTED_KEYS).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { renderCategory } from '../js/views/category.js';
import { visibleCategoryItems } from '../js/services/contentPrefs.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';
import { initialState, PERSISTED_KEYS } from '../js/core/state/initial.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/* ------------------------------------------------------------------ */
/* Shared fixtures                                                      */
/* ------------------------------------------------------------------ */

const ITEM = (id, order) => ({
  id,
  category_id: 'cat-listen',
  repetitions: 3,
  order,
  arabic: `عربي ${id}`,
  transliteration: `Translit ${id}`,
  title: { en: `Title ${id}`, ar: `عنوان ${id}` },
  translation: { en: `Meaning ${id}`, ar: `معنى ${id}` },
});

const CAT = {
  id: 'cat-listen',
  name: { en: 'Listening', ar: 'استماع' },
  color: 'emerald',
  items: [ITEM('li-a', 1), ITEM('li-b', 2), ITEM('li-c', 3)],
};

const DOC = {
  metadata: { id: 'adhkar', name: { en: 'Adhkar', ar: 'أذكار' } },
  categories: [CAT],
};

function categoryState({ lang = 'en', listenAll = null, manage = false, prefs = null } = {}) {
  const base = initialState();
  return {
    ...base,
    settings: {
      ...base.settings,
      language: lang,
      ...(prefs ? { contentPrefs: prefs } : {}),
    },
    activeView: 'category',
    activeParams: { id: 'cat-listen' },
    library: { ...base.library, documents: { adhkar: DOC } },
    customContent: {},
    listenAll,
    ui: { ...base.ui, contentManage: manage },
  };
}

/* A deterministic window.speechSynthesis stand-in: records what was
 * spoken, ends utterances only when the test says so. */
function stubSpeech() {
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
    // Per the Web Speech spec, cancel() does NOT clear the paused flag —
    // the first stub hid the pause→stop silence defect behind this reset.
    cancel() {
      synth.speaking = false;
      synth._current = null;
    },
    pause() {
      if (synth.speaking) synth.paused = true;
    },
    resume() {
      synth.paused = false;
    },
  };
  const prevWindow = globalThis.window;
  const prevUtterance = globalThis.SpeechSynthesisUtterance;
  globalThis.window = { speechSynthesis: synth };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.onend = null;
      this.onerror = null;
    }
  };
  return {
    log,
    synth,
    endCurrent() {
      const u = synth._current;
      synth._current = null;
      synth.speaking = false;
      if (u && u.onend) u.onend();
    },
    restore() {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
      else globalThis.SpeechSynthesisUtterance = prevUtterance;
    },
  };
}

/** Real store + a fake item index, the way js/app/net.js builds it. */
async function seedStore(ids = ['li-a', 'li-b', 'li-c']) {
  const { store, actions } = await import('../js/core/state.js');
  const itemIndex = {};
  for (const id of ids) {
    const item = CAT.items.find((it) => it.id === id) || ITEM(id, 99);
    itemIndex[id] = { item, category: CAT, document: DOC };
  }
  store.dispatch(actions.setLibraryIndex(itemIndex));
  return { store, actions };
}

async function importEngine() {
  const engine = await import('../js/app/listenAll.js');
  const { store, actions } = await import('../js/core/state.js');
  store.dispatch(actions.setListenAll(null));
  if (store.getState().speakingItemId !== null) store.dispatch(actions.setSpeakingItem(null));
  return { engine, store, actions };
}

/* ------------------------------------------------------------------ */
/* 1. The engine: order, one pass, skip, pause honesty, stop            */
/* ------------------------------------------------------------------ */

test('a session reads the queue in order, once each, then ends clean', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    assert.equal(engine.startListenAll('cat-listen', ['li-a', 'li-b', 'li-c']), 'started');
    assert.deepEqual(store.getState().listenAll, {
      categoryId: 'cat-listen',
      itemIds: ['li-a', 'li-b', 'li-c'],
      index: 0,
      paused: false,
    });
    assert.equal(store.getState().speakingItemId, 'li-a');
    assert.deepEqual(stub.log, ['Translit li-a'], 'no Arabic voice → transliteration, like Listen');

    stub.endCurrent();
    assert.equal(store.getState().listenAll.index, 1);
    assert.equal(store.getState().speakingItemId, 'li-b');
    stub.endCurrent();
    assert.equal(store.getState().listenAll.index, 2);
    assert.equal(store.getState().speakingItemId, 'li-c');
    stub.endCurrent();
    assert.equal(store.getState().listenAll, null, 'the last item ends the session');
    assert.equal(store.getState().speakingItemId, null);
    assert.deepEqual(stub.log, ['Translit li-a', 'Translit li-b', 'Translit li-c']);
    engine.stopListenAll();
  } finally {
    stub.restore();
  }
});

test('ids with no live entry are dropped up front; a mid-session vanish is skipped', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store, actions } = await importEngine();
    await seedStore();
    assert.equal(engine.startListenAll('cat-listen', ['li-a', 'ghost', 'li-b', 'li-c']), 'started');
    assert.deepEqual(
      store.getState().listenAll.itemIds,
      ['li-a', 'li-b', 'li-c'],
      'ghost id never enters the queue'
    );
    // li-b disappears from the index while li-a is reading.
    const { store: s2 } = await import('../js/core/state.js');
    s2.dispatch(
      actions.setLibraryIndex({
        'li-a': { item: CAT.items[0], category: CAT, document: DOC },
        'li-c': { item: CAT.items[2], category: CAT, document: DOC },
      })
    );
    stub.endCurrent(); // li-a ends → li-b skipped → li-c speaks
    assert.equal(store.getState().speakingItemId, 'li-c');
    assert.deepEqual(stub.log, ['Translit li-a', 'Translit li-c']);
    engine.stopListenAll();
  } finally {
    stub.restore();
  }
});

test('pause only claims what the engine reports; resume clears it', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    engine.pauseListenAll();
    assert.equal(stub.synth.paused, true);
    assert.equal(store.getState().listenAll.paused, true);
    engine.resumeListenAll();
    assert.equal(store.getState().listenAll.paused, false);
    engine.stopListenAll();

    // An engine that cannot pause never earns a paused bar.
    stub.synth.pause = () => {};
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    engine.pauseListenAll();
    assert.equal(store.getState().listenAll.paused, false, 'unsupported pause stays honest');
    engine.stopListenAll();
  } finally {
    stub.restore();
  }
});

test('stop mid-session silences the engine and clears both state fields', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    engine.stopListenAll();
    assert.equal(store.getState().listenAll, null);
    assert.equal(store.getState().speakingItemId, null);
    assert.equal(stub.synth.speaking, false);
    // A stale onEnd after the stop must not restart a ghost chain.
    stub.log.length = 0;
    engine.stopListenAll();
    assert.deepEqual(stub.log, []);
  } finally {
    stub.restore();
  }
});

test('pause then Stop leaves the engine unpaused — the next session speaks', async () => {
  // Planner HOLD on PR #84: cancel() keeps the paused flag per the Web
  // Speech spec, so pause → stop used to silence every later utterance.
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    engine.pauseListenAll();
    assert.equal(stub.synth.paused, true);
    engine.stopListenAll();
    assert.equal(stub.synth.paused, false, 'stop resumes a paused engine first');
    assert.equal(store.getState().listenAll, null);
    engine.startListenAll('cat-listen', ['li-c']);
    assert.equal(store.getState().speakingItemId, 'li-c');
    assert.deepEqual(stub.log, ['Translit li-a', 'Translit li-c']);
    engine.stopListenAll();
  } finally {
    stub.restore();
  }
});

test('a speaker claim during a paused session resumes the engine it silences', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    engine.pauseListenAll();
    assert.equal(stub.synth.paused, true);
    const { claimSpeaker } = await import('../js/app/audioEngine.js');
    claimSpeaker('adhkar');
    assert.equal(store.getState().listenAll, null);
    assert.equal(stub.synth.paused, false, 'the arbiter never leaves a paused engine');
  } finally {
    stub.restore();
  }
});

test('a session never touches counters, targets or stats', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    const before = JSON.stringify({
      counters: store.getState().counters,
      statistics: store.getState().statistics,
      contentPrefs: store.getState().settings.contentPrefs,
    });
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    stub.endCurrent();
    engine.stopListenAll();
    const after = JSON.stringify({
      counters: store.getState().counters,
      statistics: store.getState().statistics,
      contentPrefs: store.getState().settings.contentPrefs,
    });
    assert.equal(after, before);
  } finally {
    stub.restore();
  }
});

test('the tap contract: tapping the read item is a stop, another item ends the session', async () => {
  const stub = stubSpeech();
  try {
    const { engine } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    assert.equal(
      engine.endListenAllForListenTap('li-b'),
      false,
      'other item: session ends, solo proceeds'
    );
    assert.equal(engine.listenAllSession(), null);
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    assert.equal(
      engine.endListenAllForListenTap('li-a'),
      true,
      'current item: a stop, not a restart'
    );
    assert.equal(engine.listenAllSession(), null);
  } finally {
    stub.restore();
  }
});

test('another voice claiming the speaker clears the session (arbiter)', async () => {
  const stub = stubSpeech();
  try {
    const { engine, store } = await importEngine();
    await seedStore();
    engine.startListenAll('cat-listen', ['li-a', 'li-b']);
    const { claimSpeaker } = await import('../js/app/audioEngine.js');
    const displaced = claimSpeaker('adhkar');
    assert.ok(displaced.includes('speech'));
    assert.equal(store.getState().listenAll, null);
    assert.equal(store.getState().speakingItemId, null);
    assert.equal(stub.synth.speaking, false);
  } finally {
    stub.restore();
  }
});

/* ------------------------------------------------------------------ */
/* 2. Wiring (source-pinned, the discipline of one-voice.test.js)       */
/* ------------------------------------------------------------------ */

test('navigation stops the session', () => {
  const sub = readProject('js/app/stateSub.js');
  const at = sub.indexOf("action.type === 'NAVIGATE' && store.getState().listenAll");
  assert.ok(at > -1, 'stateSub watches NAVIGATE for a live session');
  assert.ok(/stopListenAll\(\)/.test(sub.slice(at, at + 400)), 'NAVIGATE stops the session engine');
});

test('toggle-speech ends the session before any solo speech', () => {
  const items = readProject('js/app/handlers/items.js');
  const at = items.indexOf("'toggle-speech': (ds) => {");
  const claim = items.indexOf("claimSpeaker('speech')", at);
  const end = items.indexOf('endListenAllForListenTap', at);
  assert.ok(end > -1 && end < claim, 'the session ends before the speaker is claimed');
});

test('the start handler builds its queue with the view’s own visibility math', () => {
  const items = readProject('js/app/handlers/items.js');
  const at = items.indexOf("'listen-all-start': (ds) => {");
  assert.ok(at > -1);
  assert.ok(
    /visibleCategoryItems\(/.test(items.slice(at, at + 900)),
    'the queue is the visible list, never the raw corpus'
  );
});

test('the arbiter clears the session when it displaces speech', () => {
  const engine = readProject('js/app/audioEngine.js');
  const at = engine.indexOf('export function claimSpeaker(');
  const speechBranch = engine.slice(at, at + 2600);
  assert.ok(/setListenAll\(null\)/.test(speechBranch), 'claimSpeaker clears the session state');
});

test('the session module never hand-rolls arbitration outside its own stop', () => {
  const src = readProject('js/app/listenAll.js');
  for (const m of src.matchAll(/speech\.stop\(\)/g)) {
    const before = src.slice(Math.max(0, m.index - 700), m.index);
    assert.match(
      before,
      /export function stopListenAll\(\)/,
      'speech.stop() belongs to stopListenAll alone; starts go through claimSpeaker'
    );
  }
  assert.match(src, /claimSpeaker\('speech'\)/, 'the session start arbitrates');
});

/* ------------------------------------------------------------------ */
/* 3. Rendering                                                          */
/* ------------------------------------------------------------------ */

test('idle: the category view offers Listen to all (EN + AR)', () => {
  for (const lang of ['en', 'ar']) {
    const dict = lang === 'ar' ? AR_STRINGS : EN_STRINGS;
    const html = renderCategory(categoryState({ lang }));
    assert.match(html, /data-action="listen-all-start" data-category-id="cat-listen"/);
    assert.ok(html.includes(dict['category.listenAll']), `start label renders (${lang})`);
    assert.ok(!html.includes('listen-all-bar'), 'no progress bar while idle');
  }
});

test('running: the inline bar reports progress with pause and stop (EN + AR)', () => {
  const session = {
    categoryId: 'cat-listen',
    itemIds: ['li-a', 'li-b', 'li-c'],
    index: 1,
    paused: false,
  };
  for (const lang of ['en', 'ar']) {
    const dict = lang === 'ar' ? AR_STRINGS : EN_STRINGS;
    const html = renderCategory(categoryState({ lang, listenAll: session }));
    assert.match(html, /<div class="listen-all-bar" role="status">/);
    const want = dict['category.listenAllProgress'].replace('{n}', '2').replace('{total}', '3');
    assert.ok(html.includes(want), `"${want}" renders (${lang})`);
    assert.match(html, /data-action="listen-all-toggle-pause" aria-pressed="false"/);
    assert.match(html, /data-action="listen-all-stop"/);
    assert.ok(html.includes(dict['category.listenAllPause']));
    assert.ok(!html.includes('data-action="listen-all-start"'), 'no second start while running');
  }
});

test('paused: the bar offers Resume with aria-pressed true', () => {
  const session = { categoryId: 'cat-listen', itemIds: ['li-a'], index: 0, paused: true };
  const html = renderCategory(categoryState({ lang: 'en', listenAll: session }));
  assert.match(html, /data-action="listen-all-toggle-pause" aria-pressed="true"/);
  assert.ok(html.includes(EN_STRINGS['category.listenAllResume']));
});

test('a session for another category renders no bar here; manage mode hides the control', () => {
  const other = { categoryId: 'cat-elsewhere', itemIds: ['li-a'], index: 0, paused: false };
  const html = renderCategory(categoryState({ lang: 'en', listenAll: other }));
  assert.ok(!html.includes('listen-all-bar'), 'bars stay with their own category');
  assert.match(html, /data-action="listen-all-start"/);
  const managed = renderCategory(categoryState({ lang: 'en', manage: true }));
  assert.ok(!managed.includes('data-action="listen-all-start"'), 'manage mode is for editing');
});

test('the queue the handler would build skips hidden items exactly like the list', () => {
  const prefs = { hiddenItems: { 'li-b': true } };
  const state = categoryState({ prefs });
  const rendered = renderCategory(state);
  const queueIds = visibleCategoryItems(state, CAT).map((it) => it.id);
  assert.deepEqual(queueIds, ['li-a', 'li-c']);
  // The list itself renders exactly those cards (the hidden one survives
  // only as an unhide chip), so chain and list agree.
  assert.ok(/<article class="card[^>]*data-item-id="li-a"/.test(rendered));
  assert.ok(!/<article class="card[^>]*data-item-id="li-b"/.test(rendered));
  assert.ok(/<article class="card[^>]*data-item-id="li-c"/.test(rendered));
});

/* ------------------------------------------------------------------ */
/* 4. Strings + persistence discipline                                  */
/* ------------------------------------------------------------------ */

test('listen-all strings exist in both languages with matching placeholders', () => {
  for (const key of [
    'category.listenAll',
    'category.listenAllProgress',
    'category.listenAllPause',
    'category.listenAllResume',
  ]) {
    assert.ok(EN_STRINGS[key], `${key} (en)`);
    assert.ok(AR_STRINGS[key], `${key} (ar)`);
  }
  for (const ph of ['{n}', '{total}']) {
    assert.ok(EN_STRINGS['category.listenAllProgress'].includes(ph));
    assert.ok(AR_STRINGS['category.listenAllProgress'].includes(ph));
  }
});

test('the session slice is ephemeral — never persisted', () => {
  assert.ok(!PERSISTED_KEYS.includes('listenAll'), 'a reload has nothing playing');
});
