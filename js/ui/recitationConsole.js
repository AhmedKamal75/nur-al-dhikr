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
import { t, isRTL } from '../core/i18n.js';
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

/**
 * Cycle mirrors — services/surahPlayback.js owns the canonical
 * REPEAT_CYCLE/LOOP_CYCLE (ui/ stays free of services/ per the layer
 * note above), so these are pinned equal by the drift-net test in
 * tests/recitation-console.test.js. One definition each: the snapshot
 * and the builder both read from here.
 */
export const REPEAT_CYCLE_UI = [1, 3, 5, 10, -1];
export const LOOP_CYCLE_UI = [1, 2, 3, 5, 10];
// (v5.13.0, V5) speed ladder mirror — services/surahPlayback VERSE_RATES
// owns the canonical rungs; pinned equal by recitation-console.test.js.
export const SPEED_CYCLE_UI = [0.5, 0.75, 1, 1.25, 1.5, 2];
const nextIn = (cycle, cur) => cycle[(cycle.indexOf(cur) + 1) % cycle.length];
const cycleLabel = (v) => (v === -1 ? '∞' : `×${v}`);

/** Normalize session + settings + sleep into one snapshot for the builder. */
export function consoleSnapshot(sp, settings, sleep, lang, extra = {}) {
  const audio = settings?.audio || {};
  const rep = REPEAT_CYCLE_UI.includes(sp.repeat) ? sp.repeat : 1;
  const loop = LOOP_CYCLE_UI.includes(sp.loop) ? sp.loop : 1;
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
    repLabel: cycleLabel(rep),
    repNext: nextIn(REPEAT_CYCLE_UI, rep),
    repNextLabel: cycleLabel(nextIn(REPEAT_CYCLE_UI, rep)),
    echo: sp.listenRepeat === true,
    // (v5.12.0 hostile review) echo is silently dead under infinite repeat
    // (onVerseEnded returns before the echo gate) while the UI arms both
    // chips independently. The snapshot names the conflict so the builder
    // can say so and the handler can refuse it — never a dead chip again.
    echoBlocked: rep === -1,
    compare: sp.compare === true,
    voiceBLabel: voiceB ? reciterShortLabel(voiceB, lang) : '',
    voiceALabel: reciterShortLabel(voiceA, lang),
    loop,
    loopNext: nextIn(LOOP_CYCLE_UI, loop),
    loopNextLabel: cycleLabel(nextIn(LOOP_CYCLE_UI, loop)),
    speed: Number(sp.speed) || 1,
    speedNext: nextIn(
      SPEED_CYCLE_UI,
      SPEED_CYCLE_UI.includes(Number(sp.speed)) ? Number(sp.speed) : 1
    ),
    // (v5.15.0, V5) base loudness for the slider (0–100 display).
    volumePct: Math.max(0, Math.min(100, Math.round(Number(audio.verseVolume ?? 1) * 100))),
    sleepEnabled: !!sleep?.enabled,
    sleepLabel: sleep?.label || '',
    paused: sp.paused === true,
    waiting: sp.waiting === true,
    // (v5.12.0) element mute mirror (M key) — passed in by hosts from
    // ephemeral state.ui (ui/ stays free of services/ per the layer note).
    muted: extra?.muted === true,
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
  // (UX-8, retired v5.10.8) icon-only buttons: shape carries the meaning and
  // every button keeps its aria-label + title. .rec-console-label never
  // paints at any width (components.css) — the spans stay in the DOM for
  // tests + screen-reader verbose modes only, and are aria-hidden.
  const wideLabel = (text) =>
    `<span class="rec-console-label" aria-hidden="true">${escapeHTML(text)}</span>`;
  const chip = (action, on, pressed, label, inner) =>
    `<button type="button" class="${cls.chip}${on ? ` ${cls.on}` : ''}" data-action="${action}"${pressed == null ? '' : ` aria-pressed="${pressed}"`} aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${inner}</button>`;
  // Mute chip: same builder helper, plus its keyboard equivalent exposed
  // to assistive tech (the global M handler lives in app/audioEngine.js).
  const muteChip = `<button type="button" class="${cls.chip}${snap.muted ? ` ${cls.on}` : ''}" data-action="audio-mute-toggle" aria-pressed="${snap.muted}" aria-keyshortcuts="m" aria-label="${escapeHTML(t(snap.muted ? 'audio.unmute' : 'audio.mute', lang))}" title="${escapeHTML(t(snap.muted ? 'audio.unmute' : 'audio.mute', lang))}">${icon(snap.muted ? 'volume-x' : 'volume', { size: 13 })} ${wideLabel(t(snap.muted ? 'audio.unmute' : 'audio.mute', lang))}</button>`;
  const navBtn = (action, label, glyph, shortText, titleText) =>
    `<button type="button" class="${cls.btn}" data-action="${action}" aria-label="${escapeHTML(label)}" title="${escapeHTML(titleText ?? label)}">${icon(glyph, { size: 16 })}${shortText ? wideLabel(shortText) : ''}</button>`;
  // (v5.12.0) blind-cycle cure: the repeat/loop chips name the current
  // rung AND the next one (aria + title) — the visible chip text is
  // untouched, so the compact row keeps its size on every host.
  const repeatLabel = t('audio.repeatNext', lang, { cur: snap.repLabel, next: snap.repNextLabel });
  const loopLabel = t('audio.loopNext', lang, {
    cur: cycleLabel(snap.loop),
    next: snap.loopNextLabel,
  });
  const speedLabel = t('audio.speedNext', lang, { cur: snap.speed, next: snap.speedNext });
  const voiceLabel = `${t('audio.chooseReciter', lang)} — ${snap.voiceALabel}${snap.voiceBLabel ? ` + ${snap.voiceBLabel}` : ''}`;
  // (v5.15.0, V5) verse loudness slider: continuous loudness stays a
  // slider while discrete hifz budgets stay chips (L2 steelman). Yields
  // under sleep — the fade tick owns the curve (same contract as the
  // file bar's disabled slider).
  const volTitle = snap.sleepEnabled ? t('audio.volumeSleep', lang) : t('audio.volume', lang);
  const volumeSlider = `
      <span class="rec-console-volume" role="group" aria-label="${escapeHTML(volTitle)}">${icon('volume', { size: 13 })}
        <input type="range" min="0" max="100" step="5" value="${snap.volumePct}" dir="ltr" data-bind="recite-volume" aria-label="${escapeHTML(volTitle)}" title="${escapeHTML(volTitle)}"${snap.sleepEnabled ? ' disabled aria-disabled="true"' : ''} />
      </span>`;
  const moreOpen = opts.moreOpen === true;
  // (v5.12.0 hostile review) book-order chevrons point right-to-left even
  // in English UI (UX-4 rule). RTL users need no explanation; LTR screen
  // readers hear the rule once in the name instead of reverse-engineering
  // every chevron. Titles stay short — tooltips are for sighted skimming.
  const orderName = (label) =>
    isRTL(lang) ? label : `${label}. ${t('mushaf.bookOrderNote', lang)}`;
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
      ${navBtn('recite-ayah-prev', orderName(t('audio.ayahPrev', lang)), 'chevronRight', t('audio.ayahPrev', lang), t('audio.ayahPrev', lang))}
      <button type="button" class="rec-console-play" data-action="recite-pause-toggle" aria-label="${t(snap.paused ? 'audio.play' : 'audio.pause', lang)}" title="${t(snap.paused ? 'audio.play' : 'audio.pause', lang)}">${icon(snap.paused ? 'play' : 'pause', { size: 24 })}${wideLabel(t(snap.paused ? 'audio.play' : 'audio.pause', lang))}</button>
      ${navBtn('recite-stop', t('audio.reciteStop', lang), 'stop')}
      ${navBtn('recite-ayah-next', orderName(t('audio.ayahNext', lang)), 'chevronLeft', t('audio.ayahNext', lang), t('audio.ayahNext', lang))}
      ${chip('recite-speed-cycle', false, null, speedLabel, `${snap.speed}×`)}
      ${chip('recite-voice-open', false, null, voiceLabel, `${icon('volume', { size: 13 })} <span class="rec-chip__text">${escapeHTML(snap.voiceALabel)}${snap.voiceBLabel ? `+${escapeHTML(snap.voiceBLabel)}` : ''}</span>`)}
      ${chip('recite-more-toggle', moreOpen, moreOpen, t('audio.moreSettings', lang), `${icon('menu', { size: 16 })} ${wideLabel(t('audio.moreSettings', lang))}`)}
  </div>
  <div class="rec-console-more${moreOpen ? ' rec-console-more--open' : ''}"${moreOpen ? '' : ' hidden'}>
      ${chip('recite-repeat-toggle', snap.rep !== 1, null, repeatLabel, `${icon('repeat', { size: 13 })} ${snap.repLabel}`)}
      ${chip('recite-follow-toggle', snap.follow, snap.follow, t('audio.follow', lang), `${icon(snap.follow ? 'eye' : 'eyeOff', { size: 14 })} ${wideLabel(t('audio.follow', lang))}`)}
      ${chip('recite-listen-toggle', snap.continuous, snap.continuous, t('audio.listenMode', lang), `${icon('play', { size: 13 })} ${t('audio.listen', lang)}`)}
      ${chip('recite-echo-toggle', snap.echo, snap.echo, snap.echoBlocked ? `${t('audio.echoMode', lang)} — ${t('audio.echoNeedsRepeat', lang)}` : t('audio.echoMode', lang), `${icon('volume', { size: 13 })} ${t('audio.echo', lang)}`)}
      ${snap.echoBlocked ? `<p class="rec-console-note" role="note">${escapeHTML(t('audio.echoNeedsRepeat', lang))}</p>` : ''}
      ${muteChip}
      ${volumeSlider}
      ${chip('recite-sleep-cycle', snap.sleepEnabled, null, t('audio.sleepTimer', lang), `${icon('bed', { size: 13 })}${snap.sleepEnabled ? ` <span class="rec-chip__text">${escapeHTML(snap.sleepLabel)}</span>` : ''}`)}
      ${chip('recite-compare-toggle', snap.compare, snap.compare, t('audio.compareMode', lang), `${icon('grid', { size: 13 })} ${t('audio.compare', lang)}`)}
      ${snap.voiceBLabel ? chip('recite-compare-swap', false, null, t('audio.compareSwap', lang), `${icon('refresh', { size: 13 })} ${wideLabel(t('audio.compareSwap', lang))}`) : ''}
      ${chip('recite-loop-toggle', snap.loop !== 1, null, loopLabel, `${icon('list', { size: 13 })} ${snap.loop === 1 ? t('audio.loop', lang) : `×${snap.loop}`}`)}
      ${chip('recite-mode-surah', false, null, t('audio.modeSurah', lang), `${icon('book', { size: 13 })} ${wideLabel(t('audio.modeSurah', lang))}`)}
  </div>`;
}

/** The "your turn" echo-wait banner, or '' — host supplies the class. */
export function recitationEchoHTML(snap, lang, echoClass) {
  if (snap.waiting !== true) return '';
  return `<div class="${echoClass}" role="status">${icon('volume', { size: 14 })} ${t('audio.yourTurn', lang)}</div>`;
}
