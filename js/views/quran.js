/**
 * views/quran.js
 * The complete Qur'an: a searchable list of all 114 surahs, and a per-surah
 * reader (Arabic + Sahih International translation). Data is fetched lazily
 * by app.js (never at boot) and cached in state.quran — this view only ever
 * reads that cache and renders whatever is currently available, showing a
 * loading state while a fetch is in flight.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { buildHash } from '../router.js';
import { escapeHTML } from '../utils.js';
import { VIEWS } from '../config.js';
import { ayahAudioUrl } from '../mushaf.js';
import { khatmProgress } from '../khatm.js';

const BISMILLAH_AR = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

function khatmPanelHTML(state) {
  const lang = state.settings.language;
  const currentPage = state.mushafBookmark.page || 1;
  const progress = khatmProgress(state.khatm, currentPage);

  if (!progress) {
    return `
    <section class="panel panel--khatm-start">
      <div class="panel__header"><h2>${icon('book-open', { size: 18 })} ${t('khatm.title', lang)}</h2></div>
      <p class="panel__subtext">${t('khatm.subtitle', lang)}</p>
      <div class="khatm-start-options">
        <button type="button" class="btn btn--secondary btn--sm" data-action="khatm-start" data-days="30">${t('khatm.days', lang, { n: 30 })}</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="khatm-start" data-days="60">${t('khatm.days', lang, { n: 60 })}</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="khatm-start" data-days="604">${t('khatm.onePagePerDay', lang)}</button>
      </div>
    </section>`;
  }

  const statusText = progress.completed
    ? t('khatm.completed', lang)
    : progress.overdue
      ? t('khatm.overdue', lang)
      : progress.onTrack
        ? t('khatm.onTrack', lang)
        : t('khatm.behind', lang, { n: progress.pagesPerDayNeeded });

  return `
  <section class="panel panel--khatm-progress">
    <div class="panel__header">
      <h2>${icon('book-open', { size: 18 })} ${t('khatm.title', lang)}</h2>
      <button type="button" class="icon-btn icon-btn--sm" data-action="khatm-reset" aria-label="${t('khatm.cancel', lang)}">${icon('close', { size: 15 })}</button>
    </div>
    <div class="progress-bar" role="progressbar" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar__fill" style="width:${progress.percent}%"></div>
    </div>
    <p class="panel__subtext" dir="ltr">${progress.percent}% \u2014 ${progress.pagesRead}/${progress.pagesToRead} ${t('khatm.pages', lang)}</p>
    <p class="panel__subtext ${progress.completed ? 'khatm-status--done' : progress.overdue || !progress.onTrack ? 'khatm-status--behind' : 'khatm-status--ontrack'}">${statusText}</p>
    ${!progress.completed ? `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.MUSHAF, { page: currentPage })}" data-action="navigate" data-view="${VIEWS.MUSHAF}" data-page="${currentPage}">${t('khatm.continueReading', lang)}</a>` : ''}
  </section>`;
}

function surahListHTML(state) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const q = (state.activeParams.q || '').trim().toLowerCase();

  if (!meta) {
    return `<div class="quran-loading">${t('quran.loading', lang)}</div>`;
  }

  const surahs = meta.surahs.filter((s) => {
    if (!q) return true;
    return (
      s.nameEn.toLowerCase().includes(q) ||
      s.nameTransliteration.toLowerCase().includes(q) ||
      s.nameAr.includes(q) ||
      String(s.number).includes(q)
    );
  });

  const tiles = surahs
    .map(
      (s) => `
    <a class="surah-tile" href="${buildHash(VIEWS.QURAN, { id: s.number })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${s.number}">
      <span class="surah-tile__num">${s.number}</span>
      <span class="surah-tile__text">
        <span class="surah-tile__name-en">${escapeHTML(s.nameTransliteration)}</span>
        <span class="surah-tile__meta">${t('quran.ayahCount', lang, { n: s.ayahCount })} \u2022 ${t(s.revelationType === 'Meccan' ? 'quran.meccan' : 'quran.medinan', lang)}</span>
      </span>
      <span class="surah-tile__name-ar" dir="rtl">${escapeHTML(s.nameAr)}</span>
    </a>`
    )
    .join('');

  return `
    ${q ? '' : khatmPanelHTML(state)}
    <div class="search-bar quran-search">
      <span class="search-bar__icon">${icon('search', { size: 18 })}</span>
      <input
        type="search"
        class="search-bar__input"
        id="quran-search-input"
        placeholder="${t('quran.searchPlaceholder', lang)}"
        value="${escapeHTML(state.activeParams.q || '')}"
        data-bind="quran-search"
        autocomplete="off"
      />
    </div>
    <div class="surah-grid">${tiles || `<p class="empty-hint">${t('search.noResults', lang)}</p>`}</div>`;
}

function surahReaderHTML(state, number) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const surah = state.quran.surahs[number];
  const surahMeta = meta ? meta.surahs.find((s) => String(s.number) === String(number)) : null;

  if (meta && !surahMeta) {
    return `<p class="empty-hint">${t('quran.notFound', lang)}</p>`;
  }

  const num = parseInt(number, 10);
  const prev = num > 1 ? num - 1 : null;
  const next = num < 114 ? num + 1 : null;
  const showBismillah = num !== 1 && num !== 9;

  const header = surahMeta
    ? `
    <header class="quran-reader__header">
      <p class="quran-reader__num">${t('quran.surah', lang)} ${surahMeta.number}</p>
      <h1 class="quran-reader__name-ar" dir="rtl">${escapeHTML(surahMeta.nameAr)}</h1>
      <p class="quran-reader__name-en">${escapeHTML(surahMeta.nameTransliteration)} \u2014 ${escapeHTML(surahMeta.nameEn)}</p>
      <p class="quran-reader__meta">${t('quran.ayahCount', lang, { n: surahMeta.ayahCount })} \u2022 ${t(surahMeta.revelationType === 'Meccan' ? 'quran.meccan' : 'quran.medinan', lang)}</p>
    </header>`
    : '';

  const body = surah
    ? `
      ${showBismillah ? `<p class="quran-bismillah" dir="rtl">${BISMILLAH_AR}</p>` : ''}
      <div class="ayah-list">
        ${surah.ayahs
          .map((a) => {
            const audioUrl = ayahAudioUrl(meta?.surahs, state.settings.reciter, number, a.number);
            const key = `${number}:${a.number}`;
            const playing = state.recitingAyahKey === key;
            return `
          <div class="ayah-card">
            <div class="ayah-card__top">
              <span class="ayah-card__badge">${a.number}</span>
              <div class="ayah-card__actions">
                ${
                  audioUrl
                    ? `
                <button type="button" class="icon-btn icon-btn--sm ${playing ? 'icon-btn--playing' : ''}" data-action="play-ayah" data-url="${escapeHTML(audioUrl)}" data-key="${escapeHTML(key)}" aria-label="${t('mushaf.listen', lang)}">
                  ${icon(playing ? 'stop' : 'volume', { size: 16 })}
                </button>`
                    : ''
                }
                <button type="button" class="icon-btn icon-btn--sm" data-action="copy-ayah" data-surah="${number}" data-ayah="${a.number}" aria-label="${t('common.export', lang)}">
                  ${icon('copy', { size: 16 })}
                </button>
              </div>
            </div>
            <p class="ayah-card__arabic" dir="rtl">${escapeHTML(a.text)}</p>
            ${state.settings.showTranslation ? `<p class="ayah-card__translation">${escapeHTML(a.translation)}</p>` : ''}
          </div>`;
          })
          .join('')}
      </div>`
    : `<div class="quran-loading">${t('quran.loading', lang)}</div>`;

  const nav = `
    <nav class="quran-reader__nav">
      ${prev ? `<a class="quran-reader__nav-link" href="${buildHash(VIEWS.QURAN, { id: prev })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${prev}">${icon('chevronRight', { size: 16 })} ${t('quran.prevSurah', lang)}</a>` : '<span></span>'}
      ${next ? `<a class="quran-reader__nav-link" href="${buildHash(VIEWS.QURAN, { id: next })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${next}">${t('quran.nextSurah', lang)} ${icon('chevronLeft', { size: 16 })}</a>` : '<span></span>'}
    </nav>`;

  return `${header}${body}${surah ? nav : ''}`;
}

export function renderQuran(state) {
  const lang = state.settings.language;
  const id = state.activeParams.id;

  const mushafLink = id
    ? `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="mushaf-open-at-surah" data-surah="${id}">${icon('book', { size: 16 })} ${t('quran.viewInMushaf', lang)}</button>`
    : `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="navigate" data-view="${VIEWS.MUSHAF}">${icon('book', { size: 16 })} ${t('quran.viewInMushaf', lang)}</button>`;

  return `
  <section class="view view--quran">
    <header class="view-header">
      ${id ? `<a class="back-link" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}">${icon('chevronLeft', { size: 18 })} ${t('quran.backToList', lang)}</a>` : ''}
      ${!id ? `<h1 class="view__title">${t('quran.title', lang)}</h1><p class="view__subtitle">${t('quran.subtitle', lang)}</p>` : ''}
      ${mushafLink}
    </header>
    ${id ? surahReaderHTML(state, id) : surahListHTML(state)}
  </section>`;
}
