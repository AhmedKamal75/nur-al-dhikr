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
import { sleepSnapshot, VERSE_RATES } from '../services/surahPlayback.js';
import { normalizeRepeatMode } from '../domain/audioQueue.js';
import {
  consoleSnapshot,
  recitationChipsHTML,
  recitationEchoHTML,
} from '../ui/recitationConsole.js';

// Speed ladder: the canonical VERSE_RATES (services/surahPlayback.js) —
// the file bar used to keep its own copy and the two already disagreed.

export function renderPlayerBar(state) {
  const lang = state.settings.language;
  // (v5.12.0) minimized: a slim pill that keeps audio + essential
  // controls, for reading with nothing but the text on screen.
  if (state.ui?.playerMin === true) return miniBarHTML(state, lang);
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
  const rate = VERSE_RATES.includes(prefs.rate) ? prefs.rate : 1;
  // (v5.12.0) file-mode volume: the one true loudness slider (verse
  // sessions stay mute-only — the sleep fade owns their volume). While a
  // sleep timer is armed the slider yields (disabled): the 1s fade tick
  // would fight the thumb, so the toast explains who owns it.
  const volPct = Math.max(0, Math.min(100, Math.round(Number(prefs.fileVolume ?? 1) * 100)));
  const volDisabled = p.sleepEnabled === true;
  const volTitle = volDisabled ? t('audio.volumeSleep', lang) : t('audio.volume', lang);
  // (v5.12.0) element mute mirror (M key) — ephemeral ui, never persisted.
  const muted = state.ui?.audioMuted === true;
  // (v5.2.67) three repeat modes: the chip names the active one (tooltip +
  // screen reader) and badges repeat-all visibly — icon-only would lie.
  const repeat = normalizeRepeatMode(prefs.repeat);
  const repeatLabel = repeat === 'all' ? t('audio.repeatAll', lang) : t('audio.repeat', lang);

  return `
  <div class="player-bar" data-player-mounted="1">
    <div class="player-bar__head">
      ${'' /* (v5.12.0) book-order transport: prev = right chevron, next = left —
        same as the fullscreen file row and every surah/ayah nav (UX-4). */}
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-prev" aria-label="${t('audio.prev', lang)}">${icon('chevronRight', { size: 18 })}</button>
      <button type="button" class="player-bar__play" data-action="player-toggle" aria-label="${t(p.playing ? 'audio.pause' : 'audio.play', lang)}">
        ${icon(p.playing ? 'pause' : 'play', { size: 20 })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-next" aria-label="${t('audio.next', lang)}">${icon('chevronLeft', { size: 18 })}</button>
      <div class="player-bar__meta">
        <span class="player-bar__surah">${escapeHTML(surahName)}</span>
        <span class="player-bar__reciter">${escapeHTML(name)}${p.offline ? ` · ${icon('check', { size: 11 })} ${t('audio.offlineBadge', lang)}` : ''}</span>
        <span class="player-bar__mode-note">${escapeHTML(t('audio.fileModeNote', lang))}</span>
      </div>
      <span class="player-bar__buffer" data-player-buffer hidden>${t('audio.buffering', lang)}</span>
      <button type="button" class="player-bar__chip ${repeat !== 'off' ? 'player-bar__chip--on' : ''}" data-action="player-repeat" aria-pressed="${repeat !== 'off'}" aria-label="${repeatLabel}" title="${repeatLabel}">
        ${icon('repeat', { size: 14 })}${repeat === 'all' ? ` ${escapeHTML(t('audio.repeatAllShort', lang))}` : ''}
      </button>
      <button type="button" class="player-bar__chip" data-action="player-rate" aria-label="${t('audio.speed', lang)} — ${rate}&times;">${rate}&times;</button>
      <button type="button" class="player-bar__chip ${muted ? 'player-bar__chip--on' : ''}" data-action="audio-mute-toggle" aria-pressed="${muted}" aria-keyshortcuts="m" aria-label="${t(muted ? 'audio.unmute' : 'audio.mute', lang)}" title="${t(muted ? 'audio.unmute' : 'audio.mute', lang)}">
        ${icon(muted ? 'volume-x' : 'volume', { size: 14 })}
      </button>
      <button type="button" class="player-bar__chip ${p.sleepEnabled ? 'player-bar__chip--on' : ''}" data-action="player-sleep-cycle" aria-pressed="${p.sleepEnabled === true}" aria-label="${t('audio.sleepTimer', lang)}${p.sleepLabel ? ` — ${p.sleepLabel}` : ''}" title="${t('audio.sleepTimer', lang)}${p.sleepLabel ? ` — ${p.sleepLabel}` : ''}">
        ${icon('moon', { size: 14 })}${p.sleepEnabled && p.sleepLabel ? ` ${escapeHTML(p.sleepLabel)}` : ''}
      </button>
      <button type="button" class="player-bar__chip" data-action="recite-mode-ayah" aria-label="${t('audio.modeAyah', lang)}" title="${t('audio.modeAyah', lang)}">
        ${icon('list', { size: 14 })}
      </button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-min-toggle" aria-label="${t('audio.playerMinimize', lang)}" title="${t('audio.minimizeHint', lang)}">${icon('chevronDown', { size: 16 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-close" data-player-dismiss="1" aria-label="${t('common.close', lang)}">${icon('close', { size: 16 })}</button>
    </div>
    <div class="player-bar__track">
      <span class="player-bar__time" data-player-time>0:00</span>
      <button type="button" class="player-bar__chip" data-action="player-seek-back" aria-label="${t('audio.seekBack', lang)}" title="${t('audio.seekBack', lang)}">${lang === 'ar' ? '-10 ث' : '-10s'}</button>
      <input class="player-bar__seek" type="range" min="0" max="100" step="0.1" value="0" dir="ltr"
        data-player-seek aria-label="${t('audio.seek', lang)}" />
      <button type="button" class="player-bar__chip" data-action="player-seek-fwd" aria-label="${t('audio.seekFwd', lang)}" title="${t('audio.seekFwd', lang)}">${lang === 'ar' ? '+10 ث' : '+10s'}</button>
      <span class="player-bar__time" data-player-dur>0:00</span>
    </div>
    <div class="player-bar__volume">
      ${icon('volume', { size: 14 })}
      <input class="player-bar__seek" type="range" min="0" max="100" step="5" value="${volPct}" dir="ltr"
        data-player-volume aria-label="${escapeHTML(volTitle)}" title="${escapeHTML(volTitle)}"${volDisabled ? ' disabled aria-disabled="true"' : ''} />
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
  // The controls come from the single shared builder (UX-5) — this bar
  // only owns the header/counter chrome around them.
  const snap = consoleSnapshot(sp, state.settings, sleepSnapshot(), lang, {
    muted: state.ui?.audioMuted === true,
  });
  const chips = recitationChipsHTML(
    snap,
    lang,
    {
      chip: 'player-bar__chip',
      on: 'player-bar__chip--on',
      btn: 'icon-btn icon-btn--sm',
    },
    { moreOpen: state.ui?.reciteMore === true }
  );
  // Queue position ("2/5") when a saved queue is playing.
  const qPos =
    Array.isArray(sp.queue) && sp.queue.length > 1 && Number.isFinite(Number(sp.qIndex))
      ? ` · ${Number(sp.qIndex) + 1}/${sp.queue.length}`
      : '';
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
        <span class="player-bar__ayah-counter" dir="ltr">${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}${escapeHTML(qPos)}</span>
      </div>
      <button type="button" class="icon-btn icon-btn--sm" data-action="recite-pause-toggle" aria-label="${escapeHTML(t(snap.paused ? 'audio.play' : 'audio.pause', lang))}" title="${escapeHTML(t(snap.paused ? 'audio.play' : 'audio.pause', lang))}">${icon(snap.paused ? 'play' : 'pause', { size: 16 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="player-min-toggle" aria-label="${escapeHTML(t('audio.playerMinimize', lang))}" title="${escapeHTML(t('audio.minimizeHint', lang))}">${icon('chevronDown', { size: 16 })}</button>
      <button type="button" class="icon-btn icon-btn--sm" data-action="recite-stop" data-player-dismiss="1" aria-label="${escapeHTML(t('audio.reciteStop', lang))}" title="${escapeHTML(t('audio.reciteStop', lang))}">${icon('close', { size: 16 })}</button>
    </div>
    <div class="player-bar__console" role="group" aria-label="${escapeHTML(t('audio.player', lang))}">
      ${chips}
    </div>
    ${recitationEchoHTML(snap, lang, 'player-bar__echo-wait')}
  </div>`;
}

/**
 * (v5.12.0) minimized pill: play/pause + position label + restore + quit.
 * One template for both engines (file mode and verse session) — the two
 * buttons dispatch the mode's own actions, so minimizing never changes
 * what is playing, only how much chrome surrounds it.
 */
function miniBarHTML(state, lang) {
  const sp = state.surahPlayback;
  const p = state.player;
  const isRecite = sp?.active && sp.surah != null;
  if (!isRecite && (!p?.moshafId || p.surah == null)) return '';
  const toggle = isRecite ? 'recite-pause-toggle' : 'player-toggle';
  const quit = isRecite ? 'recite-stop' : 'player-close';
  const playing = isRecite ? sp.paused !== true : p.playing === true;
  const label = isRecite
    ? `${sp.surah}:${sp.ayah} / ${sp.total}`
    : `#${p.surah}`;
  const surah = state.quran.meta?.surahs?.find(
    (x) => String(x.number) === String(isRecite ? sp.surah : p.surah)
  );
  const name =
    surah != null
      ? lang === 'ar'
        ? surah.nameAr
        : (surah.nameTransliteration || surah.nameEn || `#${isRecite ? sp.surah : p.surah}`)
      : `#${isRecite ? sp.surah : p.surah}`;
  return `
  <div class="player-bar player-bar--min" data-player-mounted="1">
    <button type="button" class="player-bar__play player-bar__play--sm" data-action="${toggle}" aria-label="${t(playing ? 'audio.pause' : 'audio.play', lang)}">
      ${icon(playing ? 'pause' : 'play', { size: 18 })}
    </button>
    <span class="player-bar__meta player-bar__meta--min">
      <span class="player-bar__surah">${escapeHTML(name)}</span>
      <span class="player-bar__reciter" dir="ltr">${escapeHTML(label)}</span>
    </span>
    <button type="button" class="icon-btn icon-btn--sm" data-action="player-min-toggle" aria-label="${t('audio.playerRestore', lang)}" title="${t('audio.playerRestore', lang)}">${icon('chevronUp', { size: 16 })}</button>
    <button type="button" class="icon-btn icon-btn--sm" data-action="${quit}" data-player-dismiss="1" aria-label="${t(isRecite ? 'audio.reciteStop' : 'common.close', lang)}">${icon('close', { size: 16 })}</button>
  </div>`;
}
