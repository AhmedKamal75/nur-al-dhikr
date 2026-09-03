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
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { GRADE_LABELS } from '../core/config.js';
import { buildHash } from '../core/router.js';

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

  const title = pickLocale(item.title, lang) || item.transliteration || item.arabic;
  const translation = pickLocale(item.translation, lang);
  const virtue = pickLocale(item.virtues, lang);
  const gradeLabel = GRADE_LABELS[item.grade]
    ? pickLocale(GRADE_LABELS[item.grade], lang)
    : item.grade;
  const refParts = [
    item.reference?.collection,
    item.reference?.hadith,
    item.reference?.narrator ? `${t('card.narratedBy', lang)} ${item.reference.narrator}` : '',
    item.reference?.grading,
  ]
    .filter(Boolean)
    .join(' \u00B7 ');
  const target = counter?.target || item.repetitions || 1;
  const count = counter?.count || 0;
  const cycles = counter?.completedCycles || 0;
  // (v5.0.0) The pill's FIRST number is how many you've done: mid-count it
  // is the live count; resting after a completed cycle it is the cycle
  // count ("1 / 1 ✓" — never "0 / 1" with a stray ✓ elsewhere). The
  // checkmark rides the END of the pill exactly once, carrying the cycle
  // count only when it's above one; the done state itself shows whenever
  // a cycle has been completed (even mid-way through the next one — the
  // v3.4 W-2 contract, kept).
  const restingDone = count === 0 && cycles > 0;
  const displayCount = restingDone ? cycles : count;
  const done = cycles > 0 || count >= target;
  const progressPct = restingDone
    ? 100
    : Math.min(100, Math.round((count / Math.max(1, target)) * 100));

  const categoryChip = category
    ? `<a class="chip chip--${escapeHTML(category.color || 'slate')}" href="${buildHash('category', { id: category.id })}" data-action="navigate" data-view="category" data-id="${escapeHTML(category.id)}">${escapeHTML(pickLocale(category.name, lang))}</a>`
    : '';

  return `
  <article class="card ${compact ? 'card--compact' : ''}" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" data-action="counter-tap" data-target="${escapeHTML(String(target))}" ${cycles > 0 ? `title="${escapeHTML(t('card.completedTimes', lang, { n: cycles }))}"` : ''}>
    <header class="card__top">
      <div class="card__meta">
        ${categoryChip}
        ${show.grade && item.grade ? `<span class="chip chip--grade chip--grade-${escapeHTML(item.grade.toLowerCase())}">${escapeHTML(gradeLabel)}</span>` : ''}
      </div>
      <div class="card__actions">
        <button type="button" class="icon-btn icon-btn--play ${isSpeaking ? 'icon-btn--playing' : ''}" data-action="toggle-speech" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isSpeaking}" aria-label="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}" title="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}">
          ${icon(isSpeaking ? 'stop' : 'volume', { size: 18 })}
        </button>
        <button type="button" class="icon-btn ${isFavorite ? 'icon-btn--active' : ''}" data-action="toggle-favorite" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isFavorite}" aria-label="${t(isFavorite ? 'card.unfavorite' : 'card.favorite', lang)}" title="${t(isFavorite ? 'card.unfavorite' : 'card.favorite', lang)}">
          ${icon(isFavorite ? 'heart-filled' : 'heart', { size: 18 })}
        </button>
        <button type="button" class="icon-btn" data-action="open-card-menu" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" aria-label="${t('card.more', lang)}" title="${t('card.more', lang)}">
          ${icon('share', { size: 18 })}
        </button>
      </div>
    </header>

    ${title ? `<h3 class="card__title">${escapeHTML(title)}</h3>` : ''}

    ${item.arabic ? `<p class="card__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic)}</p>` : ''}
    ${show.transliteration && item.transliteration ? `<p class="card__translit">${escapeHTML(item.transliteration)}</p>` : ''}
    ${show.translation && translation ? `<p class="card__translation">${escapeHTML(translation)}</p>` : ''}

    ${show.virtues && virtue ? `<p class="card__virtue"><strong>${escapeHTML(t('card.virtue', lang))}:</strong> ${escapeHTML(virtue)}</p>` : ''}
    ${show.reference && refParts ? `<p class="card__reference">${icon('book', { size: 14 })} ${escapeHTML(refParts)}</p>` : ''}
    ${show.reference && item.reference?.notes ? `<p class="card__reference-note">${escapeHTML(item.reference.notes)}</p>` : ''}
    ${show.notes && item.notes ? `<p class="card__attribution">${icon('info', { size: 12 })} ${escapeHTML(item.notes)}</p>` : ''}

    <footer class="card__footer">
      <!-- (v4.5, APP-FLOW I6) the CARD BODY is the count target (see the
           article's data-action above) — counting never requires aiming at
           this small pill. The pill stays as the keyboard/SR control and
           the visual progress readout; No aria-live on its label: every
           tap is announced once by the global #counter-announcer
           (services/tasbih.js). -->
      <button type="button" class="counter-pill${done ? ' counter-pill--done' : ''}" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" data-target="${escapeHTML(String(target))}">
        <span class="counter-pill__ring" style="--progress:${progressPct}%"></span>
        <span class="counter-pill__label" dir="ltr">${escapeHTML(String(displayCount))} / ${escapeHTML(String(target))}</span>
        ${done ? `<span class="counter-pill__cycles">✓${cycles > 1 ? escapeHTML(String(cycles)) : ''}</span>` : ''}
      </button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="open-focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}">
        ${t('card.openFocus', lang)}
      </button>
    </footer>
  </article>`;
}

/** A minimal one-line card used inside dense lists (search suggestions, collection pickers). */
export function miniCardHTML(item, lang = 'en') {
  const title = pickLocale(item.title, lang) || item.transliteration;
  return `
  <button type="button" class="mini-card" data-action="open-focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(item.category_id)}">
    <span class="mini-card__title">${escapeHTML(title)}</span>
    <span class="mini-card__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic.slice(0, 40))}${item.arabic.length > 40 ? '\u2026' : ''}</span>
  </button>`;
}
