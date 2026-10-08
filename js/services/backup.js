/**
 * backup.js
 * Export the persisted portion of state as a downloadable JSON file, and
 * import/validate a previously exported file back into the store.
 * This is the only supported way to move data between devices, since the
 * app has no account system and stores everything locally.
 */

import { APP_VERSION, SCHEMA_VERSION } from '../core/config.js';
import { openDB } from '../core/idb/openDB.js';
import { actions, store } from '../core/state.js';
import { isFuturePayload, persistedSnapshot } from '../core/state/restore.js';
import { ok } from '../core/utils.js';
import { isReturningUser } from '../domain/onboarding.js';

const BACKUP_MIME = 'application/json';

/**
 * Machine-readable parse failures.
 *
 * The UI must never decide what went wrong by matching an English
 * sentence — reword one message and an Arabic-only reader gets raw
 * English again. Every refusal therefore carries BOTH a stable `code`
 * (mapped to an i18n key at the edge) and a human English sentence in
 * `error` (so a future caller that renders `error` raw degrades to
 * English rather than to a token like `backup/invalid-json`).
 */
export const BACKUP_ERRORS = Object.freeze({
  invalidJson: 'backup/invalid-json',
  futureVersion: 'backup/future-version',
  noData: 'backup/no-data',
  emptyFile: 'backup/empty-file',
});

/** A failed parse: English sentence + stable code, never a throw. */
function failWithCode(code) {
  return {
    success: false,
    value: null,
    error: BACKUP_ERROR_MESSAGES[code] || 'That file could not be imported.',
    code,
  };
}

/** The English sentence per code — the raw-display fallback, not the API. */
const BACKUP_ERROR_MESSAGES = Object.freeze({
  [BACKUP_ERRORS.invalidJson]: 'That file is not valid JSON.',
  [BACKUP_ERRORS.futureVersion]:
    'This backup is from a newer version of Nūr al-Dhikr — update the app to import it.',
  [BACKUP_ERRORS.noData]: 'That file does not look like a Nūr al-Dhikr backup.',
  [BACKUP_ERRORS.emptyFile]: 'That file does not contain any recognizable app data.',
});

/** Rolling on-device snapshot cadence + off-device staleness threshold. */
export const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

export const AUTO_BACKUP_DAYS = 7;
export const STALE_BACKUP_DAYS = 30;
/** localStorage key for the rolling auto-snapshot (a valid backup file). */
export const AUTO_BACKUP_KEY = 'nur-al-dhikr-auto-backup';

export function buildBackupPayload(persistedState) {
  return {
    kind: 'nur-al-dhikr-backup',
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: persistedState,
  };
}

/** Trigger a browser download of the backup JSON. */
export function downloadBackup(persistedState, filename) {
  const payload = buildBackupPayload(persistedState);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: BACKUP_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `nur-al-dhikr-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Trigger a browser download of an exported plan JSON (family sharing). */
export function downloadPlan(planObj, filename) {
  const blob = new Blob([JSON.stringify(planObj, null, 2)], { type: BACKUP_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `nur-al-dhikr-plan-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Parse and lightly validate an uploaded backup file's text content. */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return failWithCode(BACKUP_ERRORS.invalidJson);
  }

  // Accept either a wrapped backup payload or a bare persisted-state object (best-effort).
  const wrapped = json?.kind === 'nur-al-dhikr-backup';
  // (v5.2.74, BUG-03) a future version's backup is refused with an honest
  // message — never mangled through the allowlist below. Version-less
  // legacy blobs still import.
  if (wrapped && isFuturePayload(json)) {
    return failWithCode(BACKUP_ERRORS.futureVersion);
  }
  const data = wrapped ? json.data : json;
  if (isFuturePayload(data)) {
    return failWithCode(BACKUP_ERRORS.futureVersion);
  }
  if (!data || typeof data !== 'object') {
    return failWithCode(BACKUP_ERRORS.noData);
  }
  if (!wrapped && isFuturePayload(data)) {
    return failWithCode(BACKUP_ERRORS.futureVersion);
  }

  const required = ['settings', 'favorites', 'collections', 'counters', 'statistics'];
  const missing = required.filter((k) => !(k in data));
  if (missing.length === required.length) {
    return failWithCode(BACKUP_ERRORS.emptyFile);
  }

  return ok(data);
}

/** Read a File object (from an <input type="file">) as text, Promise-based. */
export function isImportFileTooLarge(file) {
  const size = Number(file?.size);
  return Number.isFinite(size) && size > MAX_IMPORT_FILE_BYTES;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* ------------------------------------------------------------------ */
/* Auto-periodic local backup (v5.2.53): a rolling on-device snapshot  */
/* ------------------------------------------------------------------ */
// A second on-device copy (NOT an off-device export — device loss still
// needs a manual export, and the stale nudge keeps saying so). Kept as a
// valid backup file so the existing parse + restore path reads it back.

/** Due for an auto-snapshot? Returning users with data, interval elapsed. */
export function autoBackupDue(backupMeta, persistedState, now = Date.now()) {
  if (!isReturningUser(persistedState || {})) return false;
  const last = Number(backupMeta?.lastAutoBackupAt);
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last >= AUTO_BACKUP_DAYS * 86400000;
}

/**
 * Boot-time heartbeat: snapshot when due, stamp the meta. Fire-and-forget
 * (boot never awaits it) and total — a failed snapshot must never break
 * startup. Resolves to 'saved' | 'skipped' | 'failed' for tests.
 */
export async function maybeAutoBackupNow() {
  try {
    const state = store.getState();
    const snap = persistedSnapshot(state);
    if (!autoBackupDue(state.backupMeta, snap)) return 'skipped';
    if (!writeAutoSnapshot(snap)) return 'failed';
    // (v5.17.59, merged-plan item 12) stamp the snapshot's size beside its
    // time, so the shared summary card states it honestly. Best-effort:
    // a measuring failure still leaves a correctly stamped snapshot.
    let bytes = null;
    try {
      bytes = backupFileText(snap).length;
    } catch {
      bytes = null;
    }
    store.dispatch(actions.markAutoBackupSaved(bytes));
    return 'saved';
  } catch {
    return 'failed';
  }
}

/** Overdue for a manual (off-device) export? Drives the stale nudge. */
export function backupStale(lastBackupAt, now = Date.now()) {
  const last = Number(lastBackupAt);
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last >= STALE_BACKUP_DAYS * 86400000;
}

/** Storage boundary, injectable (a Map-like fake rides in tests). */
export function defaultBackupStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Write the rolling snapshot. Best-effort (quota/privacy) — never throws. */
export function writeAutoSnapshot(
  persistedState,
  storage = defaultBackupStorage(),
  now = Date.now()
) {
  if (!storage) return false;
  try {
    storage.setItem(
      AUTO_BACKUP_KEY,
      JSON.stringify({ savedAt: now, backup: buildBackupPayload(persistedState) })
    );
    return true;
  } catch {
    return false;
  }
}

/** Read the rolling snapshot ({ savedAt, backup } or null). Never throws. */
export function readAutoSnapshot(storage = defaultBackupStorage()) {
  try {
    const raw = storage?.getItem(AUTO_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.backup) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Serialize the current state for file writes (save-back + download). */
export function backupFileText(persistedState) {
  return JSON.stringify(buildBackupPayload(persistedState), null, 2);
}

/* ------------------------------------------------------------------ */
/* File System Access save-back (v5.2.53): write back to a user-picked */
/* file instead of piling up downloads. Chromium-only; everywhere else */
/* the linked flow degrades to the classic download.                   */
/* ------------------------------------------------------------------ */

const HANDLE_DB = 'nur-al-dhikr';
const HANDLE_STORE = 'file-handles';
const HANDLE_KEY = 'backup-file';

export function filePickerSupported() {
  try {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  } catch {
    return false;
  }
}

/** Ask the person where to keep their backup (abort/denial → null). */
export async function pickBackupFile(suggestedName) {
  if (!filePickerSupported()) return null;
  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
    });
  } catch {
    return null;
  }
}

async function handleStore(mode) {
  const db = await openDB(HANDLE_DB, 1, (upgraded) => {
    if (!upgraded.objectStoreNames.contains(HANDLE_STORE)) upgraded.createObjectStore(HANDLE_STORE);
  });
  if (!db) return null;
  try {
    return db.transaction(HANDLE_STORE, mode).objectStore(HANDLE_STORE);
  } catch {
    return null;
  }
}

/** Persist the picked file handle across sessions (handles survive IDB). */
export async function saveBackupHandle(handle) {
  try {
    const store = await handleStore('readwrite');
    if (!store) return false;
    await new Promise((resolve, reject) => {
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return false;
  }
}

/** Load the linked handle (null when never linked or IDB unavailable). */
export async function loadBackupHandle() {
  try {
    const store = await handleStore('readonly');
    if (!store) return null;
    const handle = await new Promise((resolve, reject) => {
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return handle || null;
  } catch {
    return null;
  }
}

/** Forget the linked file (stale handles self-heal through this). */
export async function clearBackupHandle() {
  try {
    const store = await handleStore('readwrite');
    if (!store) return false;
    await new Promise((resolve, reject) => {
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return false;
  }
}

/** Write backup text back to the linked file (permission-aware). */
export async function writeBackupToHandle(handle, text) {
  try {
    if (!handle || typeof handle.createWritable !== 'function') return false;
    if (typeof handle.queryPermission === 'function') {
      const current = await handle.queryPermission({ mode: 'readwrite' });
      if (current !== 'granted') {
        if (typeof handle.requestPermission !== 'function') return false;
        const next = await handle.requestPermission({ mode: 'readwrite' });
        if (next !== 'granted') return false;
      }
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
