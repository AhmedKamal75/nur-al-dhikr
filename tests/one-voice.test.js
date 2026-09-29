/**
 * one-voice.test.js — "one voice at a time" must mean all five pairs.
 *
 * THE DEFECT THIS PINS
 *
 * `docs/PROJECT-PICTURE.md` §3 lists "One voice at a time" as a standing
 * product decision, and the code carried the comment at every start path. It
 * was true for the pairings anyone happened to be looking at and false for
 * the rest. A relational audit of every surface pairing found:
 *
 *   - TTS narration spoke over a dhikr clip's siblings, a verse session, and
 *     an adhan;
 *   - a dhikr clip played under a live recitation;
 *   - starting a verse session or tapping an ayah never stopped TTS or a clip;
 *   - a scheduled adhan silenced four voices and not the fifth.
 *
 * That is one bug wearing five costumes: each start path stopped only the
 * engines its author was already thinking about.
 *
 * WHY A MATRIX AND NOT FIVE ASSERTIONS
 *
 * The fix that does not come back is `claimSpeaker(voice)` in
 * `js/app/audioEngine.js`, called by every start path. This test holds the
 * matrix — for each voice, which others it must displace — so a new voice, or
 * a start path that forgets to arbitrate, is caught structurally rather than
 * by whoever next reads this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');

/** The five voices, and the engine that owns each. */
const VOICES = ['player', 'verse', 'speech', 'adhkar', 'adhan'];

/** What each voice must silence when it starts. */
const MUST_DISPLACE = {
  player: ['verse', 'speech', 'adhkar'],
  verse: ['player', 'speech', 'adhkar'],
  speech: ['player', 'verse', 'adhkar'],
  adhkar: ['player', 'verse', 'speech'],
  adhan: ['player', 'verse', 'speech', 'adhkar'],
};

const engine = read('js/app/audioEngine.js');

test('the arbiter exists and names all five voices', () => {
  assert.match(engine, /export function claimSpeaker\(/);
  for (const v of VOICES) {
    assert.match(engine, new RegExp(`'${v}'`), `VOICES should name ${v}`);
  }
});

test('the matrix is symmetric EXCEPT that the adhan outranks every voice', () => {
  // My first cut asserted full symmetry and it was wrong. Prayer time is the
  // one moment the app must not talk over, so the adhan displaces everything
  // while a recitation or a narration does NOT displace the adhan. That
  // asymmetry is the design, and naming it here stops the next reader from
  // "fixing" it into a symmetric matrix.
  for (const [a, list] of Object.entries(MUST_DISPLACE)) {
    for (const b of list) {
      assert.notEqual(a, b, 'a voice must not displace itself');
      if (a === 'adhan' || b === 'adhan') continue;
      assert.ok(
        MUST_DISPLACE[b].includes(a),
        `${a} displaces ${b}, so ${b} must also displace ${a}`
      );
    }
  }
  for (const v of VOICES) {
    if (v === 'adhan') continue;
    assert.ok(!MUST_DISPLACE[v].includes('adhan'), `a ${v} must never displace the adhan`);
  }
});

test('every voice that starts anywhere in the app goes through the arbiter', () => {
  // A new start path that hand-rolls its own stop list is exactly how this
  // bug came back five times. Every caller of a start-ish entry point must
  // arbitrate, so the sweep is structural: is there a claimSpeaker call
  // anywhere in every file that starts audio?
  const starters = [
    'js/app/audioEngine.js',
    'js/app/handlers/quranAudio.js',
    'js/app/handlers/quran.js',
    'js/app/handlers/audio.js',
    'js/app/handlers/items.js',
  ];
  for (const f of starters) {
    assert.match(read(f), /claimSpeaker\(/, `${f} starts audio and must arbitrate`);
  }
});

test('no start path hand-rolls a partial stop list any more', () => {
  // The shape of the old bug: a block that stops SOME voices inline. If
  // `speech.stop()` is called from a start path, someone has rebuilt a
  // private arbitration.
  //
  // Exempt: the toggle-OFF branch in items.js, where the voice being stopped
  // IS the one the user just asked to stop. That is a toggle half, not an
  // arbitration, and it is only legitimate when guarded by "am I already
  // speaking this item?".
  const src = read('js/app/handlers/items.js');
  for (const m of src.matchAll(/speech\.stop\(\)/g)) {
    const before = src.slice(Math.max(0, m.index - 300), m.index);
    assert.match(
      before,
      /speech\.isSpeakingItem\(/,
      'items.js calls speech.stop() outside the toggle-off branch — that is a private arbitration; call claimSpeaker(voice)'
    );
  }
  for (const f of [
    'js/app/handlers/quran.js',
    'js/app/handlers/audio.js',
    'js/app/handlers/quranAudio.js',
  ]) {
    assert.ok(
      !/speech\.stop\(\)/.test(read(f)),
      `${f} calls speech.stop() directly — that is a private arbitration`
    );
  }
});

test('a resumable voice is paused, a single-shot voice is only stopped', () => {
  // The distinction matters and is easy to flatten: pausing a recitation the
  // user is mid-way through is correct, silently killing a 40-verse session
  // is not. The full-surah track stays docked so one tap resumes it.
  assert.match(engine, /yieldFullSurahPlayer\(\)/, 'the player must be paused, not discarded');
  assert.match(
    engine,
    /actions\.setAudioPlayer\(\{ playing: false \}\)/,
    'the paused track keeps its position in the bar'
  );
  // No auto-resume in CODE. Comments are stripped first — the note above
  // contains the phrase itself, and a test that greps its own explanation is
  // a test that can never pass.
  const code = engine.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.ok(
    !/auto-?resume|autoResume/.test(code),
    'a displaced voice must never restart itself; one tap resumes'
  );
});

test('the adhan owns the speaker completely — it is the one non-negotiable', () => {
  // Prayer time is the one moment the app must not talk over.
  const m = engine.match(/onAdhanStart\(\(\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(m, 'an onAdhanStart handler should exist');
  assert.match(m[1], /claimSpeaker\('adhan'\)/, 'adhan must arbitrate, not hand-pick voices');
});

test('VOICES and the matrix cannot drift from the doc', () => {
  const declared = engine.match(/VOICES = Object\.freeze\(\[([^\]]+)\]/);
  assert.ok(declared, 'VOICES should be a frozen array');
  const names = [...declared[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(names.sort(), [...VOICES].sort(), 'VOICES drifted from the five engines');
});

test('the project doc still claims the decision this implements', () => {
  // If someone removes the decision, this test should fail rather than leave
  // a comment asserting a rule the product no longer holds.
  const doc = read('docs/PROJECT-PICTURE.md');
  assert.match(doc, /One voice at a time/i);
});
