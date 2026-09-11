/**
 * views/offline.js — the Offline library (v5.3.0): one-tap bulk download
 * of every on-demand text corpus, per-group status, a storage meter, and
 * a pointer to reciter-audio downloads (which stay per-reciter in Audio).
 */
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { OFFLINE_GROUPS } from '../domain/offline.js';
import { formatBytes } from '../services/audioStore.js';

function fmtDate(at, lang) {
  try {
    return new Date(at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function groupStatusHTML(status, group, lang) {
  const st = status?.[group.id];
  if (st && st.total > 0 && st.done >= st.total) {
    return `<span class="offline-row__status offline-row__status--done">${icon('check', { size: 14 })} ${escapeHTML(t('offline.complete', lang))}${st.at ? ` · ${escapeHTML(fmtDate(st.at, lang))}` : ''}</span>`;
  }
  if (st && st.total > 0) {
    return `<span class="offline-row__status">${escapeHTML(t('offline.partial', lang, { done: st.done, total: st.total }))}</span>`;
  }
  return `<span class="offline-row__status">${escapeHTML(t('offline.notDownloaded', lang))}</span>`;
}

export function renderOffline(state) {
  const lang = state.settings.language;
  const jobs = state.offlineJobs || {};
  const status = state.settings.offline || {};
  const running = jobs.running === true;
  const compressed = state.settings.compressedDownloads === true;
  const pct = jobs.total > 0 ? Math.min(100, Math.round((jobs.done / jobs.total) * 100)) : 0;
  const totalMB = OFFLINE_GROUPS.reduce((n, g) => n + (compressed ? g.gzMB : g.sizeMB), 0);

  const quota = jobs.quota;
  const meter =
    quota && quota.quota > 0
      ? `<p class="panel__subtext" dir="ltr">${escapeHTML(t('offline.storage', lang))}: ${escapeHTML(formatBytes(quota.usage))} / ${escapeHTML(formatBytes(quota.quota))}</p>`
      : `<p class="panel__subtext">${escapeHTML(t('offline.storageUnknown', lang))}</p>`;

  const rows = OFFLINE_GROUPS.map((g) => {
    const mb = compressed ? g.gzMB : g.sizeMB;
    return `
    <div class="offline-row">
      <span class="offline-row__icon">${icon('book', { size: 18 })}</span>
      <span class="offline-row__text">
        <span class="offline-row__name">${escapeHTML(t(`offline.group.${g.id}`, lang))}</span>
        <span class="offline-row__sub" dir="ltr">~${mb} MB</span>
      </span>
      <div class="offline-row__actions">
        ${groupStatusHTML(status, g, lang)}
        <button type="button" class="btn btn--secondary btn--sm" data-action="offline-download-group" data-group="${g.id}" ${running ? 'disabled' : ''}>${icon('download', { size: 14 })} ${escapeHTML(t('offline.downloadGroup', lang))}</button>
      </div>
    </div>`;
  }).join('');

  return `
  <section class="view view--offline">
    <header class="view-header view-header--row">
      <a class="back-link" href="${buildHash(VIEWS.SETTINGS)}" data-action="navigate" data-view="${VIEWS.SETTINGS}">${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 18 })} ${t('nav.settings', lang)}</a>
      <h1 class="view__title">${t('nav.offline', lang)}</h1>
    </header>
    <p class="view__subtitle">${t('offline.lead', lang)}</p>

    <section class="panel">
      ${meter}
      ${
        running
          ? `
      <div class="progress-bar" role="progressbar" aria-label="${t('offline.downloading', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
      </div>
      <p class="panel__subtext" dir="ltr">${jobs.done} / ${jobs.total}</p>
      <button type="button" class="btn btn--secondary" data-action="offline-stop">${icon('stop', { size: 14 })} ${t('offline.stop', lang)}</button>`
          : `
      <button type="button" class="btn btn--primary" data-action="offline-download-all">${icon('download', { size: 16 })} ${escapeHTML(t('offline.downloadAll', lang, { mb: totalMB }))}</button>`
      }
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('offline.groupsTitle', lang)}</h2></div>
      ${rows}
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('offline.storageModeTitle', lang)}</h2></div>
      <p class="panel__subtext">${t('offline.storageModeBody', lang)}</p>
      <label class="mushaf-sheet__row mushaf-sheet__row--toggle">
        <span class="mushaf-sheet__label">${t('offline.compressedLabel', lang)}</span>
        <span class="switch">
          <input type="checkbox" data-action="offline-toggle-compressed" ${compressed ? 'checked' : ''} ${running ? 'disabled' : ''} />
          <span class="switch__track"></span>
        </span>
      </label>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('offline.audioTitle', lang)}</h2></div>
      <p class="panel__subtext">${t('offline.audioBody', lang)}</p>
      <a class="btn btn--secondary btn--sm" href="${buildHash(VIEWS.AUDIO)}" data-action="navigate" data-view="${VIEWS.AUDIO}">${icon('volume', { size: 14 })} ${t('offline.audioOpen', lang)}</a>
    </section>
  </section>`;
}
