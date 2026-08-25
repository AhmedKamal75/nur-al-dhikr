/**
 * views/tafsirPanel.js
 * Shared UI (modal templates) for the Qur'an study features: the per-word
 * grammar/i'rab/sarf popover, the multi-source tafsir panel (tabs across
 * every bundled + on-demand edition), and the Mushaf display-settings
 * panel (font / paper color / sizing / animation). Used by both
 * views/quran.js (classic list reader) and views/mushafReader.js (604-page
 * book reader) so the two reading modes share one implementation.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { MUSHAF_FONTS, MUSHAF_PAPERS } from '../config.js';
import {
  getWord,
  wordGrammarSummary,
  wordDetailTags,
  wordAffixLabels,
  rootOccurrences,
  splitEditions,
} from '../wordStudy.js';

/* ------------------------------------------------------------------ */
/* Word-by-word rendering                                              */
/* ------------------------------------------------------------------ */

/**
 * Renders an ayah's *official* app text (already exactly what ships in
 * data/quran or data/mushaf — never altered) as a run of tappable
 * per-word spans, position-matched (1-based, whitespace-split) against
 * the fetched grammar/gloss records for that ayah. Falls back to plain
 * escaped text — with zero risk to text fidelity — when word study is
 * off or data hasn't loaded yet.
 */
export function renderAyahWords(
  officialText,
  wordRecords,
  surah,
  ayah,
  { tappable = true, underline = true } = {}
) {
  const tokens = String(officialText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tappable || !Array.isArray(wordRecords) || !wordRecords.length) {
    return escapeHTML(officialText || '');
  }
  return tokens
    .map((tok, idx) => {
      const i = idx + 1;
      const has = wordRecords.some((w) => w.i === i);
      if (!has) return escapeHTML(tok);
      return `<span class="qword ${underline ? 'qword--underline' : ''}" data-action="word-tap" data-surah="${surah}" data-ayah="${ayah}" data-i="${i}" tabindex="0" role="button">${escapeHTML(tok)}</span>`;
    })
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* Word grammar popover                                                */
/* ------------------------------------------------------------------ */

export function buildWordStudyPanel(state) {
  const lang = state.settings.language;
  const ref = state.activeWordStudy;
  if (!ref) return '';
  const { surah, ayah, i } = ref;
  const word = getWord(state.quranWords, surah, ayah, i);

  if (!word) {
    return `
    <div class="word-study">
      <h2 id="modal-title-word-study" class="sr-only">${t('wordStudy.title', lang)}</h2>
      <p class="empty-hint">${t('wordStudy.noData', lang)}</p>
      <button type="button" class="btn btn--secondary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
        ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
      </button>
    </div>`;
  }

  const { prefixes, suffixes } = wordAffixLabels(word, lang);
  const tags = wordDetailTags(word, lang);
  const { count, sample } = rootOccurrences(state.quranRoots, word.root, surah, ayah, 8);

  const affixHtml = (list, labelKey) =>
    list.length
      ? `
    <div class="word-study__affixes">
      <span class="word-study__affixes-label">${t(labelKey, lang)}</span>
      ${list.map((p) => `<span class="chip chip--basis">${escapeHTML(p.form)} — ${escapeHTML(p.label)}</span>`).join('')}
    </div>`
      : '';

  const rootHtml = word.root
    ? `
    <div class="word-study__root">
      <div class="word-study__root-head">
        <span class="word-study__root-label">${t('wordStudy.root', lang)}</span>
        <span class="word-study__root-text" dir="rtl">${escapeHTML(word.root)}</span>
        <span class="word-study__root-count">${t('wordStudy.rootCount', lang, { n: count })}</span>
      </div>
      ${
        sample.length
          ? `
      <p class="word-study__root-hint">${t('wordStudy.rootHint', lang)}</p>
      <div class="word-study__root-chips">
        ${sample
          .map(
            (o) => `
          <button type="button" class="chip chip--basis" data-action="root-jump" data-surah="${o.s}" data-ayah="${o.a}">
            <span dir="rtl">${escapeHTML(o.t || '')}</span>
            <span class="word-study__root-ref" dir="ltr">${o.s}:${o.a}</span>
          </button>`
          )
          .join('')}
      </div>`
          : ''
      }
    </div>`
    : '';

  return `
  <div class="word-study">
    <h2 id="modal-title-word-study" class="sr-only">${t('wordStudy.title', lang)}</h2>
    <p class="word-study__ref" dir="ltr">${surah}:${ayah} \u00B7 ${t('wordStudy.wordN', lang, { n: i })}</p>
    <p class="word-study__arabic" dir="rtl" lang="ar">${escapeHTML(word.text || '')}</p>
    ${word.translit ? `<p class="word-study__translit" dir="ltr">${escapeHTML(word.translit)}</p>` : ''}
    ${word.en ? `<p class="word-study__gloss">${escapeHTML(word.en)}</p>` : ''}
    <p class="word-study__grammar">${escapeHTML(wordGrammarSummary(word, lang))}</p>
    ${tags.length ? `<div class="word-study__tags">${tags.map((tg) => `<span class="chip chip--basis chip--sm">${escapeHTML(tg)}</span>`).join('')}</div>` : ''}
    ${affixHtml(prefixes, 'wordStudy.prefix')}
    ${affixHtml(suffixes, 'wordStudy.suffix')}
    ${rootHtml}
    <div class="word-study__actions">
      <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
        ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
      </button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Multi-source tafsir panel                                           */
/* ------------------------------------------------------------------ */

/** Turn a raw tafsir string into readable HTML: recognizes the
 *  "* SectionName:" headers several grammar sources use (i'rab/sarf/
 *  balagha/fawaid), highlights ﴿word﴾-marked segments some sources use,
 *  and turns blank lines into paragraph breaks. Falls back to plain
 *  paragraphs for ordinary tafsir prose that has neither. */
export function formatArabicCommentary(raw) {
  if (!raw) return '';
  const escaped = escapeHTML(raw);
  const hasSections = /(^|\n)\s*\*\s*[^:\n]{2,20}:/.test(escaped);
  let html;
  if (hasSections) {
    const parts = escaped.split(/(?:^|\n)\s*\*\s*([^:\n]{2,20}):\s*/).filter((s) => s !== '');
    // parts alternates [preamble?, title, body, title, body, ...]
    let out = '';
    let idx = 0;
    if (parts.length % 2 === 1) {
      out += paragraphize(parts[0]);
      idx = 1;
    }
    for (; idx < parts.length - 1; idx += 2) {
      out += `<h4 class="tafsir-section-h">${parts[idx]}</h4>${paragraphize(parts[idx + 1])}`;
    }
    html = out;
  } else {
    html = paragraphize(escaped);
  }
  return html.replace(
    /\uFD3F([^\uFD3E]*)\uFD3E/g,
    '<span class="tafsir-word-mark">\uFD3F$1\uFD3E</span>'
  );
}
function paragraphize(s) {
  return s
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * The tabbed panel: one tab per catalog edition. `activeId` is which tab
 * is currently selected (module-scoped transient state owned by the
 * caller, mirroring bookmarkFolderFilter in mushafReader.js).
 */
export function buildTafsirPanel(state, surah, ayah, activeId) {
  const lang = state.settings.language;
  const editions = state.tafsirEditions;
  if (!editions) {
    return `<div class="tafsir-panel"><p class="panel__subtext">${t('tafsir.loading', lang)}</p></div>`;
  }
  const { bundled, remote } = splitEditions(editions);
  const active = activeId || state.settings.mushafPrefs.defaultTafsir || bundled[0]?.id;
  const activeEdition = [...bundled, ...remote].find((e) => e.id === active);

  const tabBtn = (ed) => `
    <button type="button" class="tafsir-tab ${active === ed.id ? 'tafsir-tab--active' : ''}" data-action="tafsir-tab" data-edition="${ed.id}" data-surah="${surah}" data-ayah="${ayah}">
      ${escapeHTML(pickLocale({ en: ed.nameEn, ar: ed.nameAr }, lang))}
      ${!ed.bundled ? `<span class="tafsir-tab__cloud">${icon('download', { size: 11 })}</span>` : ''}
    </button>`;

  let body;
  if (!activeEdition) {
    body = `<p class="panel__subtext">${t('tafsir.pickSource', lang)}</p>`;
  } else {
    const text = state.tafsir?.[activeEdition.id]?.[String(surah)]?.[String(ayah)];
    if (text) {
      body = `
        <p class="tafsir-panel__author">${escapeHTML(pickLocale({ en: activeEdition.authorEn, ar: activeEdition.authorAr }, lang))}</p>
        <div class="tafsir-panel__body" dir="rtl" lang="ar">${formatArabicCommentary(text)}</div>`;
    } else if (activeEdition.bundled) {
      body = `<div class="tafsir-panel__loading">${icon('quran', { size: 22 })}<p>${t('tafsir.loading', lang)}</p></div>`;
    } else {
      body = `
        <div class="tafsir-panel__remote">
          <p class="panel__subtext">${t('tafsir.remoteHint', lang)}</p>
          <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-download" data-edition="${activeEdition.id}" data-surah="${surah}" data-ayah="${ayah}">
            ${icon('download', { size: 15 })} ${t('tafsir.download', lang)}
          </button>
        </div>`;
    }
  }

  return `
  <div class="tafsir-panel">
    <div class="tafsir-tabs" role="tablist">
      ${bundled.map(tabBtn).join('')}
      ${remote.length ? `<span class="tafsir-tabs__sep"></span>${remote.map(tabBtn).join('')}` : ''}
    </div>
    <div class="tafsir-panel__content">${body}</div>
  </div>`;
}

/**
 * The full study modal: Arabic text + translation/bookmark/play/copy
 * (identical to the previous ayah-detail modal) with the tafsir panel
 * appended below it. Used as the single "ayah detail" surface in both
 * reading modes now.
 */
export function buildAyahStudyExtras(state, surah, ayah, activeTafsirId) {
  return `
    <div class="ayah-study-divider"></div>
    ${buildTafsirPanel(state, surah, ayah, activeTafsirId)}`;
}

/* ------------------------------------------------------------------ */
/* Mushaf display settings                                             */
/* ------------------------------------------------------------------ */

export function buildMushafSettingsPanel(state) {
  const lang = state.settings.language;
  const prefs = state.settings.mushafPrefs;

  const fontRow = MUSHAF_FONTS.map(
    (f) => `
    <button type="button" class="mushaf-settings__font ${prefs.font === f.id ? 'mushaf-settings__font--active' : ''}" data-action="mushaf-set-font" data-font="${f.id}" style="font-family:${f.family}">
      <span class="mushaf-settings__font-sample" dir="rtl">${'\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650'}</span>
      <span class="mushaf-settings__font-name">${escapeHTML(pickLocale(f.name, lang))}</span>
    </button>`
  ).join('');

  const paperRow = MUSHAF_PAPERS.map(
    (p) => `
    <button type="button" class="mushaf-settings__paper ${prefs.paper === p.id ? 'mushaf-settings__paper--active' : ''}" data-action="mushaf-set-paper" data-paper="${p.id}" style="background:${p.bg};color:${p.ink};border-color:${p.border}" aria-label="${escapeHTML(pickLocale(p.name, lang))}" title="${escapeHTML(pickLocale(p.name, lang))}">
      ${prefs.paper === p.id ? icon('check', { size: 14 }) : ''}
    </button>`
  ).join('');

  const toggle = (key, labelKey) => `
    <div class="toggle-row">
      <span class="toggle-row__label">${t(labelKey, lang)}</span>
      <label class="switch">
        <input type="checkbox" data-action="toggle-mushaf-pref" data-key="${key}" ${prefs[key] ? 'checked' : ''} />
        <span class="switch__track"></span>
      </label>
    </div>`;

  return `
  <div class="mushaf-settings">
    <h2 id="modal-title-mushaf-settings">${t('mushaf.settingsTitle', lang)}</h2>

    <h3 class="mushaf-jump__heading">${t('mushaf.font', lang)}</h3>
    <div class="mushaf-settings__fonts">${fontRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.paper', lang)}</h3>
    <div class="mushaf-settings__papers">${paperRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.textSize', lang)}</h3>
    <input class="slider" type="range" min="0.8" max="1.6" step="0.05" value="${prefs.fontScale}" data-bind="mushaf-font-scale" aria-label="${t('mushaf.textSize', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.lineSpacing', lang)}</h3>
    <input class="slider" type="range" min="0.85" max="1.3" step="0.05" value="${prefs.lineSpacing}" data-bind="mushaf-line-spacing" aria-label="${t('mushaf.lineSpacing', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.behavior', lang)}</h3>
    ${toggle('pageFlipAnimation', 'mushaf.flipAnimation')}
    ${toggle('wordByWordStudy', 'mushaf.wordStudy')}
    ${toggle('wordUnderline', 'mushaf.wordUnderline')}
  </div>`;
}
