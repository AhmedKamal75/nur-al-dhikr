/**
 * views/tafsirPanel.js
 * Shared UI (modal templates) for the Qur'an study features: the per-word
 * grammar/i'rab/sarf popover, the multi-source tafsir panel (tabs across
 * every bundled + on-demand edition), and the Mushaf display-settings
 * panel (font / paper color / sizing / animation). Used by both
 * views/quran.js (classic list reader) and views/mushafReader.js (604-page
 * book reader) so the two reading modes share one implementation.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { clamp, escapeHTML, pickLocale } from '../core/utils.js';
import { skeletonLines } from '../ui/skeleton.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { MUSHAF_FONTS, MUSHAF_PAPERS } from '../core/config.js';
import {
  classifyAyahTajweed,
  classifyWordTajweed,
  wordUnits,
  TAJWEED_RULES,
  TAJWEED_FAMILIES,
  tajweedPrefsOf,
  ruleEnabled,
  effectiveRuleColor,
  filterSpansByPrefs,
} from '../domain/tajweed.js';
import {
  getWord,
  wordGrammarSummary,
  wordDetailTags,
  wordAffixLabels,
  rootOccurrences,
  splitEditions,
} from '../domain/wordStudy.js';

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
  { tappable = true, underline = true, tajweed = false, prefs = null } = {}
) {
  const tokens = String(officialText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const tajweedByWord = tajweed ? classifyAyahTajweed(officialText) : null;

  return tokens
    .map((tok, idx) => {
      const i = idx + 1;
      const inner = tajweedByWord
        ? colorizeWord(tok, tajweedByWord[idx]?.spans || [], prefs)
        : escapeHTML(tok);
      // (v4.6.0) a word is tappable even without grammar data — the tap
      // opens the study panel, which always answers the tajweed question
      // from the ayah text itself. `tappable` opts OUT (practice mode).
      if (!tappable) return inner;
      return `<span class="qword ${underline ? 'qword--underline' : ''}" data-action="word-tap" data-surah="${surah}" data-ayah="${ayah}" data-i="${i}" tabindex="0" role="button">${inner}</span>`;
    })
    .join(' ');
}

/** Wrap a word's tajweed-flagged letter runs in colored spans, escaping
 *  everything else as plain text. Spans are character-index ranges into
 *  `word` produced by tajweed.js — see that module for why they're safe
 *  to trust (computed directly from this app's own text, not aligned
 *  against a third-party offset table). */
function colorizeWord(word, spans, prefs = null) {
  const active = filterSpansByPrefs(spans, prefs);
  if (!active.length) return escapeHTML(word);
  const sorted = [...active].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue; // rules should never overlap, but never let one clobber the last
    out += escapeHTML(word.slice(cursor, s.start));
    const rule = TAJWEED_RULES.find((r) => r.id === s.rule);
    const color = effectiveRuleColor(prefs, rule);
    out += `<span class="tajweed tajweed--${s.rule}"${color ? ` style="color:${color}"` : ''}>${escapeHTML(word.slice(s.start, s.end))}</span>`;
    cursor = s.end;
  }
  out += escapeHTML(word.slice(cursor));
  return out;
}

/** v3.7 — Tajweed inspector: what to DO at this specific word.
 * Recomputes the classification from the official ayah token with proper
 * one-letter lookahead, then lists every rule applying here — bilingual
 * name, legend color, and the pronunciation instruction — so tapping any
 * word answers "which letters carry a rule and how do I recite them?"
 * straight from the same classifier that colors the page. It can never
 * disagree with the colored text, because it IS the colored text's source.
 *
 * (v4.6.0) No longer gated on the tajweedInspector pref: tapping a word
 * ALWAYS answers the tajweed question — that is the tap's whole job when
 * grammar data hasn't loaded (the classic "mushaf words do nothing"
 * complaint).
 */
function wordTajweedSection(state, surah, ayah, wordIndex, lang) {
  const doc = state.quran.surahs[String(surah)];
  const ayahText = doc?.ayahs?.find((x) => String(x.number) === String(ayah))?.text;
  if (!ayahText) return '';
  const tokens = ayahText.trim().split(/\s+/).filter(Boolean);
  const token = tokens[wordIndex - 1];
  if (!token) return '';
  // Reading order: the first letter AFTER this word decides cross-word
  // rules; it comes from the same tokenizer the rules themselves use.
  const nextToken = tokens[wordIndex];
  const nextUnits = nextToken ? wordUnits(nextToken) : [];
  const prefs = tajweedPrefsOf(state);
  const allSpans = classifyWordTajweed(token, {
    nextWordFirstBase: nextUnits[0] ? nextToken[nextUnits[0].start] : null,
    isLastWordOfAyah: wordIndex === tokens.length,
  });
  const spans = filterSpansByPrefs(allSpans, prefs);
  if (!spans.length) return '';
  // Dedupe identical (rule, range) pairs defensively; sort in reading order.
  const seen = new Set();
  const rows = spans
    .filter((sp) => {
      const key = `${sp.rule}:${sp.start}:${sp.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((p1, p2) => p1.start - p2.start || p1.end - p2.end)
    .map((sp) => {
      const rule = TAJWEED_RULES.find((r) => r.id === sp.rule);
      if (!rule || !ruleEnabled(prefs, sp.rule)) return '';
      const name = lang === 'ar' ? rule.name.ar : rule.name.en;
      const nameAlt = lang === 'ar' ? '' : ` \u00B7 ${rule.name.ar}`;
      const desc = lang === 'ar' ? rule.desc.ar : rule.desc.en;
      const color = effectiveRuleColor(prefs, rule);
      return `
        <div class="wti-row">
          <span class="wti-swatch" style="background:${color || 'transparent'}" aria-hidden="true"></span>
          <div class="wti-body">
            <span class="wti-name">${escapeHTML(name)}<span dir="rtl" class="wti-name-alt">${escapeHTML(nameAlt)}</span></span>
            <span class="wti-desc">${escapeHTML(desc)}</span>
            <span class="wti-letters" dir="rtl" lang="ar">${escapeHTML(token.slice(sp.start, sp.end))}</span>
          </div>
        </div>`;
    })
    .join('');
  return `
    <div class="word-study__tajweed">
      <p class="word-study__tajweed-label">${t('wordStudy.tajweed', lang)}</p>
      <div class="word-study__tajweed-arabic" dir="rtl" lang="ar">${colorizeWord(token, spans, prefs)}</div>
      ${rows}
    </div>`;
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
    // (v4.6.0) No grammar data is not a dead end: the ayah text itself
    // still carries the tajweed answer. Show the token, colorized, with
    // every rule it contains — then the tafsir deep-link as before.
    const doc = state.quran.surahs[String(surah)];
    const ayahText = doc?.ayahs?.find((x) => String(x.number) === String(ayah))?.text;
    const token = ayahText ? ayahText.trim().split(/\s+/).filter(Boolean)[i - 1] : null;
    const tajweedHTML = token ? wordTajweedSection(state, surah, ayah, i, lang) : '';
    return `
    <div class="word-study">
      <h2 id="modal-title-word-study" class="sr-only">${t('wordStudy.title', lang)}</h2>
      ${
        token
          ? `<p class="word-study__ref" dir="ltr">${surah}:${ayah} \u00B7 ${t('wordStudy.wordN', lang, { n: i })}</p>
      <p class="word-study__arabic word-study__arabic--solo" dir="rtl" lang="ar">${escapeHTML(token)}</p>`
          : `<p class="empty-hint">${t('wordStudy.noData', lang)}</p>`
      }
      ${tajweedHTML}
      ${token ? `<p class="panel__subtext">${t('wordStudy.tajweedOnly', lang)}</p>` : ''}
      <div class="word-study__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
          ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
        </button>
      </div>
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
        <span class="word-study__root-text" dir="rtl" lang="ar">${escapeHTML(word.root)}</span>
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
      <button type="button" class="btn btn--secondary btn--sm word-study__root-browse" data-action="roots-open" data-root="${escapeHTML(word.root)}">
        ${t('wordStudy.rootBrowse', lang, { n: count })}
      </button>
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
    ${wordTajweedSection(state, surah, ayah, i, lang)}
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
    // v4.1: editions-catalog failure gets an inline error + Retry instead
    // of a permanent skeleton.
    if (state.loadErrors?.['tafsir-editions']) {
      return `<div class="tafsir-panel">${loadErrorStateHTML({ lang, tierKey: 'tafsir-editions', t })}</div>`;
    }
    return `<div class="tafsir-panel">${skeletonLines(lang, [46, 94, 90, 66])}</div>`;
  }
  const { bundled, remote } = splitEditions(editions);
  const active = activeId || state.settings.mushafPrefs.defaultTafsir || bundled[0]?.id;
  const activeEdition = [...bundled, ...remote].find((e) => e.id === active);

  const tabBtn = (ed) => `
    <button type="button" role="tab" id="tafsir-tab-${ed.id}" aria-controls="tafsir-panel-content" aria-selected="${active === ed.id}" tabindex="${active === ed.id ? '0' : '-1'}" class="tafsir-tab ${active === ed.id ? 'tafsir-tab--active' : ''}" data-action="tafsir-tab" data-edition="${ed.id}" data-surah="${surah}" data-ayah="${ayah}">
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
    } else if (state.loadErrors?.['tafsir-text']) {
      // v4.1: the text fetch failed — Retry instead of a stuck skeleton.
      body = `<div class="tafsir-panel__loading">${loadErrorStateHTML({ lang, tierKey: 'tafsir-text', t })}</div>`;
    } else if (activeEdition.bundled) {
      body = `<div class="tafsir-panel__loading">${skeletonLines(lang, [92, 86, 60])}</div>`;
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

  const activeTabId = activeEdition ? `tafsir-tab-${activeEdition.id}` : '';
  const compareBlock = buildTafsirCompare(
    state,
    surah,
    ayah,
    [...bundled, ...remote],
    activeEdition?.id,
    lang
  );

  return `
  <div class="tafsir-panel">
    <div class="tafsir-tabs" role="tablist" aria-label="${t('tafsir.title', lang)}">
      ${bundled.map(tabBtn).join('')}
      ${remote.length ? `<span class="tafsir-tabs__sep"></span>${remote.map(tabBtn).join('')}` : ''}
    </div>
    <div class="tafsir-panel__content" role="tabpanel" id="tafsir-panel-content" ${activeTabId ? `aria-labelledby="${activeTabId}"` : ''} tabindex="0">${body}</div>
    ${compareBlock}
  </div>`;
}

/**
 * Tafsir compare: a second source beneath the active tab. The picker offers
 * bundled editions plus remote ones already cached for THIS surah (an
 * uncached remote would need its own download flow — the primary tab owns
 * that). The choice persists in settings.tafsirCompareB; a stale id renders
 * only the picker, never an error.
 */
function buildTafsirCompare(state, surah, ayah, editions, activeId, lang) {
  const picked = state.settings.tafsirCompareB || null;
  const cached = (ed) => ed.bundled || state.tafsir?.[ed.id]?.[String(surah)] != null;
  const options = editions.filter((ed) => ed.id !== activeId && cached(ed));
  const chipFor = (id, label, on) => `
    <button type="button" class="chip ${on ? 'chip--active' : ''}" data-action="tafsir-compare" data-edition="${escapeHTML(id)}" data-surah="${surah}" data-ayah="${ayah}" aria-pressed="${on}">
      ${escapeHTML(label)}
    </button>`;
  const picker = `
    <div class="tafsir-compare__pick">
      <span class="tafsir-compare__label">${t('tafsir.compare', lang)}</span>
      ${chipFor('', t('tafsir.compareOff', lang), !picked)}
      ${options.map((ed) => chipFor(ed.id, pickLocale({ en: ed.nameEn, ar: ed.nameAr }, lang), picked === ed.id)).join('')}
    </div>`;

  let second = '';
  if (picked && picked !== activeId) {
    const ed = editions.find((e) => e.id === picked);
    const text = ed ? state.tafsir?.[ed.id]?.[String(surah)]?.[String(ayah)] : null;
    if (ed && text) {
      second = `
      <p class="tafsir-panel__author">${escapeHTML(pickLocale({ en: ed.authorEn, ar: ed.authorAr }, lang))}</p>
      <div class="tafsir-panel__body" dir="rtl" lang="ar">${formatArabicCommentary(text)}</div>`;
    } else if (ed && cached(ed)) {
      second = `<div class="tafsir-panel__loading">${skeletonLines(lang, [92, 86, 60])}</div>`;
    }
    // Uncached remote / unknown id: picker only (above) — the text arrives
    // via the primary tab's own download flow, then appears here.
  }
  if (!options.length && !second) return '';
  return `
    <div class="tafsir-compare">
      ${picker}
      ${second ? `<div class="tafsir-compare__body">${second}</div>` : ''}
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
  // Defense-in-depth (review v3.3 B1): sanitized upstream, but the slider
  // value attributes still interpolate prefs — emit clamped numbers only.
  // (v4.5) the range widened to match the new pinch-zoom / ctrl+wheel span.
  const fontScale = clamp(Number(prefs.fontScale) || 1, 0.6, 2.2);
  const lineSpacing = clamp(Number(prefs.lineSpacing) || 1, 0.85, 1.3);

  const fontRow = MUSHAF_FONTS.map(
    (f) => `
    <button type="button" class="mushaf-settings__font ${prefs.font === f.id ? 'mushaf-settings__font--active' : ''}" data-action="mushaf-set-font" data-font="${f.id}" style="font-family:${f.family}">
      <span class="mushaf-settings__font-sample" dir="rtl" lang="ar">${'\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650'}</span>
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
    <label class="toggle-row">
      <span class="toggle-row__label">${t(labelKey, lang)}</span>
      <span class="switch">
        <input type="checkbox" data-action="toggle-mushaf-pref" data-key="${key}" ${prefs[key] ? 'checked' : ''} />
        <span class="switch__track"></span>
      </span>
    </label>`;

  return `
  <div class="mushaf-settings">
    <h2 id="modal-title-mushaf-settings">${t('mushaf.settingsTitle', lang)}</h2>

    <h3 class="mushaf-jump__heading">${t('mushaf.font', lang)}</h3>
    <div class="mushaf-settings__fonts">${fontRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.paper', lang)}</h3>
    <div class="mushaf-settings__papers">${paperRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.textSize', lang)}</h3>
    <input class="slider" type="range" min="0.6" max="2.2" step="0.05" value="${fontScale}" data-bind="mushaf-font-scale" aria-label="${t('mushaf.textSize', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.lineSpacing', lang)}</h3>
    <input class="slider" type="range" min="0.85" max="1.3" step="0.05" value="${lineSpacing}" data-bind="mushaf-line-spacing" aria-label="${t('mushaf.lineSpacing', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.bismillahStyle', lang)}</h3>
    <div class="mushaf-settings__bismillah">
      ${['auto', 'gold', 'accent', 'hidden']
        .map(
          (st) => `
      <button type="button" class="mushaf-settings__bismillah-chip ${prefs.bismillahStyle === st ? 'mushaf-settings__bismillah-chip--active' : ''}" data-action="mushaf-set-bismillah" data-style="${st}">
        <span dir="rtl" lang="ar" class="bismillah-sample bismillah--${st}">بِسْمِ اللَّهِ</span>
        <span class="mushaf-settings__bismillah-label">${t(`mushaf.bismillah_${st}`, lang)}</span>
      </button>`
        )
        .join('')}
    </div>

    <h3 class="mushaf-jump__heading">${t('mushaf.behavior', lang)}</h3>
    ${toggle('spread', 'mushaf.spread')}
    ${toggle('pageFlipAnimation', 'mushaf.flipAnimation')}
    ${toggle('tajweedInspector', 'mushaf.tajweedInspector')}
    ${toggle('wordByWordStudy', 'mushaf.wordStudy')}
    ${toggle('wordUnderline', 'mushaf.wordUnderline')}
    ${toggle('tajweedColoring', 'mushaf.tajweed')}

    <button type="button" class="btn btn--secondary practice-launch-btn" data-action="practice-open">
      ${icon('sparkle', { size: 15 })} ${t('practice.launchFromSettings', lang)}
    </button>

    ${
      prefs.tajweedColoring
        ? `
    <h3 class="mushaf-jump__heading">${t('mushaf.tajweedLegend', lang)}</h3>
    <div class="tajweed-legend">
      ${TAJWEED_FAMILIES.map(
        (family) => `
        <div class="tajweed-legend__family">
          <div class="tajweed-legend__family-head">
            <span class="tajweed-legend__swatch" style="background:${family.color}"></span>
            <span class="tajweed-legend__family-name">${escapeHTML(pickLocale(family.name, lang))}</span>
          </div>
          <p class="tajweed-legend__family-desc">${escapeHTML(pickLocale(family.desc, lang))}</p>
          ${TAJWEED_RULES.filter((r) => r.family === family.id)
            .map(
              (r) => `
          <div class="tajweed-legend__row">
            <span class="tajweed-legend__swatch tajweed-legend__swatch--${r.color ? 'solid' : 'plain'}" ${r.color ? `style="background:${r.color}"` : ''} title="${escapeHTML(t('mushaf.tajweedUncolored', lang))}"></span>
            <div>
              <div class="tajweed-legend__name">${escapeHTML(pickLocale(r.name, lang))}</div>
              <div class="tajweed-legend__desc">${escapeHTML(pickLocale(r.desc, lang))}</div>
            </div>
          </div>`
            )
            .join('')}
        </div>`
      ).join('')}
      <div class="tajweed-legend__row tajweed-legend__row--plain">
        <span class="tajweed-legend__swatch tajweed-legend__swatch--plain"></span>
        <div>
          <div class="tajweed-legend__name">${escapeHTML(t('mushaf.tajweedUncolored', lang))}</div>
          <div class="tajweed-legend__desc">${escapeHTML(t('mushaf.tajweedCoverage', lang))}</div>
        </div>
      </div>
    </div>`
        : ''
    }
  </div>`;
}
