/**
 * views/focus.js
 * Full-bleed, distraction-free reading/counting mode for one item at a time,
 * with previous/next navigation through the rest of its category.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { pickLocale, escapeHTML } from '../utils.js';
import { selectors } from '../state.js';
import { VIEWS, GRADE_LABELS } from '../config.js';

function findCategory(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return cat;
  }
  return null;
}

export function renderFocus(state) {
  const lang = state.settings.language;
  const categoryId = state.activeParams.id;
  const itemId = state.activeParams.subId;
  const cat = findCategory(state, categoryId);
  const item = cat?.items.find((i) => i.id === itemId);

  if (!cat || !item) {
    return `<section class="view"><p class="empty-hint">Item not found.</p></section>`;
  }

  const items = [...cat.items].sort((a, b) => a.order - b.order);
  const idx = items.findIndex((i) => i.id === itemId);
  const prevItem = items[idx - 1] || null;
  const nextItem = items[idx + 1] || null;

  const counter = selectors.getCounter(state, item.id) || { count: 0, target: item.repetitions || 1, completedCycles: 0 };
  const isFav = selectors.isFavorite(state, item.id);
  const isSpeaking = state.speakingItemId === item.id;
  const translation = pickLocale(item.translation, lang);
  const virtue = pickLocale(item.virtues, lang);
  const gradeLabel = GRADE_LABELS[item.grade] ? pickLocale(GRADE_LABELS[item.grade], lang) : item.grade;
  const refParts = [item.reference?.collection, item.reference?.hadith, item.reference?.narrator ? `${t('card.narratedBy', lang)} ${item.reference.narrator}` : '', item.reference?.grading].filter(Boolean).join(' \u00B7 ');
  const pct = Math.min(100, Math.round((counter.count / Math.max(1, counter.target)) * 100));

  return `
  <section class="focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}">
    <header class="focus__top">
      <button type="button" class="icon-btn" data-action="focus-exit" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('focus.exit', lang)}">${icon('close', { size: 22 })}</button>
      <span class="focus__position" dir="ltr">${idx + 1} / ${items.length}</span>
      <div class="focus__top-actions">
        <button type="button" class="icon-btn icon-btn--play ${isSpeaking ? 'icon-btn--playing' : ''}" data-action="toggle-speech" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isSpeaking}" aria-label="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}" title="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}">
          ${icon(isSpeaking ? 'stop' : 'volume', { size: 20 })}
        </button>
        <button type="button" class="icon-btn ${isFav ? 'icon-btn--active' : ''}" data-action="toggle-favorite" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isFav}" aria-label="${t('card.favorite', lang)}">
          ${icon(isFav ? 'heart-filled' : 'heart', { size: 20 })}
        </button>
      </div>
    </header>

    <div class="focus__scroll">
      <div class="focus__content">
        ${item.grade ? `<span class="chip chip--grade chip--grade-${escapeHTML(item.grade.toLowerCase())}">${escapeHTML(gradeLabel)}</span>` : ''}
        <p class="focus__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic)}</p>
        ${state.settings.showTransliteration && item.transliteration ? `<p class="focus__translit">${escapeHTML(item.transliteration)}</p>` : ''}
        ${state.settings.showTranslation && translation ? `<p class="focus__translation">${escapeHTML(translation)}</p>` : ''}
        ${virtue ? `<p class="focus__virtue"><strong>${escapeHTML(t('card.virtue', lang))}:</strong> ${escapeHTML(virtue)}</p>` : ''}
        ${refParts ? `<p class="focus__reference">${icon('book', { size: 14 })} ${escapeHTML(refParts)}</p>` : ''}
        ${item.reference?.notes ? `<p class="focus__reference-note">${escapeHTML(item.reference.notes)}</p>` : ''}
        ${item.notes ? `<p class="focus__attribution">${icon('info', { size: 12 })} ${escapeHTML(item.notes)}</p>` : ''}
      </div>
    </div>

    <button type="button" class="focus__counter" dir="ltr" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" data-target="${counter.target}" aria-label="${t('focus.tapToCount', lang)}">
      <svg class="focus__ring" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" class="focus__ring-track"/>
        <circle cx="60" cy="60" r="52" class="focus__ring-fill" style="--pct:${pct}"/>
      </svg>
      <span class="focus__count" aria-live="polite" aria-atomic="true">${counter.count}</span>
      <span class="focus__target">/ ${counter.target}</span>
    </button>
    <p class="focus__hint">${t('focus.tapToCount', lang)}</p>

    <footer class="focus__nav">
      <button type="button" class="btn btn--ghost" data-action="focus-reset" data-item-id="${escapeHTML(item.id)}" data-target="${counter.target}">${t('focus.reset', lang)}</button>
      <div class="focus__nav-arrows">
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${prevItem ? escapeHTML(prevItem.id) : ''}" ${prevItem ? '' : 'disabled'} aria-label="${t('focus.previous', lang)}">${icon('chevronLeft', { size: 20 })}</button>
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${nextItem ? escapeHTML(nextItem.id) : ''}" ${nextItem ? '' : 'disabled'} aria-label="${t('focus.next', lang)}">${icon('chevronRight', { size: 20 })}</button>
      </div>
      <button type="button" class="btn btn--ghost" data-action="open-card-menu" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}">${t('card.more', lang)}</button>
    </footer>
  </section>`;
}

export function focusUrl(categoryId, itemId) {
  return buildHash(VIEWS.FOCUS, { id: categoryId, subId: itemId });
}
