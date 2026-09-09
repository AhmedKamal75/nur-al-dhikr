/**
 * recitation-console.test.js — Blueprint E step 1: one console builder,
 * three hosts. Pins the 13-action set (exactly once each), non-empty
 * labels, mushaf-order chevrons on every host, and snapshot normalization.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  consoleSnapshot,
  recitationChipsHTML,
  recitationEchoHTML,
  reciterShortLabel,
} from '../js/ui/recitationConsole.js';

const ACTIONS = [
  'recite-ayah-prev',
  'recite-ayah-next',
  'recite-repeat-toggle',
  'recite-follow-toggle',
  'recite-listen-toggle',
  'recite-echo-toggle',
  'recite-sleep-cycle',
  'recite-voice-open',
  'recite-compare-toggle',
  'recite-loop-toggle',
  'recite-speed-cycle',
  'recite-pause-toggle',
  'recite-stop',
];

function session(over = {}) {
  return {
    active: true,
    surah: 2,
    ayah: 5,
    total: 286,
    repeat: 1,
    loop: 1,
    speed: 1,
    paused: false,
    waiting: false,
    continuous: false,
    listenRepeat: false,
    compare: false,
    reciterId: 'x',
    ...over,
  };
}

const settings = { audio: { ayahFollow: true }, reciter: 'x' };
const sleep = { enabled: false, label: '' };
const CLS = { chip: 'c-chip', on: 'c-chip--on', btn: 'c-btn' };

function actionsIn(html) {
  return [...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
}

test('E: all 13 actions render exactly once with labels', () => {
  const snap = consoleSnapshot(session(), settings, sleep, 'en');
  const html = recitationChipsHTML(snap, 'en', CLS);
  const found = actionsIn(html).filter((a) => a.startsWith('recite-'));
  assert.deepEqual([...found].sort(), [...ACTIONS].sort());
  for (const label of [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])) {
    assert.ok(label.length > 0, 'every control has a non-empty label');
  }
});

test('E: ayah prev/next follow mushaf order on every host', () => {
  const snap = consoleSnapshot(session(), settings, sleep, 'en');
  const hosts = [
    CLS,
    { chip: 'mushaf-fs-chip', on: 'mushaf-fs-chip--on', btn: 'icon-btn' },
    { chip: 'reader-immersive-chip', on: 'reader-immersive-chip--on', btn: 'icon-btn' },
    { chip: 'player-bar__chip', on: 'player-bar__chip--on', btn: 'icon-btn icon-btn--sm' },
  ];
  for (const cls of hosts) {
    const html = recitationChipsHTML(snap, 'en', cls);
    // chevronRight (M9 5l7 7-7 7) = previous in mushaf order; chevronLeft
    // (M15 5 8 12l7 7) = next — identical on all three hosts now.
    const prevSeg = html.split('data-action="recite-ayah-prev"')[1].split('data-action=')[0];
    const nextSeg = html.split('data-action="recite-ayah-next"')[1].split('data-action=')[0];
    assert.ok(prevSeg.includes('M9 5l7 7-7 7'), `prev chevron (${cls.chip})`);
    assert.ok(nextSeg.includes('M15 5 8 12l7 7'), `next chevron (${cls.chip})`);
    assert.ok(html.includes(`class="${cls.chip}`), `host chip class (${cls.chip})`);
  }
});

test('E: active toggles carry the host on-class + aria-pressed', () => {
  const snap = consoleSnapshot(
    session({ continuous: true, listenRepeat: true, compare: true, repeat: 3 }),
    settings,
    sleep,
    'en'
  );
  const html = recitationChipsHTML(snap, 'en', CLS);
  assert.ok(html.includes('c-chip--on'));
  assert.ok(/recite-follow-toggle" aria-pressed="true"/.test(html));
  assert.ok(/recite-listen-toggle" aria-pressed="true"/.test(html));
  assert.ok(/recite-echo-toggle" aria-pressed="true"/.test(html));
  assert.ok(/recite-compare-toggle" aria-pressed="true"/.test(html));
  assert.ok(html.includes('×3'));
});

test('E: snapshot normalizes hostile session values', () => {
  const snap = consoleSnapshot(
    session({ repeat: 99, loop: 99, speed: 'fast' }),
    settings,
    sleep,
    'en'
  );
  assert.equal(snap.rep, 1);
  assert.equal(snap.loop, 1);
  assert.equal(snap.speed, 1);
  const inf = consoleSnapshot(session({ repeat: -1 }), settings, sleep, 'en');
  assert.equal(inf.repLabel, '∞');
});

test('E: echo banner only while waiting', () => {
  const idle = consoleSnapshot(session(), settings, sleep, 'en');
  assert.equal(recitationEchoHTML(idle, 'en', 'x-echo'), '');
  const waiting = consoleSnapshot(session({ waiting: true }), settings, sleep, 'en');
  const banner = recitationEchoHTML(waiting, 'en', 'x-echo');
  assert.ok(banner.includes('x-echo') && banner.includes('role="status"'));
});

test('E: icon-only buttons carry wide-viewport labels (UX-8)', () => {
  const snap = consoleSnapshot(session(), settings, sleep, 'en');
  const html = recitationChipsHTML(snap, 'en', CLS);
  for (const action of [
    'recite-ayah-prev',
    'recite-ayah-next',
    'recite-follow-toggle',
    'recite-pause-toggle',
  ]) {
    const seg = html.split(`data-action="${action}"`)[1].split('</button>')[0];
    assert.ok(seg.includes('rec-console-label'), `${action} has a label span`);
    assert.ok(seg.includes('aria-hidden="true"'), `${action} label is decorative`);
  }
  // The stop square stays icon-only (universal glyph + aria-label).
  const stopSeg = html.split('data-action="recite-stop"')[1].split('</button>')[0];
  assert.ok(!stopSeg.includes('rec-console-label'));
});

test('E: reciterShortLabel falls back to the raw id', () => {
  assert.equal(reciterShortLabel('unknown-id', 'en'), 'unknown-id');
  assert.equal(reciterShortLabel('', 'en'), '');
});
