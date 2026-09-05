/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { scheduleAutoAdvance } from '../focusRuntime.js';
import { ensureHadithBook, ensureHadithIndex, scrollToHadithListTop } from '../hadithData.js';
import { getItemEntry, itemClipboardText } from '../shared.js';
import { asTranslationEdition, TRANSLATION_EDITIONS, VIEWS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { go } from '../../core/router.js';
import { actions, store } from '../../core/state.js';
import { escapeHTML, pickLocale, uid } from '../../core/utils.js';
// (v4.3) shareCard.js (553 lines of canvas rendering) is imported lazily:
// it is only ever needed on an explicit share/download tap, so every boot
// used to pay for code nobody opened. Both callers are async handlers, so
// `await import()` costs nothing extra.
import {
  buildCardMenu,
  buildCollectionPicker,
  buildConfirm,
  buildTextPrompt,
} from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as speech from '../../services/speech.js';
import * as tasbih from '../../services/tasbih.js';

/** (v5.0.0) The counting ripple: one span, radial bloom at the tap point,
 *  removed on animationend. The CSS (cards.css) honors
 *  prefers-reduced-motion; the span is inert (pointer-events: none) so it
 *  can never intercept the next tap. */
export function triggerRipple(surface, e) {
  if (typeof document === 'undefined') return;
  const rect = surface.getBoundingClientRect();
  const x = Number.isFinite(e.clientX) ? e.clientX - rect.left : rect.width / 2;
  const y = Number.isFinite(e.clientY) ? e.clientY - rect.top : rect.height / 2;
  const span = document.createElement('span');
  span.className = 'count-ripple';
  span.style.left = `${Math.round(x)}px`;
  span.style.top = `${Math.round(y)}px`;
  surface.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
  // Safety net: if animations are disabled (reduced motion), animationend
  // never fires — reap the span after 700ms regardless.
  setTimeout(() => span.remove(), 700);
}

export const clickHandlers = {
  'toggle-favorite': (ds) => {
    store.dispatch(actions.toggleFavorite(ds.itemId));
  },

  'counter-tap': (ds, e) => {
    const target = parseInt(ds.target, 10) || 1;
    const result = tasbih.increment(ds.itemId, ds.categoryId || null, target);
    tasbih.playTick(result.cycleCompleted ? 'complete' : 'tick');

    // (v5.0.0) Counting feedback — the full trio:
    //   1. vibration (settings.hapticsEnabled; no-op where unsupported)
    //   2. the tick sound above (settings.soundEnabled, inside playTick)
    //   3. the tap ripple — a one-shot radial bloom at the tap point on
    //      the tapped card (settings.tapRipple; reduced-motion kills it
    //      via CSS, same as every other animation).
    const state = store.getState();
    if (state.settings.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(result.cycleCompleted ? [12, 40, 18] : 10);
    }
    if (state.settings.tapRipple && e) {
      // The increment above re-renders #main synchronously — the tapped
      // node is detached by then. Defer one frame so the ripple lands on
      // the FRESH surface (re-queried by item id, stage fallback).
      const itemId = ds.itemId;
      requestAnimationFrame(() => {
        const fresh =
          document.querySelector(
            `[data-action="counter-tap"][data-item-id="${CSS.escape(itemId)}"]`
          ) || document.querySelector('.focus__scroll, .tasbih-stage');
        if (fresh) triggerRipple(fresh, e);
      });
    }

    if (
      result.cycleCompleted &&
      state.activeView === VIEWS.FOCUS &&
      state.settings.autoAdvanceFocus
    ) {
      scheduleAutoAdvance();
    }
  },

  'open-focus': (ds) => {
    go(VIEWS.FOCUS, { id: ds.categoryId, subId: ds.itemId });
  },

  'focus-exit': (ds) => {
    go(VIEWS.CATEGORY, { id: ds.categoryId });
  },

  'focus-reset': (ds) => {
    tasbih.reset(ds.itemId, parseInt(ds.target, 10) || 1);
  },

  'open-card-menu': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const lang = store.getState().settings.language;
    openModal(buildCardMenu(entry.item, ds.categoryId, lang), { labelledBy: 'modal-title-menu' });
  },

  'copy-item': async (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const lang = store.getState().settings.language;
    const text = itemClipboardText(entry.item, lang);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
    closeModal();
  },

  'copy-ayah': async (ds) => {
    const state = store.getState();
    const surah = state.quran.surahs[ds.surah];
    if (!surah) return;
    const ayah = surah.ayahs.find((a) => String(a.number) === String(ds.ayah));
    if (!ayah) return;
    const lang = state.settings.language;
    const text = `${ayah.text}\n\n${ayah.translation}\n\n\u2014 ${t('quran.surah', lang)} ${surah.nameEn} (${surah.number}:${ayah.number})`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  // v3.24.0: the shareable ayah card — a rendered image (Arabic +
  // translation + edition attribution), Web Share with files when the
  // platform allows, PNG download as fallback, text share last so the
  // button never dead-ends. Mirrors the library item's share flow.
  'ayah-share': async (ds) => {
    const state = store.getState();
    // FIX (review v3.26 F2): data-attribute lookups are hostile-input
    // boundaries — coerce and range-check before indexing (a forged
    // '__proto__' key used to be truthy here and crashed the lookup).
    const sn = Math.floor(Number(ds.surah));
    const ay = Math.floor(Number(ds.ayah));
    if (!(sn >= 1 && sn <= 114) || !(ay >= 1 && ay <= 286)) return;
    const surah = Object.hasOwn(state.quran.surahs, String(sn))
      ? state.quran.surahs[String(sn)]
      : state.quran.surahs[sn];
    if (!surah || !Array.isArray(surah.ayahs)) return;
    const ayah = surah.ayahs.find((a) => String(a.number) === String(ay));
    if (!ayah) return;
    const lang = state.settings.language;
    const edition = TRANSLATION_EDITIONS.find(
      (e) => e.id === asTranslationEdition(state.settings.quranTranslation)
    );
    // (v4.3) lazy canvas-renderer load — see the import note at the top.
    const { ayahCardFilename, buildAyahCardPayload, downloadBlob, generateAyahCardBlob } =
      await import('../../services/shareCard.js');
    const payload = buildAyahCardPayload({
      surahNumber: surah.number,
      ayahNumber: ayah.number,
      surahName: lang === 'ar' ? surah.nameAr : surah.nameTransliteration || surah.nameEn,
      surahNameAr: surah.nameAr,
      arabic: ayah.text,
      translation: ayah.translation,
      editionName: edition ? edition.author : '',
      editionDir: edition ? edition.dir : 'ltr',
    });
    if (!payload) return;
    const title = `${payload.surahName} ${payload.ref}`;
    let handled = false;
    try {
      const blob = await generateAyahCardBlob(payload, state);
      const file = new File([blob], ayahCardFilename(payload), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: payload.translation });
        handled = true;
      } else {
        downloadBlob(blob, ayahCardFilename(payload));
        showToast(t('card.imageSaved', lang));
        handled = true;
      }
    } catch (err) {
      // Dismissing the OS share sheet is not an error — abort cleanly.
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) handled = true;
    }
    if (!handled) {
      if (navigator.share) {
        try {
          await navigator.share({ title, text: payload.translation });
        } catch {
          /* user cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(
            `${payload.arabic}\n\n${payload.translation}\n\n\u2014 ${payload.surahName} ${payload.ref}`
          );
          showToast(t('card.copied', lang));
        } catch {
          showToast(t('card.copyFailed', lang));
        }
      }
    }
  },

  // ---- Ahadeeth (v3.9) ----
  'hadith-copy': async (ds) => {
    const st = store.getState();
    const bookId = String(st.activeParams?.id || '');
    const doc = st.hadith.docs[bookId];
    const h = doc?.hadiths.find((x) => String(x.n) === String(ds.n));
    if (!h) return;
    const lang = st.settings.language;
    const text = `${h.ar}\n\n${h.en}\n\n\u2014 ${pickLocale(doc.name, lang)} \u2116${h.n}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('card.copied', lang));
    } catch {
      showToast(t('card.copyFailed', lang));
    }
  },

  'hadith-section': (ds) => {
    store.dispatch(actions.setHadithView({ section: String(ds.id || 'all'), page: 1 }));
  },

  // (v5.2.0) Hadith bookmarks — the ayah-bookmark equivalent for hadith.
  // The book id rides on the button (cards in the daily widget render
  // outside the book route, where activeParams.id is empty).
  'hadith-bookmark': (ds) => {
    const st = store.getState();
    const bookId = String(ds.bookId || st.activeParams?.id || '');
    const n = String(ds.n || '');
    if (!bookId || !n) return;
    const key = `${bookId}:${n}`;
    const was = (st.hadithBookmarks || []).includes(key);
    store.dispatch(actions.toggleHadithBookmark(bookId, n));
    showToast(t(was ? 'hadith.unbookmarked' : 'hadith.bookmarkedToast', st.settings.language));
  },

  // Personal hadith notes: a small modal with the existing note (if any).
  // Saving an empty note deletes it (same contract as ayah bookmark notes).
  'hadith-note-open': (ds) => {
    const st = store.getState();
    const lang = st.settings.language;
    const bookId = String(ds.bookId || st.activeParams?.id || '');
    const n = String(ds.n || '');
    if (!bookId || !n) return;
    const key = `${bookId}:${n}`;
    const cur = (st.hadithNotes || {})[key] || '';
    openModal(
      `
      <form class="editor-form" data-form="hadith-note" data-key="${escapeHTML(key)}">
        <h2 id="modal-title-hadith-note">${t('hadith.noteTitle', lang)}</h2>
        <p class="editor-form__note" dir="ltr">${escapeHTML(key)}</p>
        <label class="field">${t('hadith.note', lang)}
          <textarea class="input" name="note" dir="auto" rows="4" maxlength="2000" placeholder="${t('hadith.notePh', lang)}">${escapeHTML(cur)}</textarea>
        </label>
        <div class="editor-form__actions">
          ${cur ? `<button type="button" class="btn btn--danger btn--sm" data-action="hadith-note-delete" data-key="${escapeHTML(key)}">${t('common.delete', lang)}</button>` : ''}
          <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
          <button type="submit" class="btn btn--primary">${t('common.save', lang)}</button>
        </div>
      </form>`,
      { labelledBy: 'modal-title-hadith-note' }
    );
  },

  'hadith-note-delete': (ds) => {
    if (!ds.key) return;
    closeModal();
    store.dispatch(actions.setHadithNote(ds.key, ''));
    showToast(t('hadith.noteDeleted', store.getState().settings.language));
  },

  // (v4.6.0) Hadith cards get the same treatment as azkar cards: share
  // (Web Share API with clipboard fallback) and listen (Web Speech on the
  // Arabic text). Same doc lookup as hadith-copy.
  'hadith-share': async (ds) => {
    const st = store.getState();
    const bookId = String(st.activeParams?.id || '');
    const doc = st.hadith.docs[bookId];
    const h = doc?.hadiths.find((x) => String(x.n) === String(ds.n));
    if (!h) return;
    const lang = st.settings.language;
    const text = `${h.ar}\n\n${h.en}\n\n\u2014 ${pickLocale(doc.name, lang)} \u2116${h.n}`;
    const url = new URL(window.location.href);
    url.hash = `#/hadith/${bookId}?n=${encodeURIComponent(String(h.n))}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url.toString()}`);
        showToast(t('card.copied', lang));
      }
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  },

  'hadith-speak': (ds) => {
    const st = store.getState();
    const bookId = String(st.activeParams?.id || '');
    const doc = st.hadith.docs[bookId];
    const h = doc?.hadiths.find((x) => String(x.n) === String(ds.n));
    if (!h?.ar) return;
    const lang = st.settings.language;
    if (!speech.isSupported()) {
      showToast(t('hadith.speechUnsupported', lang));
      return;
    }
    // A pseudo-item so the speech service's start/stop toggle contract
    // works unchanged (id, arabic text, no english).
    speech.speakItem({ id: `hadith-${bookId}-${h.n}`, arabic: h.ar, english: '' }, {});
  },

  'hadith-page-prev': () => {
    const page = Math.max(1, (store.getState().hadith.bookView.page || 1) - 1);
    store.dispatch(actions.setHadithView({ page }));
    scrollToHadithListTop();
  },

  'hadith-page-next': () => {
    const page = (store.getState().hadith.bookView.page || 1) + 1;
    store.dispatch(actions.setHadithView({ page }));
    scrollToHadithListTop();
  },

  'hadith-retry': (ds) => {
    ensureHadithBook(ds.id, true);
  },

  'hadith-retry-index': () => {
    ensureHadithIndex(true);
  },

  'share-item': async (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    const state = store.getState();
    const lang = state.settings.language;
    const text = itemClipboardText(entry.item, lang);
    const title = pickLocale(entry.item.title, lang);
    closeModal();

    // v3.0: share as a rendered image card when possible (Web Share with
    // files), fall back to a PNG download, and keep the old text-share path
    // as the last resort so sharing never regresses.
    let handled = false;
    try {
      // (v4.3) lazy canvas-renderer load — see the import note at the top.
      const { cardFilename, downloadBlob, generateCardBlob } =
        await import('../../services/shareCard.js');
      const blob = await generateCardBlob(entry.item, state);
      const file = new File([blob], cardFilename(entry.item), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        handled = true;
      } else {
        downloadBlob(blob, cardFilename(entry.item));
        showToast(t('card.imageSaved', lang));
        handled = true;
      }
    } catch (err) {
      // The person dismissing the OS share sheet is not an error — abort cleanly.
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) handled = true;
    }

    if (!handled) {
      if (navigator.share) {
        try {
          await navigator.share({ title, text });
        } catch {
          /* user cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          showToast(t('card.copied', lang));
        } catch {
          showToast(t('card.copyFailed', lang));
        }
      }
    }
  },

  'toggle-speech': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    if (speech.isSpeakingItem(ds.itemId)) {
      speech.stop();
      store.dispatch(actions.setSpeakingItem(null));
      closeModal();
      return;
    }
    store.dispatch(actions.setSpeakingItem(ds.itemId));
    speech.speakItem(entry.item, {
      onEnd: () => {
        if (store.getState().speakingItemId === ds.itemId) {
          store.dispatch(actions.setSpeakingItem(null));
        }
      },
    });
    closeModal();
  },

  'open-collection-picker': (ds) => {
    const entry = getItemEntry(ds.itemId);
    if (!entry) return;
    openModal(buildCollectionPicker(entry.item, store.getState()), {
      labelledBy: 'modal-title-picker',
    });
  },

  'create-collection': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('collections.namePrompt', lang),
        confirmAction: 'submit-new-collection',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'create-collection-suggested': (ds) => {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: ds.nameEn, ar: ds.nameAr || ds.nameEn }));
    go(VIEWS.COLLECTION, { id });
  },

  'create-collection-inline': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('collections.namePrompt', lang),
        confirmAction: 'submit-new-collection-inline',
        confirmData: { itemId: ds.itemId },
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'delete-collection': (ds) => {
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('editor.deleteConfirm', lang),
        confirmAction: 'confirm-delete-collection',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'confirm-delete-collection': (ds) => {
    store.dispatch(actions.deleteCollection(ds.id));
    closeModal();
    go(VIEWS.COLLECTIONS);
  },

  'run-search': (ds) => {
    store.dispatch(actions.addSearchHistory(ds.query));
    go(VIEWS.SEARCH, { q: ds.query });
  },

  'clear-search-history': () => {
    store.dispatch(actions.clearSearchHistory());
  },
};
