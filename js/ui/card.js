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

import { escapeHTML, highlightMatch, pickLocale } from '../core/utils.js';
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
  hasPendingScholarlyReview,
} from '../domain/localeContent.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { missingDataHTML } from './missingData.js';
import { hasVerifiedDhikrAudio } from '../core/schema.js';
// SANCTIONED (DATA-01): grades.js is pure (core/config + core/utils only,
// no state/services), same class as localeContent above.
// eslint-disable-next-line no-restricted-imports
import { gradeChipHTML, gradeStateOf } from '../domain/grades.js';
import { buildHash } from '../core/router.js';
// eslint-disable-next-line no-restricted-imports -- sanctioned (see above)
import { isDismissed, wasCompletedRecently } from '../domain/completedCards.js';

/**
 * (v5.17.52) Progressive disclosure — the one collapsed block shared by the
 * card and Focus (rule 6: a single builder, so the two surfaces cannot
 * drift from each other). Arabic stays first and always visible; the
 * supplementary rows — transliteration, translation, virtue, and a
 * source-backed grade — ride one tap behind a labelled <details>, which is
 * natively keyboard-operable and announced, so Elder/a11y needs no extra
 * wiring. Row labels reuse the existing content.field* / card.virtue keys;
 * only the summary label is new (card.details, twinned). Inner content
 * keeps the caller's class prefix (card__ / focus__) so existing
 * typography applies unchanged.
 *
 * Honest-absence rule: an explicit `Unknown` grade is NEVER hidden — the
 * caller keeps that chip in the open and this builder rows only a VALID
 * grade. Missing/malformed grades render nowhere. A missing translation is
 * stated through the ONE missing-data pattern (merged-plan item 6) — EN
 * only, like the translation row itself. Returns '' when every row is
 * empty, so callers emit no hollow disclosure.
 */
export function disclosureHTML(item, lang = 'en', opts = {}) {
  const {
    showTransliteration = true,
    showTranslation = true,
    showVirtues = true,
    showGrade = true,
    byHeart = false,
    highlight = [],
    prefix = 'card',
  } = opts;
  const hl = Array.isArray(highlight) ? highlight : [];
  // Same strict separation as the callers: transliteration/translation are
  // EN-only, virtue reads the active side exclusively, and by-heart hides
  // the transliteration giveaway exactly like the open layout did.
  const showTranslit = !byHeart && showTransliterationFor(lang, showTransliteration);
  const showTrans = showTranslationFor(lang, showTranslation);
  const translation = showTrans ? translationFor(item, lang) : '';
  const virtue = showVirtues ? virtueFor(item, lang) : '';
  const rows = [];
  if (showTranslit && item.transliteration) {
    rows.push(
      `<div class="disclosure__row"><dt class="disclosure__term">${escapeHTML(t('content.fieldTranslit', lang))}</dt><dd class="disclosure__def ${prefix}__translit">${highlightMatch(item.transliteration, hl)}</dd></div>`
    );
  }
  if (showTrans && translation) {
    rows.push(
      `<div class="disclosure__row"><dt class="disclosure__term">${escapeHTML(t('content.fieldTranslation', lang))}</dt><dd class="disclosure__def ${prefix}__translation">${highlightMatch(translation, hl)}</dd></div>`
    );
  }
  // (v5.17.53, merged-plan item 6) a missing translation is stated, never
  // silently omitted — EN only, exactly like the translation row (AR never
  // expects one; toggle-off stays silent: a hidden field is a choice).
  if (showTrans && !translation) {
    rows.push(
      `<div class="disclosure__row"><dt class="disclosure__term">${escapeHTML(t('content.fieldTranslation', lang))}</dt><dd class="disclosure__def">${missingDataHTML({ kind: 'translation-missing', lang, t })}</dd></div>`
    );
  }
  if (virtue) {
    rows.push(
      `<div class="disclosure__row"><dt class="disclosure__term">${escapeHTML(t('card.virtue', lang))}</dt><dd class="disclosure__def ${prefix}__virtue">${highlightMatch(virtue, hl)}</dd></div>`
    );
  }
  if (showGrade && gradeStateOf(item.grade) === 'valid') {
    rows.push(
      `<div class="disclosure__row"><dt class="disclosure__term">${escapeHTML(t('content.fieldGrade', lang))}</dt><dd class="disclosure__def">${gradeChipHTML(item.grade, lang)}</dd></div>`
    );
  }
  if (!rows.length) return '';
  return `<details class="disclosure ${prefix}__disclosure"><summary class="disclosure__summary">${escapeHTML(t('card.details', lang))}</summary><dl class="disclosure__list">${rows.join('')}</dl></details>`;
}

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
    // (v5.17.30) per-dhikr recitation highlight twin of isSpeaking —
    // callers pass state.dhikrAudioItemId === item.id. A caller that does
    // not know the key gets the honest default (not playing).
    isPlayingAudio = false,
    counter = null,
    showTransliteration = true,
    showTranslation = true,
    compact = false,
    fields = null,
    byHeart = null,
    highlight = [],
  } = opts;
  const hl = Array.isArray(highlight) ? highlight : [];

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
  // (DATA-01) honest grades: only source-backed values render a chip;
  // Unknown renders the uncertain "Unverified" chip, missing/malformed
  // render nothing — never an authoritative-looking raw string.
  // (v5.17.52) progressive disclosure: the uncertain chip stays in the
  // open header — Unknown is never hidden — while a source-backed grade
  // moves into the collapsed disclosure block (see disclosureHTML).
  const gradeChip = show.grade ? gradeChipHTML(item.grade, lang) : '';
  const headerGradeChip = show.grade && gradeStateOf(item.grade) === 'unknown' ? gradeChip : '';
  // Strict language separation lives inside disclosureHTML now (same
  // contract: transliteration/translation EN-only, virtue active-side
  // only); the reference/notes lines below stay open as provenance.
  const disclosure = disclosureHTML(item, lang, {
    showTransliteration: show.transliteration,
    showTranslation: show.translation,
    showVirtues: show.virtues,
    showGrade: show.grade,
    byHeart: !!byHeart,
    highlight: hl,
    prefix: 'card',
  });
  const refLine = show.reference ? referenceLineFor(item, lang, t('card.narratedBy', lang)) : '';
  const refNotes = show.reference ? noteFor(item.reference?.notes, lang, item) : '';
  const notes = show.notes ? noteFor(item.notes, lang) : '';
  const reviewWarning = hasPendingScholarlyReview(item);
  // The EFFECTIVE item target is authoritative (the user's manage-mode
  // override already rides `item.repetitions` — views map items through
  // withEffectiveTargets), so a counter record left stale by an older
  // build or a restored backup can never quietly shrink the target the
  // person set. The pill readout and the article's data-target below share
  // this ONE value, so what the card says is what a tap counts toward.
  const target = item.repetitions || counter?.target || 1;
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

  // (v5.17.30, OPEN-ISSUES #15 infra only) the recitation button renders
  // ONLY where a verified clip exists (absent audio → no button, never a
  // dead one). It is deliberately a different control from the synthesiser
  // button below (play icon vs volume icon, "Play recitation" vs "Listen")
  // so TTS can never masquerade as recitation. Hidden in by-heart mode for
  // the same reason Listen is — hearing the Arabic IS the answer.
  const dhikrAudio = hasVerifiedDhikrAudio(item) ? item.audio : null;
  const dhikrAudioLabel = t(isPlayingAudio ? 'card.stopDhikrAudio' : 'card.playDhikrAudio', lang);
  const dhikrAudioCredit = dhikrAudio
    ? [dhikrAudio.reciter, dhikrAudio.source].filter(Boolean).join(' · ')
    : '';
  const dhikrAudioTitle = dhikrAudioCredit
    ? `${dhikrAudioLabel} — ${dhikrAudioCredit}`
    : dhikrAudioLabel;

  return `
  <article class="card ${compact ? 'card--compact' : ''}${exitingClass}" data-item-id="${escapeHTML(item.id)}" data-category-id="${escapeHTML(category?.id || item.category_id || '')}" data-action="counter-tap" data-target="${escapeHTML(String(target))}" ${cycles > 0 ? `title="${escapeHTML(t('card.completedTimes', lang, { n: cycles }))}"` : ''}>
    <header class="card__top">
      <div class="card__meta">
        ${categoryChip}
        ${headerGradeChip}
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
        ${
          byHeart || !dhikrAudio
            ? ''
            : `<button type="button" class="icon-btn icon-btn--play ${isPlayingAudio ? 'icon-btn--playing' : ''}" data-action="play-dhikr-audio" data-item-id="${escapeHTML(item.id)}" aria-pressed="${isPlayingAudio}" aria-label="${dhikrAudioLabel}" title="${escapeHTML(dhikrAudioTitle)}">
          ${icon(isPlayingAudio ? 'stop' : 'play', { size: 18 })}
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

    ${title ? `<h3 class="card__title">${highlightMatch(title, hl)}</h3>` : ''}
    ${
      reviewWarning
        ? `<p class="content-review-warning" role="note">${icon('info', { size: 14 })} ${escapeHTML(t('content.reviewPending', lang))}</p>`
        : ''
    }

    ${
      byHeart && !byHeart.revealed && item.arabic
        ? `<button type="button" class="hadith-card__cloze" data-action="byheart-reveal" data-item-id="${escapeHTML(item.id)}" aria-label="${t('hifz.reveal', lang)}">${t('hifz.reveal', lang)}</button>`
        : item.arabic
          ? `<p class="card__arabic" lang="ar" dir="rtl">${escapeHTML(item.arabic)}</p>`
          : ''
    }
    ${disclosure}
    ${show.reference && refLine ? `<p class="card__reference">${icon('book', { size: 14 })} ${escapeHTML(refLine)}</p>` : ''}
    ${show.reference && refNotes ? `<p class="card__reference-note">${escapeHTML(refNotes)}</p>` : ''}
    ${show.notes && notes ? `<p class="card__attribution">${icon('info', { size: 12 })} ${escapeHTML(notes)}</p>` : ''}

    ${
      byHeart
        ? `
    <div class="hadith-card__mem">
      ${byHeart.due ? `<span class="hifz-due" dir="auto">${t('hifz.memorizedBadge', lang, { date: byHeart.due })}</span>` : ''}
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
