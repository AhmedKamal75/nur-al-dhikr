/**
 * tests/missing-data.test.js — merged-plan item 6 (v5.17.53), permanent.
 *
 * ONE honest-absence pattern (js/ui/missingData.js): dashed warm-gray, plain
 * words, calm — never red — bilingual EN+AR, unifying unknown grade /
 * missing translation / missing audio / missing tafsir / missing location /
 * offline-not-downloaded states (rule 6: callers pass a KIND, never strings).
 *
 * What it pins:
 *  1. Pattern render — all six kinds × both languages: the frame classes,
 *     non-empty twinned words, no raw-key leakage, block (p) vs row (span).
 *     Unknown kinds degrade to offline-missing, never a raw key on screen.
 *  2. Calm contract — the pattern's CSS uses the dashed warm-gray tokens
 *     only: no danger/red/error styling anywhere in its rules; AR words
 *     carry no Latin leakage.
 *  3. Call-site migration — the grade-unknown chip hook, the disclosure's
 *     missing-translation row (EN states it, AR stays silent, toggles stay
 *     silent), tafsir empty/remote through the builder (retired keys gone),
 *     prayer no-location + polar hooks, offline row/meter hooks, the audio
 *     surah-missing cell hook, and the loadError/notFound frame hooks.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { t } from '../js/core/i18n.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';
import { MISSING_DATA_KINDS, missingDataKeyFor, missingDataHTML } from '../js/ui/missingData.js';
import { gradeChipHTML, gradeStateOf } from '../js/domain/grades.js';
import { disclosureHTML } from '../js/ui/card.js';
import { loadErrorStateHTML, notFoundStateHTML } from '../js/ui/emptyState.js';

const ROOT = join(import.meta.dirname, '..');
const readProject = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------------ */
/* 1. Pattern render: six kinds × two languages                         */
/* ------------------------------------------------------------------ */

describe('missingData: one pattern for six honest absences', () => {
  test('the kind vocabulary is exactly the six merged-plan states', () => {
    assert.deepEqual(
      [...MISSING_DATA_KINDS],
      [
        'grade-unknown',
        'translation-missing',
        'audio-missing',
        'tafsir-missing',
        'location-missing',
        'offline-missing',
      ]
    );
  });

  test('every kind renders its frame + words in EN and in AR', () => {
    for (const kind of MISSING_DATA_KINDS) {
      for (const lang of ['en', 'ar']) {
        const html = missingDataHTML({ kind, lang, t });
        assert.match(html, /^<p class="missing-data /, `${kind}/${lang}: block tag + frame`);
        assert.ok(
          html.includes(`missing-data--${kind}`),
          `${kind}/${lang}: kind modifier rides along`
        );
        const words = t(`missingData.${kind}`, lang);
        assert.ok(words && words !== `missingData.${kind}`, `${kind}/${lang}: real words`);
        assert.ok(html.includes(words), `${kind}/${lang}: words reach the screen`);
        assert.ok(!html.includes('missingData.'), `${kind}/${lang}: no raw key leaks`);
      }
    }
  });

  test('EN and AR words are genuine translations, not copies', () => {
    for (const kind of MISSING_DATA_KINDS) {
      assert.notEqual(
        ar[`missingData.${kind}`],
        en[`missingData.${kind}`],
        `${kind}: AR is a translation, not a copy`
      );
      assert.match(ar[`missingData.${kind}`], /[؀-ۿ]/u, `${kind}: AR carries Arabic script`);
    }
  });

  test('AR absence words never leak Latin chrome', () => {
    for (const kind of MISSING_DATA_KINDS) {
      assert.ok(
        !/[A-Za-z]/.test(ar[`missingData.${kind}`]),
        `${kind}: no Latin in the AR sentence`
      );
    }
  });

  test('inline rows render a span, blocks a p', () => {
    const span = missingDataHTML({ kind: 'offline-missing', lang: 'en', t, inline: true });
    assert.match(span, /^<span class="missing-data /);
    assert.ok(span.endsWith('</span>'));
    const block = missingDataHTML({ kind: 'offline-missing', lang: 'en', t });
    assert.match(block, /^<p class="missing-data /);
    assert.ok(block.endsWith('</p>'));
  });

  test('hostile kinds degrade to offline-missing — never a raw key', () => {
    for (const bad of [undefined, null, '', 'nope', '__proto__', '<b>x</b>']) {
      const html = missingDataHTML({ kind: bad, lang: 'en', t });
      assert.ok(html.includes('missing-data--offline-missing'), `degrades: ${String(bad)}`);
      assert.ok(!html.includes('missingData.'), 'no raw key leaks');
      assert.ok(!/<b>/.test(html), 'no markup injection through the kind');
    }
    assert.equal(missingDataKeyFor('tafsir-missing'), 'missingData.tafsir-missing');
    assert.equal(missingDataKeyFor('nope'), 'missingData.offline-missing');
  });
});

/* ------------------------------------------------------------------ */
/* 2. Calm contract: dashed warm-gray, never red                        */
/* ------------------------------------------------------------------ */

describe('missingData: calm by construction', () => {
  function missingDataRules() {
    const css = readProject('assets/css/components.css');
    const rules = [...css.matchAll(/(?:^|\n)([^{}\n]*\.missing-data[^{}\n]*)\{([^}]*)\}/g)];
    assert.ok(rules.length >= 5, `expected the pattern rules, found ${rules.length}`);
    return rules;
  }

  test('the frame is dashed warm-gray from existing tokens only', () => {
    const rules = missingDataRules();
    const base = rules.find(([, sel]) => sel.trim() === '.missing-data');
    assert.ok(base, 'a base .missing-data frame exists');
    assert.match(base[2], /dashed/, 'dashed, not solid');
    assert.ok(
      base[2].includes('var(--color-border-strong)'),
      'warm-gray border token, nothing invented'
    );
    assert.ok(!/border-style:\s*solid/.test(base[2]), 'no solid override in the base frame');
  });

  test('no danger/red/error styling anywhere in the pattern rules', () => {
    for (const [sel, body] of missingDataRules()) {
      assert.ok(!/danger/i.test(body), `${sel.trim()}: no danger token`);
      assert.ok(!/#b91c1c/i.test(body), `${sel.trim()}: no danger hex`);
      assert.ok(!/var\(--color-danger/.test(body), `${sel.trim()}: no danger var`);
      assert.ok(!/\berror\b/i.test(body), `${sel.trim()}: no error styling`);
      assert.ok(!/background:\s*red\b/i.test(body), `${sel.trim()}: no red fill`);
    }
  });

  test('the builder emits no alarming words in either language', () => {
    for (const kind of MISSING_DATA_KINDS) {
      for (const lang of ['en', 'ar']) {
        const html = missingDataHTML({ kind, lang, t });
        assert.ok(!/fail|error|wrong|forbidden|prohibited/i.test(html), `${kind}/${lang}: calm`);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* 3. Call-site migration pins                                          */
/* ------------------------------------------------------------------ */

describe('missingData: grade-unknown stays an uncertain chip, on the pattern', () => {
  test('Unknown renders the Unverified chip WITH the pattern hook', () => {
    assert.equal(gradeStateOf('Unknown'), 'unknown');
    const html = gradeChipHTML('Unknown', 'en');
    assert.ok(html.includes('chip--grade-unknown'), 'the uncertain chip survives');
    assert.ok(html.includes('missing-data--grade-unknown'), 'the pattern hook rides along');
    assert.ok(html.includes('Unverified'), 'the honest word survives');
    const arabic = gradeChipHTML('Unknown', 'ar');
    assert.ok(arabic.includes('missing-data--grade-unknown'), 'hook in AR too');
    assert.ok(arabic.includes('غير محقق'), 'the AR word survives');
  });

  test('valid grades never wear the absence frame; gaps render nothing', () => {
    assert.ok(!gradeChipHTML('Sahih', 'en').includes('missing-data'), 'valid ≠ absent');
    assert.equal(gradeChipHTML(null, 'en'), '');
    assert.equal(gradeChipHTML('Almost-Sahih', 'en'), '');
  });
});

describe('missingData: the disclosure states a missing translation (EN only)', () => {
  const NO_TRANSLATION = {
    id: 'md-no-tr',
    arabic: 'سُبْحَانَ اللَّهِ',
    title: { en: 'Glorification', ar: 'تسبيح' },
    virtues: { en: 'A palm tree is planted.', ar: 'تُغرس له نخلة.' },
  };

  test('EN states the absence instead of silently omitting the row', () => {
    const html = disclosureHTML(NO_TRANSLATION, 'en', { prefix: 'card' });
    assert.ok(html.includes('missing-data--translation-missing'), 'pattern hook in the row');
    assert.ok(html.includes('No translation available.'), 'plain EN words');
  });

  test('AR never expects a translation — still silent there', () => {
    const html = disclosureHTML(NO_TRANSLATION, 'ar', { prefix: 'card' });
    assert.ok(!html.includes('missing-data--translation-missing'), 'no EN-shaped gap in AR');
    assert.ok(!html.includes('No translation available.'), 'no English in AR chrome');
    assert.ok(html.includes('تُغرس له نخلة.'), 'the Arabic virtue still rows');
  });

  test('toggle-off stays silent: a hidden field is a choice, not a gap', () => {
    const html = disclosureHTML(NO_TRANSLATION, 'en', {
      showTransliteration: false,
      showTranslation: false,
      showVirtues: false,
      showGrade: false,
    });
    assert.equal(html, '', 'hidden fields leave no hollow disclosure');
  });
});

describe('missingData: tafsir empties + remote downloads share one source', () => {
  test('empty ayahs (primary tab + compare slot) render the builder', async () => {
    const { buildTafsirPanel } = await import('../js/views/tafsirPanel.js');
    const { readFileSync: read } = await import('node:fs');
    const { join: joinPath } = await import('node:path');
    const { DEFAULT_SETTINGS } = await import('../js/core/config.js');
    const root = joinPath(import.meta.dirname, '..');
    const editions = JSON.parse(read(joinPath(root, 'data/tafsir-editions.json'), 'utf8'));
    const state = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      tafsirEditions: editions,
      tafsir: { muyassar: { 1: {} } },
    };
    const primary = buildTafsirPanel(state, 1, 1, 'muyassar');
    assert.ok(primary.includes('missing-data--tafsir-missing'), 'primary empty ayah');
    assert.ok(primary.includes('This source has no commentary for this ayah.'), 'kept sentence');
    assert.ok(!primary.includes('tafsir-panel__empty'), 'no parallel ad-hoc class left');
  });

  test('uncached remote editions pair the pattern with the kept download action', async () => {
    const { buildTafsirPanel } = await import('../js/views/tafsirPanel.js');
    const { readFileSync: read } = await import('node:fs');
    const { join: joinPath } = await import('node:path');
    const { DEFAULT_SETTINGS } = await import('../js/core/config.js');
    const root = joinPath(import.meta.dirname, '..');
    const editions = JSON.parse(read(joinPath(root, 'data/tafsir-editions.json'), 'utf8'));
    const state = {
      settings: { ...DEFAULT_SETTINGS, language: 'en' },
      tafsirEditions: editions,
      tafsir: {},
    };
    const html = buildTafsirPanel(state, 1, 1, 'ibn-kathir');
    assert.ok(html.includes('missing-data--offline-missing'), 'remote = not downloaded');
    assert.ok(html.includes('data-action="tafsir-download"'), 'the download action survives');
    assert.ok(html.includes('Not downloaded'), 'single-source words');
  });

  test('rule 6: the retired ad-hoc keys are gone from the panel source', () => {
    const src = readProject('js/views/tafsirPanel.js');
    assert.ok(!src.includes('tafsir.emptyAyah'), 'no parallel empty-ayah string');
    assert.ok(!src.includes('tafsir.remoteHint'), 'no parallel remote string');
    assert.ok(src.includes('missingDataHTML'), 'the single source serves the panel');
    assert.ok(!('tafsir.emptyAyah' in en), 'EN key retired');
    assert.ok(!('tafsir.remoteHint' in en), 'EN remote key retired');
    assert.ok(!('tafsir.emptyAyah' in ar), 'AR key retired');
    assert.ok(!('tafsir.remoteHint' in ar), 'AR remote key retired');
  });
});

describe('missingData: prayer, offline, audio and frame hooks', () => {
  test('prayer no-location states the gap through the shared words + frame', async () => {
    const { renderPrayer } = await import('../js/views/prayer.js');
    const { initialState } = await import('../js/core/state/initial.js');
    const base = initialState();
    const state = {
      ...base,
      settings: {
        ...base.settings,
        language: 'en',
        prayer: { ...base.settings.prayer, latitude: null, longitude: null },
      },
      dailyChecklist: {},
    };
    const html = renderPrayer(state);
    assert.ok(html.includes('missing-data--location-missing'), 'frame hook on the empty state');
    assert.ok(html.includes(en['missingData.location-missing']), 'single-source words');
    assert.ok(html.includes(en['prayer.chooseCity']), 'the city guidance is kept, not lost');
  });

  test('rule 6: prayer + offline + audio sources carry the hooks, not parallel markup', () => {
    const prayer = readProject('js/views/prayer.js');
    assert.ok(prayer.includes('missing-data--location-missing'), 'polar + empty hooks');
    assert.ok(prayer.includes("t('prayer.polarNote'"), 'polar words stay exact');
    const offline = readProject('js/views/offline.js');
    assert.ok(offline.includes('missing-data--offline-missing'), 'row + meter hooks');
    const audio = readProject('js/views/audioManager.js');
    assert.ok(audio.includes('missing-data--audio-missing'), 'surah-cell hook');
    const grades = readProject('js/domain/grades.js');
    assert.ok(grades.includes('missing-data--grade-unknown'), 'chip hook');
    const card = readProject('js/ui/card.js');
    assert.ok(card.includes("kind: 'translation-missing'"), 'disclosure kind call');
  });

  test('offline idle view marks not-downloaded rows + the unknown meter', async () => {
    const { renderOffline } = await import('../js/views/offline.js');
    const { initialState } = await import('../js/core/state/initial.js');
    const base = initialState();
    const state = {
      ...base,
      settings: { ...base.settings, language: 'en', offline: {} },
      offlineJobs: {
        running: false,
        group: null,
        done: 0,
        total: 0,
        failed: 0,
        quota: null,
      },
    };
    const html = renderOffline(state);
    assert.ok(html.includes('missing-data--offline-missing'), 'hooks present');
    assert.ok(html.includes(en['offline.notDownloaded']), 'row words kept');
    assert.ok(html.includes(en['offline.storageUnknown']), 'meter words kept');
  });

  test('audio surah-missing cells wear the pattern without losing their reason', async () => {
    const { renderAudio } = await import('../js/views/audioManager.js');
    const { markSurahMissing, _resetAvailabilityForTests } =
      await import('../js/services/moshafAvailability.js');
    _resetAvailabilityForTests();
    markSurahMissing('custom-a', 5);
    const customs = [
      { id: 'custom-a', nameEn: 'My Sheikh', nameAr: 'شيخي', rewaya: '', server: 'https://a/' },
    ];
    const state = {
      settings: {
        language: 'en',
        reciter: 'ar.alafasy',
        customReciters: customs,
        audio: { moshafId: 'custom-a' },
      },
      audioManager: { catalogReady: true },
      audioDownloads: {},
      audioDownloading: {},
      quran: {},
      loadErrors: {},
    };
    const html = renderAudio(state);
    assert.ok(html.includes('missing-data--audio-missing'), 'cell hook present');
    assert.ok(html.includes(en['audio.surahUnavailable']), 'reciter-specific reason kept');
    _resetAvailabilityForTests();
  });

  test('loadError + notFound keep their actions inside the shared frame', () => {
    const failed = loadErrorStateHTML({ lang: 'en', tierKey: 'library', t });
    assert.ok(failed.includes('missing-data--offline-missing'), 'load frame hook');
    assert.ok(failed.includes('data-action="retry-load"'), 'Retry survives');
    const arFailed = loadErrorStateHTML({ lang: 'ar', tierKey: 'library', t });
    assert.ok(arFailed.includes(ar['common.loadFailed']), 'AR words, no leak');
    const lost = notFoundStateHTML({ title: 'Gone', lang: 'en', t });
    assert.ok(lost.includes('missing-data'), 'dead-end frame hook');
    assert.ok(lost.includes('data-action="navigate"'), 'Go home survives');
  });
});
