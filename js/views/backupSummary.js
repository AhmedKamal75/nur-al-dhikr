/**
 * views/backupSummary.js — (v5.17.59, merged-plan item 12) the ONE unified
 * offline+backup summary card: a shared view partial (like installRow.js),
 * because ui/ may not import services/ or domain/ and this card needs both
 * (daysSinceBackup + backupStale from services, isReturningUser from
 * domain). One builder, two surfaces (rule 6), so the two can never drift:
 *
 *   - last off-device export age (the only "backed up" this zero-server
 *     app can honestly claim),
 *   - rolling on-device auto-snapshot age + size (device loss still needs
 *     a manual export — the stale nudge keeps saying exactly that),
 *   - the stale nudge when the export is older than STALE_BACKUP_DAYS,
 *     for returning users only (strangers are never nagged),
 *   - a restore entry (the auto-snapshot restore when one exists, the
 *     file-import entry otherwise — never a restore button for a snapshot
 *     that does not exist),
 *   - the cross-link that binds the pair: Offline → Settings data
 *     section, Settings → Offline library.
 *
 * Honest states throughout: "never" and "nothing saved yet" are stated,
 * the size line renders only when a real byte count is known, and the
 * snapshot restore button is gated on the snapshot stamp.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { escapeHTML } from '../core/utils.js';
import { daysSinceBackup, formatBytes } from '../services/dataHealth.js';
import { backupStale } from '../services/backup.js';
import { isReturningUser } from '../domain/onboarding.js';

/** Upper bound for a believable snapshot byte count (1 GiB); beyond it the value is junk. */
export const MAX_SNAPSHOT_BYTES = 1073741824;

/** A stored byte count worth displaying, or null when unknown/junk. */
export function cleanSnapshotBytes(v) {
  // Note: Number(null) is 0, so absent must be rejected before converting —
  // otherwise "never snapshotted" would state a size of 0 B. Zero itself is
  // also not a real snapshot (the payload is kilobytes), so only counts
  // above zero display.
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_SNAPSHOT_BYTES) return null;
  return Math.floor(n);
}

/**
 * The card's facts, DOM-free for tests: whole-day ages (null = never),
 * the snapshot byte count (null = unknown), and whether the stale nudge
 * shows (returning users with an old-or-never export only).
 */
export function describeBackupSummary(state, now = Date.now()) {
  const meta = state?.backupMeta || {};
  const at = now instanceof Date ? now : new Date(now);
  return {
    exportDays: daysSinceBackup(meta.lastBackupAt, at),
    autoDays: daysSinceBackup(meta.lastAutoBackupAt, at),
    autoBytes: cleanSnapshotBytes(meta.lastAutoBackupBytes),
    hasAuto: Number(meta.lastAutoBackupAt) > 0,
    stale: backupStale(meta.lastBackupAt, now instanceof Date ? now.getTime() : now),
    nudge:
      backupStale(meta.lastBackupAt, now instanceof Date ? now.getTime() : now) &&
      isReturningUser(state || {}),
  };
}

/**
 * The shared card. `variant` picks the cross-link direction only —
 * 'offline' (rendered on the Offline view, links into the Settings data
 * section where restore lives) or 'settings' (rendered in the Settings
 * data section, links out to the Offline library). Facts, nudge and
 * restore entry are identical on both.
 */
export function backupSummaryHTML(state, opts = {}) {
  const variant = opts.variant === 'offline' ? 'offline' : 'settings';
  const lang = state?.settings?.language || 'en';
  const d = describeBackupSummary(state, opts.now ?? Date.now());
  const titleId = `backup-summary-title-${variant}`;

  const exportLine =
    d.exportDays == null
      ? escapeHTML(t('settings.dataLastBackupNever', lang))
      : escapeHTML(t('settings.dataLastBackupDays', lang, { n: d.exportDays }));

  let autoLine =
    d.autoDays == null
      ? escapeHTML(t('settings.dataAutoNever', lang))
      : escapeHTML(t('settings.dataAutoLine', lang, { n: d.autoDays }));
  if (d.autoDays != null && d.autoBytes != null) {
    const size = formatBytes(d.autoBytes) ?? String(d.autoBytes);
    autoLine += ` · <span dir="ltr">${escapeHTML(t('backup.summarySize', lang, { size }))}</span>`;
  }

  let nudge = '';
  if (d.nudge) {
    const line =
      d.exportDays == null
        ? t('settings.dataBackupNever', lang)
        : t('settings.dataBackupStale', lang, { n: d.exportDays });
    nudge = `<p class="panel__subtext">${icon('shield', { size: 13 })} ${escapeHTML(line)} <button type="button" class="link-btn link-btn--sm" data-action="export-backup">${escapeHTML(t('settings.exportBackup', lang))}</button></p>`;
  }

  // The restore entry: the snapshot restore when a snapshot exists, the
  // file-import entry otherwise. A restore button for a snapshot that was
  // never taken would be a lie, so the no-snapshot state links the import
  // path instead of offering a restore.
  const restoreEntry = d.hasAuto
    ? `<button type="button" class="btn btn--secondary btn--sm" data-action="restore-auto-backup">${icon('upload', { size: 14 })} ${escapeHTML(t('settings.restoreAutoBackup', lang))}</button>`
    : `<button type="button" class="btn btn--secondary btn--sm" data-action="import-backup">${icon('upload', { size: 14 })} ${escapeHTML(t('settings.importBackup', lang))}</button>`;

  const crossLink =
    variant === 'offline'
      ? `<a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.SETTINGS, { id: 'data' })}" data-action="navigate" data-view="${VIEWS.SETTINGS}" data-id="data">${icon('shield', { size: 14 })} ${escapeHTML(t('backup.openData', lang))}</a>`
      : `<a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.OFFLINE)}" data-action="navigate" data-view="${VIEWS.OFFLINE}">${icon('download', { size: 14 })} ${escapeHTML(t('backup.openOffline', lang))}</a>`;

  return `
    <section class="panel" data-testid="backup-summary" data-variant="${variant}" aria-labelledby="${titleId}">
      <div class="panel__header"><h2 id="${titleId}">${escapeHTML(t('backup.summaryTitle', lang))}</h2></div>
      <p class="panel__subtext">${exportLine}</p>
      <p class="panel__subtext">${autoLine}</p>
      ${nudge}
      <div class="btn-stack">${restoreEntry}${crossLink}</div>
    </section>`;
}
