/**
 * views/focus.js
 * Full-bleed, distraction-free reading/counting mode for one item at a time,
 * with previous/next navigation through the rest of its category.
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { hasVerifiedDhikrAudio } from '../core/schema.js';
import { escapeHTML, dateKey, categoryDisplayName } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { referenceLineFor, noteFor } from '../domain/localeContent.js';
import { selectors } from '../core/state.js';
import { notFoundStateHTML } from '../ui/emptyState.js';
import { azkarModeSwitchHTML } from '../ui/shell.js';
import { skeletonLines } from '../ui/skeleton.js';
import { VIEWS } from '../core/config.js';
import { gradeChipHTML, gradeStateOf } from '../domain/grades.js';
import { disclosureHTML } from '../ui/card.js';
import { listCompletion } from '../domain/reflections.js';
import { wasJustCompleted } from '../services/tasbih.js';
import { visibleCategoryItems, itemTargetOf } from '../services/contentPrefs.js';
import { hasPendingScholarlyReview } from '../domain/contentLens.js';

function findCategory(state, categoryId) {
  const docs = [...Object.values(state.library.documents), ...Object.values(state.customContent)];
  for (const doc of docs) {
    const cat = doc.categories.find((c) => c.id === categoryId);
    if (cat) return cat;
  }
  return null;
}

/**
 * (v5.2.24) Item-change transition memory, view-local on purpose. The
 * renderer re-renders on every tap (the counter), but the slide must play
 * ONLY when the item itself changes — so the last shown item key + index
 * live here, next to the template that reads them. Same item, no class,
 * no replay; new item, one directional slide. Session memory only.
 */
let lastFocusKey = null;
let lastFocusIdx = -1;

/**
 * Pure directional-enter decision (unit-tested): forward slides from the
 * reading-start side, back from the other. `last` is { key, idx } | null.
 */
export function focusEnterClass(key, idx, last) {
  if (last && last.key === key) return '';
  return idx >= (last?.idx ?? -1) ? ' focus--enter-next' : ' focus--enter-prev';
}

/**
 * (v5.17.20) A bare #/focus used to render "Item not found" — and the
 * palette launches Focus with no parameters, so tapping it in the app's own
 * launcher produced a dead end. A paramless Focus is a question, not an
 * error: "what would you like to focus on?" So answer it with the categories
 * that actually have visible items, and drop into the first one on tap.
 */
function focusPickerHTML(state, lang) {
  const docs = [
    ...Object.values(state.library.documents || {}),
    ...Object.values(state.customContent || {}),
  ];
  const rows = [];
  for (const doc of docs) {
    for (const cat of doc.categories || []) {
      const items = visibleCategoryItems(state, cat);
      if (!items.length) continue;
      const first = items[0];
      rows.push(`<li class="focus-picker__row">
        <a class="focus-picker__link" href="${buildHash(VIEWS.FOCUS, { id: cat.id, subId: first.id })}" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${escapeHTML(first.id)}">
          <span class="focus-picker__name">${escapeHTML(t(`cat.${cat.id}`, lang) === `cat.${cat.id}` ? cat.title || cat.id : t(`cat.${cat.id}`, lang))}</span>
          <span class="focus-picker__count">${escapeHTML(t('collections.itemCount', lang, { n: items.length }))}</span>
        </a>
      </li>`);
    }
  }
  if (!rows.length) {
    // A loading state must never wear an error's clothes. Before the library
    // index arrives there is nothing to list, and that is "not yet", not
    // "not found" — a bare #/focus during a cold boot used to show exactly
    // that false error whenever the index was still in flight.
    const loading =
      !state.library?.documents ||
      !Object.keys(state.library.documents).length ||
      !state.library?.itemIndex;
    if (loading) {
      return `<section class="view"><div class="view__loading" aria-busy="true">${skeletonLines(3)}</div></section>`;
    }
    // Genuinely nothing to focus on: that is an honest empty state.
    return `<section class="view">${notFoundStateHTML({ title: t('common.notFoundItem', lang), lang, t })}</section>`;
  }
  return `<section class="view view--focus-picker">
    <header class="view-header">
      <a class="back-link" href="${buildHash(VIEWS.LIBRARY)}" data-action="navigate" data-view="${VIEWS.LIBRARY}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('nav.azkar', lang)}</a>
      <h1 class="view__title">${t('focus.pickerTitle', lang)}</h1>
    </header>
    ${azkarModeSwitchHTML(state.activeView, lang)}
    <p class="panel__subtext">${t('focus.pickerHint', lang)}</p>
    <ul class="focus-picker">${rows.join('')}</ul>
  </section>`;
}

export function renderFocus(state) {
  const lang = state.settings.language;
  const categoryId = state.activeParams.id;
  const itemId = state.activeParams.subId;
  const cat = findCategory(state, categoryId);
  const item = visibleCategoryItems(state, cat).find((i) => i.id === itemId);

  // No category asked for yet: show the picker rather than a dead end. A
  // mistyped id must NOT get the picker — that would dress a broken link up
  // as a working page.
  if (!categoryId) return focusPickerHTML(state, lang);

  if (!cat || !item) {
    // (v5.12.1 UX audit S13) same shared recovery state (Go home) as
    // category/mood/collection. A typed or stale id is genuinely not-found.
    return `<section class="view">${notFoundStateHTML({ title: t('common.notFoundItem', lang), lang, t })}</section>`;
  }

  // (v4.5.2) Focus follows the manage lens: hidden items are skipped and
  // the effective target (override > corpus default) drives the counter,
  // so the arrangement you set in manage mode is exactly what you recite.
  const items = visibleCategoryItems(state, cat);
  const idx = items.findIndex((i) => i.id === itemId);
  const prevItem = items[idx - 1] || null;
  const nextItem = items[idx + 1] || null;

  const categoryName = categoryDisplayName(cat, lang);

  const counter = selectors.getCounter(state, item.id) || {
    count: 0,
    target: itemTargetOf(state, item),
    completedCycles: 0,
  };
  const isFav = selectors.isFavorite(state, item.id);
  const isSpeaking = state.speakingItemId === item.id;
  // (v5.17.30, OPEN-ISSUES #15 infra only) recitation twin of isSpeaking —
  // same conditional-button contract as ui/card.js: verified clip only,
  // absent audio renders no button, parked in by-heart mode like Listen.
  const isPlayingAudio = state.dhikrAudioItemId === item.id;
  const dhikrAudio = hasVerifiedDhikrAudio(item) ? item.audio : null;
  const dhikrAudioLabel = t(isPlayingAudio ? 'card.stopDhikrAudio' : 'card.playDhikrAudio', lang);
  const dhikrAudioCredit = dhikrAudio
    ? [dhikrAudio.reciter, dhikrAudio.source].filter(Boolean).join(' · ')
    : '';
  const dhikrAudioTitle = dhikrAudioCredit
    ? `${dhikrAudioLabel} — ${dhikrAudioCredit}`
    : dhikrAudioLabel;
  // Strict language separation rides the shared disclosure builder (the
  // same contract as ui/card.js): AR shows the Arabic matn + Arabic
  // virtue/source only; transliteration/translation render in EN only,
  // with no cross-language fallback. (Built after `bh` below — by-heart
  // hides the transliteration giveaway exactly like the card.)
  // (DATA-01) honest grades — see ui/card.js: an explicit Unknown stays in
  // the open header, never hidden; a source-backed grade rides the
  // disclosure block.
  const gradeChip = gradeStateOf(item.grade) === 'unknown' ? gradeChipHTML(item.grade, lang) : '';
  // (v5.17.52) session queue: play-through-category progress reuses the
  // category's own completion math (rule 6) over the same visible items the
  // prev/next arrows walk — position says where you are, this says how much
  // of today's pass is done. Completion is stated plainly, never celebrated.
  const session = listCompletion(items, state.counters, dateKey(new Date()));
  const sessionDone = session.total > 0 && session.done >= session.total;
  const refLine = referenceLineFor(item, lang, t('card.narratedBy', lang));
  const refNotes = noteFor(item.reference?.notes, lang, item);
  const notes = noteFor(item.notes, lang);
  const reviewWarning = hasPendingScholarlyReview(item);
  const pct = Math.min(100, Math.round((counter.count / Math.max(1, counter.target)) * 100));
  // (v5.2.24) directional enter: forward slides from the reading-start
  // side, back from the other — auto-advance (+1) always slides forward.
  const focusKey = `${cat.id}:${item.id}`;
  const enterClass = focusEnterClass(focusKey, idx, { key: lastFocusKey, idx: lastFocusIdx });
  lastFocusKey = focusKey;
  lastFocusIdx = idx;
  // By-heart mode: the focus stage hides Arabic + transliteration behind
  // the same reveal tap as the category cards, with recall grading below.
  // Listening is parked in this mode — hearing the Arabic IS the answer.
  const bh =
    state.byHeart?.categoryId === cat.id
      ? {
          revealed: state.byHeart?.revealed?.[item.id] === true,
          due: state.byHeartRecords?.[item.id]?.due || '',
        }
      : null;
  // (v5.2.25) separation of concerns, same as the card pill: the
  // counter shows ONLY live session progress — the lifetime cycles moved
  // to the small badge under the hint, never into the tap number.
  const focusDone = counter.count >= counter.target;
  const lifetimeCycles = counter.completedCycles || 0;
  const disclosure = disclosureHTML(item, lang, {
    showTransliteration: state.settings.showTransliteration,
    showTranslation: state.settings.showTranslation,
    showVirtues: true,
    showGrade: true,
    byHeart: !!bh,
    prefix: 'focus',
  });

  return `
  <section class="focus${enterClass}" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}">
    <h1 class="sr-only">${t('title.focus', lang)}</h1>
    <header class="focus__top">
      <button type="button" class="icon-btn" data-action="focus-exit" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('focus.exit', lang)}">${icon('close', { size: 22 })}</button>
      <div class="focus__identity">
        <span class="focus__category">${escapeHTML(categoryName)}</span>
        <span class="focus__position" dir="ltr">${idx + 1} / ${items.length}</span>
      </div>
      <div class="focus__top-actions">
        ${
          bh
            ? ''
            : `<button type="button" class="icon-btn icon-btn--play ${isSpeaking ? 'icon-btn--playing' : ''}" data-action="toggle-speech" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isSpeaking}" aria-label="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}" title="${t(isSpeaking ? 'card.stop' : 'card.listen', lang)}">
          ${icon(isSpeaking ? 'stop' : 'volume', { size: 20 })}
        </button>`
        }
        ${
          bh || !dhikrAudio
            ? ''
            : `<button type="button" class="icon-btn icon-btn--play ${isPlayingAudio ? 'icon-btn--playing' : ''}" data-action="play-dhikr-audio" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isPlayingAudio}" aria-label="${dhikrAudioLabel}" title="${escapeHTML(dhikrAudioTitle)}">
          ${icon(isPlayingAudio ? 'stop' : 'play', { size: 20 })}
        </button>`
        }
        <button type="button" class="icon-btn ${isFav ? 'icon-btn--active' : ''}" data-action="toggle-favorite" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isFav}" aria-label="${t('card.favorite', lang)}">
          ${icon(isFav ? 'heart-filled' : 'heart', { size: 20 })}
        </button>
      </div>
    </header>
    <div class="focus__progress" role="progressbar" aria-valuenow="${idx + 1}" aria-valuemin="1" aria-valuemax="${items.length}" aria-label="${escapeHTML(t('focus.progress', lang, { count: idx + 1, target: items.length }))}">
      <span class="focus__progress-fill" style="--focus-pct:${Math.max(0, Math.min(100, ((idx + 1) / Math.max(1, items.length)) * 100))}%"></span>
    </div>

    <!-- (v4.5, APP-FLOW I7) THE STAGE IS THE BUTTON: the whole scrollable
         content area counts on tap, exactly like the card body in windowed
         lists — no aiming for the dial. The dial button below stays as the
         keyboard/SR control and the progress visual; clicks land here only
         when they don't hit an inner control first (event delegation
         resolves the closest [data-action]). Drag-scrolling never fires a
         click, so scrolling to re-read never mis-counts. -->
    <div class="focus__scroll" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" data-target="${escapeHTML(String(counter.target))}">
      <div class="focus__content">
        ${gradeChip}
        ${reviewWarning ? `<p class="content-review-warning" role="note">${icon('info', { size: 14 })} ${escapeHTML(t('content.reviewPending', lang))}</p>` : ''}
        ${
          bh && !bh.revealed
            ? `<button type="button" class="hadith-card__cloze" data-action="byheart-reveal" data-item-id="${escapeHTML(item.id)}" aria-label="${t('hifz.reveal', lang)}">${t('hifz.reveal', lang)}</button>`
            : `<p class="focus__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic)}</p>`
        }
        ${disclosure}
        ${
          bh
            ? `
        <div class="hadith-card__mem">
          ${bh.due ? `<span class="hifz-due" dir="auto">${t('hifz.memorizedBadge', lang, { date: bh.due })}</span>` : ''}
          <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="again" title="${t('hifz.struggled', lang)}">
            ${t('hifz.again', lang)}
          </button>
          <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="hard" title="${t('hifz.hard', lang)}">
            ${t('hifz.hard', lang)}
          </button>
          <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="good" title="${t('hifz.recalled', lang)}">
            ${t('hifz.good', lang)}
          </button>
          <button type="button" class="chip" data-action="byheart-review" data-item-id="${escapeHTML(item.id)}" data-grade="easy" title="${t('hifz.recalled', lang)}">
            ${t('hifz.easy', lang)}
          </button>
        </div>`
            : ''
        }
        ${session.total ? `<p class="focus__session">${escapeHTML(t('category.progressToday', lang, { done: session.done, total: session.total, pct: session.pct }))}</p>` : ''}
        ${sessionDone ? `<p class="focus__complete">${escapeHTML(t('focus.sessionComplete', lang))}</p>` : ''}
        ${refLine ? `<p class="focus__reference">${icon('book', { size: 14 })} ${escapeHTML(refLine)}</p>` : ''}
        ${refNotes ? `<p class="focus__reference-note">${escapeHTML(refNotes)}</p>` : ''}
        ${notes ? `<p class="focus__attribution">${icon('info', { size: 12 })} ${escapeHTML(notes)}</p>` : ''}
      </div>
    </div>

    <!-- (v5.1.0) ONE compact control bar instead of the 180px dial + hint +
         nav stack that ate a third of the screen: reset, prev/next, the
         64px progress counter, and the card menu. The stage above keeps
         ALL the room, and it scrolls (see the overflow fix in cards.css). -->
    <p class="focus__hint${wasJustCompleted(item.id) ? ' is-just-completed' : ''}">${t('focus.tapToCount', lang)}</p>
    ${lifetimeCycles > 0 ? `<p class="focus__lifetime" title="${escapeHTML(t('card.completedTimes', lang, { n: lifetimeCycles }))}">✓ ${escapeHTML(String(lifetimeCycles))}×</p>` : ''}
    <footer class="focus__bar">
      <button type="button" class="icon-btn" data-action="focus-reset" data-item-id="${escapeHTML(item.id)}" data-target="${escapeHTML(String(counter.target))}" aria-label="${t('focus.reset', lang)}" title="${t('focus.reset', lang)}">
        ${icon('refresh', { size: 20 })}
      </button>
      <div class="focus__bar-arrows">
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${prevItem ? escapeHTML(prevItem.id) : ''}" ${prevItem ? '' : 'disabled'} aria-label="${t('focus.previous', lang)}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 20 })}</button>
        <button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.FOCUS}" data-id="${escapeHTML(cat.id)}" data-sub-id="${nextItem ? escapeHTML(nextItem.id) : ''}" ${nextItem ? '' : 'disabled'} aria-label="${t('focus.next', lang)}">${icon(isRTL(lang) ? 'chevronLeft' : 'chevronRight', { size: 20 })}</button>
      </div>
      <button type="button" class="focus__counter${wasJustCompleted(item.id) ? ' is-just-completed' : ''}${focusDone ? ' is-done' : ''}" dir="ltr" data-action="counter-tap" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" data-target="${escapeHTML(String(counter.target))}" aria-label="${t('focus.tapToCount', lang)} — ${t('focus.progress', lang, { count: counter.count, target: counter.target })}">
        <svg class="focus__ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="27" class="focus__ring-track"/>
          <circle cx="32" cy="32" r="27" class="focus__ring-fill" style="--pct:${pct}"/>
        </svg>
        <span class="focus__counter-num" aria-hidden="true">${escapeHTML(String(counter.count))}${focusDone ? ' ✓' : ''}</span>
        <span class="focus__counter-den" aria-hidden="true">/ ${escapeHTML(String(counter.target))}</span>
      </button>
      <button type="button" class="icon-btn" data-action="open-card-menu" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(cat.id)}" aria-label="${t('card.more', lang)}" title="${t('card.more', lang)}">
        ${icon('more', { size: 20 })}
      </button>
    </footer>
  </section>`;
}
