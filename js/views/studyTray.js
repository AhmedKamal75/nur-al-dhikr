/**
 * views/studyTray.js — (v5.17.54, merged-plan item 7) the inline Qur'an
 * study tray.
 *
 * Tapping an ayah's Study control renders the SAME study panel inline UNDER
 * the tapped ayah row — Arabic, edition-labelled translation, word chips
 * with lemma/root/grammar detail, and the shared tabbed tafsir panel —
 * instead of a modal. The modal path (tafsir-open / mushaf-ayah-tap /
 * word-tap with no tray) is untouched: this module only ADDS the inline
 * surface, sharing every builder with the modal so the two can never drift
 * (rule 6):
 *
 *   - tafsir tabs, authors, compare slots, download actions and their
 *     missing-data states ride buildAyahStudyExtras verbatim;
 *   - the word sources block rides wordSourcesHTML verbatim;
 *   - missing translation/tafsir speak through the ONE missing-data
 *     pattern (merged-plan item 6): EN states the absence, AR stays
 *     silent, toggles stay silent — the disclosure rule, not a new one.
 *
 * Translation is never visually equal to the Uthmani text: the Arabic rides
 * the large Arabic typeface while the translation rides the small secondary
 * class (see assets/css/quran.css). No gamification anywhere — plain
 * stated progress, never celebrated.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { TRANSLATION_EDITIONS, VIEWS } from '../core/config.js';
import { buildHash } from '../core/router.js';
import { mergeStudyContextParams } from './studyContext.js';
import { resolveCompareTexts } from '../domain/translationCompare.js';
import {
  getWord,
  wordGrammarSummary,
  wordDetailTags,
  wordIrabLine,
  rootOccurrences,
  rootStudyEntryFor,
  dictEntryFor,
  materializeWordStudy,
} from '../domain/wordStudy.js';
import { buildAyahStudyExtras, wordSourcesHTML } from './tafsirPanel.js';
import { missingDataHTML } from '../ui/missingData.js';
import { skeletonLines } from '../ui/skeleton.js';

/**
 * Canonical "surah:ayah" key of the open tray, or null on hostile input.
 * Both readers gate their inline render on this — a crafted value never
 * reaches the template interpolations.
 */
export function studyTrayKey(state) {
  const tray = state?.studyTray;
  if (!tray || typeof tray !== 'object') return null;
  const s = Math.floor(Number(tray.surah));
  const a = Math.floor(Number(tray.ayah));
  if (!(s >= 1 && s <= 114 && a >= 1 && a <= 286)) return null;
  return `${s}:${a}`;
}

/** True when this exact ayah row carries the open tray. */
export function isStudyTrayOpen(state, surah, ayah) {
  const key = studyTrayKey(state);
  return key != null && key === `${Math.floor(Number(surah))}:${Math.floor(Number(ayah))}`;
}

/** Canonical selected word index inside the open tray, or null. */
function trayWordIndex(state) {
  const w = state?.studyTray?.word;
  if (w == null || w === '') return null;
  const n = Math.floor(Number(w));
  return n >= 1 ? n : null;
}

function editionOf(state) {
  const id = state?.settings?.quranTranslation || 'en-sahih';
  return TRANSLATION_EDITIONS.find((e) => e.id === id) || TRANSLATION_EDITIONS[0];
}

function translationBlock(state, lang, surah, ayah, ayahDoc) {
  const show = state?.settings?.showTranslation === true;
  const cmps = show ? resolveCompareTexts(state, TRANSLATION_EDITIONS, surah, ayah) : [];
  const cmpHTML = cmps
    .map(
      (cmp) =>
        `<p class="study-tray__translation study-tray__translation--compare" dir="${cmp.edition.dir === 'rtl' ? 'rtl' : 'auto'}" lang="${cmp.lang}"><span class="ayah-card__compare-label">${escapeHTML(cmp.edition.native)}</span> ${escapeHTML(cmp.text)}</p>`
    )
    .join('');
  // Strict AR separation (the disclosure rule): AR chrome never carries a
  // translation line and never states its absence — it stays silent.
  if (lang === 'ar') return cmpHTML;
  if (ayahDoc?.translation) {
    const ed = editionOf(state);
    const editionLabel = `${ed.native} — ${ed.author}`;
    return `<p class="study-tray__edition">${escapeHTML(t('study.trayTranslation', lang, { edition: editionLabel }))}</p><p class="study-tray__translation" dir="auto">${escapeHTML(ayahDoc.translation)}</p>${cmpHTML}`;
  }
  if (!show) return cmpHTML;
  return `${missingDataHTML({ kind: 'translation-missing', lang, t })}${cmpHTML}`;
}

function wordChipsRow(state, lang, surah, ayah, words) {
  const selected = trayWordIndex(state);
  const chips = words
    .map((w) => {
      const on = selected === Number(w.i);
      const gloss = wordGrammarSummary(w, lang);
      return `<button type="button" class="chip${on ? ' chip--active' : ''}" data-action="study-tray-word" data-surah="${surah}" data-ayah="${ayah}" data-i="${w.i}" data-surface="${escapeHTML(w.text || '')}" aria-pressed="${on}" aria-label="${escapeHTML(w.text || '')}${gloss ? ` — ${escapeHTML(gloss)}` : ''}"><span dir="rtl" lang="ar">${escapeHTML(w.text || '')}</span>${gloss ? `<span class="study-tray__chip-gloss">${escapeHTML(gloss)}</span>` : ''}</button>`;
    })
    .join('');
  return `
    <p class="study-tray__words-label">${escapeHTML(t('study.trayWords', lang))}</p>
    <div class="study-tray__words" role="group" aria-label="${escapeHTML(t('study.trayWords', lang))}">${chips}</div>`;
}

function selectedWordDetail(state, lang, surah, ayah) {
  const i = trayWordIndex(state);
  if (i == null) return '';
  const surface =
    typeof state?.studyTray?.surface === 'string' && state.studyTray.surface
      ? state.studyTray.surface
      : null;
  const word = getWord(state?.quranWords, surah, ayah, i, surface);
  if (!word) return `<p class="empty-hint">${escapeHTML(t('wordStudy.noData', lang))}</p>`;
  const dict = dictEntryFor(state.wordDict, word.lemma);
  const rootMeaning = rootStudyEntryFor(state.rootsMeaning, word.root);
  const study = materializeWordStudy(word, word.study, dict, rootMeaning);
  const { count } = rootOccurrences(state.quranRoots, word.root, surah, ayah, 8);
  const lemmaChip = word.lemma
    ? `<span class="chip chip--basis chip--sm" dir="rtl" lang="ar">${escapeHTML(word.lemma)}</span>`
    : '';
  const rootChip = word.root
    ? `<span class="chip chip--basis chip--sm" dir="rtl" lang="ar">${escapeHTML(word.root)} · ${escapeHTML(t('wordStudy.rootCount', lang, { n: count }))}</span>`
    : `<span class="chip chip--basis chip--sm">${escapeHTML(t('wordStudy.rootNotApplicable', lang))}</span>`;
  const grammar = wordGrammarSummary(word, lang);
  const grammarChip = grammar
    ? `<span class="chip chip--basis chip--sm">${escapeHTML(grammar)}</span>`
    : '';
  const irabLine = word.study?.irab?.[lang === 'ar' ? 'ar' : 'en'] || wordIrabLine(word, lang);
  const tags = wordDetailTags(word, lang);
  return `
    <div class="study-tray__word-detail">
      <div class="study-tray__word-chips" role="group" aria-label="${escapeHTML(t('wordStudy.wordN', lang, { n: i }))}">
        ${lemmaChip}${rootChip}${grammarChip}
      </div>
      ${dict?.ar ? `<p class="study-tray__word-ar" dir="rtl" lang="ar">${escapeHTML(dict.ar)}</p>` : ''}
      ${dict?.en || word.en ? `<p class="study-tray__word-en" dir="ltr" lang="en">${escapeHTML(dict?.en || word.en || '')}</p>` : ''}
      ${irabLine ? `<p class="study-tray__word-irab">${escapeHTML(irabLine)}</p>` : ''}
      ${tags.length ? `<div class="study-tray__word-tags">${tags.map((tag) => `<span class="chip chip--basis chip--sm">${escapeHTML(tag)}</span>`).join('')}</div>` : ''}
      ${wordSourcesHTML(study, lang)}
      <div class="study-tray__word-actions">
        <button type="button" class="btn btn--secondary btn--sm" data-action="word-study-from-tray" data-surah="${surah}" data-ayah="${ayah}" data-i="${i}" data-surface="${escapeHTML(surface || word.text || '')}">
          ${icon('search', { size: 14 })} ${escapeHTML(t('wordStudy.open', lang))}
        </button>
      </div>
    </div>`;
}

function studyJourneyHTML(state, lang, surah, ayah) {
  const i = trayWordIndex(state);
  const surface =
    typeof state?.studyTray?.surface === 'string' && state.studyTray.surface
      ? state.studyTray.surface
      : null;
  const selected = i == null ? null : getWord(state?.quranWords, surah, ayah, i, surface);
  const root = selected?.root ? String(selected.root).trim() : '';
  const links = [
    {
      key: 'study.journeyTafsir',
      iconName: 'book',
      action: 'tafsir-open',
      attrs: `data-surah="${surah}" data-ayah="${ayah}"`,
    },
    ...(root
      ? [
          {
            key: 'study.journeyRoot',
            iconName: 'search',
            href: buildHash(VIEWS.ROOTS, mergeStudyContextParams({ id: root }, state)),
            attrs: `data-view="${VIEWS.ROOTS}" data-id="${escapeHTML(root)}"`,
          },
        ]
      : []),
    {
      key: 'study.journeyTajweed',
      iconName: 'sparkle',
      href: buildHash(VIEWS.TAJWEED_COURSE, mergeStudyContextParams({}, state)),
      attrs: `data-view="${VIEWS.TAJWEED_COURSE}"`,
    },
    {
      key: 'study.journeyMemorize',
      iconName: 'target',
      href: buildHash(VIEWS.QURAN, {
        id: surah,
        ay: String(ayah),
        mem: '1',
        ...mergeStudyContextParams({}, state),
      }),
      attrs: `data-view="${VIEWS.QURAN}" data-id="${surah}" data-ay="${ayah}" data-mem="1"`,
    },
    {
      key: 'study.journeyMutashabihat',
      iconName: 'quran',
      href: buildHash(VIEWS.MUTASHABIHAT, mergeStudyContextParams({}, state)),
      attrs: `data-view="${VIEWS.MUTASHABIHAT}"`,
    },
  ];
  return `
    <div class="study-tray__journey">
      <p class="study-tray__journey-label">${escapeHTML(t('study.journeyTitle', lang))}</p>
      <div class="study-tray__journey-links" role="group" aria-label="${escapeHTML(t('study.journeyTitle', lang))}">
        ${links
          .map((item) => {
            if (item.href) {
              return `<a class="study-tray__journey-link" href="${item.href}" data-action="navigate" ${item.attrs}>${icon(item.iconName, { size: 14 })}<span>${escapeHTML(t(item.key, lang))}</span></a>`;
            }
            return `<button type="button" class="study-tray__journey-link" data-action="${item.action}" ${item.attrs}>${icon(item.iconName, { size: 14 })}<span>${escapeHTML(t(item.key, lang))}</span></button>`;
          })
          .join('')}
      </div>
    </div>`;
}

/**
 * The inline panel for one ayah row. `arabicText` is the row's own Uthmani
 * text (the classic card and the mushaf page both have it on hand); the
 * loaded surah doc is the fallback, a skeleton the last resort — never a
 * blank panel pretending to be empty.
 */
export function buildStudyTray(state, surahNumber, ayahNumber, arabicText = null) {
  const lang = state?.settings?.language || 'en';
  const surah = Math.floor(Number(surahNumber));
  const ayah = Math.floor(Number(ayahNumber));
  if (!(surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 286)) return '';
  const key = `${surah}:${ayah}`;
  const surahDoc = state?.quran?.surahs?.[String(surah)];
  const ayahDoc = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayah));
  const arabic = arabicText || ayahDoc?.text || '';
  const words = state?.quranWords?.[String(surah)]?.[String(ayah)];
  const wordsBlock =
    Array.isArray(words) && words.length
      ? `${wordChipsRow(state, lang, surah, ayah, words)}${selectedWordDetail(state, lang, surah, ayah)}`
      : `<p class="empty-hint">${escapeHTML(t(state?.quranWords?.[String(surah)] ? 'wordStudy.noData' : 'wordStudy.loadingHint', lang))}</p>`;
  return `
  <section class="study-tray" data-study-tray="${key}" aria-label="${escapeHTML(t('study.trayTitle', lang))} ${key}">
    <div class="study-tray__head">
      <div>
        <p class="study-tray__kicker">${escapeHTML(t('study.title', lang))}</p>
        <h3 class="study-tray__title" tabindex="-1" data-study-tray-title>${escapeHTML(t('study.trayTitle', lang))} <span dir="ltr">${key}</span></h3>
      </div>
      <button type="button" class="icon-btn icon-btn--sm" data-action="study-tray-close" data-surah="${surah}" data-ayah="${ayah}" aria-label="${escapeHTML(t('study.trayClose', lang))}" title="${escapeHTML(t('study.trayClose', lang))}">
        ${icon('close', { size: 15 })}
      </button>
    </div>
    ${arabic ? `<p class="study-tray__arabic" dir="rtl" lang="ar">${escapeHTML(arabic)}</p>` : skeletonLines(lang, [92, 86])}
    ${translationBlock(state, lang, surah, ayah, ayahDoc)}
    ${wordsBlock}
    ${buildAyahStudyExtras(state, surah, ayah, state?.mushafSession?.tafsirTab ?? null)}
    ${studyJourneyHTML(state, lang, surah, ayah)}
    <div class="study-tray__foot">
      <button type="button" class="btn btn--secondary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
        ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
      </button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="study-tray-close" data-surah="${surah}" data-ayah="${ayah}">
        ${t('study.trayClose', lang)}
      </button>
    </div>
  </section>`;
}
