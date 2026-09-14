/**
 * tests/backupAuto.test.js — item 10 (backup) gates:
 *  1. autoBackupDue fires for returning users past the interval only;
 *     backupStale flags never/old manual exports;
 *  2. write/readAutoSnapshot round-trip a valid backup file through
 *     injectable storage; quota/corruption degrade silently;
 *  3. writeBackupToHandle honors the permission ladder (fake handles);
 *  4. BACKUP_AUTO_SAVED stamps without touching the manual stamp (and
 *     vice versa); sanitize keeps both stamps honest;
 *  5. maybeAutoBackupNow orchestrates save-once through the real store;
 *  6. the Data panel nudges stale exports, shows the auto line, gates the
 *     link/restore buttons, and all strings ship EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  AUTO_BACKUP_DAYS,
  STALE_BACKUP_DAYS,
  autoBackupDue,
  backupFileText,
  backupStale,
  filePickerSupported,
  maybeAutoBackupNow,
  readAutoSnapshot,
  writeAutoSnapshot,
  writeBackupToHandle,
} from '../js/services/backup.js';
import { actions, store } from '../js/core/state.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { renderSettings } from '../js/views/settings.js';

const DAY_MS = 86400000;
const RETURNING = {
  statistics: { totalRecitations: 10 },
  favorites: [],
  history: [],
  collections: [],
};
const FRESH = { statistics: { totalRecitations: 0 }, favorites: [], history: [], collections: [] };

/** Map-backed localStorage stand-in. */
function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

describe('autoBackupDue / backupStale: cadence gates', () => {
  test('due only for returning users past the interval', () => {
    const now = Date.now();
    assert.equal(autoBackupDue({}, FRESH, now), false, 'strangers get no snapshot');
    assert.equal(autoBackupDue({}, RETURNING, now), true, 'never snapshotted → due');
    assert.equal(
      autoBackupDue({ lastAutoBackupAt: now - DAY_MS }, RETURNING, now),
      false,
      'fresh snapshot waits'
    );
    assert.equal(
      autoBackupDue({ lastAutoBackupAt: now - AUTO_BACKUP_DAYS * DAY_MS }, RETURNING, now),
      true,
      'interval elapsed → due'
    );
    assert.equal(autoBackupDue({ lastAutoBackupAt: 'x' }, RETURNING, now), true);
    assert.equal(AUTO_BACKUP_DAYS, 7);
  });

  test('stale flags never/old manual exports', () => {
    const now = Date.now();
    assert.equal(backupStale(null, now), true);
    assert.equal(backupStale('x', now), true);
    assert.equal(backupStale(now - DAY_MS, now), false);
    assert.equal(backupStale(now - STALE_BACKUP_DAYS * DAY_MS, now), true);
    assert.equal(STALE_BACKUP_DAYS, 30);
  });
});

describe('auto snapshot storage: valid files, silent failures', () => {
  test('round-trips a restorable backup file', () => {
    const storage = fakeStorage();
    const persisted = { ...RETURNING, settings: { language: 'en' } };
    assert.equal(writeAutoSnapshot(persisted, storage, 12345), true);
    const snap = readAutoSnapshot(storage);
    assert.equal(snap.savedAt, 12345);
    assert.equal(snap.backup.kind, 'nur-al-dhikr-backup');
    assert.deepEqual(snap.backup.data.settings, { language: 'en' });
  });

  test('quota, absence and corruption degrade to false/null', () => {
    assert.equal(writeAutoSnapshot(RETURNING, null), false);
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    assert.equal(writeAutoSnapshot(RETURNING, throwing), false);
    assert.equal(readAutoSnapshot(null), null);
    assert.equal(readAutoSnapshot(fakeStorage()), null);
    const corrupt = fakeStorage();
    corrupt.setItem('nur-al-dhikr-auto-backup', '{oops');
    assert.equal(readAutoSnapshot(corrupt), null);
    const wrongShape = fakeStorage();
    wrongShape.setItem('nur-al-dhikr-auto-backup', JSON.stringify({ nope: 1 }));
    assert.equal(readAutoSnapshot(wrongShape), null);
  });

  test('backupFileText serializes the payload', () => {
    const text = backupFileText({ settings: {} });
    assert.deepEqual(JSON.parse(text).kind, 'nur-al-dhikr-backup');
  });
});

describe('writeBackupToHandle: permission ladder on fakes', () => {
  function fakeHandle({ permission = 'granted', requestResult = 'granted', throws = false } = {}) {
    const calls = [];
    return {
      calls,
      async queryPermission() {
        return permission;
      },
      async requestPermission() {
        calls.push('request');
        return requestResult;
      },
      async createWritable() {
        if (throws) throw new Error('disk');
        return {
          async write(text) {
            calls.push(['write', text]);
          },
          async close() {
            calls.push('close');
          },
        };
      },
    };
  }

  test('granted writes and closes', async () => {
    const h = fakeHandle();
    assert.equal(await writeBackupToHandle(h, 'data'), true);
    assert.deepEqual(h.calls, [['write', 'data'], 'close']);
  });

  test('prompt upgrades through request; denial stops silently', async () => {
    const h = fakeHandle({ permission: 'prompt', requestResult: 'granted' });
    assert.equal(await writeBackupToHandle(h, 'data'), true);
    assert.ok(h.calls.includes('request'));
    const denied = fakeHandle({ permission: 'prompt', requestResult: 'denied' });
    assert.equal(await writeBackupToHandle(denied, 'data'), false);
    assert.ok(!denied.calls.some((c) => Array.isArray(c)), 'never wrote');
  });

  test('hostile handles fail closed', async () => {
    assert.equal(await writeBackupToHandle(null, 'data'), false);
    assert.equal(await writeBackupToHandle({}, 'data'), false);
    assert.equal(await writeBackupToHandle(fakeHandle({ throws: true }), 'data'), false);
  });

  test('no picker under Node', () => {
    assert.equal(filePickerSupported(), false);
  });
});

describe('backupMeta: auto stamp coexists with the manual stamp', () => {
  test('reducers stamp independently', () => {
    const s0 = { ...initialState(), backupMeta: { lastBackupAt: 111, lastAutoBackupAt: null } };
    const auto = reduce(s0, actions.markAutoBackupSaved());
    assert.ok(Number.isFinite(auto.backupMeta.lastAutoBackupAt), 'auto stamped');
    assert.equal(auto.backupMeta.lastBackupAt, 111, 'manual untouched');
    const manual = reduce(auto, { type: 'BACKUP_EXPORTED' });
    assert.equal(
      manual.backupMeta.lastAutoBackupAt,
      auto.backupMeta.lastAutoBackupAt,
      'auto untouched'
    );
    assert.ok(manual.backupMeta.lastBackupAt >= 111, 'manual stamped');
  });

  test('sanitize keeps both stamps honest', () => {
    const future = Date.now() + 365 * DAY_MS;
    const out = sanitizeRestoredPayload({
      backupMeta: { lastBackupAt: 222, lastAutoBackupAt: future },
    });
    assert.equal(out.backupMeta.lastBackupAt, 222);
    assert.equal(out.backupMeta.lastAutoBackupAt, null, 'future auto is junk');
    assert.deepEqual(sanitizeRestoredPayload({}).backupMeta, {
      lastBackupAt: null,
      lastAutoBackupAt: null,
    });
  });
});

describe('maybeAutoBackupNow: save-once through the real store', () => {
  test('saves when due, then skips', async () => {
    const storage = fakeStorage();
    globalThis.localStorage = storage;
    try {
      store.dispatch(actions.restoreState({ favorites: ['a'] }));
      assert.equal(await maybeAutoBackupNow(), 'saved');
      assert.ok(readAutoSnapshot(storage)?.backup, 'snapshot banked');
      assert.ok(Number.isFinite(store.getState().backupMeta.lastAutoBackupAt), 'meta stamped');
      assert.equal(await maybeAutoBackupNow(), 'skipped', 'interval restarts');
    } finally {
      store.flushPersist();
      delete globalThis.localStorage;
      store.dispatch(actions.restoreState({}));
      store.flushPersist();
    }
  });

  test('fresh users skip without touching storage', async () => {
    const storage = fakeStorage();
    globalThis.localStorage = storage;
    try {
      store.dispatch(actions.restoreState({}));
      assert.equal(await maybeAutoBackupNow(), 'skipped');
      assert.equal(readAutoSnapshot(storage), null);
    } finally {
      store.flushPersist();
      delete globalThis.localStorage;
    }
  });
});

describe('Data panel: stale nudge, auto line, gated buttons', () => {
  function settingsState(over = {}) {
    return {
      settings: { language: 'en' },
      reminders: [],
      profiles: [],
      activeProfile: 'main',
      statistics: { totalRecitations: 0 },
      favorites: [],
      history: [],
      collections: [],
      backupMeta: { lastBackupAt: null, lastAutoBackupAt: null },
      ...over,
    };
  }

  test('returning + stale exports get the nudge with an export CTA', () => {
    const html = renderSettings(
      settingsState({
        statistics: { totalRecitations: 40 },
        backupMeta: { lastBackupAt: Date.now() - 40 * DAY_MS, lastAutoBackupAt: null },
      })
    );
    assert.ok(html.includes('last export 40 day(s) ago'), 'stale line names the gap');
    assert.ok(html.includes('data-action="export-backup"'), 'nudge carries its CTA');
  });

  test('fresh exports and fresh users see no nudge', () => {
    const fresh = renderSettings(
      settingsState({
        statistics: { totalRecitations: 40 },
        backupMeta: { lastBackupAt: Date.now() - DAY_MS, lastAutoBackupAt: null },
      })
    );
    assert.ok(!fresh.includes('last export'), 'recent export stays quiet');
    const stranger = renderSettings(settingsState());
    assert.ok(!stranger.includes('Export a backup'), 'strangers get no nudge');
  });

  test('auto line reports the snapshot; restore button is gated on it', () => {
    const none = renderSettings(settingsState({ statistics: { totalRecitations: 40 } }));
    assert.ok(none.includes('nothing saved yet'), 'auto-missing line');
    assert.ok(!none.includes('data-action="restore-auto-backup"'), 'no restore without snapshot');
    const some = renderSettings(
      settingsState({
        statistics: { totalRecitations: 40 },
        backupMeta: { lastBackupAt: null, lastAutoBackupAt: Date.now() - 2 * DAY_MS },
      })
    );
    assert.ok(some.includes('2 day(s) ago'), 'auto age renders');
    assert.ok(some.includes('data-action="restore-auto-backup"'), 'restore offered');
    assert.ok(some.includes('no export yet'), 'auto snapshot never quiets the manual nudge');
  });

  test('file-link button hides without the API', () => {
    const html = renderSettings(settingsState());
    assert.ok(!html.includes('data-action="backup-link-file"'), 'Node has no picker');
  });
});

describe('backup wiring: handlers, boot, strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/system.js', import.meta.url), 'utf8');
  const boot = readFileSync(new URL('../js/app/boot.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('link/restore actions registered; export tries save-back; boot heartbeats', () => {
    assert.ok(handlers.includes("'backup-link-file'"), 'link handler missing');
    assert.ok(handlers.includes("'restore-auto-backup'"), 'restore handler missing');
    assert.ok(handlers.includes('writeBackupToHandle'), 'export must try save-back first');
    assert.ok(boot.includes('maybeAutoBackupNow()'), 'boot must run the heartbeat');
  });

  test('backup strings ship EN + AR', () => {
    for (const key of [
      'settings.dataBackupStale',
      'settings.dataBackupNever',
      'settings.dataAutoLine',
      'settings.dataAutoNever',
      'settings.dataLinkFile',
      'settings.restoreAutoBackup',
      'settings.backupFileSaved',
    ]) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
