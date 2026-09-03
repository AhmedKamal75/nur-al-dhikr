/**
 * views/focus.js
 * Full-bleed, distraction-free reading/counting mode for one item at a time,
 * with previous/next navigation through the rest of its category.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { pickLocale, escapeHTML } from '../core/utils.js';
import { selectors } from '../core/state.js';
import { VIEWS, GRADE_LABELS } from '../core/config.js';
import { wasJustCompleted } from '../services/tasbih.js';
import { visibleCategoryItems, itemTargetOf } from '../services/contentPrefs.js';

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
  const item = visibleCategoryItems(state, cat).find((i) => i.id === itemId);

  if (!cat || !item) {
    return `<section class="view"><p class="empty-hint">${t('common.notFoundItem', lang)}</p></section>`;
  }

  // (v4.5.2) Focus follows the manage lens: hidden items are skipped and
  // the effective target (override > corpus default) drives the counter,
  // so the arrangement you set in manage mode is exactly what you recite.
  const items = visibleCategoryItems(state, cat);
  const idx = items.findIndex((i) => i.id === itemId);
  const prevItem = items[idx - 1] || null;
  const nextItem = items[idx + 1] || null;

  const counter = selectors.getCounter(state, item.id) || {
    count: 0,
    target: itemTargetOf(state, item),
    completedCycles: 0,
  };
  const isFav = selectors.isFavorite(state, item.id);
  const isSpeaking = state.speakingItemId === item.id;
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
  const pct = Math.min(100, Math.round((counter.count / Math.max(1, counter.target)) * 100));
  // (v5.0.0) Same "done / target ✓" contract as the card pill: resting
  // after a completed cycle the dial shows the completed count (1 / 1 with
  // the check), never 0 / 1.
  const restingDone = counter.count === 0 && counter.completedCycles > 0;
  const displayCount = restingDone ? counter.completedCycles : counter.count;
  const focusDone = restingDone || counter.count >= counter.target;

  return `
  <section class="focus" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}">
    <h1 class="sr-only">${t('title.focus', lang)}</h1>
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

    <!-- (v4.5, APP-FLOW I7) THE STAGE IS THE BUTTON: the whole scrollable
         content area counts on tap, exactly like the card body in windowed
         lists — no aiming for the dial. The dial button below stays as the
         keyboard/SR control and the progress visual; clicks land here only
         when they don't hit an inner control first (event delegation
         resolves the closest [data-action]). Drag-scrolling never fires a
         click, so scrolling to re-read never mis-counts. -->
    <div class="focus__scroll" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" data-target="${escapeHTML(String(counter.target))}">
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

    <!-- (v5.1.0) ONE compact control bar instead of the 180px dial + hint +
         nav stack that ate a third of the screen: reset, prev/next, the
         64px progress counter, and the card menu. The stage above keeps
         ALL the room, and it scrolls (see the overflow fix in cards.css). -->
    <p class="focus__hint${wasJustCompleted(item.id) ? ' is-just-completed' : ''}">${t('focus.tapToCount', lang)}</p>
    <footer class="focus__bar">
      <button type="button" class="icon-btn" data-action="focus-reset" data-item-id="${escapeHTML(item.id)}" data-target="${escapeHTML(String(counter.target))}" aria-label="${t('focus.reset', lang)}" title="${t('focus.reset', lang)}">
        ${icon('refresh', { size: 20 })}
      </button>
      <div class="focus__bar-arrows">
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${prevItem ? escapeHTML(prevItem.id) : ''}" ${prevItem ? '' : 'disabled'} aria-label="${t('focus.previous', lang)}">${icon('chevronLeft', { size: 20 })}</button>
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${nextItem ? escapeHTML(nextItem.id) : ''}" ${nextItem ? '' : 'disabled'} aria-label="${t('focus.next', lang)}">${icon('chevronRight', { size: 20 })}</button>
      </div>
      <button type="button" class="focus__counter${wasJustCompleted(item.id) ? ' is-just-completed' : ''}${focusDone ? ' is-done' : ''}" dir="ltr" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" data-target="${escapeHTML(String(counter.target))}" aria-label="${t('focus.tapToCount', lang)} — ${t('focus.progress', lang, { count: displayCount, target: counter.target })}">
        <svg class="focus__ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="27" class="focus__ring-track"/>
          <circle cx="32" cy="32" r="27" class="focus__ring-fill" style="--pct:${restingDone ? 100 : pct}"/>
        </svg>
        <span class="focus__counter-num" aria-hidden="true">${escapeHTML(String(displayCount))}${focusDone ? ' ✓' : ''}</span>
        <span class="focus__counter-den" aria-hidden="true">/ ${escapeHTML(String(counter.target))}</span>
      </button>
      <button type="button" class="icon-btn" data-action="open-card-menu" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('card.more', lang)}" title="${t('card.more', lang)}">
        ${icon('more', { size: 20 })}
      </button>
    </footer>
  </section>`;
}

export function focusUrl(categoryId, itemId) {
  return buildHash(VIEWS.FOCUS, { id: categoryId, subId: itemId });
}
