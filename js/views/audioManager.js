/**
 * views/audioManager.js
 * Reciters & offline downloads:
 *  - searchable catalog of 314 mushafs (mp3quran + quranicaudio) + the
 *    user's custom reciters,
 *  - per-surah download grid for the selected moshaf with Download All,
 *    per-file delete, moshaf wipe, storage usage bar,
 *  - custom-reciter form (any server following 001.mp3…114.mp3).
 *
 * Downloads run through app.js (the only place allowed to fetch); this
 * view is a pure template over state + the download registry.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { queueSignature } from '../services/surahPlayback.js';
import { searchReciters, findMoshaf } from '../services/audioCatalog.js';
import { formatBytes } from '../services/audioStore.js';
import { skeletonReciterRows } from '../ui/skeleton.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

function surahName(state, n) {
  const meta = state.quran.meta;
  const s = meta?.surahs?.find((x) => String(x.number) === String(n));
  return s ? `${s.nameTransliteration} · ${s.nameAr}` : `#${n}`;
}

export function renderAudio(state) {
  const lang = state.settings.language;
  const q = state.audioManager?.query || '';
  const hits = searchReciters(q, state.settings.customReciters || []);
  const selectedId = state.settings.audio.moshafId;
  const selected = selectedId ? findMoshaf(selectedId, state.settings.customReciters || []) : null;
  const downloads = state.audioDownloads || {};

  const rows = hits
    .slice(0, 60)
    .map((r) => {
      const active = r.id === selectedId;
      return `
    <div class="reciter-row ${active ? 'reciter-row--active' : ''}">
      <button type="button" class="reciter-row__main" data-action="audio-select-moshaf" data-id="${escapeHTML(r.id)}">
        <span class="reciter-row__name">${escapeHTML(lang === 'ar' && r.nameAr ? r.nameAr : r.nameEn)}</span>
        <span class="reciter-row__sub">${escapeHTML(r.nameAr && r.nameEn && lang === 'ar' ? r.nameEn : r.nameAr || '')}${r.rewaya ? ` — ${escapeHTML(r.rewaya)}` : ''}</span>
      </button>
      ${r.source === 'custom' ? `<button type="button" class="icon-btn icon-btn--sm" data-action="audio-remove-custom" data-id="${escapeHTML(r.id)}" aria-label="${t('common.delete', lang)}">${icon('trash', { size: 14 })}</button>` : ''}
    </div>`;
    })
    .join('');

  let grid = '';
  if (selected) {
    const doneCount = Object.keys(downloads).filter((k) => k.startsWith(`${selected.id}:`)).length;
    const totalBytes = Object.entries(downloads)
      .filter(([k]) => k.startsWith(`${selected.id}:`))
      .reduce((n, [, v]) => n + (v.bytes || 0), 0);

    const cells = [];
    for (let n = 1; n <= 114; n += 1) {
      const key = `${selected.id}:${n}`;
      const dl = downloads[key];
      // v3.14 Phase C: an in-flight download shows a spinner cell (and the
      // tap is ignored by the handler), so a 2MB fetch never reads as a
      // dead button.
      const busy = !!(state.audioDownloading && state.audioDownloading[key]);
      const label = lang === 'ar' ? t('quran.surah', lang) + ' ' + n : String(n);
      cells.push(`
      <div class="dl-cell ${dl ? 'dl-cell--done' : ''}${busy ? ' dl-cell--busy' : ''}">
        <button type="button" class="dl-cell__btn" data-action="${dl ? 'audio-delete-surah' : 'audio-download-surah'}" data-moshaf="${escapeHTML(selected.id)}" data-surah="${n}"
          title="${escapeHTML(surahName(state, n))}"
          aria-label="${escapeHTML(surahName(state, n))} — ${dl ? t('audio.deleteFile', lang) : t('audio.downloadFile', lang)}">
          <span class="dl-cell__num">${label}</span>
          <span class="dl-cell__state">${dl ? icon('check', { size: 13 }) : busy ? `<span class="dl-cell__spinner" role="status" aria-label="${t('common.loading', lang)}"></span>` : icon('download', { size: 13 })}</span>
        </button>
        ${dl ? `<span class="dl-cell__bytes">${formatBytes(dl.bytes)}</span>` : ''}
      </div>`);
    }

    grid = `
    <section class="panel panel--dl">
      <div class="panel__header">
        <h2>${escapeHTML(lang === 'ar' && selected.nameAr ? selected.nameAr : selected.nameEn)}${selected.rewaya ? ` — ${escapeHTML(selected.rewaya)}` : ''}</h2>
        <span class="chip__count">${doneCount} / 114 · ${formatBytes(totalBytes)}</span>
      </div>
      <div class="dl-actions">
        ${
          state.audioManager?.batchRunning
            ? `<button type="button" class="btn btn--danger btn--sm" data-action="audio-batch-stop" data-moshaf="${escapeHTML(selected.id)}">
          ${icon('close', { size: 14 })} ${t('audio.batchStop', lang)}
        </button>`
            : `<button type="button" class="btn btn--primary btn--sm" data-action="audio-download-all" data-moshaf="${escapeHTML(selected.id)}">
          ${icon('download', { size: 14 })} ${doneCount >= 114 ? t('audio.downloadMissing', lang) : t('audio.downloadAll', lang)}
        </button>`
        }
        <button type="button" class="btn btn--secondary btn--sm" data-action="audio-play-moshaf" data-moshaf="${escapeHTML(selected.id)}">
          ${icon('play', { size: 14 })} ${t('audio.playFirst', lang)}
        </button>
        ${doneCount ? `<button type="button" class="btn btn--ghost btn--sm" data-action="audio-delete-moshaf" data-moshaf="${escapeHTML(selected.id)}">${icon('trash', { size: 13 })} ${t('audio.deleteAll', lang)}</button>` : ''}
      </div>
      <div class="dl-grid">${cells.join('')}</div>
    </section>`;
  }

  const storageRow = `
  <section class="panel">
    <div class="panel__header"><h2>${t('audio.customTitle', lang)}</h2></div>
    <form class="editor-form" data-form="audio-custom-reciter">
      <label class="field">${t('audio.customName', lang)}<input class="input" name="name" required placeholder="${t('audio.customNamePh', lang)}" /></label>
      <label class="field">${t('audio.customServer', lang)}<input class="input" name="server" dir="ltr" required placeholder="https://example.com/quran/" /></label>
      <p class="panel__subtext">${t('audio.customHint', lang)}</p>
      <div class="editor-form__actions">
        <button type="submit" class="btn btn--primary btn--sm">${t('common.save', lang)}</button>
      </div>
    </form>
  </section>`;

  return `
  <section class="view view--audio">
    <h1 class="view__title">${t('audio.title', lang)}</h1>
    <p class="view__subtitle">${t('audio.subtitle', lang)}</p>

    <div class="search-bar audio-search">
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input type="search" class="search-bar__input" id="audio-search-input"
        placeholder="${t('audio.searchPh', lang)}" aria-label="${t('audio.searchPh', lang)}" value="${escapeHTML(q)}"
        data-bind="audio-search" autocomplete="off" />
    </div>
    ${
      state.loadErrors?.['reciters-catalog']
        ? loadErrorStateHTML({ lang, tierKey: 'reciters-catalog', t })
        : !state.audioManager?.catalogReady && !hits.length
          ? skeletonReciterRows(lang, 6)
          : ''
    }
    ${rows ? `<div class="reciter-list">${rows}</div>` : state.audioManager?.catalogReady && !hits.length ? emptyStateHTML({ iconName: 'volume', title: t('search.noResults', lang), hint: t('audio.noResultsHint', lang) }) : ''}
    ${hits.length > 60 ? `<p class="empty-hint">${t('audio.moreResults', lang, { n: hits.length })}</p>` : ''}

    ${grid}
    ${renderQueuePanel(state, lang)}
    ${storageRow}
    <p class="view__meta">${t('audio.note', lang)}</p>
  </section>`;
}

/**
 * Recitation queues: named lists of (surah, from, to) ranges played in
 * order through the verse-by-verse engine. Ranges are saved from any
 * ayah-range picker; queues play from here.
 */
function renderQueuePanel(state, lang) {
  const lists = state.playlists || [];
  const playingId =
    state.surahPlayback?.active && Array.isArray(state.surahPlayback.queue)
      ? queueIdOf(state)
      : null;
  const itemLabel = (it) => {
    const name = surahName(state, it.surah);
    const range = it.to != null && it.to !== it.from ? `:${it.from}–${it.to}` : `:${it.from}`;
    return `${name} ${range}`;
  };
  const rows = lists
    .map(
      (p) => `
    <div class="queue-row">
      <div class="queue-row__head">
        <span class="queue-row__name">${escapeHTML(p.name)}</span>
        <span class="chip__count">${p.items.length}</span>
        <button type="button" class="btn ${playingId === p.id ? 'btn--primary' : 'btn--secondary'} btn--sm" data-action="playlist-play" data-id="${escapeHTML(p.id)}">
          ${icon(playingId === p.id ? 'stop' : 'play', { size: 14 })} ${t(playingId === p.id ? 'audio.reciteStop' : 'playlist.playQueue', lang)}
        </button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="playlist-delete" data-id="${escapeHTML(p.id)}" aria-label="${t('common.delete', lang)}">
          ${icon('trash', { size: 14 })}
        </button>
      </div>
      ${
        p.items.length
          ? `<ol class="queue-row__items">${p.items
              .map(
                (it, i) => `
            <li class="queue-row__item">
              <span class="queue-row__item-label" dir="auto">${escapeHTML(itemLabel(it))}</span>
              <button type="button" class="icon-btn icon-btn--sm" data-action="playlist-remove-item" data-id="${escapeHTML(p.id)}" data-index="${i}" aria-label="${t('common.delete', lang)}">
                ${icon('close', { size: 13 })}
              </button>
            </li>`
              )
              .join('')}</ol>`
          : `<p class="empty-hint">${t('playlist.empty', lang)}</p>`
      }
    </div>`
    )
    .join('');
  return `
    <section class="panel panel--queue">
      <div class="panel__header">
        <h2>${t('playlist.title', lang)}</h2>
        <button type="button" class="btn btn--secondary btn--sm" data-action="playlist-create">
          ${icon('plus', { size: 14 })} ${t('playlist.create', lang)}
        </button>
      </div>
      <p class="panel__subtext">${t('playlist.hint', lang)}</p>
      ${rows || `<p class="empty-hint">${t('playlist.noQueues', lang)}</p>`}
    </section>`;
}

/**
 * Which saved queue (if any) the running verse session is playing: the
 * engine holds the item list, not the playlist id, so match by exact item
 * sequence against saved lists.
 */
function queueIdOf(state) {
  const sig = queueSignature(state.surahPlayback?.queue);
  if (!sig) return null;
  return (state.playlists || []).find((p) => queueSignature(p.items) === sig)?.id || null;
}
