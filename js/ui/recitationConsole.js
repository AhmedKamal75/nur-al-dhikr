/**
 * ui/recitationConsole.js — THE recitation console (Blueprint E step 1).
 *
 * The fullscreen Mushaf bar, the immersive reader bar, and the player bar
 * rendered the same 13 recitation controls from three copy-pasted builders
 * that had already drifted (the player bar's ayah prev/next pointed the
 * LTR way while the other two follow mushaf order). One builder, three
 * hosts: same actions, same labels, same state derivations. Hosts keep
 * their own CSS classes (no visual change) via the `cls` hooks.
 *
 * Layer note: ui/ stays free of services/ — callers pass the sleep
 * snapshot in (the v4.3 calendarModals precedent).
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { QURAN_RECITERS } from '../core/config.js';

/** Short voice label for the console's reciter chip ("Alafasy", "Husary"…). */
export function reciterShortLabel(reciterId, lang) {
  const r = QURAN_RECITERS.find((x) => x.id === reciterId);
  if (!r) return reciterId || '';
  const name = lang === 'ar' ? r.nameAr : r.nameEn;
  return String(name).split(' ')[0];
}

/** Normalize session + settings + sleep into one snapshot for the builder. */
export function consoleSnapshot(sp, settings, sleep, lang) {
  const audio = settings?.audio || {};
  const rep = [1, 3, 5, 10, -1].includes(sp.repeat) ? sp.repeat : 1;
  const loop = [1, 2, 3, 5, 10].includes(sp.loop) ? sp.loop : 1;
  const voiceA = sp.reciterId || settings?.reciter;
  const voiceB = settings?.reciterB || sp.reciterIdB || null;
  // (v5.10.7) session progress for the slim progress bar: finite ints
  // only, otherwise the bar stays hidden (never a NaN width).
  const ayah = Math.floor(Number(sp.ayah));
  const total = Math.floor(Number(sp.total));
  const pct =
    Number.isFinite(ayah) && Number.isFinite(total) && total > 0
      ? Math.max(0, Math.min(100, Math.round((ayah / total) * 100)))
      : null;
  return {
    follow: audio.ayahFollow ?? true,
    continuous: sp.continuous === true,
    rep,
    repLabel: rep === -1 ? '∞' : `×${rep}`,
    echo: sp.listenRepeat === true,
    compare: sp.compare === true,
    voiceBLabel: voiceB ? reciterShortLabel(voiceB, lang) : '',
    voiceALabel: reciterShortLabel(voiceA, lang),
    loop,
    speed: Number(sp.speed) || 1,
    sleepEnabled: !!sleep?.enabled,
    sleepLabel: sleep?.label || '',
    paused: sp.paused === true,
    waiting: sp.waiting === true,
    // (v5.10.7) session progress bar (ayah x of y). Null-safe by
    // construction above — null pct hides the bar, never NaN widths.
    ayah: Number.isFinite(ayah) ? ayah : null,
    total: Number.isFinite(total) && total > 0 ? total : null,
    progressPct: pct,
  };
}

/**
 * The recitation controls. cls: { chip, on, btn } class hooks per host.
 * Ayah prev/next follow mushaf order (prev = right chevron) on every host —
 * Quranic sequence doesn't mirror with UI language (UX-4 rule).
 *
 * (v5.10.6) Professional two-row layout: a transport row (prev, hero
 * play/pause, stop, next, speed, reciter) always visible, plus a "more"
 * toggle opening the secondary settings (repeat, loop, follow, listen,
 * echo, sleep, compare, mode). Every control keeps its data-action — the
 * regroup only moves markup, so all handlers keep working untouched.
 */
export function recitationChipsHTML(snap, lang, cls, opts = {}) {
  // (UX-8) icon-only buttons carry no meaning on touch (title tooltips
  // don't exist there). The short label shows on wide viewports via CSS
  // (.rec-console-label, ≥900px); phones keep the compact row. The span
  // is aria-hidden — the button's aria-label already announces.
  const wideLabel = (text) =>
    `<span class="rec-console-label" aria-hidden="true">${escapeHTML(text)}</span>`;
  const chip = (action, on, pressed, label, inner) =>
    `<button type="button" class="${cls.chip}${on ? ` ${cls.on}` : ''}" data-action="${action}"${pressed == null ? '' : ` aria-pressed="${pressed}"`} aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${inner}</button>`;
  const navBtn = (action, label, glyph, shortText) =>
    `<button type="button" class="${cls.btn}" data-action="${action}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${icon(glyph, { size: 16 })}${shortText ? wideLabel(shortText) : ''}</button>`;
  const voiceLabel = `${t('audio.chooseReciter', lang)} — ${snap.voiceALabel}${snap.voiceBLabel ? ` + ${snap.voiceBLabel}` : ''}`;
  const moreOpen = opts.moreOpen === true;
  // (v5.10.7) slim session progress (the screenshots' progress bar,
  // stepped per ayah — exact within-ayah position needs per-frame time
  // updates the verse engine deliberately avoids re-rendering for).
  const progress =
    snap.progressPct == null
      ? ''
      : `
  <div class="rec-console-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${snap.progressPct}" aria-label="${t('audio.sessionProgress', lang)}">
    <span class="rec-console-progress__fill" style="width:${snap.progressPct}%"></span>
  </div>
  <p class="rec-console-count" dir="ltr">${snap.ayah} / ${snap.total}</p>`;
  return `
  ${progress}
  <div class="rec-console-transport" role="group" aria-label="${t('audio.transport', lang)}">
      ${navBtn('recite-ayah-prev', t('audio.ayahPrev', lang), 'chevronRight', t('audio.ayahPrev', lang))}
      <button type="button" class="rec-console-play" data-action="recite-pause-toggle" aria-label="${t(snap.paused ? 'audio.play' : 'audio.pause', lang)}" title="${t(snap.paused ? 'audio.play' : 'audio.pause', lang)}">${icon(snap.paused ? 'play' : 'pause', { size: 24 })}${wideLabel(t(snap.paused ? 'audio.play' : 'audio.pause', lang))}</button>
      ${navBtn('recite-stop', t('audio.reciteStop', lang), 'stop')}
      ${navBtn('recite-ayah-next', t('audio.ayahNext', lang), 'chevronLeft', t('audio.ayahNext', lang))}
      ${chip('recite-speed-cycle', false, null, t('audio.speed', lang), `${snap.speed}×`)}
      ${chip('recite-voice-open', false, null, voiceLabel, `${icon('volume', { size: 13 })} <span class="rec-chip__text">${escapeHTML(snap.voiceALabel)}${snap.voiceBLabel ? `+${escapeHTML(snap.voiceBLabel)}` : ''}</span>`)}
      ${chip('recite-more-toggle', moreOpen, moreOpen, t('audio.moreSettings', lang), `${icon('menu', { size: 16 })} ${wideLabel(t('audio.moreSettings', lang))}`)}
  </div>
  <div class="rec-console-more${moreOpen ? ' rec-console-more--open' : ''}"${moreOpen ? '' : ' hidden'}>
      ${chip('recite-repeat-toggle', snap.rep !== 1, null, `${t('audio.repeatAyah', lang)} (${snap.repLabel})`, `${icon('repeat', { size: 13 })} ${snap.repLabel}`)}
      ${chip('recite-follow-toggle', snap.follow, snap.follow, t('audio.follow', lang), `${icon(snap.follow ? 'eye' : 'eyeOff', { size: 14 })} ${wideLabel(t('audio.follow', lang))}`)}
      ${chip('recite-listen-toggle', snap.continuous, snap.continuous, t('audio.listenMode', lang), `${icon('play', { size: 13 })} ${t('audio.listen', lang)}`)}
      ${chip('recite-echo-toggle', snap.echo, snap.echo, t('audio.echoMode', lang), `${icon('volume', { size: 13 })} ${t('audio.echo', lang)}`)}
      ${chip('recite-sleep-cycle', snap.sleepEnabled, null, t('audio.sleepTimer', lang), `${icon('moon', { size: 13 })}${snap.sleepEnabled ? ` <span class="rec-chip__text">${escapeHTML(snap.sleepLabel)}</span>` : ''}`)}
      ${chip('recite-compare-toggle', snap.compare, snap.compare, t('audio.compareMode', lang), `${icon('grid', { size: 13 })} ${t('audio.compare', lang)}`)}
      ${snap.voiceBLabel ? chip('recite-compare-swap', false, null, t('audio.compareSwap', lang), `${icon('refresh', { size: 13 })} ${wideLabel(t('audio.compareSwap', lang))}`) : ''}
      ${chip('recite-loop-toggle', snap.loop !== 1, null, t('audio.loopMode', lang), `${icon('repeat', { size: 13 })} ${snap.loop === 1 ? t('audio.loop', lang) : `×${snap.loop}`}`)}
      ${chip('recite-mode-surah', false, null, t('audio.modeSurah', lang), `${icon('book', { size: 13 })} ${wideLabel(t('audio.modeSurah', lang))}`)}
  </div>`;
}

/** The "your turn" echo-wait banner, or '' — host supplies the class. */
export function recitationEchoHTML(snap, lang, echoClass) {
  if (snap.waiting !== true) return '';
  return `<div class="${echoClass}" role="status">${icon('volume', { size: 14 })} ${t('audio.yourTurn', lang)}</div>`;
}
