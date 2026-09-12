/**
 * components/card.js
 * The one card template used everywhere an item appears: library lists,
 * search results, favorites, collections, and Focus Mode. Fields that are
 * empty for a given item are simply omitted — nothing renders "N/A".
 * (v5.0.0) `opts.fields` gates which JSON fields render (banner-level
 * visibility toggles; falls back to the legacy show* booleans).
 * (v5.0.0) Counter pill: "done / target ✓" — after completing a target-1
 * dhikr the pill reads "1 / 1 ✓" (the completed count FIRST), never the
 * old "0 / 1 ✓ 1" resting-on-zero confusion.
 *
 * Cards never attach their own listeners. Every interactive element carries
 * data-action / data-item-id / data-category-id attributes and is handled by
 * the single delegated listener registered once in app.js.
 */

import { escapeHTML, pickLocale } from '../core/utils.js';
// SANCTIONED ui → domain edge (separation contract): card.js is the audited
// consumer of localeContent + completedCards (ARCHITECTURE.md §2 exception).
// eslint-disable-next-line no-restricted-imports
import {
  showTransliterationFor,
  showTranslationFor,
  translationFor,
  virtueFor,
  contentTitleFor,
  referenceLineFor,
  noteFor,
} from '../domain/localeContent.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { GRADE_LABELS } from '../core/config.js';
import { buildHash } from '../core/router.js';
// eslint-disable-next-line no-restricted-imports -- sanctioned (see above)
import { isDismissed, wasCompletedRecently } from '../domain/completedCards.js';

/**
 * @param {object} item        normalized item
 * @param {object} category    normalized category (for color/name context)
 * @param {object} opts
 *   lang, isFavorite, counter, showTransliteration, showTranslation, compact,
 *   inCollectionIds, fields ({transliteration,translation,virtues,reference,grade,notes})
 */
export function cardHTML(item, category, opts = {}) {
  const {
    lang = 'en',
    isFavorite = false,
    isSpeaking = false,
    counter = null,
    showTransliteration = true,
    showTranslation = true,
    compact = false,
    fields = null,
    byHeart = null,
  } = opts;

  // (v5.0.0) Effective field visibility: banner-level toggles win, then
  // the legacy global show* settings, then "visible".
  const show = {
    transliteration: fields ? fields.transliteration !== false : showTransliteration,
    translation: fields ? fields.translation !== false : showTranslation,
    virtues: fields ? fields.virtues !== false : true,
    reference: fields ? fields.reference !== false : true,
    grade: fields ? fields.grade !== false : true,
    notes: fields ? fields.notes !== false : true,
  };

  // Titles keep a graceful fallback (an empty header is worse than a
  // foreign one), but the fallback itself stays locale-safe: AR never
  // falls back to the Latin transliteration line.
  const title = contentTitleFor(item, lang);
  // Strict language separation: transliteration/translation render in EN
  // only (never in AR, regardless of toggles); virtue/reference/notes read
  // the active side exclusively with no cross-language fallback.
  const showTranslit = showTransliterationFor(lang, show.transliteration);
  const showTrans = showTranslationFor(lang, show.translation);
  const translation = showTrans ? translationFor(item, lang) : '';
  const virtue = show.virtues ? virtueFor(item, lang) : '';
  const gradeLabel = GRADE_LABELS[item.grade]
    ? pickLocale(GRADE_LABELS[item.grade], lang)
    : item.grade;
  const refLine = show.reference ? referenceLineFor(item, lang, t('card.narratedBy', lang)) : '';
  const refNotes = show.reference ? noteFor(item.reference?.notes, lang, item) : '';
  const notes = show.notes ? noteFor(item.notes, lang) : '';
  const target = counter?.target || item.repetitions || 1;
  const count = counter?.count || 0;
  const cycles = counter?.completedCycles || 0;
  // (v5.2.25) separation of concerns: the pill shows ONLY live session
  // progress (count / target — never the lifetime cycles, which used to
  // render as "6 / 1 ✓" and read as a broken counter). Lifetime lives in
  // the metadata badge below; the done ring lights on session completion.
  const done = count >= target;
  const progressPct = Math.min(100, Math.round((count / Math.max(1, target)) * 100));
  const lifetimeBadge =
    cycles > 0
      ? `<span class="chip chip--muted" title="${escapeHTML(t('card.completedTimes', lang, { n: cycles }))}">✓ ${escapeHTML(String(cycles))}×</span>`
      : '';

  const categoryChip = category
    ? `<a class="chip chip--${escapeHTML(category.color || 'slate')}" href="${buildHash('category', { id: category.id })}" data-action="navigate" data-view="category" data-id="${escapeHTML(category.id)}">${escapeHTML(pickLocale(category.name, lang))}</a>`
    : '';

  // (v5.2.24) session dismissal: a card that completed its target this
  // session renders nothing — the next supplication slides up in its
  // place. A freshly completed card (inside the exit window) renders with
  // the exit-animation class; the counter-tap handler removes the node
  // when the animation lands and pins the dismissal.
  if (isDismissed(item.id)) return '';
  const exitingClass = wasCompletedRecently(item.id) ? ' card--exiting' : '';

  return `
  <article class="card ${compact ? 'card--compact' : ''}${exitingClass}" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" data-action="counter-tap" data-target="${escapeHTML(String(target))}" ${cycles > 0 ? `title="${escapeHTML(t('card.completedTimes', lang, { n: cycles }))}"` : ''}>
    <header class="card__top">
      <div class="card__meta">
        ${categoryChip}
        ${show.grade && item.grade ? `<span class="chip chip--grade chip--grade-${escapeHTML(item.grade.toLowerCase())}">${escapeHTML(gradeLabel)}</span>` : ''}
        ${lifetimeBadge}
      </div>
      <div class="card__actions">
        ${
          byHeart
            ? ''
            : `<button type="button" class="icon-btn icon-btn--play ${isSpeaking ? 'icon-btn--playing' : ''}" data-action="toggle-speech" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isSpeaking}" aria-label="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}" title="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}">
          ${icon(isSpeaking ? 'stop' : 'volume', { size: 18 })}
        </button>`
        }
        <button type="button" class="icon-btn ${isFavorite ? 'icon-btn--active' : ''}" data-action="toggle-favorite" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isFavorite}" aria-label="${t(isFavorite ? 'card.unfavorite' : 'card.favorite', lang)}" title="${t(isFavorite ? 'card.unfavorite' : 'card.favorite', lang)}">
          ${icon(isFavorite ? 'heart-filled' : 'heart', { size: 18 })}
        </button>
        <button type="button" class="icon-btn" data-action="open-card-menu" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" aria-label="${t('card.more', lang)}" title="${t('card.more', lang)}">
          ${icon('share', { size: 18 })}
        </button>
      </div>
    </header>

    ${title ? `<h3 class="card__title">${escapeHTML(title)}</h3>` : ''}

    ${
      byHeart && !byHeart.revealed && item.arabic
        ? `<button type="button" class="hadith-card__cloze" data-action="byheart-reveal" data-item-id="${escapeHTML(item.id)}" aria-label="${t('hifz.reveal', lang)}">${t('hifz.reveal', lang)}</button>`
        : item.arabic
          ? `<p class="card__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic)}</p>`
          : ''
    }
    ${!byHeart && showTranslit && item.transliteration ? `<p class="card__translit">${escapeHTML(item.transliteration)}</p>` : ''}
    ${showTrans && translation ? `<p class="card__translation">${escapeHTML(translation)}</p>` : ''}

    ${show.virtues && virtue ? `<p class="card__virtue"><strong>${escapeHTML(t('card.virtue', lang))}:</strong> ${escapeHTML(virtue)}</p>` : ''}
    ${show.reference && refLine ? `<p class="card__reference">${icon('book', { size: 14 })} ${escapeHTML(refLine)}</p>` : ''}
    ${show.reference && refNotes ? `<p class="card__reference-note">${escapeHTML(refNotes)}</p>` : ''}
    ${show.notes && notes ? `<p class="card__attribution">${icon('info', { size: 12 })} ${escapeHTML(notes)}</p>` : ''}

    ${
      byHeart
        ? `
    <div class="hadith-card__mem">
      ${byHeart.due ? `<span class="hifz-due" dir="auto">${t('hifz.memorizedBadge', lang, { date: byHeart.due })}</span>` : ''}
      <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="easy">
        ${icon('check', { size: 13 })} ${t('hifz.recalled', lang)}
      </button>
      <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="again">
        ${icon('repeat', { size: 13 })} ${t('hifz.struggled', lang)}
      </button>
    </div>`
        : ''
    }

    <footer class="card__footer">
      <!-- (v4.5, APP-FLOW I6) the CARD BODY is the count target (see the
           article's data-action above) — counting never requires aiming at
           this small pill. The pill stays as the keyboard/SR control and
           the visual progress readout; No aria-live on its label: every
           tap is announced once by the global #counter-announcer
           (services/tasbih.js). -->
      <button type="button" class="counter-pill${done ? ' counter-pill--done' : ''}" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" data-target="${escapeHTML(String(target))}">
        <span class="counter-pill__ring" style="--progress:${progressPct}%"></span>
        <span class="counter-pill__label" dir="ltr">${escapeHTML(String(count))} / ${escapeHTML(String(target))}</span>
      </button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="open-focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}">
        ${t('card.openFocus', lang)}
      </button>
    </footer>
  </article>`;
}

/** A minimal one-line card used inside dense lists (search suggestions, collection pickers). */
export function miniCardHTML(item, lang = 'en') {
  // Locale-safe fallback: AR never falls back to the Latin transliteration
  // (matches cardHTML's title rule) — an empty title falls back to Arabic.
  const title = contentTitleFor(item, lang);
  return `
  <button type="button" class="mini-card" data-action="open-focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(item.category_id)}">
    <span class="mini-card__title">${escapeHTML(title)}</span>
    <span class="mini-card__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic.slice(0, 40))}${item.arabic.length > 40 ? '\u2026' : ''}</span>
  </button>`;
}
