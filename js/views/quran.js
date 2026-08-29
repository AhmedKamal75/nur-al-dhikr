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
import { renderAyahWords } from './tafsirPanel.js';
import { skeletonSurahList, skeletonAyahCards } from '../components/skeleton.js';

const BISMILLAH_AR = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

/**
 * The v3.10 continuous-recitation toolbar for the classic reader:
 * "Recite surah" (ayah-by-ayah with auto-advance), a live ayah counter
 * while reciting, and the follow-highlight toggle.
 */
function recitationToolbarHTML(state, number, lang) {
  const sp = state.surahPlayback || { active: false, surah: null, ayah: null, total: 0 };
  const active = sp.active && Number(sp.surah) === Number(number);
  const follow = state.settings.audio?.ayahFollow ?? true;
  return `
      <div class="quran-reader__toolbar">
        <button type="button" class="btn btn--sm ${active ? 'btn--primary' : 'btn--secondary'}" data-action="surah-play" data-surah="${number}">
          ${icon(active ? 'stop' : 'play', { size: 14 })}
          ${active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}
        </button>
        ${active ? `<span class="quran-reader__recite-progress" dir="ltr">${sp.ayah}/${sp.total}</span>` : ''}
        <button type="button" class="chip ${follow ? 'chip--active' : ''}" data-action="recite-follow-toggle" aria-pressed="${follow}" title="${t('audio.follow', lang)}">
          ${icon(follow ? 'eye' : 'eyeOff', { size: 13 })}
          ${t('audio.follow', lang)}
        </button>
      </div>`;
}

function surahListHTML(state) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const q = (state.activeParams.q || '').trim().toLowerCase();

  if (!meta) {
    return skeletonSurahList(lang);
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
    <div class="surah-tile-wrap">
      <a class="surah-tile" href="${buildHash(VIEWS.QURAN, { id: s.number })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${s.number}">
        <span class="surah-tile__num">${s.number}</span>
        <span class="surah-tile__text">
          <span class="surah-tile__name-en">${escapeHTML(s.nameTransliteration)}</span>
          <span class="surah-tile__meta">${t('quran.ayahCount', lang, { n: s.ayahCount })} \u2022 ${t(s.revelationType === 'Meccan' ? 'quran.meccan' : 'quran.medinan', lang)}</span>
        </span>
        <span class="surah-tile__name-ar" dir="rtl">${escapeHTML(s.nameAr)}</span>
      </a>
      <button type="button" class="icon-btn icon-btn--sm surah-tile__play ${state.player?.surah === s.number && state.player?.playing ? 'icon-btn--playing' : ''}" data-action="quran-play-surah" data-surah="${s.number}" aria-label="${t('audio.play', lang)} — ${escapeHTML(s.nameTransliteration)}" title="${t('audio.play', lang)}">
        ${icon(state.player?.surah === s.number && state.player?.playing ? 'pause' : 'play', { size: 15 })}
      </button>
    </div>`
    )
    .join('');

  return `
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
      ${recitationToolbarHTML(state, number, lang)}
    </header>`
    : '';

  const body = surah
    ? `
      ${showBismillah && state.settings.mushafPrefs.bismillahStyle !== 'hidden' ? `<p class="quran-bismillah bismillah--${state.settings.mushafPrefs.bismillahStyle}" dir="rtl">${BISMILLAH_AR}</p>` : ''}
      <div class="ayah-list">
        ${surah.ayahs
          .map((a) => {
            const audioUrl = ayahAudioUrl(meta?.surahs, state.settings.reciter, number, a.number);
            const key = `${number}:${a.number}`;
            const reciting = state.recitingAyahKey === key;
            // v3.6 deep-link focus target ('#/quran/N?ay=A'): --focus tints
            // it once arrived. Every row carries the ayah anchor id so the
            // v3.10 follow-along recitation can scroll to any ayah.
            const focus = String(state.activeParams?.ay || '') === String(a.number);
            return `
          <div class="ayah-card${focus ? ' ayah-card--focus' : ''}${reciting ? ' ayah-card--reciting' : ''}" id="ayah-${a.number}">
            <div class="ayah-card__top">
              <span class="ayah-card__badge">${a.number}</span>
              <div class="ayah-card__actions">
                ${
                  audioUrl
                    ? `
                <button type="button" class="icon-btn icon-btn--sm ${reciting ? 'icon-btn--playing' : ''}" data-action="play-ayah" data-url="${escapeHTML(audioUrl)}" data-key="${escapeHTML(key)}" aria-label="${t('mushaf.listen', lang)}">
                  ${icon(reciting ? 'stop' : 'volume', { size: 16 })}
                </button>`
                    : ''
                }
                <button type="button" class="icon-btn icon-btn--sm" data-action="copy-ayah" data-surah="${number}" data-ayah="${a.number}" aria-label="${t('common.export', lang)}">
                  ${icon('copy', { size: 16 })}
                </button>
                <button type="button" class="icon-btn icon-btn--sm" data-action="tafsir-open" data-surah="${number}" data-ayah="${a.number}" aria-label="${t('wordStudy.openTafsir', lang)}" title="${t('wordStudy.openTafsir', lang)}">
                  ${icon('book', { size: 16 })}
                </button>
              </div>
            </div>
            <p class="ayah-card__arabic" dir="rtl">${renderAyahWords(a.text, state.quranWords[String(number)]?.[String(a.number)], number, a.number, { tappable: state.settings.mushafPrefs.wordByWordStudy, underline: state.settings.mushafPrefs.wordUnderline, tajweed: state.settings.mushafPrefs.tajweedColoring })}</p>
            ${state.settings.showTranslation ? `<p class="ayah-card__translation" dir="auto">${escapeHTML(a.translation)}</p>` : ''}
          </div>`;
          })
          .join('')}
      </div>`
    : skeletonAyahCards(lang, 4);

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

  // Review A9: the reader is where listening starts, so reciter selection
  // must be reachable from here — not buried in a nav view the person may
  // never open.
  const recitersLink = `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="navigate" data-view="${VIEWS.AUDIO}">${icon('volume', { size: 16 })} ${t('quran.recitersLink', lang)}</button>`;

  return `
  <section class="view view--quran">
    <header class="view-header">
      ${id ? `<a class="back-link" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}">${icon('chevronLeft', { size: 18 })} ${t('quran.backToList', lang)}</a>` : ''}
      ${!id ? `<h1 class="view__title">${t('quran.title', lang)}</h1><p class="view__subtitle">${t('quran.subtitle', lang)}</p>` : ''}
      ${mushafLink}
      ${recitersLink}
    </header>
    ${id ? surahReaderHTML(state, id) : surahListHTML(state)}
  </section>`;
}
