/** */

import { VIEWS } from '../core/config.js';
import { t } from '../core/i18n.js';
import { go } from '../core/router.js';
import { actions, store } from '../core/state.js';
import { escapeHTML, uid } from '../core/utils.js';
import { customMoshafId, surahUrl, validateCustomServer } from '../services/audioCatalog.js';
import { clampPage } from '../services/mushaf.js';
import { closeModal, openModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import * as editorApi from '../services/editor.js';
import * as notifications from '../services/notifications.js';
import { clickHandlers as quranAudioClick } from './handlers/quranAudio.js';
import { buildMushafBookmarks, buildMushafJump } from '../views/mushafReader.js';
import {
  applyItemFields,
  applyCategoryFields,
  applyLibraryFields,
  addItemToCategory,
  addCategoryToLibrary,
} from '../services/contentPrefs.js';

export function reminderFormHTML(lang) {
  return `
  <form class="editor-form" data-form="reminder">
    <h2 id="modal-title-reminder">${t('settings.addReminder', lang)}</h2>
    <label class="field">${t('editor.fieldTitleEn', lang)}<input class="input" name="label" placeholder="${t('reminder.labelPlaceholder', lang)}" required /></label>
    <label class="field">${t('reminder.time', lang)}<input class="input" type="time" name="time" value="06:00" required /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

export function manualLocationFormHTML(lang, p) {
  return `
  <form class="editor-form" data-form="prayer-location">
    <h2 id="modal-title-location">${t('prayer.manualLocation', lang)}</h2>
    <label class="field">${t('prayer.locationName', lang)}<input class="input" name="locationName" value="${escapeHTML(p.locationName || '')}" placeholder="${t('prayer.locationExample', lang)}" /></label>
    <label class="field">${t('prayer.latitude', lang)}<input class="input" type="number" step="any" min="-90" max="90" name="latitude" value="${p.latitude ?? ''}" required /></label>
    <label class="field">${t('prayer.longitude', lang)}<input class="input" type="number" step="any" min="-180" max="180" name="longitude" value="${p.longitude ?? ''}" required /></label>
    <div class="editor-form__actions">
      <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
      <button type="submit" class="btn btn--primary">${t('editor.save', lang)}</button>
    </div>
  </form>`;
}

/* ------------------------------------------------------------------ */
/* Form submit handlers                                                */
/* ------------------------------------------------------------------ */

export const formHandlers = {
  'hadith-jump': (form) => {
    const input = form.querySelector('input');
    const lang = store.getState().settings.language;
    const bookId = String(store.getState().activeParams?.id || '');
    const raw = parseInt(input?.value, 10);
    // (v4.2) silent no-ops become honest toasts: an empty/garbage number and
    // a hadith number BEYOND the book's count both used to do nothing (or
    // navigate to a not-found page) with zero feedback.
    if (!Number.isFinite(raw) || raw < 1) {
      showToast(t('hadith.jumpInvalid', lang));
      return;
    }
    if (!bookId) return;
    const doc = store.getState().hadith.docs[bookId];
    const count =
      doc?.hadiths?.length ??
      store.getState().hadith.index?.books?.find((b) => b.id === bookId)?.count;
    if (count && raw > count) {
      showToast(t('hadith.jumpOutOfRange', lang, { n: count }));
      return;
    }
    input.value = '';
    go(VIEWS.HADITH, { id: bookId, n: String(raw) });
  },

  'mushaf-jump-page': (form) => {
    const fd = new FormData(form);
    const lang = store.getState().settings.language;
    const rawPage = parseInt(fd.get('page'), 10);
    // (v4.2) garbage used to clamp(NaN) → page 1 silently; say it instead.
    if (!Number.isFinite(rawPage)) {
      closeModal();
      showToast(t('mushaf.jumpInvalid', lang));
      return;
    }
    closeModal();
    go(VIEWS.MUSHAF, { page: String(clampPage(rawPage)) });
  },

  'khatma-plan': (form) => {
    const fd = new FormData(form);
    const lang = store.getState().settings.language;
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    const todayISO = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const startDate = ISO.test(String(fd.get('startDate') || ''))
      ? String(fd.get('startDate'))
      : todayISO();
    const targetRaw = String(fd.get('targetDate') || '');
    const targetDate = ISO.test(targetRaw) ? targetRaw : null;
    const dailyRaw = parseInt(fd.get('dailyTarget'), 10);
    const dailyTarget = Number.isFinite(dailyRaw) && dailyRaw >= 1 ? Math.min(604, dailyRaw) : null;
    if (!targetDate && !dailyTarget) {
      showToast(t('khatma.needOne', lang));
      return; // keep the form open so the person can fix it
    }
    store.dispatch(actions.setKhatmaPlan({ startDate, targetDate, dailyTarget }));
    closeModal();
    openModal(buildMushafJump(store.getState()), { labelledBy: 'modal-title-mushaf-jump' });
    showToast(t('khatma.planSaved', lang));
  },

  item: (form) => {
    const fd = new FormData(form);
    const fields = {
      title: { en: fd.get('titleEn') || '', ar: fd.get('titleAr') || '' },
      arabic: fd.get('arabic') || '',
      transliteration: fd.get('transliteration') || '',
      translation: { en: fd.get('translationEn') || '', ar: '' },
      reference: {
        collection: fd.get('reference') || '',
        book: '',
        chapter: '',
        hadith: fd.get('referenceHadith') || '',
        narrator: fd.get('referenceNarrator') || '',
        grading: fd.get('referenceGrading') || '',
        url: '',
        notes: '',
      },
      grade: fd.get('grade') || 'Unknown',
      custom_grade: { en: fd.get('customGradeEn') || '', ar: '' },
      repetitions: parseInt(fd.get('repetitions'), 10) || 1,
      virtues: { en: fd.get('virtuesEn') || '', ar: '' },
      tags: (fd.get('tags') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: fd.get('notes') || '',
    };
    // (v5.0.0) builtin scope: the same form, routed into the
    // contentPrefs override lens instead of the custom editor — full
    // field editing of bundled cards, restorable via Restore defaults.
    if (form.dataset.scope === 'builtin') {
      if (form.dataset.itemId) {
        store.dispatch(
          actions.updateSettings({
            contentPrefs: applyItemFields(store.getState(), form.dataset.itemId, fields),
          })
        );
      } else {
        const { prefs } = addItemToCategory(store.getState(), form.dataset.categoryId, fields);
        store.dispatch(actions.updateSettings({ contentPrefs: prefs }));
      }
      closeModal();
      showToast(t('editor.saved', store.getState().settings.language));
      return;
    }
    const result = editorApi.saveItem(
      form.dataset.libraryId,
      form.dataset.categoryId,
      fields,
      form.dataset.itemId || null
    );
    if (result.success) {
      closeModal();
      // Save still succeeds either way — this is a heads-up, not a block —
      // but it's no longer silent (see product review: an item saved with
      // no Arabic text and no translation previously gave zero feedback).
      if (result.warnings?.length) {
        showToast(t('editor.savedWithWarning', store.getState().settings.language));
      }
    } else {
      // (v4.2) the service returns stable English error strings (also
      // used as data-layer markers); map the known ones to localized chrome.
      const errorText =
        result.error === 'Category not found'
          ? t('editor.categoryNotFound', store.getState().settings.language)
          : result.error;
      showToast(errorText || t('editor.validationError', store.getState().settings.language));
    }
  },

  category: (form) => {
    const fd = new FormData(form);
    // (v5.0.0) builtin scope: create a user section inside a bundled
    // library (addedCategories lens) or edit a section's metadata
    // (categoryOverrides lens). Custom libraries keep the editor path.
    if (form.dataset.scope === 'builtin') {
      if (form.dataset.categoryId) {
        store.dispatch(
          actions.updateSettings({
            contentPrefs: applyCategoryFields(store.getState(), form.dataset.categoryId, {
              name: { en: fd.get('nameEn') || '', ar: fd.get('nameAr') || '' },
              description: { en: fd.get('descEn') || '', ar: '' },
              ...(fd.get('icon') ? { icon: fd.get('icon') } : {}),
              ...(fd.get('color') ? { color: fd.get('color') } : {}),
            }),
          })
        );
      } else {
        const { prefs } = addCategoryToLibrary(store.getState(), form.dataset.libraryId, {
          name: { en: fd.get('nameEn') || '', ar: fd.get('nameAr') || '' },
          description: { en: fd.get('descEn') || '', ar: '' },
          icon: fd.get('icon') || 'book',
          color: fd.get('color') || 'slate',
        });
        store.dispatch(actions.updateSettings({ contentPrefs: prefs }));
      }
      closeModal();
      return;
    }
    editorApi.addCategory(form.dataset.libraryId, {
      nameEn: fd.get('nameEn'),
      nameAr: fd.get('nameAr'),
    });
    closeModal();
  },

  library: (form) => {
    const fd = new FormData(form);
    // (v5.0.0) builtin banner edit → libraryOverrides lens; creating a
    // new library keeps the custom editor path.
    if (form.dataset.scope === 'builtin' && form.dataset.libraryId) {
      store.dispatch(
        actions.updateSettings({
          contentPrefs: applyLibraryFields(store.getState(), form.dataset.libraryId, {
            name: { en: fd.get('nameEn') || '', ar: fd.get('nameAr') || '' },
            description: { en: fd.get('descEn') || '', ar: '' },
          }),
        })
      );
      closeModal();
      return;
    }
    editorApi.createLibrary({ nameEn: fd.get('nameEn'), nameAr: fd.get('nameAr') });
    closeModal();
  },

  schedule: (form) => {
    // (v5.0.0) The four-level daily schedule: a reminder whose
    // notification deep-links back to the section/banner, optionally
    // mirrored as a recurring Hijri-calendar note.
    const fd = new FormData(form);
    const time = fd.get('time') || '06:00';
    const label = fd.get('label') || '';
    const targetView = form.dataset.targetView || '';
    store.dispatch(
      actions.addReminder(
        notifications.makeReminder({
          id: uid('rem'),
          time,
          label,
          targetView,
        })
      )
    );
    if (fd.get('alsoCalendar') === 'on') {
      const today = new Date().toISOString().slice(0, 10);
      store.dispatch(
        actions.addCalendarNote({
          id: uid('note'),
          title: label,
          body: '',
          startDate: today,
          recurrence: 'daily',
          intervalDays: 1,
          endDate: null,
          reminder: true,
          reminderTime: time,
          createdAt: Date.now(),
        })
      );
    }
    closeModal();
    showToast(t('schedule.saved', store.getState().settings.language));
  },

  'quran-range': (form) => {
    // (v5.0.0) The ayah-range playback submit: re-dispatch into the
    // existing surah-play handler with from/to bounds (+ loop passes).
    const fd = new FormData(form);
    const from = Math.max(1, parseInt(fd.get('from'), 10) || 1);
    let to = Math.max(1, parseInt(fd.get('to'), 10) || 1);
    if (to < from) to = from;
    closeModal();
    quranAudioClick['surah-play']({
      surah: form.dataset.surah,
      from: String(from),
      to: String(to),
      loop: String(parseInt(fd.get('loop'), 10) || 1),
    });
  },

  reminder: (form) => {
    const fd = new FormData(form);
    store.dispatch(
      actions.addReminder(
        notifications.makeReminder({ id: uid('rem'), time: fd.get('time'), label: fd.get('label') })
      )
    );
    closeModal();
  },

  'prayer-location': (form) => {
    const fd = new FormData(form);
    const lat = parseFloat(fd.get('latitude'));
    const lng = parseFloat(fd.get('longitude'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      showToast(t('common.error', store.getState().settings.language));
      return;
    }
    store.dispatch(
      actions.updatePrayerSettings({
        latitude: lat,
        longitude: lng,
        locationName: fd.get('locationName') || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    );
    closeModal();
  },

  'calendar-note': (form) => {
    const fd = new FormData(form);
    const recurrence = fd.get('recurrence') || 'once';
    const title = (fd.get('title') || '').trim();
    if (!title) return;

    const note = {
      id: form.dataset.noteId || uid('note'),
      title,
      body: fd.get('body') || '',
      startDate: form.dataset.date,
      recurrence,
      intervalDays:
        recurrence === 'interval' ? Math.max(2, parseInt(fd.get('intervalDays'), 10) || 3) : null,
      endDate:
        recurrence === 'range'
          ? fd.get('endDateRange') || null
          : recurrence === 'daily'
            ? fd.get('endDateDaily') || null
            : null,
      reminder: fd.get('reminder') === 'on',
      reminderTime: fd.get('reminder') === 'on' ? fd.get('reminderTime') || '08:00' : null,
      createdAt: form.dataset.noteId ? undefined : Date.now(),
    };

    if (recurrence === 'range' && !note.endDate) {
      showToast(t('calendar.untilDate', store.getState().settings.language));
      return;
    }

    if (form.dataset.noteId) {
      store.dispatch(actions.updateCalendarNote(form.dataset.noteId, note));
    } else {
      note.createdAt = Date.now();
      store.dispatch(actions.addCalendarNote(note));
    }
    closeModal();
    showToast(t('common.done', store.getState().settings.language));
  },

  'audio-custom-reciter': async (form) => {
    const fd = new FormData(form);
    const lang = store.getState().settings.language;
    const name = String(fd.get('name') || '').trim();
    const check = validateCustomServer(fd.get('server'));
    if (!name || !check.ok) {
      showToast(t('audio.customInvalid', lang));
      return;
    }
    showToast(t('audio.customChecking', lang));
    // Verify the server actually serves audio before accepting it.
    try {
      const res = await fetch(surahUrl(check.server, 1), { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !/audio|octet|mpeg|mp3/i.test(type)) {
        showToast(t('audio.customNotAudio', lang));
        return;
      }
    } catch {
      showToast(t('audio.customNotAudio', lang));
      return;
    }
    store.dispatch(
      actions.addCustomReciter({
        id: customMoshafId(check.server),
        nameEn: name,
        nameAr: name,
        rewaya: '',
        server: check.server,
      })
    );
    closeModal();
    showToast(t('common.done', lang));
  },

  'hadith-note': (form) => {
    // Personal hadith note save: blank text deletes (reducer contract).
    const key = String(form.dataset.key || '');
    const fd = new FormData(form);
    const text = String(fd.get('note') ?? '');
    closeModal();
    store.dispatch(actions.setHadithNote(key, text));
    const lang = store.getState().settings.language;
    showToast(t(text.trim() ? 'hadith.noteSaved' : 'hadith.noteDeleted', lang));
  },
};

export function handlePromptForm(form) {
  const action = form.dataset.action;
  const fd = new FormData(form);
  const value = (fd.get('value') || '').trim();
  if (!value) return;

  if (action === 'submit-new-collection') {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: value, ar: value }));
    closeModal();
    go(VIEWS.COLLECTION, { id });
  } else if (action === 'submit-new-collection-inline') {
    const id = uid('col');
    store.dispatch(actions.createCollection(id, { en: value, ar: value }));
    store.dispatch(actions.addToCollection(id, form.dataset.itemId));
    closeModal();
    showToast(t('common.done', store.getState().settings.language));
  } else if (action === 'submit-new-playlist') {
    const id = uid('plq');
    store.dispatch(actions.createPlaylist(id, value));
    closeModal();
    showToast(t('playlist.created', store.getState().settings.language));
  } else if (action === 'submit-new-bookmark-folder') {
    const id = uid('bmf');
    store.dispatch(actions.createBookmarkFolder(id, value));
    closeModal();
    openModal(buildMushafBookmarks(store.getState()), {
      labelledBy: 'modal-title-mushaf-bookmarks',
    });
  } else if (action === 'submit-new-location-profile') {
    // (v4.4) Save the current place + method as a named location profile.
    store.dispatch(actions.saveLocationProfile(value));
    closeModal();
    showToast(t('profiles.saved', store.getState().settings.language, { name: value }));
  }
}
