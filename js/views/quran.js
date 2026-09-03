/**
 * views/quran.js
 * The complete Qur'an: a searchable list of all 114 surahs, and a per-surah
 * reader (Arabic + Sahih International translation). Data is fetched lazily
 * by app.js (never at boot) and cached in state.quran — this view only ever
 * reads that cache and renders whatever is currently available, showing a
 * loading state while a fetch is in flight.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { buildHash } from '../core/router.js';
import { escapeHTML } from '../core/utils.js';
import { VIEWS } from '../core/config.js';
import { ayahAudioUrl } from '../services/mushaf.js';
import { renderAyahWords } from './tafsirPanel.js';
import { tajweedPrefsOf } from '../domain/tajweed.js';
import { skeletonSurahList, skeletonAyahCards } from '../ui/skeleton.js';
import { loadErrorStateHTML, notFoundStateHTML } from '../ui/emptyState.js';
import { clozeAyahHTML, dueSurahs, countMemorized, suggestFromKhatma } from '../domain/hifz.js';
import { keyToDate } from '../domain/review.js';

const BISMILLAH_AR = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

/* ------------------------------------------------------------------ */
/* (v4.2) Ayah windowing — the reader renders a sliding window, not the  */
/* whole surah.                                                          */
/* ------------------------------------------------------------------ */
// Al-Baqarah is 286 ayah cards ≈ 1.1MB of HTML (~1,144 inline SVGs), and
// the string-render engine rebuilt + re-parsed ALL of it on every dispatch
// — including one dispatch per ayah during continuous recitation: a
// ~100-200ms main-thread stall on mid-range mobile, 286 times in a row.
// The window keeps ~30 ayahs in the DOM; two honest "show more" buttons
// extend it, the deep-link ?ay= centers it, and the reciting ayah slides
// it forward automatically. Short surahs (the overwhelming majority —
// median is 17 ayahs) render whole and never see a sentinel at all.
const READER_WINDOW_SIZE = 30;
let readerWindow = { surah: null, from: 1, to: 1, ayParam: null };

/** Extend the window by one page of ayahs (up or down). Exported for the
 *  delegated click handler; re-renders through the standard nudge. */
export function expandReaderWindow(dir) {
  if (dir === 'up') readerWindow.from = Math.max(1, readerWindow.from - READER_WINDOW_SIZE);
  else readerWindow.to = readerWindow.to + READER_WINDOW_SIZE;
}

/** Reset the window when its owning data changes (tests, restore). */
export function _resetReaderWindowForTests() {
  readerWindow = { surah: null, from: 1, to: 1, ayParam: null };
}

/** Compute the current window for (number, total) from the volatile
 *  signals in state — pure apart from the module latch it maintains.
 *  (v4.3) exported for the windowing regression tests: bounds, deep-link
 *  recenter, recitation slide-ahead, and the re-center-once latch. */
export function currentWindow(state, number, total) {
  const key = String(number);
  const ayParam = Number(state.activeParams?.ay) || null;
  const recitingKey = state.recitingAyahKey;
  const recitingAyah =
    recitingKey && recitingKey.startsWith(`${key}:`) ? Number(recitingKey.split(':')[1]) || 0 : 0;
  const centerOn = (c) => {
    const from = Math.max(1, Math.min(c - 10, Math.max(1, total - 9)));
    readerWindow = {
      surah: key,
      from,
      to: Math.min(total, from + READER_WINDOW_SIZE - 1),
      ayParam,
    };
  };
  if (readerWindow.surah !== key) {
    centerOn(ayParam || 1);
  } else if (ayParam !== null && ayParam !== readerWindow.ayParam) {
    // A NEW deep link (or in-surah ay jump) re-centers exactly once.
    centerOn(ayParam);
  } else if (recitingAyah > 0) {
    // Follow-along: slide ahead when the reciting ayah approaches either
    // edge, so the highlight (and the auto-scroll target) always exists.
    if (recitingAyah > readerWindow.to - 5 || recitingAyah < readerWindow.from)
      centerOn(recitingAyah);
  }
  // Whatever window stands, the CURRENT ay param is now honored — a later
  // manual "show more" must not be undone by the stale-param check above.
  readerWindow.ayParam = ayParam;
  return { from: Math.max(1, readerWindow.from), to: Math.min(total, readerWindow.to) };
}

/**
 * The v3.10 continuous-recitation toolbar for the classic reader:
 * "Recite surah" (ayah-by-ayah with auto-advance), a live ayah counter
 * while reciting, and the follow-highlight toggle.
 */
function recitationToolbarHTML(state, number, lang) {
  const sp = state.surahPlayback || { active: false, surah: null, ayah: null, total: 0 };
  const active = sp.active && Number(sp.surah) === Number(number);
  const follow = state.settings.audio?.ayahFollow ?? true;
  // (v5.0.0) the surah's ayah count gates the Range affordance (a
  // single-ayah surah has no range to pick).
  const surahMeta = state.quran.meta?.surahs?.find((x) => Number(x.number) === Number(number));
  const count = surahMeta?.ayahCount || 0;
  // (v4.2) `number` arrives raw from the decoded hash segment — canonicalize
  // once so no untrusted string can ride into data-* attributes below.
  const num = String(parseInt(number, 10) || 0);
  return `
      <div class="quran-reader__toolbar">
        <button type="button" class="btn btn--sm ${active ? 'btn--primary' : 'btn--secondary'}" data-action="surah-play" data-surah="${num}">
          ${icon(active ? 'stop' : 'play', { size: 14 })}
          ${active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}
        </button>
        ${
          active || count > 1
            ? `<button type="button" class="btn btn--sm btn--ghost" data-action="quran-range-open" data-surah="${num}" title="${t('audio.rangeTitle', lang)}">
          ${icon('target', { size: 14 })}
          ${t('audio.rangeShort', lang)}
        </button>`
            : ''
        }
        ${active ? `<span class="quran-reader__recite-progress" dir="ltr">${escapeHTML(String(sp.ayah))}/${escapeHTML(String(sp.total))}</span>` : ''}
        <button type="button" class="chip ${follow ? 'chip--active' : ''}" data-action="recite-follow-toggle" aria-pressed="${follow}" title="${t('audio.follow', lang)}">
          ${icon(follow ? 'eye' : 'eyeOff', { size: 13 })}
          ${t('audio.follow', lang)}
        </button>
      </div>`;
}

/**
 * v3.17 hifz toolbar: the memorize-mode toggle, its cloze level chips
 * (word / whole ayah), re-hide, and the spaced-repetition actions — mark a
 * surah memorized, or log today's review (recalled / struggled). The due
 * date shown is the record's honest next-review day from js/hifz.js.
 */
function hifzToolbarHTML(state, number, lang) {
  const sess = state.hifzSession ?? { mode: false, surah: null, level: 'word', revealed: {} };
  const active = sess.mode && Number(sess.surah) === Number(number);
  const rec = state.hifzRecords?.[String(number)];
  const num = String(parseInt(number, 10) || 0);
  const dueLabel = rec?.due
    ? keyToDate(rec.due)?.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const memorizeChip = `
    <button type="button" class="chip ${active ? 'chip--active' : ''}" data-action="hifz-toggle" data-surah="${num}" aria-pressed="${active}" title="${t('hifz.memorizeMode', lang)}">
      ${icon('quran', { size: 13 })}
      ${t('hifz.memorizeMode', lang)}
    </button>`;
  const reviewGroup = rec
    ? `
    <span class="hifz-due" dir="auto">${t('hifz.memorizedBadge', lang, { date: dueLabel || rec.due })}</span>
    <button type="button" class="chip" data-action="hifz-review" data-surah="${num}" data-grade="easy" title="${t('hifz.recalled', lang)}">
      ${icon('check', { size: 13 })} ${t('hifz.recalled', lang)}
    </button>
    <button type="button" class="chip" data-action="hifz-review" data-surah="${num}" data-grade="again" title="${t('hifz.struggled', lang)}">
      ${icon('repeat', { size: 13 })} ${t('hifz.struggled', lang)}
    </button>`
    : `
    <button type="button" class="chip" data-action="hifz-mark" data-surah="${num}" title="${t('hifz.markMemorized', lang)}">
      ${icon('check', { size: 13 })} ${t('hifz.markMemorized', lang)}
    </button>`;
  if (!active) {
    return `
      <div class="quran-reader__toolbar quran-reader__toolbar--hifz">${memorizeChip}${reviewGroup}</div>`;
  }
  const lvl = sess.level;
  return `
      <div class="quran-reader__toolbar quran-reader__toolbar--hifz">
        ${memorizeChip}
        <button type="button" class="chip ${lvl === 'word' ? 'chip--active' : ''}" data-action="hifz-level" data-level="word" aria-pressed="${lvl === 'word'}">${t('hifz.levelWord', lang)}</button>
        <button type="button" class="chip ${lvl === 'ayah' ? 'chip--active' : ''}" data-action="hifz-level" data-level="ayah" aria-pressed="${lvl === 'ayah'}">${t('hifz.levelAyah', lang)}</button>
        <button type="button" class="chip" data-action="hifz-rehide">${icon('eyeOff', { size: 13 })} ${t('hifz.rehide', lang)}</button>
        ${reviewGroup}
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
    <div class="surah-tile-wrap" data-roving-item>
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
      <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input
        type="search"
        class="search-bar__input"
        id="quran-search-input"
        placeholder="${t('quran.searchPlaceholder', lang)}"
        aria-label="${t('quran.searchPlaceholder', lang)}"
        value="${escapeHTML(state.activeParams.q || '')}"
        data-bind="quran-search"
        autocomplete="off"
      />
    </div>
    <div class="surah-grid" data-roving role="group" aria-label="${t('quran.title', lang)}">${tiles || `<p class="empty-hint">${t('search.noResults', lang)}</p>`}</div>`;
}

function surahReaderHTML(state, number) {
  const lang = state.settings.language;
  const meta = state.quran.meta;
  const surah = state.quran.surahs[number];
  const surahMeta = meta ? meta.surahs.find((s) => String(s.number) === String(number)) : null;

  if (meta && !surahMeta) {
    return `<section class="view">${notFoundStateHTML({ title: t('quran.notFound', lang), lang, t })}</section>`;
  }

  const num = parseInt(number, 10);
  const prev = num > 1 ? num - 1 : null;
  const next = num < 114 ? num + 1 : null;
  const showBismillah = num !== 1 && num !== 9;
  // (v4.2) which slice of the surah is in the DOM right now.
  const win = surah ? currentWindow(state, number, surah.ayahs.length) : null;
  const prevHidden = win ? win.from - 1 : 0;
  const nextHidden = win ? surah.ayahs.length - win.to : 0;
  const loadUp =
    prevHidden > 0
      ? `<button type="button" class="btn btn--secondary btn--sm quran-window-load" data-action="quran-window-expand" data-dir="up">${icon('chevronUp', { size: 14 })} ${t('quran.showPrevious', lang, { n: Math.min(prevHidden, READER_WINDOW_SIZE) })}</button>`
      : '';
  const loadDown =
    nextHidden > 0
      ? `<button type="button" class="btn btn--secondary btn--sm quran-window-load" data-action="quran-window-expand" data-dir="down">${t('quran.showNext', lang, { n: Math.min(nextHidden, READER_WINDOW_SIZE) })} ${icon('chevronDown', { size: 14 })}</button>`
      : '';

  const header = surahMeta
    ? `
    <header class="quran-reader__header">
      <p class="quran-reader__num">${t('quran.surah', lang)} ${surahMeta.number}</p>
      <h1 class="quran-reader__name-ar" dir="rtl">${escapeHTML(surahMeta.nameAr)}</h1>
      <p class="quran-reader__name-en">${escapeHTML(surahMeta.nameTransliteration)} \u2014 ${escapeHTML(surahMeta.nameEn)}</p>
      <p class="quran-reader__meta">${t('quran.ayahCount', lang, { n: surahMeta.ayahCount })} \u2022 ${t(surahMeta.revelationType === 'Meccan' ? 'quran.meccan' : 'quran.medinan', lang)}</p>
      ${recitationToolbarHTML(state, number, lang)}
      ${hifzToolbarHTML(state, number, lang)}
    </header>`
    : '';

  const body = surah
    ? `
      ${showBismillah && state.settings.mushafPrefs.bismillahStyle !== 'hidden' ? `<p class="quran-bismillah bismillah--${state.settings.mushafPrefs.bismillahStyle}" dir="rtl">${BISMILLAH_AR}</p>` : ''}
      ${loadUp}
      <div class="ayah-list">
        ${surah.ayahs
          .filter((a) => a.number >= win.from && a.number <= win.to)
          .map((a) => {
            const audioUrl = ayahAudioUrl(meta?.surahs, state.settings.reciter, number, a.number);
            const key = `${number}:${a.number}`;
            const reciting = state.recitingAyahKey === key;
            // v3.6 deep-link focus target ('#/quran/N?ay=A'): --focus tints
            // it once arrived. Every row carries the ayah anchor id so the
            // v3.10 follow-along recitation can scroll to any ayah.
            const focus = String(state.activeParams?.ay || '') === String(a.number);
            // v3.17 memorize mode: word/whole-ayah cloze replaces the plain
            // Arabic render; in ayah-level mode the translation stays
            // visible as the recall prompt regardless of the global toggle.
            const hifzSession = state.hifzSession ?? {
              mode: false,
              surah: null,
              level: 'word',
              revealed: {},
            };
            const hifzActive = hifzSession.mode && Number(hifzSession.surah) === num;
            const revealed = hifzActive ? hifzSession.revealed[a.number] : null;
            const arabicHTML = hifzActive
              ? clozeAyahHTML({
                  text: a.text,
                  level: hifzSession.level,
                  ayah: a.number,
                  revealed,
                  labels: { reveal: t('hifz.reveal', lang) },
                })
              : renderAyahWords(
                  a.text,
                  state.quranWords?.[String(number)]?.[String(a.number)],
                  number,
                  a.number,
                  {
                    // (v4.6.0) words always answer a tap (tajweed at
                    // minimum); the pref governs the underline hint.
                    tappable: true,
                    underline:
                      state.settings.mushafPrefs.wordByWordStudy &&
                      state.settings.mushafPrefs.wordUnderline,
                    tajweed: state.settings.mushafPrefs.tajweedColoring,
                    prefs: tajweedPrefsOf(state),
                  }
                );
            const showTranslation =
              hifzActive && hifzSession.level === 'ayah' ? true : state.settings.showTranslation;
            return `
          <div class="ayah-card${focus ? ' ayah-card--focus' : ''}${reciting ? ' ayah-card--reciting' : ''}${hifzActive ? ' ayah-card--hifz' : ''}" id="ayah-${a.number}">
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
                <button type="button" class="icon-btn icon-btn--sm" data-action="copy-ayah" data-surah="${num}" data-ayah="${a.number}" aria-label="${t('common.copy', lang)}">
                  ${icon('copy', { size: 16 })}
                </button>
                <button type="button" class="icon-btn icon-btn--sm" data-action="ayah-share" data-surah="${num}" data-ayah="${a.number}" aria-label="${t('quran.shareAyah', lang)}" title="${t('quran.shareAyah', lang)}">
                  ${icon('share', { size: 16 })}
                </button>
                <button type="button" class="icon-btn icon-btn--sm" data-action="tafsir-open" data-surah="${num}" data-ayah="${a.number}" aria-label="${t('wordStudy.openTafsir', lang)}" title="${t('wordStudy.openTafsir', lang)}">
                  ${icon('book', { size: 16 })}
                </button>
              </div>
            </div>
            <p class="ayah-card__arabic" dir="rtl">${arabicHTML}</p>
            ${showTranslation ? `<p class="ayah-card__translation" dir="auto">${escapeHTML(a.translation)}</p>` : ''}
          </div>`;
          })
          .join('')}
      </div>
      ${loadDown}`
    : state.loadErrors?.['quran-surah']
      ? loadErrorStateHTML({ lang, tierKey: 'quran-surah', t })
      : skeletonAyahCards(lang, 4);

  const nav = `
    <nav class="quran-reader__nav">
      ${prev ? `<a class="quran-reader__nav-link" href="${buildHash(VIEWS.QURAN, { id: prev })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${prev}">${icon('chevronRight', { size: 16 })} ${t('quran.prevSurah', lang)}</a>` : '<span></span>'}
      ${next ? `<a class="quran-reader__nav-link" href="${buildHash(VIEWS.QURAN, { id: next })}" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${next}">${t('quran.nextSurah', lang)} ${icon('chevronLeft', { size: 16 })}</a>` : '<span></span>'}
    </nav>`;

  return `${header}${body}${surah ? nav : ''}`;
}

/** Canonical int from an untrusted hash segment, 0 when unusable. */
function numberToInt(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * (v4.5, APP-FLOW I1/I2) The immersive glass bar — the classic reader's
 * answer to the Mushaf's floating fs-controls. Everything a chrome-free
 * session still needs, translucent over the reading column, auto-fading
 * with the SAME idle contract as the mushaf bar (body.reader-fs-idle is
 * toggled by app/fullscreen.js's shared timer): exit, previous/next surah
 * (real routes — Back works afterwards), and the recitation control with
 * its live ayah counter. The playerbar stays visible by design for
 * follow-along; this bar rides ABOVE it, clear of the reading line.
 */
function buildReaderImmersiveBar(state, surahNum, lang) {
  const prev = surahNum > 1 ? surahNum - 1 : null;
  const next = surahNum < 114 ? surahNum + 1 : null;
  const sp = state.surahPlayback || { active: false, surah: null, ayah: null, total: 0 };
  const recitingThis = sp.active && Number(sp.surah) === Number(surahNum);
  const num = String(surahNum || 0);
  return `
    <div class="reader-immersive-exit" data-reader-fs-controls>
      <button type="button" class="icon-btn" data-action="quran-toggle-immersive" aria-label="${t('quran.immersiveExit', lang)}" title="${t('quran.immersiveExit', lang)}">
        ${icon('compress', { size: 18 })}
      </button>
      ${prev ? `<button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${prev}" aria-label="${t('quran.prevSurah', lang)}" title="${t('quran.prevSurah', lang)}">${icon('chevronRight', { size: 18 })}</button>` : ''}
      <button type="button" class="reader-immersive-exit__label" data-action="navigate" data-view="${VIEWS.QURAN}" aria-label="${t('quran.backToList', lang)}" title="${t('quran.backToList', lang)}">
        ${t('quran.backToList', lang)}
      </button>
      ${next ? `<button type="button" class="icon-btn" data-action="navigate" data-view="${VIEWS.QURAN}" data-id="${next}" aria-label="${t('quran.nextSurah', lang)}" title="${t('quran.nextSurah', lang)}">${icon('chevronLeft', { size: 18 })}</button>` : ''}
      <button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${num}" aria-label="${t(recitingThis ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}" title="${t(recitingThis ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 17 })}
      </button>
      ${recitingThis ? `<span class="reader-immersive-exit__count" dir="ltr">${escapeHTML(String(sp.ayah))}/${escapeHTML(String(sp.total))}</span>` : ''}
    </div>`;
}

export function renderQuran(state) {
  const lang = state.settings.language;
  const id = state.activeParams.id;

  const mushafLink = id
    ? `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="mushaf-open-at-surah" data-surah="${escapeHTML(String(id))}">${icon('book', { size: 16 })} ${t('quran.viewInMushaf', lang)}</button>`
    : `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="navigate" data-view="${VIEWS.MUSHAF}">${icon('book', { size: 16 })} ${t('quran.viewInMushaf', lang)}</button>`;

  // Review A9: the reader is where listening starts, so reciter selection
  // must be reachable from here — not buried in a nav view the person may
  // never open.
  const recitersLink = `<button type="button" class="btn btn--secondary btn--sm quran-mushaf-toggle" data-action="navigate" data-view="${VIEWS.AUDIO}">${icon('volume', { size: 16 })} ${t('quran.recitersLink', lang)}</button>`;

  // (v4.5, APP-FLOW §5) Immersive reading: the reader-side sibling of the
  // Mushaf's TRUE fullscreen — chrome away, column wide, ayah cards only.
  // Enter from the view header; leave via the floating glass bar (auto-
  // fading exactly like the mushaf's, so the reading line stays clean) or
  // Esc. The bar carries the whole navigation contract (exit, prev/next
  // surah, recitation with live counter) so the mode is never a trap:
  // from ANY scroll depth the full nav is one tap away. (Invariant I1.)
  const immersiveBtn = id
    ? `<button type="button" class="icon-btn quran-immersive-btn ${state.readerImmersive ? 'icon-btn--active' : ''}" data-action="quran-toggle-immersive" aria-pressed="${state.readerImmersive === true}" aria-label="${t(state.readerImmersive ? 'quran.immersiveExit' : 'quran.immersiveEnter', lang)}" title="${t(state.readerImmersive ? 'quran.immersiveExit' : 'quran.immersiveEnter', lang)}">${icon(state.readerImmersive ? 'compress' : 'expand', { size: 18 })}</button>`
    : '';
  const immersiveExit = state.readerImmersive
    ? buildReaderImmersiveBar(state, numberToInt(id), lang)
    : '';

  return `
  <section class="view view--quran">
    <header class="view-header">
      ${id ? `<a class="back-link" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}">${icon('chevronLeft', { size: 18 })} ${t('quran.backToList', lang)}</a>` : ''}
      ${!id ? `<h1 class="view__title">${t('quran.title', lang)}</h1><p class="view__subtitle">${t('quran.subtitle', lang)}</p>` : ''}
      ${mushafLink}
      ${recitersLink}
      ${immersiveBtn}
    </header>
    ${id ? surahReaderHTML(state, id) : surahListHTML(state)}
    ${immersiveExit}
  </section>`;
}

/**
 * v3.17 Home card: the hifz review queue. Due surahs (oldest first) link
 * straight into memorize mode (#/quran/N?mem=1); when the Mushaf meta is
 * already in memory, surahs fully READ via the khatma page-tracking but not
 * yet memorized are offered as honest "ready to memorize" suggestions.
 * Computed from persisted records only — zero network, zero boot cost; the
 * card is silently absent until the person has actually marked something.
 */
export function hifzReviewCardHTML(state) {
  const lang = state.settings.language;
  const records = state.hifzRecords ?? {};
  const memorized = countMemorized(records);
  // (review v3.21): count BEFORE the display cap — with 7 surahs due the
  // card used to claim “4 due for review”.
  const dueAll = dueSurahs(records);
  const due = dueAll.slice(0, 4);
  const surahMetas = state.quran.meta?.surahs ?? null;
  const nameOf = (n) => {
    const s = surahMetas?.find((x) => Number(x.number) === n);
    return s ? (lang === 'ar' ? s.nameAr : s.nameTransliteration) : `#${n}`;
  };
  const suggestions =
    state.mushaf.meta?.ayahPages && surahMetas
      ? suggestFromKhatma(
          records,
          state.mushafPagesRead,
          state.mushaf.meta.ayahPages,
          surahMetas,
          3
        )
      : [];
  if (!memorized && !suggestions.length) return '';

  const dueChips = due
    .map(
      (d) => `
      <a class="chip" href="${buildHash(VIEWS.QURAN, { id: d.surah, mem: '1' })}" title="${t('hifz.memorizedBadge', lang, { date: d.due })}">
        ${escapeHTML(nameOf(d.surah))}
        ${d.overdue > 0 ? `<span class="chip__count" dir="ltr">+${d.overdue}</span>` : ''}
      </a>`
    )
    .join('');
  const suggChips = suggestions
    .map(
      (s) => `
      <a class="chip" href="${buildHash(VIEWS.QURAN, { id: s.surah })}">${escapeHTML(nameOf(s.surah))}</a>`
    )
    .join('');

  return `
  <section class="panel panel--hifz">
    <div class="panel__header">
      <h2>${icon('target', { size: 16 })} ${t('hifz.cardTitle', lang)}</h2>
    </div>
    <p class="panel__subtext">
      ${t('hifz.memorizedCount', lang, { n: memorized })}${dueAll.length ? ` \u00b7 ${t('hifz.dueToday', lang, { n: dueAll.length })}` : ''}
    </p>
    ${dueChips ? `<div class="chip-row chip-row--scroll">${dueChips}</div>` : ''}
    ${
      suggChips
        ? `
    <p class="panel__subtext">${t('hifz.suggestHint', lang)}</p>
    <div class="chip-row chip-row--scroll">${suggChips}</div>`
        : ''
    }
  </section>`;
}
