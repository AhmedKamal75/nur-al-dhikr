/**
 * components/skeleton.js
 * Phase C (v3.14) — shape-mirroring shimmer placeholders for the app's
 * lazily-loaded surfaces (surah docs, hadith books, tafsir volumes, the
 * reciters catalog, mushaf pages). Before this, every one of those showed
 * a bare "Loading…" text line; a skeleton that mirrors the shape of the
 * content that is about to land makes the wait feel shorter and the
 * layout settle without a jump.
 *
 * Pure string builders — same render-model contract as every view: no DOM
 * access, no state mutation. The patch engine swaps a skeleton for the real
 * content when the fetch lands, so nothing here needs cleanup.
 *
 * Every skeleton carries an sr-only "loading" announcement, so screen
 * readers get the same signal sighted users get from the shimmer.
 */

import { t } from '../i18n.js';

function srLoading(lang) {
  return `<span class="sr-only">${t('common.loading', lang)}</span>`;
}

/** One shimmer bar; width in %, optional fixed height class. */
function bar(width, mod = '') {
  return `<span class="sk ${mod}" style="--sk-w:${Math.max(5, Math.min(100, width))}%"></span>`;
}

/** A vertical stack of shimmer bars mirroring a text block. */
export function skeletonLines(lang, widths = [92, 78, 85]) {
  return `<div class="sk-block" aria-hidden="false">${srLoading(lang)}${widths.map((w) => bar(w)).join('')}</div>`;
}

/** The 114-surah picker grid: rows of tiles (badge + two text lines). */
export function skeletonSurahList(lang, count = 10) {
  const tiles = Array.from(
    { length: Math.max(2, Math.min(20, count)) },
    () => `
    <div class="sk-tile">
      <span class="sk sk--badge"></span>
      <span class="sk-tile__lines">${bar(70)}${bar(45)}</span>
      <span class="sk sk--chip"></span>
    </div>`
  ).join('');
  return `<div class="sk-surah-grid">${srLoading(lang)}${tiles}</div>`;
}

/** Classic-reader ayah cards: header row, Arabic line, translation lines. */
export function skeletonAyahCards(lang, count = 3) {
  const cards = Array.from(
    { length: Math.max(1, Math.min(8, count)) },
    (_, i) => `
    <div class="sk-ayah-card">
      <span class="sk-ayah-card__top">${bar(14, 'sk--badge')}${bar(30)}</span>
      <span class="sk sk--arabic" style="--sk-w:${96 - (i % 3) * 8}%"></span>
      ${bar(84 - (i % 2) * 14)}
    </div>`
  ).join('');
  return `<div class="sk-block sk-block--cards">${srLoading(lang)}${cards}</div>`;
}

/** Reciter rows (name + subtitle) for the audio manager catalog. */
export function skeletonReciterRows(lang, count = 6) {
  const rows = Array.from(
    { length: Math.max(2, Math.min(12, count)) },
    () => `
    <div class="sk-reciter-row">${bar(46)}${bar(30)}</div>`
  ).join('');
  return `<div class="sk-reciter-list">${srLoading(lang)}${rows}</div>`;
}

/** A hadith card: narrator line, body block, chapter chips. */
export function skeletonHadithCard(lang) {
  return `
  <div class="panel sk-hadith-card">
    ${srLoading(lang)}
    ${bar(38)}
    <span class="sk-hadith-card__body">${bar(96)}${bar(88)}${bar(64)}</span>
    <span class="sk-hadith-card__chips">${bar(18, 'sk--chip')}${bar(18, 'sk--chip')}</span>
  </div>`;
}

/** Mushaf page: centred RTL text lines on paper (ink-tinted, no sheen). */
export function skeletonMushafPage(lang, count = 11) {
  const widths = [72, 88, 64, 92, 58, 84, 76, 90, 62, 86, 70];
  const lines = Array.from(
    { length: Math.max(4, Math.min(16, count)) },
    (_, i) => `
    <span class="sk sk--paper" style="--sk-w:${widths[i % widths.length]}%"></span>`
  ).join('');
  return `<div class="sk-mushaf-page">${srLoading(lang)}${lines}</div>`;
}
