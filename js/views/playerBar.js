/**
 * views/playerBar.js
 * The persistent full-surah player bar, rendered once a moshaf+surah is
 * selected and docked above the bottom nav / bottom of content on desktop.
 * Time/seek/buffered are DOM-patched by the player engine callback — the
 * bar itself only re-renders on coarse state changes (track, play/pause).
 */

import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML } from '../utils.js';
import { findMoshaf } from '../audioCatalog.js';

const RATES = [1, 1.25, 1.5, 0.75];

export function renderPlayerBar(state) {
  const lang = state.settings.language;
  const p = state.player;
  if (!p?.moshafId || p.surah == null) return '';
  const moshaf = findMoshaf(p.moshafId, state.settings.customReciters || []);
  const surah = state.quran.meta?.surahs?.find((x) => String(x.number) === String(p.surah));
  const name = moshaf ? (lang === 'ar' && moshaf.nameAr ? moshaf.nameAr : moshaf.nameEn) : '';
  const surahName = surah ? (lang === 'ar' ? surah.nameAr : `${surah.nameTransliteration} · ${surah.nameAr}`) : `#${p.surah}`;
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
      <button type="button" class="player-bar__chip" data-action="player-rate" aria-label="${t('audio.speed', lang)}">${rate}&times;</button>
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
