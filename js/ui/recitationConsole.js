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
  };
}

/**
 * The 13 recitation controls. cls: { chip, on, btn } class hooks per host.
 * Ayah prev/next follow mushaf order (prev = right chevron) on every host —
 * Quranic sequence doesn't mirror with UI language (UX-4 rule).
 */
export function recitationChipsHTML(snap, lang, cls) {
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
  return `
      ${navBtn('recite-ayah-prev', t('audio.ayahPrev', lang), 'chevronRight', t('audio.ayahPrev', lang))}
      ${navBtn('recite-ayah-next', t('audio.ayahNext', lang), 'chevronLeft', t('audio.ayahNext', lang))}
      ${chip('recite-repeat-toggle', snap.rep !== 1, null, `${t('audio.repeatAyah', lang)} (${snap.repLabel})`, `${icon('repeat', { size: 13 })} ${snap.repLabel}`)}
      ${chip('recite-follow-toggle', snap.follow, snap.follow, t('audio.follow', lang), `${icon(snap.follow ? 'eye' : 'eyeOff', { size: 14 })} ${wideLabel(t('audio.follow', lang))}`)}
      ${chip('recite-listen-toggle', snap.continuous, snap.continuous, t('audio.listenMode', lang), `${icon('play', { size: 13 })} ${t('audio.listen', lang)}`)}
      ${chip('recite-echo-toggle', snap.echo, snap.echo, t('audio.echoMode', lang), `${icon('volume', { size: 13 })} ${t('audio.echo', lang)}`)}
      ${chip('recite-sleep-cycle', snap.sleepEnabled, null, t('audio.sleepTimer', lang), `${icon('moon', { size: 13 })}${snap.sleepEnabled ? ` ${escapeHTML(snap.sleepLabel)}` : ''}`)}
      ${chip('recite-voice-open', false, null, voiceLabel, `${icon('volume', { size: 13 })} ${escapeHTML(snap.voiceALabel)}${snap.voiceBLabel ? `+${escapeHTML(snap.voiceBLabel)}` : ''}`)}
      ${chip('recite-compare-toggle', snap.compare, snap.compare, t('audio.compareMode', lang), `${icon('grid', { size: 13 })} ${t('audio.compare', lang)}`)}
      ${chip('recite-loop-toggle', snap.loop !== 1, null, t('audio.loopMode', lang), `${icon('repeat', { size: 13 })} ${snap.loop === 1 ? t('audio.loop', lang) : `×${snap.loop}`}`)}
      ${chip('recite-speed-cycle', false, null, t('audio.speed', lang), `${snap.speed}×`)}
      ${navBtn('recite-pause-toggle', t(snap.paused ? 'audio.play' : 'audio.pause', lang), snap.paused ? 'play' : 'pause', t(snap.paused ? 'audio.play' : 'audio.pause', lang))}
      ${navBtn('recite-stop', t('audio.reciteStop', lang), 'stop')}`;
}

/** The "your turn" echo-wait banner, or '' — host supplies the class. */
export function recitationEchoHTML(snap, lang, echoClass) {
  if (snap.waiting !== true) return '';
  return `<div class="${echoClass}" role="status">${icon('volume', { size: 14 })} ${t('audio.yourTurn', lang)}</div>`;
}
