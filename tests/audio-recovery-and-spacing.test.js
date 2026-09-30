/**
 * audio-recovery-and-spacing.test.js — two fixes that had no test (v5.17.24)
 *
 * A backlog consistency check asked every row marked "fixed" to name a real
 * test, and two rows had none: the recitation Retry action and the widened
 * roomySpacing. Both were real changes, and both were claims rather than
 * closures. These are the closures.
 *
 * The first is the more important of the two. A reader whose recitation will
 * not start had exactly one recourse — find the play button and tap it again
 * by hand. The action-bearing toast API had existed all along, so this was
 * never blocked on a missing capability; the audio path simply used none of
 * it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cardHTML } from '../js/ui/card.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('a recitation failure offers a Retry that replays the surah', async () => {
  const engine = read('js/app/audioEngine.js');
  const en = read('js/core/i18n/en.js');

  // The pre-playback failure path.
  assert.match(
    engine,
    /if \(error\) \{[\s\S]{0,1200}actionLabel: t\('common\.retry'/,
    'a track that could not start must carry a Retry action'
  );
  // And the mid-stream drop path, which is the case a reader most wants to
  // resume from: the retry must replay the surah that was PLAYING, not
  // whatever happens to be selected now.
  assert.match(
    engine,
    /onPlayerError\([\s\S]{0,900}actionLabel: t\('common\.retry'/,
    'a mid-stream drop must also offer Retry'
  );
  assert.match(
    engine,
    /onAction: \(\) => \{\s*void startAudioPlay\(p\.moshafId, p\.surah\)/,
    'the retry must replay the surah that was playing'
  );
  // The action-bearing API this depends on must still be what we think it is.
  const toast = read('js/ui/toast.js');
  assert.match(
    toast,
    /actionLabel = null, onAction = null/,
    'the toast API lost its action support'
  );
  assert.ok(en.includes("'common.retry'"), 'common.retry must exist in English');
  assert.ok(
    read('js/core/i18n/ar.js').includes("'common.retry'"),
    'common.retry must exist in Arabic'
  );
});

test('the ledger no longer claims this API does not exist', () => {
  // OPEN-ISSUES row 7 justified itself with "No action-bearing toast API
  // exists in js/ui/toast.js". That was false, and it is the stated reason
  // the work was blocked. A false blocker in a ledger is worse than no
  // blocker, because it stops the next person looking.
  const ledger = read('docs/OPEN-ISSUES.md');
  assert.equal(
    /No action-bearing toast API exists/.test(ledger),
    false,
    'the ledger still claims no action-bearing toast API exists; it has, since long before'
  );
});

test('roomySpacing reaches the main reading surfaces, not only translations', () => {
  const css = read('assets/css/accessibility.css');
  const block = /\[data-roomy='true'\][\s\S]*?\{[^}]*\}/.exec(css);
  assert.ok(block, 'the roomy rule exists');

  // The gap a hostile review measured: the setting reached translations,
  // virtues and the journal — the SUPPLEMENTARY text — and left the main
  // reading surfaces byte-identical, which is the signature of a dead switch.
  const selectors = [...css.matchAll(/\[data-roomy='true'\]\s+\.([a-z0-9_-]+)/g)].map((m) => m[1]);
  for (const must of ['chip--phrase', 'field-label', 'panel__subtext', 'mushaf-tray__text']) {
    assert.ok(selectors.includes(must), `roomySpacing must reach .${must}`);
  }

  // Every selector must be a class that actually appears in markup, or it is
  // another dead rule wearing a different name.
  const markup = ['js/views', 'js/ui']
    .flatMap((d) =>
      fs
        .readdirSync(path.join(root, d), { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.js'))
        .map((e) => read(path.join(d, e.name)))
    )
    .join('\n');
  // (v5.17.52) disclosureHTML (js/ui/card.js) builds its content classes
  // from a card/focus prefix — `card__virtue` rides `${prefix}__virtue`,
  // so the literal never sits in source while the rule still reaches live
  // markup. Only the builder's documented rows may use this escape hatch,
  // and the hatch itself is pinned to a live render below.
  const PREFIX_BUILT = new Set(['card__virtue']);
  const ghosts = [...new Set(selectors)].filter((cls) => {
    if (markup.includes(cls)) return false;
    if (PREFIX_BUILT.has(cls) && markup.includes('${prefix}__virtue')) return false;
    return true;
  });
  assert.deepEqual(ghosts, [], `roomySpacing selectors that match no markup: ${ghosts.join(', ')}`);
  // The escape hatch is real markup, not a comment: a virtue-bearing card
  // still emits the class the roomy rule targets.
  const liveCard = cardHTML(
    { id: 'roomy-pin', arabic: 'نص', virtues: { en: 'A virtue.' }, repetitions: 1 },
    null,
    { lang: 'en' }
  );
  assert.ok(liveCard.includes('card__virtue'), 'the roomy rule reaches live card markup');
});

test('roomySpacing never letter-spaces Arabic', () => {
  // The rule that must never be relaxed: letter-spacing breaks the joins in
  // Arabic script. A reader cannot unjoin a letter.
  const css = read('assets/css/accessibility.css');
  assert.ok(
    /\[data-roomy='true'\]\s+\.ayah-card__arabic[\s\S]{0,200}letter-spacing:\s*0/.test(css),
    'Arabic must be exempted from letter-spacing under roomySpacing'
  );
});

test('the mushaf is excluded from roomySpacing, and says why', () => {
  // The mushaf has its own line-spacing control (mushafPrefs.lineSpacing ->
  // --mushaf-line-scale). Two settings driving one line box leaves a reader
  // unable to predict which one is winning, so the exclusion is deliberate
  // and must be recorded rather than left as a silent gap.
  const css = read('assets/css/accessibility.css');
  const i = css.indexOf("[data-roomy='true']");
  const comment = css.slice(Math.max(0, i - 900), i);
  assert.match(
    comment,
    /line-spacing control|own line-spacing/i,
    'the mushaf exclusion must be explained'
  );
  assert.equal(
    /\[data-roomy='true'\]\s+\.mushaf-page__text/.test(css),
    false,
    'the mushaf must not be in the roomy rule'
  );
});
