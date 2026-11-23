import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAJWEED_SITES } from '../js/domain/tajweedSites.js';
import {
  classifyAyahTajweed,
  classifyConventionAyah,
  wordUnits,
  effectiveRuleColor,
  tajweedRule,
  canonicalWordTokens,
} from '../js/domain/tajweed.js';
import {
  buildAnswerKey,
  buildWordAnswerKey,
  buildClassifyQuestion,
  firstWeakRuleForAyah,
  statsForConvention,
} from '../js/domain/tajweedPractice.js';
import { buildPracticePicker } from '../js/views/tajweedPracticeView.js';
import { buildTajweedSettingsPanel } from '../js/views/tajweedSettings.js';
import { renderAyahWords, buildWordStudyPanel } from '../js/views/tafsirPanel.js';
import { sanitizeSettings } from '../js/core/config.js';
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const ids = ['idgham_mutajanisayn', 'idgham_mutaqaribayn'];
const doc = (s) => read(`data/quran/${s}.json`);
const textOf = (s, a) => doc(s).ayahs.find((v) => v.number === a).text;
function state(convention) {
  return {
    settings: { language: 'en', tajweedConvention: convention, tajweedPrefs: {}, mushafPrefs: {} },
    quran: { surahs: { 2: doc(2) } },
    quranWords: null,
    tajweedPracticeStats: {
      totalAttempts: 5,
      byRule: { idgham_mutajanisayn: { attempts: 5, correct: 5 } },
    },
    tajweedMissRecords: { idgham_mutajanisayn: { m: 3, l: '2026-11-23' } },
  };
}

test('overlay spans always match tappable units, baseline memo is unchanged', () => {
  for (const site of TAJWEED_SITES.sites.filter((s) => s.ref !== '11:42')) {
    const text = textOf(site.surah, site.ayah);
    const baseline = classifyAyahTajweed(text);
    const snapshot = JSON.stringify(baseline);
    const context = { surah: site.surah, ayah: site.ayah, convention: 'lpmq' };
    const key = buildAnswerKey(text, site.rule, context);
    assert.ok(key.length, site.ref);
    for (const hit of key) {
      assert.ok(
        wordUnits(baseline[hit.word - 1].word).some(
          (u) => u.start === hit.start && u.end === hit.end
        ),
        site.ref
      );
    }
    assert.ok(buildWordAnswerKey(text, site.rule, context).length);
    assert.equal(JSON.stringify(baseline), snapshot);
    assert.strictEqual(
      classifyConventionAyah(text, { ...context, convention: 'dar-al-maarifah' }),
      baseline
    );
    assert.deepEqual(
      buildAnswerKey(text, site.rule, { ...context, convention: 'dar-al-maarifah' }),
      []
    );
  }
});

test('DAM hides inactive rules from settings, practice, review and scoped totals', () => {
  const dam = state('dar-al-maarifah');
  for (const html of [buildPracticePicker(dam), buildTajweedSettingsPanel(dam)]) {
    for (const id of ids) assert.ok(!html.includes(`data-rule="${id}"`));
  }
  const text = textOf(2, 233);
  assert.equal(
    firstWeakRuleForAyah(text, ids, { surah: 2, ayah: 233, convention: 'dar-al-maarifah' }),
    null
  );
  assert.equal(statsForConvention(dam.tajweedPracticeStats, 'dar-al-maarifah').totalAttempts, 0);
  assert.equal(statsForConvention(dam.tajweedPracticeStats, 'lpmq').totalAttempts, 5);
  const q = buildClassifyQuestion(text, { surah: 2, ayah: 233, convention: 'dar-al-maarifah' });
  assert.ok(q && !q.options.some((id) => ids.includes(id)));
  const targeted = buildClassifyQuestion(text, {
    surah: 2,
    ayah: 233,
    convention: 'lpmq',
    targetRuleId: ids[0],
  });
  assert.equal(targeted.correctAnswer, ids[0]);
  assert.equal(targeted.evidenceLevel, 'rule-level-cited; per-site visual Unknown');
  assert.ok(targeted.target && targeted.target.end > targeted.target.start);
});

test('both readers share exact-byte text and overlay; canonical inspector finds raw site', () => {
  const text = textOf(2, 233);
  const html = renderAyahWords(text, null, 2, 233, {
    tajweed: true,
    prefs: { convention: 'lpmq' },
  });
  assert.ok(html.includes('tajweed--idgham_mutajanisayn'));
  const site = TAJWEED_SITES.sites[0];
  const hit = buildAnswerKey(text, site.rule, { surah: 2, ayah: 233, convention: 'lpmq' })[0];
  const index = canonicalWordTokens(text).findIndex((w) => w.rawIndex === hit.word - 1) + 1;
  const st = state('lpmq');
  st.activeWordStudy = { surah: 2, ayah: 233, i: index };
  assert.ok(buildWordStudyPanel(st).includes('Idgham Mutajanisayn'));
});

test('stable rule-ID colors override legacy family picks and survive convention switches', () => {
  const tajweedPrefs = {
    colors: { assimilation: '#ff9800', idgham_mutajanisayn: '#123456' },
    rules: { idgham_mutajanisayn: false },
  };
  for (const tajweedConvention of ['lpmq', 'dar-al-maarifah', 'lpmq']) {
    const settings = sanitizeSettings({ tajweedPrefs, tajweedConvention });
    assert.deepEqual(settings.tajweedPrefs, tajweedPrefs);
    assert.equal(effectiveRuleColor(settings.tajweedPrefs, tajweedRule(ids[0])), '#123456');
  }
});
