/**
 * views/mushafPlayer.js — (v5.12.0, Blueprint E part) the Mushaf's player
 * surfaces: start-from-page math + the fullscreen file-player row.
 * Extracted so mushafReader.js stays a page-render module (the lean pin);
 * no back-edge into mushafReader — pure templates + one pure helper over
 * caller-passed state.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { findMoshaf } from '../services/audioCatalog.js';
import {
  clampPage,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
} from '../services/mushaf.js';
import { sleepSnapshot } from '../services/surahPlayback.js';
import {
  consoleSnapshot,
  recitationChipsHTML,
  recitationEchoHTML,
} from '../ui/recitationConsole.js';

/**
 * First ayah number of `surah` carried by page docs (or null). Minimum
 * across docs (a spread can split one surah over two pages); Bismillah
 * markers (0) never count as a start. Pure — shared by the fullscreen
 * play button and the multi-surah picker.
 */
export function firstAyahOnPage(docs, surah) {
  const want = Math.floor(Number(surah));
  if (!Number.isFinite(want) || want < 1 || want > 114) return null;
  let first = null;
  for (const doc of Array.isArray(docs) ? docs : []) {
    const ch = doc?.chapters?.find((c) => Number(c?.number) === want);
    for (const v of ch?.verses || []) {
      const n = Math.floor(Number(v?.number));
      if (Number.isFinite(n) && n >= 1 && (first == null || n < first)) first = n;
    }
  }
  return first;
}

/**
 * Fullscreen file-player row: the whole-surah player used to go
 * control-less in fullscreen (the windowed bar hides, the verse console
 * only covers verse sessions) — audio orphaned with no pause or quit.
 * Same host row, same actions as the windowed bar (play/pause, prev/next,
 * quit), so entering fullscreen never strands a track and the engine
 * underneath is literally untouched (no restart, no lost position).
 */
function buildFullscreenFileConsole(state, lang) {
  const p = state.player;
  const moshaf = findMoshaf(p.moshafId, state.settings.customReciters || []);
  const surah = state.quran.meta?.surahs?.find((x) => String(x.number) === String(p.surah));
  const surahName =
    surah != null
      ? lang === 'ar'
        ? surah.nameAr
        : surah.nameTransliteration || surah.nameEn || `#${p.surah}`
      : `#${p.surah}`;
  const reciterName =
    moshaf != null ? (lang === 'ar' && moshaf.nameAr ? moshaf.nameAr : moshaf.nameEn) : '';
  return `
    <div class="mushaf-fs-console" data-fs-controls>
      <div class="rec-console-transport" role="group" aria-label="${escapeHTML(t('audio.player', lang))}">
        <button type="button" class="icon-btn" data-action="player-prev" aria-label="${escapeHTML(t('audio.prev', lang))}" title="${escapeHTML(t('audio.prev', lang))}">${icon('chevronRight', { size: 16 })}</button>
        <button type="button" class="rec-console-play" data-action="player-toggle" aria-label="${t(p.playing ? 'audio.pause' : 'audio.play', lang)}" title="${t(p.playing ? 'audio.pause' : 'audio.play', lang)}">${icon(p.playing ? 'pause' : 'play', { size: 24 })}</button>
        <button type="button" class="icon-btn" data-action="player-next" aria-label="${escapeHTML(t('audio.next', lang))}" title="${escapeHTML(t('audio.next', lang))}">${icon('chevronLeft', { size: 16 })}</button>
        <span class="mushaf-fs-controls__ayah" dir="auto">${escapeHTML(surahName)}${reciterName ? ` · ${escapeHTML(reciterName)}` : ''}</span>
        <button type="button" class="icon-btn" data-action="player-min-toggle" aria-label="${escapeHTML(t('audio.playerMinimize', lang))}" title="${escapeHTML(t('audio.minimizeHint', lang))}">${icon('chevronDown', { size: 16 })}</button>
        <button type="button" class="icon-btn" data-action="player-close" aria-label="${escapeHTML(t('common.close', lang))}" title="${escapeHTML(t('common.close', lang))}">${icon('close', { size: 16 })}</button>
      </div>
    </div>`;
}

/** File row when a whole-surah track is docked (playing or paused) and
 *  no verse session runs — '' otherwise. Minimized, the pill overlays
 *  the book instead (see the #playerbar exemption), so the row yields. */
export function fileConsole(state, lang) {
  const p = state.player;
  if (!p?.moshafId || p.surah == null) return '';
  if (state.ui?.playerMin === true) return '';
  return buildFullscreenFileConsole(state, lang);
}

/** The fullscreen console's second glass row — the windowed player bar's
 *  recitation chips, re-homed over the book. Same actions, same labels
 *  (the single shared builder in ui/recitationConsole.js), plus minimize
 *  (the pill overlays the book — fullscreen no longer strands the
 *  minimize gesture). Yields to the pill when minimized. */
export function buildFullscreenConsole(state, lang) {
  if (state.ui?.playerMin === true) return '';
  const snap = consoleSnapshot(state.surahPlayback, state.settings, sleepSnapshot(), lang, {
    muted: state.ui?.audioMuted === true,
  });
  return `
    <div class="mushaf-fs-console" data-fs-controls>
      ${recitationChipsHTML(snap, lang, { chip: 'mushaf-fs-chip', on: 'mushaf-fs-chip--on', btn: 'icon-btn' }, { moreOpen: state.ui?.reciteMore === true })}
      <button type="button" class="icon-btn mushaf-fs-min" data-action="player-min-toggle" aria-label="${escapeHTML(t('audio.playerMinimize', lang))}" title="${escapeHTML(t('audio.minimizeHint', lang))}">${icon('chevronDown', { size: 16 })}</button>
    </div>
    ${recitationEchoHTML(snap, lang, 'mushaf-fs-echo')}`;
}

/**
 * Distinct surah chapters across the visible page docs, in book order —
 * the source for the multi-surah recitation picker (a page often holds
 * the tail of one surah plus the head of the next). (sweep) moved from
 * mushafReader.js with the picker — pure docs math, no reader back-edge.
 */
export function pageChapters(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs) {
    if (!doc || !Array.isArray(doc.chapters)) continue;
    for (const c of doc.chapters) {
      const n = Number(c?.number);
      if (!Number.isFinite(n) || seen.has(n)) continue;
      seen.add(n);
      out.push(c);
    }
  }
  return out;
}

/**
 * Multi-surah picker for the recitation button: when the visible pages hold
 * more than one surah (tail of one + head of the next), each row recites
 * that surah from its start (or opens the ayah-range picker for a slice).
 * Pure template over the same page docs the reader renders. (sweep) moved
 * from mushafReader.js — the reader re-exports it, so the modal handler
 * and every test keep importing from the facade untouched.
 */
export function buildMushafPlayPick(state) {
  const lang = state.settings.language;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
  const right = spreadOn ? spreadRightPage(page) : page;
  const left = spreadOn ? spreadLeftPage(right) : null;
  const docs =
    left != null
      ? [state.mushaf.pages[String(right)], state.mushaf.pages[String(left)]]
      : [state.mushaf.pages[String(page)]];
  const surahs = pageChapters(docs);
  const activeSurah = state.surahPlayback?.active ? Number(state.surahPlayback.surah) : null;
  const rows = surahs
    .map((c) => {
      const n = Number(c.number);
      const active = activeSurah === n;
      const name = lang === 'ar' ? c.titleAr : `${c.titleEn || ''} · ${c.titleAr || ''}`;
      // (v5.12.0) start-from-this-page (active rows keep stop semantics).
      const seen = !active ? firstAyahOnPage(docs, n) : null;
      const fromAttr = Number.isFinite(seen) && seen > 1 ? ` data-from="${seen}"` : '';
      const playLabel = t(
        active ? 'audio.reciteStop' : fromAttr ? 'audio.reciteFromHere' : 'audio.reciteSurah',
        lang
      );
      return `
      <div class="mushaf-pick-row">
        <span class="mushaf-pick-row__name">${escapeHTML(name)}</span>
        <button type="button" class="btn ${active ? 'btn--primary' : 'btn--secondary'} btn--sm" data-action="surah-play" data-surah="${n}"${fromAttr}>
          ${icon(active ? 'stop' : 'play', { size: 14 })} ${playLabel}
        </button>
        <button type="button" class="icon-btn" data-action="quran-range-open" data-surah="${n}" aria-label="${t('audio.rangeTitle', lang)}" title="${t('audio.rangeTitle', lang)}">
          ${icon('target', { size: 16 })}
        </button>
      </div>`;
    })
    .join('');
  return `
  <div class="mushaf-pick">
    <h2 id="modal-title-mushaf-pick">${t('mushaf.playSurahOnPage', lang)}</h2>
    <p class="panel__subtext">${t('mushaf.playSurahHint', lang)}</p>
    ${rows}
  </div>`;
}

/**
 * Fullscreen play button: direct-play when one surah shares the spread,
 * the surah picker otherwise. A page opening mid-surah starts from its
 * first ayah (data-from) — while THIS surah recites, the button keeps its
 * stop toggle (no data-from, so the engine's stop branch still wins).
 */
export function fsPlayButtonHTML({ recitingThis, multiSurah, surahNumber, pageFrom, lang }) {
  if (multiSurah) {
    return `<button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="mushaf-play-pick" aria-label="${t('mushaf.playSurahOnPage', lang)}" title="${t('mushaf.playSurahOnPage', lang)}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 18 })}
      </button>`;
  }
  const label =
    pageFrom != null ? t('audio.reciteFromHere', lang) : t(recitingThis ? 'audio.reciteStop' : 'audio.reciteSurah', lang);
  return `<button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${surahNumber}"${pageFrom != null ? ` data-from="${pageFrom}"` : ''} aria-label="${label}" title="${label}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 18 })}
      </button>`;
}
