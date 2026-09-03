/**
 * dataHealth.js — the Settings "data health check" (v3.26.0). Pure,
 * DOM-free helpers.
 *
 * The TODO's framing is the spec: "Backups people never test are hopes,
 * not backups; this closes the loop without any server." So the panel
 * reports three honest facts:
 *   - storage footprint (navigator.storage.estimate, formatted here);
 *   - days since the last backup export (from the persisted marker the
 *     export action writes);
 *   - a one-tap RESTORE DRY RUN: the exact bytes an export would produce
 *     are pushed through the same sanitizer a real restore applies — in a
 *     sandboxed read (never dispatching into the store) — and the report
 *     says how many entries would survive, slice by slice.
 *
 * This module holds only the shape-free math and formatting; the dry run
 * itself lives next to the sanitizer it exercises (dryRunRestore in
 * state.js) so the two can never drift.
 */

import { formatBytes as canonicalFormatBytes } from '../core/utils.js';

const DAY_MS = 86400000;

/** Whole days since `ts`, or null when never backed up / junk input. */
export function daysSinceBackup(ts, now = new Date()) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return null;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  const days = Math.floor((now.getTime() - ts) / DAY_MS);
  return days >= 0 ? days : 0; // a clock set backwards is "today", not negative
}

/** Human byte size: '812 B', '14.2 KB', '3.4 MB' (never a bare number). */
// (v4.1) display format for the storage-estimate line (one decimal KB,
// null for unknown) — delegates to the shared formatter in core/utils.js.
export function formatBytes(n) {
  return canonicalFormatBytes(n, { kbPrec: 1, nullish: true });
}

/**
 * The honest verdict label for a dry run: 'clean' when everything the
 * snapshot carried survived, 'lossy' when the sanitizer had to drop
 * something (that is exactly what a real restore would drop too), 'empty'
 * when there was nothing to check, 'failed' when the sanitizer threw.
 */
export function dryRunVerdict(report) {
  if (!report || typeof report !== 'object') return 'failed';
  if (report.ok !== true) return 'failed';
  if (!Number.isFinite(report.total) || report.total <= 0) return 'empty';
  return report.kept >= report.total ? 'clean' : 'lossy';
}
