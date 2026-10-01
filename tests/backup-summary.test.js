/**
 * tests/backup-summary.test.js — merged-plan item 12 (v5.17.59): the ONE
 * unified offline+backup summary card.
 *
 * The Offline view and the Settings data section render the same builder
 * (js/views/backupSummary.js, rule 6), so the two surfaces cannot drift. The
 * card states the last off-device export age, the on-device auto-snapshot
 * age + size, the stale nudge past STALE_BACKUP_DAYS, a restore entry, and
 * the cross-link binding the pair (Offline ↔ Settings data section).
 *
 * Pinned here:
 *  1. describeBackupSummary facts per state (never / fresh / stale) incl.
 *     byte-count honesty (unknown/junk sizes never render);
 *  2. card render per state on BOTH surfaces (fresh/stale/never) with the
 *     honest copy (never implies a snapshot that does not exist);
 *  3. link wiring: Offline → Settings data section, Settings → Offline,
 *     restore entry gated on a real snapshot (import entry otherwise);
 *  4. the byte-count plumbing (reducer stamps, sanitizer keeps/drops);
 *  5. bilingual EN+AR for every new key, no gamification vocabulary, and
 *     the 19/19 renderer static budget untouched (the builder is a ui
 *     module, never a view import).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { STALE_BACKUP_DAYS } from '../js/services/backup.js';
import {
  MAX_SNAPSHOT_BYTES,
  backupSummaryHTML,
  cleanSnapshotBytes,
  describeBackupSummary,
} from '../js/views/backupSummary.js';
import { actions } from '../js/core/state.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { sanitizeRestoredPayload } from '../js/core/state/restore.js';
import { renderOffline } from '../js/views/offline.js';
import { renderSettings } from '../js/views/settings.js';
import { t } from '../js/core/i18n.js';

const DAY_MS = 86400000;
const NOW = Date.now();
const RETURNING = {
  statistics: { totalRecitations: 40 },
  favorites: [],
  history: [],
  collections: [],
};

function state(over = {}, lang = 'en') {
  return {
    settings: { language: lang },
    reminders: [],
    profiles: [],
    activeProfile: 'main',
    statistics: { totalRecitations: 0 },
    favorites: [],
    history: [],
    collections: [],
    backupMeta: { lastBackupAt: null, lastAutoBackupAt: null, lastAutoBackupBytes: null },
    offlineJobs: { running: false, group: null, done: 0, total: 0, failed: 0, quota: null },
    ...RETURNING,
    ...over,
  };
}

describe('describeBackupSummary: facts per state', () => {
  test('never: null ages, null size, nudge only for returning users', () => {
    const d = describeBackupSummary(state(), NOW);
    assert.equal(d.exportDays, null);
    assert.equal(d.autoDays, null);
    assert.equal(d.autoBytes, null);
    assert.equal(d.hasAuto, false);
    assert.equal(d.stale, true, 'no export is stale');
    const stranger = describeBackupSummary(state({ statistics: { totalRecitations: 0 } }), NOW);
    assert.equal(stranger.nudge, false, 'strangers are never nagged');
    const returning = describeBackupSummary(state(), NOW);
    assert.equal(returning.nudge, true, 'returning users with no export get the nudge');
  });

  test('fresh: ages count whole days, no nudge', () => {
    const d = describeBackupSummary(
      state({
        backupMeta: {
          lastBackupAt: NOW - 2 * DAY_MS,
          lastAutoBackupAt: NOW - DAY_MS,
          lastAutoBackupBytes: 14520,
        },
      }),
      NOW
    );
    assert.equal(d.exportDays, 2);
    assert.equal(d.autoDays, 1);
    assert.equal(d.autoBytes, 14520);
    assert.equal(d.hasAuto, true);
    assert.equal(d.nudge, false);
  });

  test('stale: exports past the threshold nudge returning users', () => {
    assert.equal(STALE_BACKUP_DAYS, 30);
    const d = describeBackupSummary(
      state({ backupMeta: { lastBackupAt: NOW - 40 * DAY_MS, lastAutoBackupAt: null } }),
      NOW
    );
    assert.equal(d.exportDays, 40);
    assert.equal(d.nudge, true);
  });

  test('byte honesty: junk counts never render', () => {
    assert.equal(cleanSnapshotBytes(null), null);
    assert.equal(cleanSnapshotBytes(undefined), null);
    assert.equal(cleanSnapshotBytes(''), null);
    assert.equal(cleanSnapshotBytes('x'), null);
    assert.equal(cleanSnapshotBytes(-5), null);
    assert.equal(cleanSnapshotBytes(0), null, 'zero bytes is not a real snapshot');
    assert.equal(cleanSnapshotBytes(Infinity), null);
    assert.equal(cleanSnapshotBytes(MAX_SNAPSHOT_BYTES + 1), null);
    assert.equal(cleanSnapshotBytes(14520.9), 14520);
    assert.equal(cleanSnapshotBytes('14520'), 14520);
  });
});

describe('card render per state, both surfaces', () => {
  test('never: honest absence on both, import entry instead of restore', () => {
    for (const html of [
      backupSummaryHTML(state(), { variant: 'offline', now: NOW }),
      backupSummaryHTML(state(), { variant: 'settings', now: NOW }),
    ]) {
      assert.ok(html.includes('data-testid="backup-summary"'), 'card hook present');
      assert.ok(html.includes('Last backup: never'), 'export absence stated');
      assert.ok(html.includes('nothing saved yet'), 'snapshot absence stated');
      assert.ok(
        !html.includes('data-action="restore-auto-backup"'),
        'no restore without a snapshot'
      );
      assert.ok(html.includes('data-action="import-backup"'), 'file-import restore entry instead');
      assert.ok(!html.includes('Snapshot size:'), 'no size claimed without bytes');
    }
  });

  test('fresh: ages + size, quiet (no nudge), snapshot restore offered', () => {
    const s = state({
      backupMeta: {
        lastBackupAt: NOW - 2 * DAY_MS,
        lastAutoBackupAt: NOW - DAY_MS,
        lastAutoBackupBytes: 14520,
      },
    });
    for (const html of [
      backupSummaryHTML(s, { variant: 'offline', now: NOW }),
      backupSummaryHTML(s, { variant: 'settings', now: NOW }),
    ]) {
      assert.ok(html.includes('Last backup: 2 day(s) ago'), 'export age stated');
      assert.ok(html.includes('Auto-backup on this device: 1 day(s) ago'), 'snapshot age stated');
      assert.ok(html.includes('Snapshot size: 14.2 KB'), 'snapshot size stated');
      assert.ok(!html.includes('last export'), 'fresh exports stay quiet');
      assert.ok(html.includes('data-action="restore-auto-backup"'), 'snapshot restore offered');
    }
  });

  test('stale: the nudge names the gap with its export CTA, on both', () => {
    const s = state({
      backupMeta: { lastBackupAt: NOW - 40 * DAY_MS, lastAutoBackupAt: null },
    });
    for (const html of [
      backupSummaryHTML(s, { variant: 'offline', now: NOW }),
      backupSummaryHTML(s, { variant: 'settings', now: NOW }),
    ]) {
      assert.ok(html.includes('last export 40 day(s) ago'), 'stale line names the gap');
      assert.ok(html.includes('data-action="export-backup"'), 'nudge carries its CTA');
    }
  });

  test('size renders only when bytes are known (age without size stays honest)', () => {
    const s = state({
      backupMeta: { lastBackupAt: null, lastAutoBackupAt: NOW - DAY_MS, lastAutoBackupBytes: null },
    });
    const html = backupSummaryHTML(s, { variant: 'offline', now: NOW });
    assert.ok(html.includes('1 day(s) ago'), 'snapshot age stated');
    assert.ok(html.includes('data-action="restore-auto-backup"'), 'stamp still offers restore');
    assert.ok(!html.includes('Snapshot size:'), 'unknown size never claimed');
  });

  test('Arabic renders the same card with no missing keys', () => {
    const s = state(
      {
        backupMeta: {
          lastBackupAt: NOW - 40 * DAY_MS,
          lastAutoBackupAt: NOW - DAY_MS,
          lastAutoBackupBytes: 14520,
        },
      },
      'ar'
    );
    for (const html of [
      backupSummaryHTML(s, { variant: 'offline', now: NOW }),
      backupSummaryHTML(s, { variant: 'settings', now: NOW }),
    ]) {
      assert.ok(html.includes('ملخص النسخة الاحتياطية'), 'AR title');
      assert.ok(html.includes('آخر نسخة احتياطية'), 'AR export age');
      assert.ok(html.includes('نسخة تلقائية على هذا الجهاز'), 'AR snapshot age');
      assert.ok(!html.includes('backup.'), 'no raw key leaks');
    }
  });
});

describe('link wiring: Offline ↔ Settings restore entry', () => {
  test('offline card links into the Settings data section', () => {
    const html = renderOffline(state());
    assert.ok(html.includes('data-testid="backup-summary"'), 'offline carries the card');
    assert.ok(html.includes('data-variant="offline"'), 'offline variant');
    assert.ok(html.includes('#/settings/data'), 'deep link to the data section');
    assert.ok(html.includes('data-view="settings"'), 'navigate contract kept');
    assert.ok(html.includes('data-id="data"'), 'section id rides along');
  });

  test('settings card links out to the Offline library', () => {
    const html = renderSettings(state());
    assert.ok(html.includes('data-testid="backup-summary"'), 'settings carries the card');
    assert.ok(html.includes('data-variant="settings"'), 'settings variant');
    assert.ok(html.includes('#/offline'), 'link to the offline route');
    assert.ok(html.includes('data-view="offline"'), 'navigate contract kept');
  });

  test('one builder serves both (rule 6): same facts, only the link differs', () => {
    const s = state({
      backupMeta: {
        lastBackupAt: NOW - 2 * DAY_MS,
        lastAutoBackupAt: NOW - DAY_MS,
        lastAutoBackupBytes: 1024,
      },
    });
    const off = backupSummaryHTML(s, { variant: 'offline', now: NOW });
    const set = backupSummaryHTML(s, { variant: 'settings', now: NOW });
    for (const fact of ['Last backup: 2 day(s) ago', '1 day(s) ago', 'Snapshot size: 1.0 KB']) {
      assert.ok(off.includes(fact) && set.includes(fact), `shared fact: ${fact}`);
    }
    assert.ok(
      off.includes('#/settings/data') && !off.includes('href="#/offline"'),
      'offline links in'
    );
    assert.ok(set.includes('#/offline') && !set.includes('#/settings/data'), 'settings links out');
  });

  test('restore entry is gated: snapshot restores, otherwise the import path', () => {
    const none = renderOffline(state());
    assert.ok(!none.includes('data-action="restore-auto-backup"'), 'no snapshot, no restore');
    const some = renderOffline(
      state({ backupMeta: { lastBackupAt: null, lastAutoBackupAt: NOW - DAY_MS } })
    );
    assert.ok(some.includes('data-action="restore-auto-backup"'), 'snapshot offers restore');
  });

  test('no new data-actions: every card CTA is already handled', async () => {
    const { clickHandlers: system } = await import('../js/app/handlers/system.js');
    for (const a of ['export-backup', 'restore-auto-backup', 'import-backup']) {
      assert.equal(typeof system[a], 'function', `handler missing: ${a}`);
    }
    const { clickHandlers: nav } = await import('../js/app/handlers/navigation.js');
    assert.equal(typeof nav.navigate, 'function', 'handler missing: navigate');
  });
});

describe('byte-count plumbing: reducer stamps, sanitizer guards', () => {
  test('BACKUP_AUTO_SAVED stamps time + bytes, keeps the manual stamp', () => {
    const s0 = {
      ...initialState(),
      backupMeta: { lastBackupAt: 111, lastAutoBackupAt: null, lastAutoBackupBytes: null },
    };
    const stamped = reduce(s0, actions.markAutoBackupSaved(14520));
    assert.ok(Number.isFinite(stamped.backupMeta.lastAutoBackupAt), 'auto stamped');
    assert.equal(stamped.backupMeta.lastAutoBackupBytes, 14520, 'bytes stamped');
    assert.equal(stamped.backupMeta.lastBackupAt, 111, 'manual untouched');
    const junk = reduce(s0, actions.markAutoBackupSaved('junk'));
    assert.ok(Number.isFinite(junk.backupMeta.lastAutoBackupAt), 'time still stamped');
    assert.equal(junk.backupMeta.lastAutoBackupBytes, null, 'junk bytes degrade to null');
  });

  test('sanitize keeps honest bytes, drops junk and futures', () => {
    const out = sanitizeRestoredPayload({
      backupMeta: { lastBackupAt: 222, lastAutoBackupAt: 333, lastAutoBackupBytes: 14520 },
    });
    assert.equal(out.backupMeta.lastAutoBackupBytes, 14520);
    const bad = sanitizeRestoredPayload({
      backupMeta: { lastBackupAt: 222, lastAutoBackupAt: 333, lastAutoBackupBytes: -5 },
    });
    assert.equal(bad.backupMeta.lastAutoBackupBytes, null);
  });
});

describe('card contract: language, adab, budget', () => {
  test('every new key ships EN + AR with no fallback', () => {
    for (const k of [
      'backup.summaryTitle',
      'backup.summarySize',
      'backup.openData',
      'backup.openOffline',
    ]) {
      const en = t(k, 'en');
      const ar = t(k, 'ar');
      assert.notEqual(en, k, `missing EN: ${k}`);
      assert.notEqual(ar, k, `missing AR: ${k}`);
      assert.notEqual(ar, en, `AR fell back to EN for ${k}`);
    }
  });

  test('no gamification or shame vocabulary on the card, either language', () => {
    const banned = [
      'streak',
      'points',
      'reward',
      'confetti',
      'leaderboard',
      'behind',
      'missed',
      'overdue',
      'shame',
      'level up',
    ];
    for (const lang of ['en', 'ar']) {
      const html = backupSummaryHTML(state({}, lang), {
        variant: 'offline',
        now: NOW,
      }).toLowerCase();
      for (const w of banned) {
        assert.ok(!html.includes(w), `card carries "${w}" (${lang})`);
      }
    }
  });

  test('renderer 19/19 static budget untouched: builder is a views partial, imports no view', () => {
    const renderer = readFileSync(new URL('../js/app/renderer.js', import.meta.url), 'utf8');
    const staticViews = [...renderer.matchAll(/from\s+['"]\.\.\/views\/([^'"]+)\.js['"]/g)].map(
      (m) => m[1]
    );
    assert.ok(
      staticViews.length <= 19,
      `renderer statically imports ${staticViews.length} views (cap 19)`
    );
    const builder = readFileSync(new URL('../js/views/backupSummary.js', import.meta.url), 'utf8');
    assert.ok(!builder.includes('../views/'), 'the shared builder imports no view');
    const offline = readFileSync(new URL('../js/views/offline.js', import.meta.url), 'utf8');
    assert.ok(offline.includes('./backupSummary.js'), 'offline reuses the builder');
    const settings = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
    assert.ok(settings.includes('./backupSummary.js'), 'settings reuses the builder');
  });

  test('Elder/a11y: labelled section, native controls, existing classes only', () => {
    const html = backupSummaryHTML(state(), { variant: 'offline', now: NOW });
    assert.ok(html.includes('aria-labelledby="backup-summary-title-offline"'), 'labelled section');
    assert.ok(html.includes('<h2 id="backup-summary-title-offline">'), 'heading target exists');
    assert.ok(html.includes('<a ') && html.includes('<button type="button"'), 'native controls');
    assert.ok(!html.includes('style='), 'no inline styles');
  });
});
