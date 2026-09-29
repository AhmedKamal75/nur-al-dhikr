/**
 * tajweed-makharij.test.js — the makharij/sifat spreads (v5.17.32)
 *
 * Handoff §8.4: render the 17/16/14 spread, never resolve it. There is no
 * TAJ-09 ruling anywhere in the tree (docs/TRUSTED-SOURCES.md §1c and
 * docs/TAJWEED-RESEARCH-DOSSIER.md §10 both say the ruling is what would
 * unblock a default), so no count may ship as the app's default and every
 * count ships with its authors, its mechanism and its citation.
 *
 * What this pins:
 *   1. the seven spread positions exist in the registry AND the mirror,
 *      all review:contested with a bilingual label and disagreement note;
 *   2. the rendered course shows all three makharij counts with their
 *      attributions and both redistribution mechanisms, in both languages;
 *   3. no lone-17 default anywhere: every new note disclaims a default;
 *   4. spread rows carry no drill button (row, chips, or continue block);
 *   5. the new sessions are reachable by search and counted by progress,
 *      and uncitedSessions() stays empty.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { TAJWEED_SOURCES } from '../js/domain/tajweedSources.js';
import {
  COURSE_STAGES,
  allSessions,
  findSession,
  findStage,
  courseProgress,
  isDrivable,
  searchSessions,
  sessionsForRule,
  stageProgress,
  uncitedSessions,
} from '../js/domain/tajweedCourse.js';
import { renderTajweedCourse } from '../js/views/tajweedCourseView.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const registry = JSON.parse(read('data/tajweed-sources.json'));
const courseDoc = JSON.parse(read('data/tajweed-course.json'));

const MAKHARIJ_IDS = ['makharij_17', 'makharij_16', 'makharij_14'];
const SIFAT_IDS = ['sifat_17', 'sifat_18', 'sifat_20', 'sifat_44'];
const SPREAD_IDS = [...MAKHARIJ_IDS, ...SIFAT_IDS];

function state(lang = 'en', progress = {}, q = '') {
  return {
    settings: { language: lang, tajweedPathMode: 'guided' },
    tajweedCourseProgress: progress,
    activeParams: { q },
  };
}

test('every spread position is contested, bilingual, and mirrored', () => {
  assert.deepEqual(Object.keys(TAJWEED_SOURCES).sort(), Object.keys(registry.rules).sort());
  for (const id of SPREAD_IDS) {
    const entry = registry.rules[id];
    assert.ok(entry, `${id} missing from data/tajweed-sources.json`);
    assert.equal(entry.review, 'contested', `${id} must be review:contested`);
    assert.ok(entry.label?.en && entry.label?.ar, `${id} label is not bilingual`);
    assert.ok(entry.caveat?.en && entry.caveat?.ar, `${id} caveat is not bilingual`);
    assert.ok(entry.work && entry.lines, `${id} has no work+lines locator`);
    assert.ok(registry.works[entry.work], `${id} cites an unknown work`);
    const mod = TAJWEED_SOURCES[id];
    assert.deepEqual(mod.label, entry.label, `${id} label drifted`);
    assert.deepEqual(mod.caveat, entry.caveat, `${id} caveat drifted`);
    assert.equal(mod.review, 'contested', `${id} mirror lost the contested state`);
  }
});

test('no Arabic spread string leaks a Latin word', () => {
  const bad = [];
  for (const id of SPREAD_IDS) {
    for (const key of ['label', 'caveat']) {
      const s = registry.rules[id][key].ar;
      const latin = s.match(/[A-Za-z]{3,}/g);
      if (latin) bad.push(`${id}.${key}: ${latin.join(', ')}`);
    }
  }
  for (const stage of courseDoc.stages.filter((s) => ['makharij', 'sifat'].includes(s.id))) {
    for (const s of [stage.title, stage.why]) {
      const latin = (s.ar.match(/[A-Za-z][A-Za-z0-9.]{2,}/g) || []).filter(
        (w) => !/^(Arabic101)$/.test(w)
      );
      if (latin.length) bad.push(`stage: ${latin.join(', ')}`);
    }
    for (const sess of stage.sessions) {
      const latin = (sess.title.ar.match(/[A-Za-z][A-Za-z0-9.]{2,}/g) || []).filter(
        (w) => !/^(Arabic101)$/.test(w)
      );
      if (latin.length) bad.push(`${sess.id}: ${latin.join(', ')}`);
    }
  }
  assert.deepEqual(bad, [], 'Latin words inside an Arabic spread string');
});

test('the new stages sit before mixed recitation, cited and bilingual', () => {
  for (const id of ['makharij', 'sifat']) {
    const doc = courseDoc.stages.find((s) => s.id === id);
    const mod = findStage(id);
    assert.ok(doc && mod, `${id} stage missing`);
    assert.ok(doc.title?.en && doc.title?.ar && doc.why?.en && doc.why?.ar);
    assert.ok(registry.works[doc.citation.work], `${id} cites an unknown work`);
    assert.ok(doc.citation.lines, `${id} has no locator`);
  }
  const order = Object.fromEntries(COURSE_STAGES.map((s) => [s.id, s.order]));
  assert.ok(order.makharij < order.mixed && order.sifat < order.mixed, 'spreads precede mixed');
  assert.equal(order.mixed, COURSE_STAGES.length, 'mixed recitation is still last');
  assert.equal(COURSE_STAGES[0].id, 'madd', 'the course still opens with madd');
});

test('the render shows all three makharij counts with attributions and both mechanisms', () => {
  const en = renderTajweedCourse(state('en'));
  for (const count of ['17', '16', '14'])
    assert.ok(en.includes(count), `EN missing count ${count}`);
  for (const name of ['Khalil', 'Sibawayh', 'Shatibi', 'Farra', 'Qutrub']) {
    assert.ok(en.includes(name), `EN spread names no ${name}`);
  }
  // Both redistribution mechanisms, in the registry's own words.
  assert.ok(en.includes('keeping al-jawf as a real makhraj'), 'EN missing the 17 mechanism');
  assert.ok(en.includes('alif to the halq'), 'EN missing the 16 redistribution');
  assert.ok(en.includes('one makhraj'), 'EN missing the 14 merge');
  // Review state and citation travel with the row, not just the counts.
  assert.ok(en.includes('Scholars differ'), 'EN spread hides its contested state');
  assert.ok(en.includes('al-Tamhid'), 'EN spread hides its work citation');

  const ar = renderTajweedCourse(state('ar'));
  for (const count of ['١٧', '١٦', '١٤'])
    assert.ok(ar.includes(count), `AR missing count ${count}`);
  for (const name of ['الخليل', 'سيبويه', 'الشاطبي', 'الفراء']) {
    assert.ok(ar.includes(name), `AR spread names no ${name}`);
  }
  assert.ok(ar.includes('إبقاء الجوف'), 'AR missing the 17 mechanism');
  assert.ok(ar.includes('يُسقَط مخرج الجوف'), 'AR missing the 16 redistribution');
  assert.ok(ar.includes('من مخرج واحد'), 'AR missing the 14 merge');
  assert.ok(ar.includes('خلاف بين العلماء'), 'AR spread hides its contested state');
});

test('the render shows the sifat spread with Ibn al-Jazari\u2019s own reason for seventeen', () => {
  const en = renderTajweedCourse(state('en'));
  for (const count of ['18', '20', '44'])
    assert.ok(en.includes(count), `EN missing sifat ${count}`);
  assert.ok(en.includes('like the number of makharij'), 'EN hides why seventeen was chosen');
  const ar = renderTajweedCourse(state('ar'));
  assert.ok(ar.includes('مثل عدد مخارج الحروف'), 'AR hides why seventeen was chosen');
});

test('no lone-17 default: every new note disclaims a default and no default key exists', () => {
  // Checked first because it is the premise of the whole feature: the tree
  // holds no TAJ-09 ruling, so a default would be us resolving the dispute.
  for (const id of SPREAD_IDS) {
    assert.match(
      registry.rules[id].caveat.en,
      /no count is this app's default/i,
      `${id} must disclaim a default in English`
    );
    assert.match(
      registry.rules[id].caveat.ar,
      /ليس أي عدد هو المعتمَد في التطبيق/,
      `${id} must disclaim a default in Arabic`
    );
  }
  const blob = read('data/tajweed-course.json') + read('js/domain/tajweedCourse.js');
  assert.doesNotMatch(blob, /defaultMakhraj|default_makhraj|DEFAULT_MAKHRAJ/i);
  // And the rendered course never shows 17 without its siblings.
  const en = renderTajweedCourse(state('en'));
  const spreadStart = en.indexOf('taj-course__spread');
  assert.ok(spreadStart !== -1, 'no spread branch rendered at all');
});

test('spread rows carry no drill button — row, chips, or continue block', () => {
  const en = renderTajweedCourse(state('en'));
  for (const sessionId of ['makharij-counts', 'sifat-counts']) {
    assert.doesNotMatch(
      en,
      new RegExp(`data-action="tajweed-course-drill" data-session="${sessionId}"`),
      `${sessionId} offers a session drill`
    );
  }
  for (const ruleId of SPREAD_IDS) {
    assert.ok(!en.includes(`data-rule="${ruleId}"`), `${ruleId} offers a rule drill chip`);
  }
  assert.ok(!isDrivable(findSession('makharij-counts')), 'makharij-counts is drivable');
  assert.ok(!isDrivable(findSession('sifat-counts')), 'sifat-counts is drivable');

  // When the ladder reaches a spread session, "continue" studies it —
  // it must not offer to drill it either.
  const before = allSessions().filter(
    (s) => s.stageOrder < findSession('makharij-counts').stageOrder
  );
  const progress = Object.fromEntries(before.map((s) => [s.id, { at: 1 }]));
  const html = renderTajweedCourse(state('en', progress));
  assert.ok(html.includes('data-session="makharij-counts"'), 'continue does not reach the spread');
  assert.doesNotMatch(
    html,
    /data-action="tajweed-course-drill" data-session="makharij-counts"/,
    'continue offers to drill the spread'
  );
});

test('the new sessions are searchable and counted, and nothing is uncited', () => {
  assert.deepEqual(
    uncitedSessions().map((s) => s.id),
    [],
    'a session teaches an uncited rule'
  );
  assert.ok(searchSessions('makharij').some((s) => s.id === 'makharij-counts'));
  assert.ok(searchSessions('makharij').some((s) => s.id === 'makharij-ghunnah'));
  assert.ok(searchSessions('sifat_20').some((s) => s.id === 'sifat-counts'));
  assert.deepEqual(
    sessionsForRule('makharij_16').map((s) => s.id),
    ['makharij-counts']
  );
  assert.deepEqual(stageProgress('makharij', {}), { done: 0, total: 2, ratio: 0 });
  assert.deepEqual(stageProgress('sifat', {}), { done: 0, total: 1, ratio: 0 });
  assert.equal(courseProgress({}).total, allSessions().length);
  assert.equal(allSessions().length, 17);
  // The e2e course spec asserts ikhfa search stays a short list (< 14);
  // the ghunnah/ikhfa session joins it without breaking that contract.
  const ikhfa = searchSessions('ikhfa').map((s) => s.id);
  assert.ok(ikhfa.includes('makharij-ghunnah'), 'ghunnah session is not rule-searchable');
  assert.ok(ikhfa.length < 14, 'ikhfa search outgrew the e2e contract');
});
