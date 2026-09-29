/**
 * tajweed-course.test.js — the course spine, and both progression modes
 *
 * Two things are being protected here.
 *
 * First, honesty. The course must not become a place where religious prose
 * appears without a source. Sessions carry rule ids, not descriptions; the
 * descriptions live in data/tajweed-sources.json with citations. So: every
 * rule a session teaches must be a rule the app can attribute, the runtime
 * module must mirror the canonical JSON, and no Arabic string may contain an
 * English word — a mistake this project has now made three times.
 *
 * Second, the two modes. `open` is not a lesser mode: it must expose every
 * session, and switching between modes must never lose progress. A reader who
 * came for one rule should not have to walk a ladder to reach it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { TAJWEED_RULES } from '../js/domain/tajweed.js';
import { TAJWEED_SOURCES } from '../js/domain/tajweedSources.js';
import {
  COURSE_STAGES,
  COURSE_STAGE_IDS,
  PATH_MODES,
  DEFAULT_PATH_MODE,
  allSessions,
  findSession,
  findStage,
  courseRules,
  courseProgress,
  isDrivable,
  isUnlocked,
  availableSessions,
  nextSession,
  stageProgress,
  searchSessions,
  sessionsForRule,
  uncitedSessions,
} from '../js/domain/tajweedCourse.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const courseDoc = JSON.parse(read('data/tajweed-course.json'));

test('the runtime spine mirrors the canonical JSON', () => {
  assert.deepEqual(
    COURSE_STAGE_IDS,
    courseDoc.stages.map((s) => s.id),
    'stage ids drifted'
  );
  assert.deepEqual(
    COURSE_STAGES.map((s) => s.order),
    courseDoc.stages.map((s) => s.order),
    'stage order drifted'
  );
  for (const docStage of courseDoc.stages) {
    const mod = findStage(docStage.id);
    assert.ok(mod, `${docStage.id} missing from the module`);
    // (v5.17.23) The mirror-parity loop checked id/order/focus/citation and
    // NOT the text, so a mirror without a single title or rationale stayed
    // green while the screen rendered six empty <h2>s — "Stage 1 … Stage 6"
    // with no names, in either language, on the feature the last two
    // releases were built around. Parity means parity.
    assert.deepEqual(mod.title, docStage.title, `${docStage.id} title drifted`);
    assert.deepEqual(mod.why, docStage.why, `${docStage.id} rationale drifted`);
    assert.ok(mod.title?.en && mod.title?.ar, `${docStage.id} title must be bilingual`);
    assert.ok(mod.why?.en && mod.why?.ar, `${docStage.id} rationale must be bilingual`);
    assert.equal(mod.sessions.length, docStage.sessions.length, `${docStage.id} session count`);
    for (const docSession of docStage.sessions) {
      const ms = findSession(docSession.id);
      assert.ok(ms, `${docSession.id} missing from the module`);
      assert.deepEqual(ms.focus, docSession.focus, `${docSession.id} focus drifted`);
      assert.equal(ms.mixed, docSession.mixed, `${docSession.id} mixed flag drifted`);
      assert.equal(ms.citation.work, docSession.citation.work, `${docSession.id} work drifted`);
      assert.equal(ms.citation.lines, docSession.citation.lines, `${docSession.id} lines drifted`);
      // (v5.17.32) Session titles render in the row heading; the mirror
      // omitted them and every row shipped with an empty title. Parity
      // means parity here too, plus the spread flag that switches the row
      // from rule chips to the disagreement branch.
      assert.deepEqual(ms.title, docSession.title, `${docSession.id} title drifted`);
      assert.ok(ms.title?.en && ms.title?.ar, `${docSession.id} title must be bilingual`);
      assert.equal(ms.spread || null, docSession.spread || null, `${docSession.id} spread drifted`);
    }
  }
});

test('every session is ordered, uniquely identified, and drivable', () => {
  const ids = allSessions().map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate session id');
  for (const stage of COURSE_STAGES) {
    const orders = stage.sessions.map((s) => s.order);
    assert.deepEqual(
      orders,
      [...orders].sort((a, b) => a - b),
      `${stage.id} is out of order`
    );
  }
  // A session with nothing to drill is a dead row in a plan — EXCEPT a
  // spread session, which teaches a disagreement by design (v5.17.32).
  // Those are exactly the non-drivable set; anything else is still a bug.
  const dead = allSessions()
    .filter((s) => !isDrivable(s))
    .map((s) => s.id);
  const spread = allSessions()
    .filter((s) => s.spread)
    .map((s) => s.id);
  assert.deepEqual(
    dead.sort(),
    spread.sort(),
    'non-drillable sessions must be exactly the spread rows'
  );
  assert.deepEqual(spread.sort(), ['makharij-counts', 'sifat-counts']);
});

test('the course opens with madd, as the sourced shape requires', () => {
  // Arabic101's 30-day programme opens with madd and calls it the foundation
  // of the other types. This pins the order so a later reshuffle is a
  // deliberate act with a commit message, not a drift.
  assert.equal(COURSE_STAGES[0].id, 'madd');
  assert.ok(
    COURSE_STAGES[0].sessions[0].focus.includes('madd_2'),
    'stage one opens on natural madd'
  );
  // And the classical gradient still holds: the noon/meem block comes before
  // the late orthographic material.
  const order = Object.fromEntries(COURSE_STAGES.map((s) => [s.id, s.order]));
  assert.ok(order.noon < order.lam, 'noon rules precede the orthographic stage');
  assert.ok(order.meem < order.lam, 'meem rules precede the orthographic stage');
  assert.equal(order.mixed, COURSE_STAGES.length, 'mixed recitation is last');
});

test('no session teaches a rule the app cannot attribute', () => {
  assert.deepEqual(
    uncitedSessions().map((s) => s.id),
    [],
    'a session teaches an uncited rule'
  );
  const unknown = courseRules().filter((r) => !TAJWEED_RULES.some((t) => t.id === r));
  // Spread positions (makharij_17, sifat_18, …) are not classifier rules,
  // so they are not in TAJWEED_RULES — but they must still resolve in the
  // citation registry as contested entries, or the row teaches the
  // unattributed. Anything else unknown is still a failure.
  const spreadIds = allSessions()
    .filter((s) => s.spread)
    .flatMap((s) => s.focus || []);
  for (const id of unknown) {
    assert.ok(
      spreadIds.includes(id) &&
        TAJWEED_SOURCES[id]?.review === 'contested' &&
        TAJWEED_SOURCES[id]?.caveat?.en &&
        TAJWEED_SOURCES[id]?.caveat?.ar,
      `${id} is taught but is neither a classifier rule nor a contested spread position`
    );
  }
  assert.deepEqual(
    unknown.filter((r) => !spreadIds.includes(r)),
    [],
    'a session references a rule the app does not have'
  );
  // Every rule the course touches must also be a rule the classifier emits.
  for (const rule of courseRules()) {
    assert.ok(TAJWEED_SOURCES[rule], `${rule} has no citation`);
  }
});

test('the course covers the rules it claims to teach', () => {
  const covered = new Set(courseRules());
  // The high-frequency nasal family and madd must all be reachable, or the
  // course is a plan that skips the work.
  for (const must of [
    'madd_2',
    'madd_muttasil',
    'madd_munfasil',
    'madd_246',
    'qalqalah',
    'tafkhim',
    'ikhfa',
    'iqlab',
    'idgham_ghunnah',
    'izhar_shafawi',
    'idgham_shafawi',
    'ikhfa_shafawi',
    'lam_shamsiyyah',
    'hamzat_wasl',
  ]) {
    assert.ok(covered.has(must), `${must} is not taught anywhere in the course`);
  }
  // And "where is this rule taught?" must answer for a rule that is in it.
  assert.ok(sessionsForRule('ikhfa').length > 0, 'ikhfa has no session');
  assert.deepEqual(sessionsForRule('not_a_rule'), []);
});

test('open mode exposes everything, and is a first-class mode', () => {
  assert.deepEqual(PATH_MODES, ['guided', 'open']);
  assert.equal(DEFAULT_PATH_MODE, 'guided', 'a reader who asks for a plan gets one by default');
  const all = allSessions();
  assert.equal(availableSessions({}, 'open').length, all.length);
  assert.equal(availableSessions({}, 'open').length, all.length);
  // Even a reader who finished everything keeps access.
  const finished = Object.fromEntries(all.map((s) => [s.id, { at: 1 }]));
  assert.equal(availableSessions(finished, 'open').length, all.length);
});

test('guided mode unlocks in order but still allows revisiting', () => {
  const all = allSessions();
  const first = all[0].id;
  assert.ok(isUnlocked(first, {}, 'guided'), 'the first session is always available');
  assert.equal(isUnlocked(all[1].id, {}, 'guided'), false, 'session two is locked at the start');
  assert.equal(availableSessions({}, 'guided').length, 1, 'only the first is open');

  // Finishing one opens exactly the next.
  const after1 = { [first]: { at: 1 } };
  assert.ok(isUnlocked(all[1].id, after1, 'guided'));
  assert.ok(isUnlocked(first, after1, 'guided'), 'a finished session stays open for revision');

  // Switching mode must not lose progress.
  assert.equal(availableSessions(after1, 'open').length, all.length);
  assert.equal(nextSession(after1, 'guided').id, all[1].id);
  assert.equal(nextSession(after1, 'open').id, all[1].id);
});

test('progress is real arithmetic, and a finished course is a real state', () => {
  const all = allSessions();
  assert.deepEqual(courseProgress({}), { done: 0, total: all.length, ratio: 0 });
  const half = Object.fromEntries(all.slice(0, 3).map((s) => [s.id, { at: 1 }]));
  const p = courseProgress(half);
  assert.equal(p.done, 3);
  assert.equal(p.ratio, 3 / all.length);

  // Done means next-up is null. The UI must handle that rather than looping.
  const finished = Object.fromEntries(all.map((s) => [s.id, { at: 1 }]));
  assert.equal(nextSession(finished, 'guided'), null);
  assert.equal(courseProgress(finished).ratio, 1);
  // A finished course must not lock itself out of review.
  assert.equal(availableSessions(finished, 'guided').length, all.length);

  assert.deepEqual(stageProgress('madd', {}), { done: 0, total: 4, ratio: 0 });
  assert.equal(stageProgress('madd', half).done, 3);
  assert.deepEqual(stageProgress('nope', half), { done: 0, total: 0, ratio: 0 });
});

test('search finds a session by the rule the reader remembers', () => {
  // The realistic case: someone who knows they want ikhfa, not which stage
  // it lives in.
  const hits = searchSessions('ikhfa');
  assert.ok(hits.length > 0, 'searching a rule id must find its session');
  assert.ok(hits.some((s) => s.focus.includes('ikhfa')));
  assert.equal(searchSessions('').length, allSessions().length, 'empty query returns everything');
  assert.equal(searchSessions('   ').length, allSessions().length);
  assert.equal(searchSessions('zzzz').length, 0);
  assert.ok(
    searchSessions('noon').some((s) => s.stageId === 'noon'),
    'stage id is searchable too'
  );
});

test('every stage the reader sees carries a name and a reason', () => {
  // The rendered symptom, not the data symptom: an unnamed stage heading is
  // an accessibility failure (axe `empty-heading`) before it is a design one.
  for (const stage of COURSE_STAGES) {
    assert.ok(
      String(stage.title?.en || '').trim().length > 0,
      `${stage.id} has no English title — the heading would render empty`
    );
    assert.ok(String(stage.title?.ar || '').trim().length > 0, `${stage.id} has no Arabic title`);
    assert.ok(
      String(stage.why?.en || '').trim().length > 0,
      `${stage.id} has no English rationale`
    );
    assert.ok(String(stage.why?.ar || '').trim().length > 0, `${stage.id} has no Arabic rationale`);
  }
});

test('bilingual everywhere, with no English leaking into Arabic', () => {
  // This has now gone wrong three times in long hand-written literals, so it
  // is checked mechanically rather than by reading.
  const bad = [];
  const walk = (node, at) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${at}[${i}]`));
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, `${at}.${k}`);
      return;
    }
    if (typeof node !== 'string') return;
    if (!/[؀-ۿ]/.test(node)) return;
    // A brand keeps its own script inside Arabic text — that is normal
    // Arabic typography, not a leak. Everything else is a mistake.
    const latin = (node.match(/[A-Za-z][A-Za-z0-9.]{2,}/g) || []).filter(
      (w) => !/^(Arabic101)$/.test(w)
    );
    // .length, not truthiness: [] is truthy in JS and flagged every string.
    if (latin.length) bad.push(`${at}: ${latin.join(', ')}`);
  };
  walk(courseDoc.stages, 'stages');
  walk(courseDoc.attribution, 'attribution');
  assert.deepEqual(bad, [], 'Latin words inside an Arabic string');
  for (const stage of courseDoc.stages) {
    for (const key of ['title', 'why']) {
      assert.ok(stage[key]?.en && stage[key]?.ar, `${stage.id}.${key} is not bilingual`);
    }
    for (const sess of stage.sessions) {
      assert.ok(sess.title?.en && sess.title?.ar, `${sess.id}.title is not bilingual`);
    }
  }
});

test('the attribution is honest about what is borrowed and what is ours', () => {
  const a = courseDoc.attribution;
  // Arabic101 is credited for pedagogy, and explicitly NOT for its syllabus,
  // because their exact stage names were never verifiable.
  assert.match(a.shape, /Arabic101/);
  assert.match(a.notClaimed, /NOT a reproduction/);
  // And the content side must promise no authored religious prose.
  assert.match(a.content, /no religious prose/i);
  assert.match(a.content, /Tuhfat al-Atfal/);
  // Every session and stage cites a work the citation registry defines.
  const works = new Set(Object.values(TAJWEED_SOURCES).map((s) => s.work));
  for (const stage of courseDoc.stages) {
    assert.ok(
      works.has(stage.citation.work) ||
        ['jazariyya', 'tuhfat-al-atfal', 'tamhid'].includes(stage.citation.work),
      `${stage.id} cites an unknown work`
    );
    for (const sess of stage.sessions) {
      assert.ok(sess.citation?.work && sess.citation?.lines, `${sess.id} has no locator`);
    }
  }
});
