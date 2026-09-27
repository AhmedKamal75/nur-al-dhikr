/**
 * app/fileImports.js — user file imports: backup JSON (with confirm),
 * shared family plans (with confirm), and custom Adhan audio
 * (magic-byte validated).
 */

import { rt } from './rt.js';
import * as backup from '../services/backup.js';
import { openModal } from '../ui/modal.js';
import { buildConfirm } from '../ui/menus.js';
import { render } from './renderer.js';
import { t } from '../core/i18n.js';
import { store } from '../core/state.js';
import { refreshCustomAdhanFlags } from '../services/prayerSound.js';
import { showToast } from '../ui/toast.js';

/**
 * (v5.13.0, V2 → v5.17.11) backup errors used to leak English to an
 * Arabic-only reader on her worst day (corrupt backup, lost progress).
 * The first fix mapped them by MATCHING THE ENGLISH SENTENCE, which
 * breaks the moment a message is reworded. parseBackup() now returns a
 * stable `code` (BACKUP_ERRORS) and this maps that code to an i18n key —
 * no string matching anywhere in the path.
 */
const BACKUP_ERROR_KEYS = {
  [backup.BACKUP_ERRORS.invalidJson]: 'backup.invalidJson',
  [backup.BACKUP_ERRORS.futureVersion]: 'backup.futureVersion',
  [backup.BACKUP_ERRORS.noData]: 'backup.noData',
  [backup.BACKUP_ERRORS.emptyFile]: 'backup.emptyFile',
};

/** Localized text for a failed parse result (or any unknown failure). */
export function backupErrorText(result, lang) {
  const key = BACKUP_ERROR_KEYS[result?.code];
  return t(key || 'common.error', lang);
}

/* v3.8: import a user-provided adhan recording (standard or Fajr) into the
 * offline audio store. Validates size/type with the same defensive posture
 * as every other untrusted input, then refreshes the fire-path flags. */
export async function handleAdhanImport(file, kind) {
  const lang = store.getState().settings.language;
  // Dynamic import keeps the IndexedDB audio-store code out of the boot
  // graph; the specifier MUST resolve from js/app/ (a stale flat-layout
  // path here once silently killed the whole feature).
  let validateAdhanFile, looksLikeAudio, saveAdhanAudio;
  try {
    ({ validateAdhanFile, looksLikeAudio, saveAdhanAudio } =
      await import('../services/audioStore.js'));
  } catch (err) {
    console.error('[adhan-import] audio store failed to load', err);
    showToast(t('prayer.adhanImportFailed', lang));
    return;
  }
  const code = validateAdhanFile(file);
  const errorKey = {
    invalid: 'prayer.adhanInvalid',
    empty: 'prayer.adhanInvalid',
    tooLarge: 'prayer.adhanTooLarge',
    notAudio: 'prayer.adhanInvalid',
  }[code];
  if (errorKey) {
    showToast(t(errorKey, lang));
    return;
  }
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!looksLikeAudio(head)) {
      showToast(t('prayer.adhanInvalid', lang));
      return;
    }
    const result = await saveAdhanAudio(kind, file);
    if (!result.ok) {
      showToast(
        t(result.error === 'quota' ? 'storage.persistFailed' : 'prayer.adhanImportFailed', lang)
      );
      return;
    }
    await refreshCustomAdhanFlags();
    showToast(t('prayer.adhanImported', lang));
    render(store.getState());
  } catch (err) {
    console.error('[adhan-import]', err);
    showToast(t('prayer.adhanImportFailed', lang));
  }
}

export async function handleImportFile(file) {
  try {
    // (v5.13.0, V12) kids sandbox: imports land outside the sandbox —
    // refuse inside kids mode instead of leaking foreign content in.
    if (store.getState().settings.kidsMode === true) {
      showToast(t('kids.blocked', store.getState().settings.language));
      return;
    }
    const text = await backup.readFileAsText(file);
    const result = backup.parseBackup(text);
    if (!result.success) {
      const lang = store.getState().settings.language;
      showToast(backupErrorText(result, lang));
      return;
    }
    // FIX (review v3.1 A2/B1): importing replaces EVERYTHING on this device
    // — favorites, streaks, collections, statistics — with no undo. One
    // misclick used to wipe months of data with a cheerful "Done". Now the
    // person sees exactly what is about to happen and confirms first.
    const lang = store.getState().settings.language;
    rt.pendingImportPayload = result.value;
    openModal(
      buildConfirm({
        message: t('backup.importConfirm', lang),
        confirmAction: 'import-backup-confirmed',
        lang,
        danger: true,
      }),
      { labelledBy: 'modal-title-confirm' }
    );
  } catch (err) {
    showToast(t('common.error', store.getState().settings.language));
    console.error('[import]', err);
  }
}

/* (v5.2.29) Family plan sharing (B-5): a shared plan file lands ON TOP of
 * this device's own data (PLAN_IMPORT merges plan keys only — the backup
 * path above replaces everything, so the confirm copy says exactly that).
 * Non-destructive, hence danger: false. The pure module loads on demand
 * so the boot graph stays untouched. */
export async function handleImportPlanFile(file) {
  try {
    const text = await backup.readFileAsText(file);
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const { isPlanFile, sanitizePlan } = await import('../domain/planExport.js');
    const lang = store.getState().settings.language;
    if (!isPlanFile(json)) {
      showToast(t('plan.badFile', lang));
      return;
    }
    const plan = sanitizePlan(json);
    if (!plan) {
      showToast(t('plan.badFile', lang));
      return;
    }
    rt.pendingPlanPayload = plan;
    openModal(
      buildConfirm({
        message: t('plan.importConfirm', lang),
        confirmAction: 'import-plan-confirmed',
        lang,
        danger: false,
      }),
      { labelledBy: 'modal-title-confirm' }
    );
  } catch (err) {
    showToast(t('common.error', store.getState().settings.language));
    console.error('[import-plan]', err);
  }
}
