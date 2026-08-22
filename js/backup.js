/**
 * backup.js
 * Export the persisted portion of state as a downloadable JSON file, and
 * import/validate a previously exported file back into the store.
 * This is the only supported way to move data between devices, since the
 * app has no account system and stores everything locally.
 */

import { APP_VERSION, SCHEMA_VERSION } from './config.js';
import { ok, fail } from './utils.js';

const BACKUP_MIME = 'application/json';

export function buildBackupPayload(persistedState) {
  return {
    kind: 'nur-al-dhikr-backup',
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: persistedState
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

/** Parse and lightly validate an uploaded backup file's text content. */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('That file is not valid JSON.');
  }

  // Accept either a wrapped backup payload or a bare persisted-state object (best-effort).
  const data = json?.kind === 'nur-al-dhikr-backup' ? json.data : json;
  if (!data || typeof data !== 'object') {
    return fail('That file does not look like a Nūr al-Dhikr backup.');
  }

  const required = ['settings', 'favorites', 'collections', 'counters', 'statistics'];
  const missing = required.filter((k) => !(k in data));
  if (missing.length === required.length) {
    return fail('That file does not contain any recognizable app data.');
  }

  return ok(data);
}

/** Read a File object (from an <input type="file">) as text, Promise-based. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
