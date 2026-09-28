/**
 * views/mushafJump.js — the jump drawer (extracted v5.17.21)
 *
 * Pulled out of mushafReader.js, which had crossed its documented 800-line
 * cap. AGENTS.md is explicit that a file near its cap gets a module, not a
 * growth, and the drawer was the cleanest seam: pure navigation, no state of
 * its own, one job.
 *
 * The drawer is 204 destinations across three scrollers — a page box, 114
 * surahs, 30 juz and 60 hizb. It now also says where you are.
 */

import { t } from '../core/i18n.js';
import { escapeHTML, pickLocale, toEasternArabicNumerals } from '../core/utils.js';
import { clampPage, hizbStartPage } from '../services/mushaf.js';
import { MUSHAF_PAGE_COUNT } from '../core/config.js';
import { skeletonLines } from '../ui/skeleton.js';

/** Eastern numerals for the mushaf chrome in Arabic, Western in English. */
const numFor = (lang, n) => (lang === 'ar' ? toEasternArabicNumerals(n) : String(n));

/** (v4.5) "{n} ayahs" for the surah rows — same source of truth
 *  (quran-meta) as the banner's count line, elided while it loads. */
function ayahCountLabelOf(state, number, lang) {
  const n = state.quran.meta?.surahs?.find((s) => Number(s.number) === Number(number))?.ayahCount;
  if (!Number.isFinite(n)) return '';
  if (lang === 'ar') return `${toEasternArabicNumerals(n)} ${n >= 3 && n <= 10 ? 'آيات' : 'آية'}`;
  return `${n} ayahs`;
}

/** Jump-to-surah / jump-to-juz / jump-to-page drawer, opened in the shared modal.
 *  Pure NAVIGATION: page form + surah list + juz list. Progress (khatma
 *  plan/history) lives in buildMushafTrack, opened from the ⋯ sheet. */
export function buildMushafJump(state) {
  const lang = state.settings.language;
  const meta = state.mushaf.meta;
  if (!meta) return skeletonLines(lang, [64, 88, 64, 88, 64]);

  // (v5.17.21) "You are here". The drawer is 204 buttons across three 320px
  // scrollers and not one of them said which surah or juz you are reading.
  // aria-current is not decoration: it is how a screen-reader user orients
  // in a list this long, and the active class is the same fact for everyone
  // else. Derived from the same first-page maps the buttons already use, so
  // it cannot disagree with where a jump would actually land.
  // Defensive: a view must not throw on a missing param bag. buildMushafSheet
  // already reads state.activeParams?.page for exactly this reason.
  const here = clampPage(state.activeParams?.page || state.mushafBookmark?.page || 1);
  const contains = (startMap, key) => {
    let current = null;
    for (const [k, v] of Object.entries(startMap)) {
      const n = Number(k);
      if (Number.isFinite(n) && Number(v) <= here) current = n;
    }
    return current;
  };
  const currentSurah = contains(meta.surahFirstPage, 'surah');
  const currentJuz = contains(meta.juzFirstPage, 'juz');

  const surahButtons = Object.entries(meta.chapterNames)
    .map(([num, names]) => {
      const isHere = Number(num) === currentSurah;
      return `
    <button type="button" class="mushaf-jump__surah${isHere ? ' mushaf-jump__row--here' : ''}" data-action="mushaf-jump-page" data-page="${meta.surahFirstPage[num] || 1}" data-roving-item${isHere ? ' aria-current="true"' : ''}>
      <span class="mushaf-jump__surah-num">${num}</span>
      <span class="mushaf-jump__surah-name">${escapeHTML(pickLocale(names, lang))}</span>
      <span class="mushaf-jump__surah-count">${ayahCountLabelOf(state, num, lang)}</span>
    </button>`;
    })
    .join('');

  const juzButtons = Object.entries(meta.juzFirstPage)
    .map(([juzNum, page]) => {
      const isHere = Number(juzNum) === currentJuz;
      return `
    <button type="button" class="mushaf-jump__juz${isHere ? ' mushaf-jump__row--here' : ''}" data-action="mushaf-jump-page" data-page="${page}" data-roving-item${isHere ? ' aria-current="true"' : ''}>${juzNum}</button>`;
    })
    .join('');

  // (v5.2.58) Hizb index: 60 halves grouped by juz, jumping to the honest
  // page-position approximation (exact breaks print in the page margins —
  // the hint below says so). Buttons reuse the juz styling.
  const hizbRows = [];
  for (let juz = 1; juz <= 30; juz += 1) {
    const halves = [juz * 2 - 1, juz * 2]
      .map((h) => {
        const page = hizbStartPage(meta.juzFirstPage, h);
        if (page == null) return '';
        const label = `${t('mushaf.hizb', lang)} ${numFor(lang, h)}`;
        return `<button type="button" class="mushaf-jump__hizb" data-action="mushaf-jump-page" data-page="${page}" data-roving-item aria-label="${escapeHTML(label)} · ${t('mushaf.pageLabel', lang)} ${numFor(lang, page)}">${numFor(lang, h)}</button>`;
      })
      .join('');
    if (!halves) continue;
    hizbRows.push(
      `<div class="mushaf-jump__hizb-row"><span class="mushaf-jump__hizb-juz">${t('mushaf.juz', lang)} ${numFor(lang, juz)}</span>${halves}</div>`
    );
  }

  return `
  <div class="mushaf-jump">
    <h2 id="modal-title-mushaf-jump">${t('mushaf.jumpTo', lang)}</h2>
    <form class="mushaf-jump__page-form" data-form="mushaf-jump-page">
      <label for="mushaf-jump-page-input">${t('mushaf.pageLabel', lang)}</label>
      <div class="mushaf-jump__page-row">
        <input type="number" id="mushaf-jump-page-input" name="page" min="1" max="604" inputmode="numeric" value="${state.mushafBookmark.page || 1}" />
        <button type="submit" class="btn btn--primary btn--sm">${t('mushaf.go', lang)}</button>
      </div>
    </form>
    <h3 class="mushaf-jump__heading">${t('mushaf.surahs', lang)}</h3>
    <div class="mushaf-jump__surah-list" role="group" aria-label="${t('mushaf.surahs', lang)}" data-roving>${surahButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.juzSection', lang)}</h3>
    <div class="mushaf-jump__juz-list" role="group" aria-label="${t('mushaf.juzSection', lang)}" data-roving>${juzButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.hizbSection', lang)}</h3>
    <p class="panel__subtext">${t('mushaf.hizbApprox', lang)}</p>
    <div class="mushaf-jump__hizb-list" role="group" aria-label="${t('mushaf.hizbSection', lang)}" data-roving>${hizbRows.join('')}</div>
  </div>`;
}
