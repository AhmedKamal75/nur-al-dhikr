/**
 * views/audioManager.js
 * Reciters & offline downloads:
 *  - searchable catalog of 312 mushafs (mp3quran + quranicaudio) + the
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
import { escapeHTML, highlightMatch, pickLocale } from '../core/utils.js';
import { QURAN_RECITERS } from '../core/config/quran.js';
import {
  queueSignature,
  normalizeRepeat,
  normalizeLoop,
  REPEAT_CYCLE,
  LOOP_CYCLE,
} from '../services/surahPlayback.js';
import { SLEEP_TIMER_CHOICES } from '../domain/sleepTimer.js';
import {
  searchReciters,
  findMoshaf,
  rewayaAr,
  translationLabel,
} from '../services/audioCatalog.js';
import { isSurahMissing } from '../services/moshafAvailability.js';
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
      // Riwaya renders localized in AR (unmapped Latin omitted, never leaked).
      const rewaya = lang === 'ar' ? rewayaAr(r.rewaya) : String(r.rewaya || '');
      const trans = translationLabel(r, lang);
      const subBits = [
        r.nameAr && r.nameEn && lang === 'ar' ? r.nameEn : r.nameAr || '',
        rewaya,
        trans,
      ].filter(Boolean);
      return `
    <div class="reciter-row ${active ? 'reciter-row--active' : ''}">
      <button type="button" class="reciter-row__main" data-action="audio-select-moshaf" data-id="${escapeHTML(r.id)}">
        <span class="reciter-row__name">${highlightMatch(lang === 'ar' && r.nameAr ? r.nameAr : r.nameEn, String(q).split(/\s+/))}${trans ? ` <span class="chip chip--muted">${escapeHTML(trans)}</span>` : ''}</span>
        ${subBits.length ? `<span class="reciter-row__sub">${escapeHTML(subBits.join(' — '))}</span>` : ''}
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
    // Header metadata, localized: Arabic riwaya/translation labels in AR.
    const selRewaya =
      lang === 'ar' ? rewayaAr(selected.rewaya) || selected.rewaya : selected.rewaya;
    const selTrans = translationLabel(selected, lang);

    const cells = [];
    for (let n = 1; n <= 114; n += 1) {
      const key = `${selected.id}:${n}`;
      const dl = downloads[key];
      // v3.14 Phase C: an in-flight download shows a spinner cell (and the
      // tap is ignored by the handler), so a 2MB fetch never reads as a
      // dead button.
      const busy = !!(state.audioDownloading && state.audioDownloading[key]);
      // Learned availability: surahs the server 404'd stay disabled with
      // an honest label instead of failing on every tap.
      const unavailable = !dl && isSurahMissing(selected.id, n);
      const label = lang === 'ar' ? t('quran.surah', lang) + ' ' + n : String(n);
      // (v5.10.2) one-button cells: a downloaded surah PLAYS on tap (the
      // unified quran-play-surah toggle — pause/resume in place, offline
      // blob aware), with delete kept as the small trailing button; an
      // undownloaded cell downloads exactly as before.
      const cellAction = dl ? 'quran-play-surah' : 'audio-download-surah';
      cells.push(`
      <div class="dl-cell ${dl ? 'dl-cell--done' : ''}${busy ? ' dl-cell--busy' : ''}${unavailable ? ' dl-cell--missing' : ''}">
        <button type="button" class="dl-cell__btn" data-action="${cellAction}" data-moshaf="${escapeHTML(selected.id)}" data-surah="${n}"
          ${unavailable ? 'disabled aria-disabled="true"' : ''}
          title="${escapeHTML(unavailable ? t('audio.surahUnavailable', lang) : surahName(state, n))}"
          aria-label="${escapeHTML(unavailable ? `${surahName(state, n)} — ${t('audio.surahUnavailable', lang)}` : `${surahName(state, n)} — ${dl ? t('audio.play', lang) : t('audio.downloadFile', lang)}`)}">
          <span class="dl-cell__num">${label}</span>
          <span class="dl-cell__state">${dl ? icon('play', { size: 13 }) : busy ? `<span class="dl-cell__spinner" role="status" aria-label="${t('common.loading', lang)}"></span>` : unavailable ? icon('close', { size: 13 }) : icon('download', { size: 13 })}</span>
        </button>
        ${
          dl
            ? `<span class="dl-cell__bytes">${formatBytes(dl.bytes)}</span>
        <button type="button" class="dl-cell__delete" data-action="audio-delete-surah" data-moshaf="${escapeHTML(selected.id)}" data-surah="${n}" aria-label="${escapeHTML(`${surahName(state, n)} — ${t('audio.deleteFile', lang)}`)}" title="${escapeHTML(t('audio.deleteFile', lang))}">${icon('trash', { size: 11 })}</button>`
            : ''
        }
      </div>`);
    }

    grid = `
    <section class="panel panel--dl">
      <div class="panel__header">
        <h2>${escapeHTML(lang === 'ar' && selected.nameAr ? selected.nameAr : selected.nameEn)}${selRewaya ? ` — ${escapeHTML(selRewaya)}` : ''}${selTrans ? ` <span class="chip chip--muted">${escapeHTML(selTrans)}</span>` : ''}</h2>
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

  // One screen for every voice: the 16 verse-by-verse CDN voices ride
  // along here (streaming-only — no per-surah files to download), so the
  // verse-voice vs full-mushaf picker split stops hiding them from each other.
  const verseRows = QURAN_RECITERS.map(
    (r) => `
    <button type="button" class="reciter-row ${state.settings.reciter === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${r.id}" aria-pressed="${state.settings.reciter === r.id}">
      <span class="reciter-row__name">${escapeHTML(pickLocale({ en: r.nameEn, ar: r.nameAr }, lang))}</span>
      ${state.settings.reciter === r.id ? icon('check', { size: 16 }) : ''}
    </button>`
  ).join('');
  const verseSection = `
  <section class="panel">
    <div class="panel__header"><h2>${t('audio.verseVoices', lang)}</h2></div>
    <p class="panel__subtext">${t('audio.verseVoicesHint', lang)}</p>
    <div class="reciter-list">${verseRows}</div>
  </section>`;

  // (v5.2.61) offline verse packs: per-surah ayah audio for the ACTIVE
  // voice (no separate picker — packs always follow settings.reciter).
  // Status rides the ephemeral audioVerse cache (IDB truth, rescanned on
  // view open); busy spinners ride the shared audioDownloading registry.
  const voice = typeof state.settings.reciter === 'string' ? state.settings.reciter : '';
  const packs = (state.audioVerse && state.audioVerse[voice]) || {};
  const voiceMeta = state.quran.meta?.surahs || [];
  const ayahCountOf = (n) => voiceMeta.find((s) => Number(s.number) === n)?.ayahCount;
  let packDone = 0;
  let packTotal = 0;
  const packCells = [];
  for (let n = 1; n <= 114; n += 1) {
    const total = Math.floor(Number(ayahCountOf(n))) || 0;
    const done = Math.max(0, Math.floor(Number(packs[n]?.done)) || 0);
    if (total > 0) {
      packDone += Math.min(done, total);
      packTotal += total;
    }
    const key = `verse:${voice}:${n}`;
    const busy = !!(state.audioDownloading && state.audioDownloading[key]);
    const complete = total > 0 && done >= total;
    const label = lang === 'ar' ? t('quran.surah', lang) + ' ' + n : String(n);
    const cellAction = complete ? 'verse-pack-delete' : 'verse-pack-download';
    packCells.push(`
      <div class="dl-cell ${complete ? 'dl-cell--done' : ''}${busy ? ' dl-cell--busy' : ''}">
        <button type="button" class="dl-cell__btn" data-action="${cellAction}" data-voice="${escapeHTML(voice)}" data-surah="${n}"
          title="${escapeHTML(surahName(state, n))}"
          aria-label="${escapeHTML(surahName(state, n))} — ${complete ? t('audio.deleteFile', lang) : t('audio.downloadFile', lang)}">
          <span class="dl-cell__num">${label}</span>
          <span class="dl-cell__state">${complete ? icon('check', { size: 13 }) : busy ? `<span class="dl-cell__spinner" role="status" aria-label="${t('common.loading', lang)}"></span>` : icon('download', { size: 13 })}</span>
        </button>
        ${total > 0 ? `<span class="dl-cell__bytes">${Math.min(done, total)}/${total}</span>` : ''}
      </div>`);
  }
  const versePacks = `
  <section class="panel panel--dl">
    <div class="panel__header">
      <h2>${t('audio.versePacks', lang)}</h2>
      <span class="chip__count">${packDone} / ${packTotal}</span>
    </div>
    <p class="panel__subtext">${t('audio.versePacksHint', lang)}</p>
    <div class="dl-grid">${packCells.join('')}</div>
  </section>`;

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
    ${q ? '' : verseSection}
    ${q ? '' : buildPlaybackDefaults(state, lang)}
    ${rows ? `<div class="reciter-list">${rows}</div>` : state.audioManager?.catalogReady && !hits.length ? emptyStateHTML({ iconName: 'volume', title: t('search.noResults', lang), hint: t('audio.noResultsHint', lang) }) : ''}
    ${hits.length > 60 ? `<p class="empty-hint">${t('audio.moreResults', lang, { n: hits.length })}</p>` : ''}

    ${grid}
    ${q ? '' : versePacks}
    ${renderQueuePanel(state, lang)}
    ${storageRow}
    <p class="view__meta">${t('audio.note', lang)}</p>
  </section>`;
}

/**
 * (v5.12.0) Playback defaults: direct picks for the per-ayah repeat
 * default, the live range loop, and file-mode sleep — the same settings
 * the player chips cycle, without the tapping. No new data-actions: one
 * [data-audio-pref] change arm (handlers/audio.js) serves all three.
 */
function buildPlaybackDefaults(state, lang) {
  const audio = state.settings.audio || {};
  const rep = normalizeRepeat(audio.ayahRepeat);
  const repOpts = REPEAT_CYCLE.map(
    (n) =>
      `<option value="${n}"${n === rep ? ' selected' : ''}>${n === -1 ? '∞' : `×${n}`}</option>`
  ).join('');
  const live = state.surahPlayback?.active === true;
  const loop = normalizeLoop(state.surahPlayback?.loop);
  const loopOpts = LOOP_CYCLE.map(
    (n) =>
      `<option value="${n}"${n === loop ? ' selected' : ''}>${n === 1 ? escapeHTML(t('audio.loopOnce', lang)) : `×${n}`}</option>`
  ).join('');
  const sleeping = state.player?.sleepEnabled === true ? state.player.sleepMinutes : '';
  const sleepOpts =
    `<option value=""${sleeping === '' ? ' selected' : ''}>${escapeHTML(t('audio.sleepOff', lang))}</option>` +
    SLEEP_TIMER_CHOICES.map(
      (m) =>
        `<option value="${m}"${m === sleeping ? ' selected' : ''}>${escapeHTML(t('units.m', lang, { n: m }))}</option>`
    ).join('');
  return `
  <section class="panel">
    <div class="panel__header"><h2>${t('audio.playbackDefaults', lang)}</h2></div>
    <p class="panel__subtext">${t('audio.playbackDefaultsHint', lang)}</p>
    <div class="editor-form">
      <label class="field">${t('audio.repeatAyah', lang)}<select class="select" data-audio-pref="ayahRepeat">${repOpts}</select></label>
      <label class="field">${t('audio.rangeLoop', lang)}<select class="select" data-audio-pref="loop"${live ? '' : ' disabled aria-disabled="true"'}>${loopOpts}</select>
        <span class="editor-form__note">${escapeHTML(live ? t('audio.loopMode', lang) : t('audio.loopNeedsSession', lang))}</span></label>
      <label class="field">${t('audio.sleepTimer', lang)}<select class="select" data-audio-pref="sleep">${sleepOpts}</select>
        <span class="editor-form__note">${escapeHTML(t('audio.sleepFileHint', lang))}</span></label>
    </div>
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
        <button type="button" class="icon-btn icon-btn--sm" data-action="playlist-rename" data-id="${escapeHTML(p.id)}" aria-label="${t('playlist.renameTitle', lang)}" title="${t('playlist.renameTitle', lang)}">
          ${icon('edit', { size: 14 })}
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
              <button type="button" class="icon-btn icon-btn--sm" data-action="playlist-move-item" data-id="${escapeHTML(p.id)}" data-index="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('settings.moveUp', lang)}" title="${t('settings.moveUp', lang)}">
                ${icon('chevronUp', { size: 13 })}
              </button>
              <button type="button" class="icon-btn icon-btn--sm" data-action="playlist-move-item" data-id="${escapeHTML(p.id)}" data-index="${i}" data-dir="1" ${i === p.items.length - 1 ? 'disabled' : ''} aria-label="${t('settings.moveDown', lang)}" title="${t('settings.moveDown', lang)}">
                ${icon('chevronDown', { size: 13 })}
              </button>
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
