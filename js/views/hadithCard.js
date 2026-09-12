/**
 * views/hadithCard.js — shared hadith card builders.
 *
 * (v5.2.18) Extracted from views/hadith.js so Home can render its
 * "Hadith of the day" card without statically importing the whole
 * hadith browser into the boot parse. Core/ui imports only; both
 * views/home.js (boot) and views/hadith.js (on demand) render from
 * here with zero visual change.
 */

import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';

/** One hadith card. `n` deep-link targeting highlights it via data attribute.
 *  (v4.6.0) cards carry the same action trio the azkar cards do: copy,
 *  share, listen — the "same treatment as azkar and quran" ask.
 *  (v5.0.0) manage mode adds the hide affordance (the same lens pattern
 *  azkar cards use), and the Arabic text follows showHadithArabic. */
export function hadithCardHTML(
  h,
  {
    lang,
    sectionName = '',
    isTarget = false,
    showTranslation = true,
    showArabic = true,
    manageable = false,
    bookId = '',
    bookmarked = false,
    note = '',
    memorizing = false,
    memRevealed = false,
    memDue = '',
  }
) {
  const num = String(h.n);
  const hasNote = typeof note === 'string' && note.trim() !== '';
  // Memorize mode: the Arabic hides behind a reveal tap (the translation
  // stays as the recall prompt); grading chips log the SRS review.
  const arabicBlock =
    memorizing && !memRevealed
      ? `<button type="button" class="hadith-card__cloze" data-action="hadith-mem-reveal" aria-label="${t('hifz.reveal', lang)}">${t('hifz.reveal', lang)}</button>`
      : showArabic && h.ar
        ? `<p class="hadith-card__arabic" dir="rtl" lang="ar">${escapeHTML(h.ar)}</p>`
        : '';
  const memRow = memorizing
    ? `
    <div class="hadith-card__mem">
      ${memDue ? `<span class="hifz-due" dir="auto">${t('hifz.memorizedBadge', lang, { date: memDue })}</span>` : ''}
      <button type="button" class="chip" data-action="hadith-mem-review" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" data-grade="easy">
        ${icon('check', { size: 13 })} ${t('hifz.recalled', lang)}
      </button>
      <button type="button" class="chip" data-action="hadith-mem-review" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" data-grade="again">
        ${icon('repeat', { size: 13 })} ${t('hifz.struggled', lang)}
      </button>
    </div>`
    : '';
  return `
  <article class="hadith-card${isTarget ? ' hadith-card--target' : ''}" ${isTarget ? 'data-hadith-target' : ''} id="hadith-${escapeHTML(num)}">
    <div class="hadith-card__meta">
      <span class="hadith-card__number" dir="ltr">#${escapeHTML(num)}</span>
      ${sectionName ? `<span class="hadith-card__section">${escapeHTML(sectionName)}</span>` : ''}
      ${
        manageable
          ? `<button type="button" class="icon-btn icon-btn--sm hadith-card__hide" data-action="hadith-hide-item" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" aria-label="${t('content.hideItem', lang)}" title="${t('content.hideItem', lang)}">${icon('eyeOff', { size: 14 })}</button>`
          : ''
      }
    </div>
    ${arabicBlock}
    ${h.en && showTranslation && lang !== 'ar' ? `<p class="hadith-card__translation" dir="ltr">${escapeHTML(h.en)}</p>` : ''}
    ${hasNote ? `<p class="hadith-card__note" dir="auto"><span class="hadith-card__note-label">${t('hadith.note', lang)}</span> ${escapeHTML(note)}</p>` : ''}
    ${memRow}
    <div class="hadith-card__actions">
      <button type="button" class="icon-btn icon-btn--sm${bookmarked ? ' icon-btn--active' : ''}" data-action="hadith-bookmark" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" aria-pressed="${bookmarked}" aria-label="${t(bookmarked ? 'hadith.unbookmark' : 'hadith.bookmark', lang)}" title="${t(bookmarked ? 'hadith.unbookmark' : 'hadith.bookmark', lang)}">${icon('bookmark', { size: 15 })}</button>
      ${bookId ? `<button type="button" class="icon-btn icon-btn--sm${memorizing ? ' icon-btn--active' : ''}" data-action="hadith-memorize" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" aria-pressed="${memorizing}" aria-label="${t(memorizing ? 'hadith.memorizeClose' : 'hadith.memorize', lang)}" title="${t(memorizing ? 'hadith.memorizeClose' : 'hadith.memorize', lang)}">${icon('target', { size: 15 })}</button>` : ''}
      <button type="button" class="icon-btn icon-btn--sm${hasNote ? ' icon-btn--active' : ''}" data-action="hadith-note-open" data-book-id="${escapeHTML(bookId)}" data-n="${escapeHTML(num)}" aria-pressed="${hasNote}" aria-label="${t(hasNote ? 'hadith.editNote' : 'hadith.addNote', lang)}" title="${t(hasNote ? 'hadith.editNote' : 'hadith.addNote', lang)}">${icon('edit', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-copy" data-n="${escapeHTML(num)}" aria-label="${t('common.copy', lang)}" title="${t('common.copy', lang)}">${icon('copy', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-share" data-n="${escapeHTML(num)}" aria-label="${t('hadith.cardShare', lang)}" title="${t('hadith.cardShare', lang)}">${icon('share', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-speak" data-n="${escapeHTML(num)}" aria-label="${t('hadith.cardListen', lang)}" title="${t('hadith.cardListen', lang)}">${icon('volume', { size: 15 })}</button>
    </div>
  </article>`;
}

/** The Home "Hadith of the day" card. Silently absent until its (small,
 *  precached) book has loaded — it must never block first paint. */
export function dailyHadithCardHTML(state) {
  const lang = state.settings.language;
  const daily = state.hadith?.daily;
  if (!daily) return '';
  const doc = state.hadith.docs[daily.bookId];
  const h = doc?.hadiths?.find((x) => Number(x.n) === Number(daily.n));
  if (!h) return '';
  const index = state.hadith.index;
  const bookMeta = (index?.books || []).find((b) => b.id === daily.bookId);
  return `
  <section class="panel panel--hadith-daily">
    <div class="panel__header">
      <h2>${t('hadith.dailyTitle', lang)}</h2>
      <button type="button" class="icon-btn icon-btn--sm" data-action="hadith-daily-shuffle" aria-label="${escapeHTML(t('hadith.dailyShuffle', lang))}" title="${escapeHTML(t('hadith.dailyShuffle', lang))}">${icon('refresh', { size: 15 })}</button>
      <a href="${buildHash(VIEWS.HADITH, { id: daily.bookId, n: String(h.n) })}" data-action="navigate" data-view="${VIEWS.HADITH}" data-id="${escapeHTML(daily.bookId)}" data-n="${escapeHTML(String(h.n))}" aria-label="${t('hadith.openBook', lang)}">${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 16 })}</a>
    </div>
    <p class="panel__subtext">${escapeHTML(pickLocale(bookMeta?.name ?? { en: daily.bookId }, lang))}</p>
    ${(() => {
      const key = `${daily.bookId}:${h.n}`;
      const memKey = state.hadith.bookView?.memorizeKey || null;
      return hadithCardHTML(h, {
        lang,
        showTranslation: state.settings.showTranslation,
        bookId: daily.bookId,
        bookmarked: (state.hadithBookmarks || []).includes(key),
        note: (state.hadithNotes || {})[key] || '',
        memorizing: memKey === key,
        memRevealed: memKey === key && state.hadith.bookView?.memorizeRevealed === true,
        memDue: (state.hadithMemRecords || {})[key]?.due || '',
      });
    })()}
  </section>`;
}
