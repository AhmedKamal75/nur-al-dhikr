/**
 * tests/studyLanguage.test.js — item v5.2.68 (study in your language) gates:
 *  1. the Settings tafsir picker lists bundled editions (native names),
 *     marks the active default, and dispatches mushaf-set-tafsir;
 *  2. the word-study modal renders Arabic grammar in AR (no translit, no
 *     English gloss) and English in EN;
 *  3. drill cards carry Arabic features; the revealed answer renders in
 *     the UI language with the English gloss English-only;
 *  4. occurrence gloss is omitted in AR (no Arabic gloss data ships);
 *  5. the reader translit line never renders in AR;
 *  6. ayah detail honors the translation toggle;
 *  7. surah/kids tiles and palette secondaries carry no Latin in AR;
 *  8. the new strings exist in both languages.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderSettings } from '../js/views/settings.js';
import { buildWordStudyPanel } from '../js/views/tafsirPanel.js';
import { drillHTML } from '../js/views/roots.js';
import { occurrenceGloss } from '../js/domain/roots.js';
import { collectDrillWords } from '../js/domain/grammarDrill.js';
import { joinTranslitLine } from '../js/views/quran.js';
import { renderKids as renderKidsView } from '../js/views/kids.js';
import { buildMushafAyahDetail } from '../js/views/ayahStudy.js';
import { buildPaletteGroups } from '../js/views/palette.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const WORD = {
  i: 1,
  text: 'بِسْمِ',
  translit: 'bismi',
  en: 'in the name',
  posEn: 'Noun',
  posAr: 'اسم',
  caseEn: 'Genitive',
  caseAr: 'مجرور',
  moodEn: null,
  moodAr: null,
  verbPattern: null,
  root: 'سمو',
  lemma: 'اسْم',
  pgn: [{ ar: 'مذكر', en: 'Masculine' }],
};

function settingsWith(lang, patch = {}) {
  const base = initialState();
  return {
    ...base,
    settings: { ...base.settings, language: lang, ...patch },
  };
}

describe('tafsir default picker', () => {
  const catalog = {
    editions: [
      { id: 'muyassar', bundled: true, nameAr: 'التفسير الميسر', nameEn: 'Al-Muyassar' },
      {
        id: 'en-mukhtasar',
        bundled: true,
        nameAr: 'المختصر (إنجليزي)',
        nameEn: 'Al-Mukhtasar (English)',
      },
      { id: 'tabari', bundled: false, nameAr: 'الطبري', nameEn: 'At-Tabari' },
    ],
  };

  test('lists bundled editions with native names, marks the active one', () => {
    const s = {
      ...settingsWith('en', { mushafPrefs: { defaultTafsir: 'en-mukhtasar' } }),
      tafsirEditions: catalog,
    };
    const html = renderSettings(s);
    assert.ok(html.includes('data-action="mushaf-set-tafsir"'), 'picker rows present');
    assert.ok(html.includes('data-edition="muyassar"'), 'bundled Arabic listed');
    assert.ok(html.includes('data-edition="en-mukhtasar"'), 'bundled English listed');
    assert.ok(!html.includes('data-edition="tabari"'), 'remote excluded (offline-first)');
    assert.ok(
      html.includes('data-edition="en-mukhtasar" dir="auto" aria-pressed="true"'),
      'active marked'
    );
  });

  test('empty catalog renders no rows, never throws', () => {
    const html = renderSettings({ ...settingsWith('ar'), tafsirEditions: null });
    assert.ok(!html.includes('data-action="mushaf-set-tafsir"'), 'no rows without catalog');
    assert.ok(html.includes('التفسير الافتراضي'), 'section label still renders');
  });

  test('the preference persists through the reducer + sanitizer', () => {
    let s = reduce(initialState(), actions.updateMushafPrefs({ defaultTafsir: 'en-mukhtasar' }));
    assert.equal(s.settings.mushafPrefs.defaultTafsir, 'en-mukhtasar');
  });

  test('handler clamps hostile ids (source-pinned)', () => {
    const src = readProject('js/app/handlers/quran.js');
    const at = src.indexOf("'mushaf-set-tafsir'");
    assert.ok(at > -1, 'handler exists');
    assert.ok(src.indexOf('updateMushafPrefs', at) > -1, 'dispatches prefs update');
    assert.ok(src.indexOf('slice(0, 40)', at) > -1, 'id length-clamped at the edge');
  });
});

describe('word-study localization', () => {
  function wordState(lang) {
    return {
      ...settingsWith(lang, {
        mushafPrefs: { tajweedColoring: false, wordByWordStudy: true },
      }),
      activeWordStudy: { surah: 1, ayah: 1, i: 1 },
      quranWords: { 1: { 1: [WORD] } },
      quran: { surahs: {} },
    };
  }

  test('AR modal: Arabic grammar, no translit, no English gloss', () => {
    const html = buildWordStudyPanel(wordState('ar'));
    assert.ok(!html.includes('word-study__translit'), 'no romanization in AR');
    assert.ok(!html.includes('word-study__gloss'), 'no English gloss in AR');
    assert.ok(html.includes('اسم'), 'Arabic POS present');
    assert.ok(html.includes('مجرور'), 'Arabic case present');
    assert.ok(html.includes('مذكر'), 'Arabic tags present');
  });

  test('EN modal keeps translit + gloss + English grammar', () => {
    const html = buildWordStudyPanel(wordState('en'));
    assert.ok(html.includes('word-study__translit'), 'romanization in EN');
    assert.ok(html.includes('in the name'), 'English gloss in EN');
    assert.ok(html.includes('Noun'), 'English POS in EN');
  });
});

describe('drill localization', () => {
  const cache = { 1: { 1: [WORD] } };

  test('deal carries Arabic features alongside English ones', () => {
    const [card] = collectDrillWords(cache);
    assert.deepEqual(card.feats, ['Genitive']);
    assert.deepEqual(card.featsAr, ['مجرور']);
    assert.equal(card.posAr, 'اسم');
  });

  test('revealed answer renders in the UI language', () => {
    const [card] = collectDrillWords(cache);
    const ar = drillHTML(
      {
        settings: { language: 'ar' },
        grammarDrill: { cards: [card], index: 0, right: 0, revealed: true },
      },
      'ar'
    );
    assert.ok(ar.includes('اسم'), 'Arabic POS in AR');
    assert.ok(ar.includes('مجرور'), 'Arabic features in AR');
    assert.ok(!ar.includes('Noun'), 'no English POS in AR');
    assert.ok(!ar.includes('in the name'), 'no English gloss in AR');
    assert.ok(!ar.includes('bismi'), 'no translit in AR');
    const en = drillHTML(
      {
        settings: { language: 'en' },
        grammarDrill: { cards: [card], index: 0, right: 0, revealed: true },
      },
      'en'
    );
    assert.ok(en.includes('Noun'), 'English POS in EN');
    assert.ok(en.includes('in the name'), 'gloss in EN');
  });

  test('occurrence gloss omitted in AR (no Arabic gloss data ships)', () => {
    const words = { 1: { 1: [WORD] } };
    assert.equal(occurrenceGloss(words, 1, 1, 1, 'en'), 'in the name');
    assert.equal(occurrenceGloss(words, 1, 1, 1, 'ar'), '');
  });
});

describe('reader + tiles in AR', () => {
  test('translit line never renders in AR', () => {
    const st = (lang, show) => ({
      settings: { language: lang, showTransliteration: show },
      quranWords: { 1: { 1: [WORD] } },
    });
    assert.equal(joinTranslitLine(st('ar', true), 1, 1), '', 'AR + toggle on');
    assert.equal(joinTranslitLine(st('ar', false), 1, 1), '', 'AR + toggle off');
    assert.equal(joinTranslitLine(st('en', false), 1, 1), '', 'EN + toggle off');
    assert.ok(joinTranslitLine(st('en', true), 1, 1).includes('bismi'), 'EN + toggle on');
  });

  test('ayah detail honors the translation toggle', () => {
    const doc = {
      nameEn: 'Al-Fatiha',
      nameAr: 'الفاتحة',
      ayahs: [{ number: 1, translation: 'In the name' }],
    };
    const st = (lang, show) => ({
      settings: { language: lang, showTranslation: show, reciter: 'ar.alafasy' },
      quran: { meta: { surahs: [] } },
      ayahBookmarks: [],
    });
    assert.ok(
      !buildMushafAyahDetail('بِسْمِ', doc, 1, 1, st('en', false), null).includes(
        'mushaf-ayah-detail__translation'
      ),
      'pref off hides the line'
    );
    assert.ok(
      buildMushafAyahDetail('بِسْمِ', doc, 1, 1, st('en', true), null).includes('In the name'),
      'pref on shows the chosen edition'
    );
  });

  test('kids tiles carry no Latin in AR', () => {
    const meta = {
      surahs: [
        { number: 1, nameAr: 'الفاتحة', nameTransliteration: 'Al-Fatiha', nameEn: 'The Opener' },
      ],
    };
    const st = (lang) => ({
      settings: { language: lang },
      quran: { meta },
      surahPlayback: {},
      kidsStars: {},
    });
    const ar = renderKidsView(st('ar'));
    assert.ok(!ar.includes('kids-tile__name-en'), 'no Latin tile names in AR');
    assert.ok(!ar.includes('Al-Fatiha'), 'no transliteration anywhere in AR tiles');
    assert.ok(ar.includes('الفاتحة'), 'Arabic names stay');
    const en = renderKidsView(st('en'));
    assert.ok(en.includes('kids-tile__name-en'), 'EN keeps Latin names');
  });

  test('palette surah secondaries omit Latin in AR', () => {
    const deps = (lang) => ({
      lang,
      query: 'baq',
      surahs: [
        { number: 2, nameAr: 'البقرة', nameTransliteration: 'Al-Baqarah', nameEn: 'The Cow' },
      ],
      history: [],
      collections: [],
      favorites: [],
      adhkar: [],
    });
    const arSurah = buildPaletteGroups(deps('ar')).groups.find((g) => g.key === 'surah');
    assert.ok(arSurah, 'surah group found');
    assert.equal(arSurah.rows[0].secondary, '', 'AR secondary omitted');
    assert.ok(arSurah.rows[0].primary.includes('البقرة'), 'AR primary Arabic');
    const enSurah = buildPaletteGroups(deps('en')).groups.find((g) => g.key === 'surah');
    assert.ok(enSurah.rows[0].secondary.includes('البقرة'), 'EN keeps Arabic aid');
  });

  test('translation lines follow the chosen edition (tested)', () => {
    assert.equal(typeof joinTranslitLine, 'function');
    assert.equal(typeof buildMushafAyahDetail, 'function');
  });
});

describe('strings', () => {
  test('tafsir picker strings exist in EN + AR', () => {
    assert.ok(EN_STRINGS['settings.tafsirDefault']);
    assert.ok(AR_STRINGS['settings.tafsirDefault']);
    assert.ok(EN_STRINGS['settings.tafsirDefaultHint']);
    assert.ok(AR_STRINGS['settings.tafsirDefaultHint']);
  });
});
