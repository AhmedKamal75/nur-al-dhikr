/**
 * tests/dhikr-audio.test.js — per-dhikr recitation INFRA ONLY (v5.17.30,
 * OPEN-ISSUES #15 + #37).
 *
 * Zero real clips ship and none are fetched here: every case uses fixture
 * urls (https://example.com/…, never a licensed source, never a reciter
 * name presented as data). What is pinned:
 *
 *  1. shape validation — absent audio stays null; malformed audio (string,
 *     array, http WAN, javascript:, spaces, overlong, missing url)
 *     normalizes to null; a verified https object survives with capped
 *     metadata; the sanitizer allowlist mirrors the gate.
 *  2. rendering — cardHTML + renderFocus draw the play-dhikr-audio button
 *     ONLY for verified audio (absent/malformed → no button, never dead),
 *     keep the Listen synthesis button untouched and distinctly labelled,
 *     and park the button in by-heart mode.
 *  3. playback driver — single-shot (a second play stops the first),
 *     fail-closed on unverified urls, ended/error callbacks clear state,
 *     streaming-only (preload none, no IDB touch).
 *  4. handler wiring — play-dhikr-audio resolves in the delegation table
 *     (no orphan), stops TTS + yields the full-surah track, and offers a
 *     Retry that replays the same item on failure.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  normalizeItem,
  normalizeDhikrAudio,
  hasVerifiedDhikrAudio,
  validateDocument,
} from '../js/core/schema.js';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../js/core/config.js';
import { cardHTML } from '../js/ui/card.js';
import { renderFocus } from '../js/views/focus.js';
import {
  playDhikrAudio,
  stopDhikrAudio,
  isPlayingDhikrAudioItem,
  currentDhikrAudioItemId,
  resetDhikrAudioForTests,
} from '../js/services/dhikrAudio.js';
import { mergedClickHandlers } from '../js/app/events.js';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const GOOD_URL = 'https://example.com/audio/dhikr-001.mp3';

/** Minimal normalized item; audioRaw rides the pre-normalize shape. */
function itemWithAudio(audioRaw, id = 'dhk-1') {
  return normalizeItem(
    {
      id,
      arabic: 'سُبْحَانَ اللَّهِ',
      transliteration: 'SubhanAllah',
      translation: { en: 'Glory be to Allah', ar: '' },
      repetitions: 3,
      ...(audioRaw === undefined ? {} : { audio: audioRaw }),
    },
    'c1'
  );
}

describe('schema: per-dhikr audio shape validation', () => {
  test('absent audio normalizes to null (honest absence)', () => {
    assert.equal(itemWithAudio(undefined).audio, null);
    assert.equal(normalizeItem({ id: 'x' }, 'c').audio, null);
    assert.equal(normalizeDhikrAudio(null), null);
    assert.equal(normalizeDhikrAudio(undefined), null);
  });

  test('malformed audio normalizes to null, never a half-shape', () => {
    for (const bad of [
      'https://example.com/a.mp3', // string, not an object
      ['https://example.com/a.mp3'], // array
      42,
      true,
      {}, // object without url
      { url: '' },
      { url: 42 },
      { url: 'http://example.com/a.mp3' }, // http WAN — OPEN-ISSUES #1 gate
      { url: 'javascript:alert(1)' },
      { url: 'data:audio/mp3;base64,AAA' },
      { url: 'ftp://example.com/a.mp3' },
      { url: 'https://example.com/a b.mp3' }, // spaces
      { url: `https://example.com/${'a'.repeat(600)}.mp3` }, // overlong
    ]) {
      assert.equal(
        normalizeDhikrAudio(bad),
        null,
        `must drop ${JSON.stringify(bad)?.slice(0, 60)}`
      );
      assert.equal(itemWithAudio(bad).audio, null, 'normalizeItem must drop it too');
      assert.equal(hasVerifiedDhikrAudio({ audio: bad }), false);
    }
  });

  test('http localhost/LAN survives (same exception as the reciter gate)', () => {
    const kept = normalizeDhikrAudio({ url: 'http://localhost:8080/a.mp3' });
    assert.ok(kept && kept.url === 'http://localhost:8080/a.mp3');
  });

  test('a verified https object survives with trimmed, capped metadata', () => {
    const out = itemWithAudio({
      url: `  ${GOOD_URL}  `,
      reciter: '  Fixture Voice  ',
      source: 'Fixture Source',
      license: 'Fixture License',
      extra: 'dropped',
    }).audio;
    assert.deepEqual(out, {
      url: GOOD_URL,
      reciter: 'Fixture Voice',
      source: 'Fixture Source',
      license: 'Fixture License',
    });
    assert.ok(!('extra' in out), 'unknown keys do not smuggle through');
    assert.equal(hasVerifiedDhikrAudio({ audio: out }), true);
  });

  test('non-string metadata degrades to empty, never throws', () => {
    const out = normalizeDhikrAudio({ url: GOOD_URL, reciter: 42, source: null, license: ['x'] });
    assert.deepEqual(out, { url: GOOD_URL, reciter: '', source: '', license: '' });
  });

  test('hasVerifiedDhikrAudio is fail-closed on hostile shapes', () => {
    for (const hostile of [null, undefined, 42, 'x', [], { audio: '__proto__' }]) {
      assert.equal(hasVerifiedDhikrAudio(hostile), false);
    }
    assert.equal(hasVerifiedDhikrAudio({}), false);
    assert.equal(hasVerifiedDhikrAudio({ audio: null }), false);
  });

  test('validateDocument warns on audio that bypassed normalization', () => {
    const doc = {
      metadata: { id: 't' },
      categories: [
        {
          id: 'c1',
          items: [
            { id: 'bad-clip', arabic: 'ذ', audio: { url: 'http://example.com/a.mp3' } },
            { id: 'good-clip', arabic: 'ذ', audio: { url: GOOD_URL } },
            { id: 'plain-clip', arabic: 'ذ' },
          ],
        },
      ],
    };
    const result = validateDocument(doc);
    assert.equal(result.success, true);
    const audioWarnings = result.value.warnings.filter((w) => w.includes('unverified audio'));
    assert.deepEqual(
      audioWarnings,
      ['Item "bad-clip" has an unverified audio value (no https url)'],
      `expected exactly the bypass warning, got ${JSON.stringify(result.value.warnings)}`
    );
  });
});

describe('sanitizer: user-added items keep audio only through the gate', () => {
  function addedAudio(audioRaw) {
    const settings = {
      ...DEFAULT_SETTINGS,
      contentPrefs: {
        ...DEFAULT_SETTINGS.contentPrefs,
        addedItems: { c1: [{ id: 'u1', arabic: 'ذ', audio: audioRaw }] },
      },
    };
    const clean = sanitizeSettings(settings);
    return clean.contentPrefs.addedItems?.c1?.[0]?.audio;
  }

  test('verified https audio survives restore', () => {
    const audio = addedAudio({ url: GOOD_URL, reciter: 'Fixture Voice' });
    assert.deepEqual(audio, { url: GOOD_URL, reciter: 'Fixture Voice', source: '', license: '' });
  });

  test('http WAN / javascript: audio drops at the boundary', () => {
    assert.equal(addedAudio({ url: 'http://example.com/a.mp3' }), undefined);
    assert.equal(addedAudio({ url: 'javascript:alert(1)' }), undefined);
    assert.equal(addedAudio('https://example.com/a.mp3'), undefined);
  });
});

describe('render: conditional recitation button, never TTS masquerading', () => {
  test('absent audio → no recitation button, Listen synthesis stays', () => {
    for (const lang of ['en', 'ar']) {
      const html = cardHTML(itemWithAudio(undefined), null, { lang });
      assert.doesNotMatch(html, /play-dhikr-audio/, `no recitation button (${lang})`);
      assert.match(html, /data-action="toggle-speech"/, `Listen stays (${lang})`);
    }
    const en = cardHTML(itemWithAudio(undefined), null, { lang: 'en' });
    assert.match(en, /aria-label="Listen"/, 'Listen keeps its synthesis label');
  });

  test('malformed audio normalized → no button (never dead)', () => {
    const html = cardHTML(itemWithAudio({ url: 'http://example.com/a.mp3' }), null, {
      lang: 'en',
    });
    assert.doesNotMatch(html, /play-dhikr-audio/);
  });

  test('verified audio → distinct recitation button beside Listen', () => {
    const item = itemWithAudio({ url: GOOD_URL, reciter: 'Fixture Voice' });
    const en = cardHTML(item, null, { lang: 'en' });
    assert.match(en, /data-action="play-dhikr-audio"/, 'recitation button renders');
    assert.match(en, /aria-label="Play recitation"/, 'EN recitation label');
    assert.match(en, /data-action="toggle-speech"/, 'Listen still renders alongside');
    assert.match(en, /aria-label="Listen"/, 'Listen label untouched — no masquerading');
    assert.match(en, /title="Play recitation — Fixture Voice"/, 'title names the voice');
    const ar = cardHTML(item, null, { lang: 'ar' });
    assert.match(ar, /aria-label="تشغيل التلاوة"/, 'AR recitation label');
    assert.match(ar, /aria-label="استماع"/, 'AR Listen untouched');
  });

  test('playing state flips the button to Stop recitation', () => {
    const item = itemWithAudio({ url: GOOD_URL });
    const html = cardHTML(item, null, { lang: 'en', isPlayingAudio: true });
    assert.match(html, /aria-label="Stop recitation"/);
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /icon-btn--playing/);
  });

  test('by-heart mode parks the recitation button like Listen', () => {
    const item = itemWithAudio({ url: GOOD_URL });
    const html = cardHTML(item, null, {
      lang: 'en',
      byHeart: { revealed: true, due: '' },
    });
    assert.doesNotMatch(html, /play-dhikr-audio/);
    assert.doesNotMatch(html, /toggle-speech/);
  });
});

describe('renderFocus mirrors the card contract', () => {
  const focusState = (item, extra = {}) => ({
    settings: { ...DEFAULT_SETTINGS, language: 'en' },
    library: {
      documents: { t: { categories: [{ id: 'c1', items: [item] }] } },
      order: ['t'],
      itemIndex: {},
    },
    customContent: {},
    activeView: 'focus',
    activeParams: { id: 'c1', subId: item.id },
    favorites: [],
    counters: {},
    speakingItemId: null,
    dhikrAudioItemId: null,
    byHeart: null,
    byHeartRecords: {},
    ...extra,
  });

  test('absent audio → no button; verified → button; playing → stop label', () => {
    const bare = renderFocus(focusState(itemWithAudio(undefined, 'f1')));
    assert.doesNotMatch(bare, /play-dhikr-audio/);
    assert.match(bare, /data-action="toggle-speech"/);

    const item = itemWithAudio({ url: GOOD_URL }, 'f2');
    const withAudio = renderFocus(focusState(item));
    assert.match(withAudio, /data-action="play-dhikr-audio"/);
    assert.match(withAudio, /aria-label="Play recitation"/);

    const playing = renderFocus(focusState(item, { dhikrAudioItemId: 'f2' }));
    assert.match(playing, /aria-label="Stop recitation"/);
  });

  test('AR focus labels the recitation button without touching Listen', () => {
    const item = itemWithAudio({ url: GOOD_URL }, 'f3');
    const html = renderFocus(
      focusState(item, { settings: { ...DEFAULT_SETTINGS, language: 'ar' } })
    );
    assert.match(html, /aria-label="تشغيل التلاوة"/);
    assert.match(html, /aria-label="استماع"/);
  });
});

describe('driver: single-shot, fail-closed, streaming-only', () => {
  // Fixture element: records lifecycle calls, fires handlers on demand.
  function makeHarness(playImpl = () => Promise.resolve()) {
    const listeners = {};
    const instances = [];
    class FakeAudio {
      constructor() {
        this.preload = 'auto';
        this.src = '';
        this.paused = false;
        this.removedSrc = false;
        instances.push(this);
      }
      addEventListener(name, fn) {
        listeners[name] = fn;
      }
      removeEventListener(name) {
        delete listeners[name];
      }
      removeAttribute(name) {
        if (name === 'src') this.removedSrc = true;
      }
      pause() {
        this.paused = true;
      }
      play() {
        return playImpl();
      }
    }
    return { FakeAudio, listeners, instances };
  }

  function makeFake(playImpl) {
    return makeHarness(playImpl).FakeAudio;
  }

  test('a verified clip starts once and owns the highlight identity', () => {
    resetDhikrAudioForTests();
    let made = 0;
    const Fake = makeFake();
    const result = playDhikrAudio(
      { itemId: 'dhk-1', url: GOOD_URL },
      {
        AudioImpl: class extends Fake {
          constructor() {
            super();
            made += 1;
          }
        },
      }
    );
    assert.equal(result, 'started');
    assert.equal(made, 1);
    assert.equal(currentDhikrAudioItemId(), 'dhk-1');
    assert.equal(isPlayingDhikrAudioItem('dhk-1'), true);
    assert.equal(isPlayingDhikrAudioItem('other'), false);
    resetDhikrAudioForTests();
    assert.equal(currentDhikrAudioItemId(), null);
  });

  test('streaming-only: preload none, nothing handed to storage', () => {
    resetDhikrAudioForTests();
    let element = null;
    const Fake = makeFake();
    playDhikrAudio(
      { itemId: 'dhk-1', url: GOOD_URL },
      {
        AudioImpl: class extends Fake {
          constructor() {
            super();
            element = this;
          }
        },
      }
    );
    assert.equal(element.preload, 'none');
    assert.equal(element.src, GOOD_URL);
    // No storage/session imports (comments may name them; imports may not).
    const driverSrc = read('js/services/dhikrAudio.js');
    assert.doesNotMatch(driverSrc, /import[^;]*audioStore/, 'no IDB import');
    assert.doesNotMatch(driverSrc, /import[^;]*mediaSession/, 'no session import');
    resetDhikrAudioForTests();
  });

  test('a second play stops the first (play-once, no stacking)', () => {
    resetDhikrAudioForTests();
    const seen = [];
    const Fake = makeFake();
    const Tracked = class extends Fake {
      constructor() {
        super();
        seen.push(this);
      }
    };
    playDhikrAudio({ itemId: 'a', url: GOOD_URL }, { AudioImpl: Tracked });
    playDhikrAudio({ itemId: 'b', url: GOOD_URL }, { AudioImpl: Tracked });
    assert.equal(seen.length, 2);
    assert.equal(seen[0].paused, true, 'first clip stopped');
    assert.equal(currentDhikrAudioItemId(), 'b');
    resetDhikrAudioForTests();
  });

  test('unverified urls fail closed without creating an element', () => {
    resetDhikrAudioForTests();
    for (const bad of ['http://example.com/a.mp3', 'javascript:alert(1)', '', null]) {
      let made = 0;
      const Fake = makeFake();
      const result = playDhikrAudio(
        { itemId: 'x', url: bad },
        {
          AudioImpl: class extends Fake {
            constructor() {
              super();
              made += 1;
            }
          },
        }
      );
      assert.equal(result, 'invalid');
      assert.equal(made, 0, 'no element for an unverified url');
      assert.equal(currentDhikrAudioItemId(), null);
    }
  });

  test('ended clears state and fires onEnd; error fires onError', () => {
    resetDhikrAudioForTests();
    const endHarness = makeHarness();
    const endEvents = [];
    playDhikrAudio(
      { itemId: 'dhk-1', url: GOOD_URL },
      { AudioImpl: endHarness.FakeAudio, onEnd: (id) => endEvents.push(['end', id]) }
    );
    assert.ok(typeof endHarness.listeners.ended === 'function', 'driver subscribes ended');
    endHarness.listeners.ended();
    assert.deepEqual(endEvents, [['end', 'dhk-1']], 'natural end reports the finished item');
    assert.equal(currentDhikrAudioItemId(), null, 'highlight clears on end');

    const errHarness = makeHarness();
    const errEvents = [];
    playDhikrAudio(
      { itemId: 'dhk-2', url: GOOD_URL },
      { AudioImpl: errHarness.FakeAudio, onError: (e) => errEvents.push(e) }
    );
    assert.ok(typeof errHarness.listeners.error === 'function', 'driver subscribes error');
    errHarness.listeners.error();
    assert.equal(errEvents.length, 1, 'load error surfaces as a failure');
    assert.equal(currentDhikrAudioItemId(), null, 'highlight clears on error');
    resetDhikrAudioForTests();
  });

  test('play() rejection reports onError and clears the highlight', async () => {
    resetDhikrAudioForTests();
    const Fake = makeFake(() => Promise.reject(new Error('autoplay')));
    const errors = [];
    const result = playDhikrAudio(
      { itemId: 'dhk-9', url: GOOD_URL },
      { AudioImpl: Fake, onError: (e) => errors.push(e) }
    );
    assert.equal(result, 'started');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(errors.length, 1, 'rejection surfaces as a failure');
    assert.equal(currentDhikrAudioItemId(), null, 'highlight reverts');
  });

  test('stop is idempotent and unsupported hosts report cleanly', () => {
    resetDhikrAudioForTests();
    assert.doesNotThrow(() => stopDhikrAudio());
    const errors = [];
    const result = playDhikrAudio(
      { itemId: 'x', url: GOOD_URL },
      { AudioImpl: null, onError: (e) => errors.push(e) }
    );
    assert.equal(result, 'unsupported');
    assert.equal(errors.length, 1);
  });
});

describe('handler wiring: play-dhikr-audio resolves and fails with Retry', () => {
  test('the action is registered (no orphan, no dead button)', () => {
    assert.ok(
      mergedClickHandlers['play-dhikr-audio'],
      'play-dhikr-audio must resolve in the delegation table'
    );
    assert.equal(
      typeof mergedClickHandlers['play-dhikr-audio'],
      'function',
      'the handler must be a function'
    );
  });

  test('failure path toasts with Retry that replays the same item', () => {
    const src = read('js/app/handlers/items.js');
    // The error callback (not a silent revert)…
    assert.match(
      src,
      /playDhikrAudio\([\s\S]{0,400}onError: \(\) => \{[\s\S]{0,600}t\('dhikrAudio\.failed'/,
      'a clip failure must toast dhikrAudio.failed'
    );
    // …carries the shared Retry action…
    assert.match(
      src,
      /onError: \(\) => \{[\s\S]{0,600}actionLabel: t\('common\.retry'/,
      'the failure toast must carry a Retry action'
    );
    // …that replays THIS item (self-invocation with the same dataset).
    assert.match(
      src,
      /clickHandlers\['play-dhikr-audio'\]\(ds\)/,
      'Retry must replay the same item, not whatever is selected now'
    );
    // Toggle-off while playing, and one-voice yielding both directions.
    assert.match(
      src,
      /isPlayingDhikrAudioItem\(ds\.itemId\)\) \{\s*stopDhikrAudio\(\)/,
      'tapping while playing must stop (toggle)'
    );
    // v5.17.43: this pinned a literal `yieldFullSurahPlayer()` inside the
    // play-dhikr-audio handler. The one-voice fix replaced that private stop
    // list with `claimSpeaker('adhkar')`, which is strictly stronger — it
    // also silences TTS and a live verse session, which the old call did
    // not. The behaviour is now held by tests/one-voice.test.js.
    assert.match(
      src,
      /'play-dhikr-audio'[\s\S]{0,1400}claimSpeaker\('adhkar'\)/,
      'a dhikr clip must arbitrate the speaker'
    );
    assert.match(
      src,
      // v5.17.43: was a literal `stopDhikrAudio()` inside toggle-speech, which
      // silenced the clip but not a live verse session or an adhan. The
      // arbiter covers all of them; this now asserts the arbitration.
      /'toggle-speech': \(ds\) => \{[\s\S]{0,600}claimSpeaker\('speech'\)/,
      'synthesis must arbitrate the speaker (one voice)'
    );
  });

  test('i18n keys exist in both languages with distinct recitation/synthesis labels', () => {
    const en = read('js/core/i18n/en.js');
    const ar = read('js/core/i18n/ar.js');
    for (const key of ['card.playDhikrAudio', 'card.stopDhikrAudio', 'dhikrAudio.failed']) {
      assert.ok(en.includes(`'${key}'`), `${key} missing in English`);
      assert.ok(ar.includes(`'${key}'`), `${key} missing in Arabic`);
    }
    // Synthesis keeps its own label — the two must never read the same.
    assert.ok(en.includes("'card.listen': 'Listen'"), 'Listen label must stay');
  });
});
