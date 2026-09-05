/**
 * tests/dataHealth.test.js — v3.26.0, the Settings data health check.
 *
 * "Backups people never test are hopes, not backups." The dry run's whole
 * contract: the exact bytes an export would produce go through the SAME
 * sanitizer a real restore applies, in a sandboxed read that never
 * touches the store, and the report counts what would survive. Also
 * pinned: the days-since-backup math (a clock set backwards is "today",
 * never negative), byte formatting, the verdict labels, the reducer
 * guards (a forged BACKUP_EXPORTED payload cannot fake timestamps, a
 * future backupMeta is junk), and the Settings panel render in both
 * languages.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { daysSinceBackup, formatBytes, dryRunVerdict } from '../js/services/dataHealth.js';
import { dryRunRestore, store, actions } from '../js/core/state.js';
import { renderSettings } from '../js/views/settings.js';
import { t } from '../js/core/i18n.js';

const NOW = new Date(2025, 5, 15, 12, 0);

/* ------------------------------------------------------------------ */
/* pure helpers                                                        */
/* ------------------------------------------------------------------ */

test('daysSinceBackup: never/junk -> null; whole days; backwards clock is today', () => {
  assert.equal(daysSinceBackup(null, NOW), null);
  assert.equal(daysSinceBackup(undefined, NOW), null);
  assert.equal(daysSinceBackup('x', NOW), null);
  assert.equal(daysSinceBackup(0, NOW), null);
  assert.equal(daysSinceBackup(-5, NOW), null);
  assert.equal(daysSinceBackup(NOW.getTime(), NOW), 0);
  assert.equal(daysSinceBackup(NOW.getTime() - 86400000, NOW), 1);
  assert.equal(daysSinceBackup(NOW.getTime() - 30 * 86400000, NOW), 30);
  // a clock set backwards: the marker is "in the future" -> clamp to 0, never -3
  assert.equal(daysSinceBackup(NOW.getTime() + 3 * 86400000, NOW), 0);
  assert.equal(daysSinceBackup(NaN, NOW), null);
});

test('formatBytes: B / KB / MB, junk -> null', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(812), '812 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(14520), '14.2 KB');
  assert.equal(formatBytes(3.4 * 1024 * 1024), '3.4 MB');
  assert.equal(formatBytes(-1), null);
  assert.equal(formatBytes('x'), null);
  assert.equal(formatBytes(Infinity), null);
});

test('dryRunVerdict: the four honest labels', () => {
  assert.equal(dryRunVerdict({ ok: true, total: 10, kept: 10 }), 'clean');
  assert.equal(dryRunVerdict({ ok: true, total: 10, kept: 7 }), 'lossy');
  assert.equal(dryRunVerdict({ ok: true, total: 0, kept: 0 }), 'empty');
  assert.equal(dryRunVerdict({ ok: false, total: 0, kept: 0 }), 'failed');
  assert.equal(dryRunVerdict(null), 'failed');
  assert.equal(dryRunVerdict('x'), 'failed');
});

/* ------------------------------------------------------------------ */
/* the dry run (sandboxed restore cleaning)                            */
/* ------------------------------------------------------------------ */

test('dryRunRestore: a healthy payload reports kept == total, store untouched', () => {
  const payload = {
    settings: { language: 'en' },
    reminders: [
      { id: 'r1', time: '06:00', label: 'a' },
      { id: 'r2', time: '18:30', label: 'b' },
    ],
    favorites: ['a', 'b', 'c'],
    calendarNotes: [],
  };
  const before = store.getState();
  const report = dryRunRestore(payload);
  assert.equal(report.ok, true);
  // settings counts its keys (1: language) + reminders 2 + favorites 3
  assert.equal(report.total, 6, 'counts entries across slices');
  assert.equal(report.kept, report.total, 'a healthy payload survives intact');
  assert.ok(report.slices.reminders && report.slices.reminders.kept === 2);
  // sandboxed: the store must not have moved
  assert.equal(store.getState(), before);
});

test('dryRunRestore: junk entries are counted as what a real restore would drop', () => {
  const payload = {
    reminders: [
      { id: 'good', time: '07:00' },
      { id: 'bad-hours', time: '25:99' },
      { id: 'bad-empty', time: '' },
      { id: 'bad-garbage', time: 'nope' },
    ],
    mushafPagesRead: { 1: true, 2: true, 99999: true, notapage: true },
  };
  const report = dryRunRestore(payload);
  assert.equal(report.ok, true);
  assert.equal(report.slices.reminders.total, 4);
  assert.equal(report.slices.reminders.kept, 1, 'only the valid reminder survives');
  assert.equal(report.slices.mushafPagesRead.total, 4);
  assert.equal(report.slices.mushafPagesRead.kept, 2, 'only real mushaf pages survive');
  assert.ok(report.kept < report.total);
  assert.equal(dryRunVerdict(report), 'lossy');
});

test('dryRunRestore: null/hostile payloads never throw', () => {
  assert.equal(dryRunRestore(null).ok, true);
  assert.equal(dryRunRestore(null).total, 0);
  assert.equal(dryRunRestore('x').ok, true);
  assert.equal(dryRunRestore(42).ok, true);
  const cyclic = {};
  cyclic.self = cyclic; // clone must survive a cyclic shape via try/catch
  const r = dryRunRestore(cyclic);
  assert.ok(r && typeof r.ok === 'boolean');
});

/* ------------------------------------------------------------------ */
/* the store boundary                                                  */
/* ------------------------------------------------------------------ */

test('BACKUP_EXPORTED ignores the payload and stamps the device clock', () => {
  store.dispatch({ type: 'BACKUP_EXPORTED', ts: 1 });
  const stamped = store.getState().backupMeta.lastBackupAt;
  assert.ok(Number.isFinite(stamped) && stamped > 1e12, 'device-now stamped');
  assert.ok(Math.abs(Date.now() - stamped) < 60000);
});

test('RESTORE_STATE: a forged future backupMeta and junk shapes drop', () => {
  store.dispatch({
    type: 'RESTORE_STATE',
    payload: {
      settings: {},
      backupMeta: { lastBackupAt: Date.now() + 365 * 86400000 },
    },
  });
  assert.equal(store.getState().backupMeta.lastBackupAt, null, 'future backup is junk');
  store.dispatch({
    type: 'RESTORE_STATE',
    payload: { settings: {}, backupMeta: 'junk' },
  });
  assert.equal(store.getState().backupMeta.lastBackupAt, null);
});

test('DATA_HEALTH reducers: hostile values degrade to the guarded shape', () => {
  store.dispatch({ type: 'DATA_HEALTH_STORAGE', value: { usage: -5, quota: 'x', junk: 1 } });
  const s = store.getState().dataHealth.storage;
  assert.equal(s.usage, 0);
  assert.equal(s.quota, 0);
  assert.equal(s.unsupported, false);
  store.dispatch({ type: 'DATA_HEALTH_DRYRUN', value: { ok: 'yes', total: -3, kept: 'x' } });
  const r = store.getState().dataHealth.dryRun;
  assert.equal(r, null, 'ok must be a boolean, not a string');
  store.dispatch({ type: 'DATA_HEALTH_STORAGE', value: 'junk' });
  assert.equal(store.getState().dataHealth.storage, null);
  store.dispatch(actions.setDataHealthStorage({ usage: 100, quota: 1000 }));
  assert.equal(store.getState().dataHealth.storage.quota, 1000);
});

/* ------------------------------------------------------------------ */
/* the Settings panel (both languages)                                 */
/* ------------------------------------------------------------------ */

const KEY_DATA = [
  'settings.dataStorage',
  'settings.dataStoragePending',
  'settings.dataStorageUnsupported',
  'settings.dataLastBackupNever',
  'settings.dataLastBackupDays',
  'settings.dataVerify',
  'settings.dataVerifyClean',
  'settings.dataVerifyLossy',
  'settings.dataVerifyFailed',
  'settings.dataAppVersion',
];

test('CONTRACT: every data-health key exists in BOTH languages', () => {
  for (const k of KEY_DATA) {
    const en = t(k, 'en');
    const ar = t(k, 'ar');
    assert.notEqual(en, k, `missing EN: ${k}`);
    assert.notEqual(ar, k, `missing AR: ${k}`);
    assert.notEqual(ar, en, `AR fell back to EN for ${k}`);
  }
});

test('Settings panel renders the health lines (EN + AR smoke)', () => {
  const base = {
    settings: {
      language: 'en',
      palette: 'emerald',
      shape: 'round',
      themeMode: 'light',
      reciter: 'x',
      quranTranslation: 'en-sahih',
      reminders: [],
      fontScale: 1,
      arabicFontScale: 1,
      dailyGoal: 100,
    },
    reminders: [],
    backupMeta: { lastBackupAt: Date.now() - 3 * 86400000 },
    dataHealth: { storage: { usage: 14 * 1024, quota: 1024 * 1024 }, dryRun: null },
  };
  const html = renderSettings(base);
  assert.ok(html.includes('data-action="verify-backup"'));
  assert.ok(html.includes('Last backup: 3 day(s) ago'));
  assert.ok(html.includes('14.0 KB of 1.0 MB'));
  assert.ok(html.includes('App version:'));
  assert.ok(!html.includes('undefined'), 'no unformatted fallback leaks');
  const ar = renderSettings({ ...base, settings: { ...base.settings, language: 'ar' } });
  assert.ok(ar.includes('آخر نسخة احتياطية'));
});

test('Settings panel: the dry-run verdict line renders after a verify', () => {
  const base = {
    settings: { language: 'en', reminders: [] },
    reminders: [],
    backupMeta: { lastBackupAt: null },
    dataHealth: {
      storage: null,
      dryRun: { ok: true, total: 12, kept: 12, slices: {} },
    },
  };
  const html = renderSettings(base);
  assert.ok(html.includes('Restore check passed'));
  assert.ok(html.includes('12 of 12'));
  assert.ok(html.includes('Last backup: never'));
});
