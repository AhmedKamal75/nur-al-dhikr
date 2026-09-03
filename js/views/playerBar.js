/**
 * views/playerBar.js
 * The persistent full-surah player bar, rendered once a moshaf+surah is
 * selected and docked above the bottom nav / bottom of content on desktop.
 * Time/seek/buffered are DOM-patched by the player engine callback — the
 * bar itself only re-renders on coarse state changes (track, play/pause).
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { findMoshaf } from '../services/audioCatalog.js';
import { sleepSnapshot } from '../services/surahPlayback.js';

const RATES = [1, 1.25, 1.5, 0.75];

export function renderPlayerBar(state) {
  const lang = state.settings.language;
  // v3.10: the bar doubles as the continuous-recitation console when a
  // follow-along session is active (even with no full-surah track).
  const sp = state.surahPlayback;
  if (sp?.active && sp.surah != null) return recitationBarHTML(state, lang);
  const p = state.player;
  if (!p?.moshafId || p.surah == null) return '';
  const moshaf = findMoshaf(p.moshafId, state.settings.customReciters || []);
  const surah = state.quran.meta?.surahs?.find((x) => String(x.number) === String(p.surah));
  const name = moshaf ? (lang === 'ar' && moshaf.nameAr ? moshaf.nameAr : moshaf.nameEn) : '';
  const surahName = surah
    ? lang === 'ar'
      ? surah.nameAr
      : `${surah.nameTransliteration} · ${surah.nameAr}`
    : `#${p.surah}`;
  const prefs = state.settings.audio || {};
  const rate = RATES.includes(prefs.rate) ? prefs.rate : 1;
  const repeat = prefs.repeat === 'one' ? 'one' : 'off';

  return `
  <div class="player-bar" data-player-mounted="1">
    <div class="player-bar__head">
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-prev" aria-label="${t('audio.prev', lang)}">${icon('chevronLeft', { size: 18 })}</button>
      <button type="button" class="player-bar__play" data-action="player-toggle" aria-label="${t(p.playing ? 'audio.pause' : 'audio.play', lang)}">
        ${icon(p.playing ? 'pause' : 'play', { size: 20 })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-next" aria-label="${t('audio.next', lang)}">${icon('chevronRight', { size: 18 })}</button>
      <div class="player-bar__meta">
        <span class="player-bar__surah">${escapeHTML(surahName)}</span>
        <span class="player-bar__reciter">${escapeHTML(name)}${p.offline ? ` · ${icon('check', { size: 11 })} ${t('audio.offlineBadge', lang)}` : ''}</span>
      </div>
      <span class="player-bar__buffer" data-player-buffer hidden>${t('audio.buffering', lang)}</span>
      <button type="button" class="player-bar__chip ${repeat !== 'off' ? 'player-bar__chip--on' : ''}" data-action="player-repeat" aria-pressed="${repeat !== 'off'}" aria-label="${t('audio.repeat', lang)}">
        ${icon('repeat', { size: 14 })}
      </button>
      <button type="button" class="player-bar__chip" data-action="player-rate" aria-label="${t('audio.speed', lang)} — ${rate}&times;">${rate}&times;</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-close" aria-label="${t('common.close', lang)}">${icon('close', { size: 16 })}</button>
    </div>
    <div class="player-bar__track">
      <span class="player-bar__time" data-player-time>0:00</span>
      <input class="player-bar__seek" type="range" min="0" max="100" step="0.1" value="0" dir="ltr"
        data-player-seek aria-label="${t('audio.seek', lang)}" />
      <span class="player-bar__time" data-player-dur>0:00</span>
    </div>
  </div>`;
}

/**
 * v3.10: compact console for the continuous follow-along recitation —
 * live ayah counter, follow-highlight toggle, stop. Rendered by
 * renderPlayerBar whenever state.surahPlayback is active.
 */
function recitationBarHTML(state, lang) {
  const sp = state.surahPlayback;
  const follow = state.settings.audio?.ayahFollow ?? true;
  // v4.4 listen mode: continuous multi-surah playback + sleep timer.
  const continuous = sp.continuous === true;
  const sleep = sleepSnapshot();
  // v3.17 hifz: per-ayah repeat budget + manual ayah skips (the ∞ mode's
  // exit hatch). Chip reads the live session snapshot; the persisted
  // default comes from settings.audio.ayahRepeat.
  const rep = [1, 3, 5, 10, -1].includes(sp.repeat) ? sp.repeat : 1;
  const repLabel = rep === -1 ? '\u221e' : `\u00d7${rep}`;
  const surah = state.quran.meta?.surahs?.find((x) => String(x.number) === String(sp.surah));
  const name = surah
    ? lang === 'ar'
      ? surah.nameAr
      : `${surah.nameTransliteration}`
    : `#${sp.surah}`;
  return `
  <div class="player-bar player-bar--recite" data-player-mounted="1">
    <div class="player-bar__head">
      <span class="player-bar__pulse" aria-hidden="true"></span>
      <div class="player-bar__meta">
        <span class="player-bar__reciter">${escapeHTML(t('audio.reciting', lang))} · ${escapeHTML(name)}</span>
        <span class="player-bar__ayah-counter" dir="ltr">${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}</span>
      </div>
      <button type="button" class="icon-btn icon-btn--sm" data-action="recite-ayah-prev" aria-label="${t('audio.ayahPrev', lang)}" title="${t('audio.ayahPrev', lang)}">${icon('chevronLeft', { size: 15 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="recite-ayah-next" aria-label="${t('audio.ayahNext', lang)}" title="${t('audio.ayahNext', lang)}">${icon('chevronRight', { size: 15 })}</button>
      <button type="button" class="player-bar__chip ${rep !== 1 ? 'player-bar__chip--on' : ''}" data-action="recite-repeat-toggle" aria-label="${escapeHTML(t('audio.repeatAyah', lang))} (${repLabel})" title="${escapeHTML(t('audio.repeatAyah', lang))} (${repLabel})">
        ${icon('repeat', { size: 13 })} ${repLabel}
      </button>
      <button type="button" class="player-bar__chip ${follow ? 'player-bar__chip--on' : ''}" data-action="recite-follow-toggle" aria-pressed="${follow}" aria-label="${t('audio.follow', lang)}" title="${t('audio.follow', lang)}">
        ${icon(follow ? 'eye' : 'eyeOff', { size: 14 })}
      </button>
      <button type="button" class="player-bar__chip ${continuous ? 'player-bar__chip--on' : ''}" data-action="recite-listen-toggle" aria-pressed="${continuous}" aria-label="${t('audio.listenMode', lang)}" title="${t('audio.listenMode', lang)}">
        ${icon('play', { size: 13 })} ${t('audio.listen', lang)}
      </button>
      <button type="button" class="player-bar__chip ${sleep.enabled ? 'player-bar__chip--on' : ''}" data-action="recite-sleep-cycle" aria-label="${t('audio.sleepTimer', lang)}" title="${t('audio.sleepTimer', lang)}">
        ${icon('moon', { size: 13 })}${sleep.enabled ? ` ${escapeHTML(sleep.label)}` : ''}
      </button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="recite-stop" aria-label="${t('audio.reciteStop', lang)}">
        ${icon('stop', { size: 16 })}
      </button>
    </div>
  </div>`;
}
