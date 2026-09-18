/**
 * surahPlayback.js
 * Continuous surah recitation: play a surah verse-by-verse with automatic
 * advance — the "listen to the whole surah and follow along" mode. Closes
 * the last Critical TODO item; works in BOTH reading modes (the classic
 * reader scrolls to the reciting ayah, the Mushaf flips pages to follow it).
 *
 * Design:
 *  - The engine is a small state machine over the SHARED single <audio>
 *    element in recitation.js (one voice in the whole app, ever). It drives
 *    recitation through a swappable driver so tests can inject a fake and
 *    simulate 'ended' events without any audio device.
 *  - Pure helpers (nextAyah, resolvePage) are exported for unit tests.
 *  - The engine knows nothing about the DOM or the store: app.js subscribes
 *    via onAyahChange() and mirrors progress into state.surahPlayback, and
 *    owns the follow-scroll / page-flip effects.
 *  - A session is surah-scoped: reaching the last ayah ends it (the Sunnah-
 *    standard behaviour every major app ships). Starting any other audio
 *    (full-surah player, single-ayah play) stops the session — one voice.
 */

import { ayahAudioUrl, globalAyahNumber } from './mushaf.js';
import { getVerseAudio } from './audioStore.js';
import {
  QURAN_RECITER_IDS,
  DEFAULT_RECITER,
  quranAudioUrl,
  VERSE_BITRATES,
} from '../core/config/quran.js';
import {
  driverPlay,
  driverStop,
  driverOnEnded,
  driverOnError,
  driverOffEnded,
  driverOffError,
  driverSetVolume,
  driverSetRate,
  driverPause,
  driverResume,
  driverHasEnded,
  driverPreload,
  onPreloadSample,
  lastPlaySwapped,
  prunePool,
} from './recitation.js';
import { SLEEP_TIMER_CHOICES, volumeAt, countdownLabel } from '../domain/sleepTimer.js';

export { SLEEP_TIMER_CHOICES };

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** Next ayah number within a surah, or null at the end (surah-scoped). */
export function nextAyah(ayah, total) {
  const a = Math.floor(Number(ayah));
  const t = Math.floor(Number(total));
  if (!Number.isFinite(a) || !Number.isFinite(t) || a < 1 || t < 1) return null;
  return a < t ? a + 1 : null;
}

/** Mushaf page holding a (surah, ayah), from mushaf-meta's ayahPages map. */
export function resolvePage(ayahPages, surah, ayah) {
  if (!ayahPages || typeof ayahPages !== 'object') return null;
  const page = ayahPages[`${Number(surah)}:${Number(ayah)}`];
  return Number.isInteger(page) && page >= 1 && page <= 604 ? page : null;
}

/** Stable key for an ayah, same shape recitation.js uses everywhere. */
export const ayahKey = (surah, ayah) => `${surah}:${ayah}`;

/* ------------------------------------------------------------------ */
/* (v5.9.0) Ayah-audio mirror chain                                    */
/*                                                                     */
/* A single CDN file can 404 (removed encoding) or fail CORS while     */
/* its siblings are fine — so each ayah resolves to an ORDERED         */
/* candidate list instead of one URL, and the engine walks it before   */
/* ever admitting failure:                                             */
/*   1. primary verse CDN @128kbps (cdn.islamic.network),              */
/*   2. same-CDN @64kbps mirror (a different encoding file),           */
/*   3. EveryAyah per-ayah mp3s (SSSAAA zero-padded) for mapped voices.*/
/* The EveryAyah subdir map is best-effort (verify live when touched): */
/* a wrong tertiary URL simply 404s and falls through to an honest     */
/* failure — it can never misroute audio, only cost one extra attempt. */
/* Full-surah audio is NOT in this chain: the verse session only falls */
/* back to a full-surah file when every ayah-level mirror has failed   */
/* (decided by the caller via onError, e.g. app/boot.js).              */
/* ------------------------------------------------------------------ */

const EVERAYAH_SUBDIR = Object.freeze({
  'ar.alafasy': 'Alafasy_128kbps',
  'ar.husary': 'Husary_128kbps',
  'ar.abdulbasitmurattal': 'Abdul_Basit_Murattal_192kbps',
  'ar.abdurrahmaansudais': 'Abdurrahmaan_As-Sudais_192kbps',
  'ar.mahermuaiqly': 'Maher_AlMuaiqly_64kbps',
  'ar.husarymujawwad': 'Husary_Mujawwad_128kbps',
  'ar.muhammadayyoub': 'Muhammad_Ayyoub_128kbps',
  'ar.muhammadjibreel': 'Muhammad_Jibreel_128kbps',
  'ar.hudhaify': 'Hudhaify_128kbps',
  'ar.ahmedajamy': 'Ahmed_ibn_Ali_al-Ajamy_128kbps',
  // (v5.10.8) tertiary mirrors HEAD-verified per voice (002255.mp3 probe).
  'ar.minshawi': 'Minshawy_Murattal_128kbps',
  'ar.shaatree': 'Abu_Bakr_Ash-Shaatree_128kbps',
  'ar.saoodshuraym': 'Saood_ash-Shuraym_128kbps',
  'ar.hanirifai': 'Hani_Rifai_192kbps',
  'ar.aymanswoaid': 'Ayman_Sowaid_64kbps',
  'ar.abdullahbasfar': 'Abdullah_Basfar_192kbps',
});

const pad3 = (n) => String(Math.floor(Number(n))).padStart(3, '0');

/**
 * Ordered streaming URLs for one ayah (primary → mirrors). Pure — the
 * engine and unit tests share this exact chain. Offline Blob playback
 * bypasses it (a stored file needs no mirror).
 */
export function verseAudioCandidates(reciterId, surah, ayah, globalNum) {
  const out = [];
  const g = Math.floor(Number(globalNum));
  if (Number.isFinite(g) && g >= 1) {
    const id = QURAN_RECITER_IDS.has(reciterId) ? reciterId : DEFAULT_RECITER;
    // (v5.10.8) per-voice bitrate ladder — voices missing a rung skip it
    // instead of burning a doomed fetch per ayah.
    const ladder = VERSE_BITRATES[id] || [128, 64];
    for (const b of ladder) out.push(quranAudioUrl(id, g, b));
  }
  const sub = EVERAYAH_SUBDIR[reciterId];
  const s = Math.floor(Number(surah));
  const a = Math.floor(Number(ayah));
  if (sub && s >= 1 && s <= 114 && a >= 1 && a <= 286) {
    out.push(`https://everyayah.com/data/${sub}/${pad3(s)}${pad3(a)}.mp3`);
  }
  return out;
}

/**
 * (v5.10.2) Download-ordered candidates for one ayah. Streaming
 * (verseAudioCandidates) leads with the primary CDN because the <audio>
 * element needs no CORS — but fetch() downloads DO, and the primary CDN
 * sends no Access-Control-Allow-Origin (every verse-pack fetch failed
 * with net::ERR_FAILED in a real browser). Downloads therefore lead
 * with the CORS-open EveryAyah mirror (verified `ACAO: *`) and keep the
 * primary URLs as fallback for contexts where CORS is open. Same
 * pure-in/pure-out contract as the streaming chain.
 */
export function verseDownloadCandidates(reciterId, surah, ayah, globalNum) {
  const stream = verseAudioCandidates(reciterId, surah, ayah, globalNum);
  const everyayah = stream.filter((u) => u.includes('everyayah.com'));
  const primary = stream.filter((u) => !u.includes('everyayah.com'));
  return [...everyayah, ...primary];
}

/**
 * Resolve queue item `queue[idx]` against the surah meta into playable
 * bounds { surah, from, end, total }, or null when the entry is junk
 * (bad surah number, unknown ayah count). Pure — shared by the advance
 * path and the prefetch peek so both agree on what "next" means.
 */
export function resolveQueueItem(queue, idx, surahsMeta) {
  if (!Array.isArray(queue)) return null;
  const item = queue[idx];
  if (!item || typeof item !== 'object') return null;
  const s = Math.floor(Number(item.surah));
  if (!Number.isFinite(s) || s < 1 || s > 114) return null;
  const meta = Array.isArray(surahsMeta) ? surahsMeta.find((m) => Number(m.number) === s) : null;
  const total = Math.floor(Number(meta?.ayahCount));
  if (!Number.isFinite(total) || total < 1) return null;
  const f = Math.floor(Number(item.from));
  const from = Number.isFinite(f) && f >= 1 && f <= total ? f : 1;
  const e = Math.floor(Number(item.to));
  const end = Number.isFinite(e) && e >= 1 && e <= total ? Math.max(e, from) : total;
  return { surah: s, from, end, total };
}

/** Identity of a queue's item sequence — lets views/handlers recognize
 *  which saved playlist a running session is playing (the engine holds
 *  items, not playlist ids). */
export function queueSignature(items) {
  if (!Array.isArray(items)) return '';
  return JSON.stringify(
    items.map((it) => [Number(it?.surah) || 0, Number(it?.from) || 0, Number(it?.to) || 0])
  );
}

/** Sanitize a caller-supplied queue into [{ surah, from, to }] (or null).
 *  Bounds clamp at load time against live meta — here we only keep the
 *  shape honest so hostile data-attributes can't smuggle strings in. */
export function normalizeQueue(queue) {
  if (!Array.isArray(queue) || !queue.length) return null;
  const out = [];
  for (const item of queue.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue;
    const s = Math.floor(Number(item.surah));
    if (!Number.isFinite(s) || s < 1 || s > 114) continue;
    out.push({
      surah: s,
      from: Math.floor(Number(item.from)) || 1,
      to: item.to == null ? null : Math.floor(Number(item.to)) || null,
    });
  }
  return out.length ? out : null;
}

/**
 * Per-ayah repeat budget (v3.17 hifz): how many times EACH ayah plays before
 * the session advances. 1 = off; 3/5/10 = that many plays; -1 = loop the
 * current ayah forever (the recite-next skip is the exit). The chip cycles
 * REPEAT_CYCLE; anything else normalizes to 1.
 */
export const REPEAT_CYCLE = [1, 3, 5, 10, -1];

export function normalizeRepeat(r) {
  return REPEAT_CYCLE.includes(r) ? r : 1;
}

export function nextRepeat(r) {
  const i = REPEAT_CYCLE.indexOf(normalizeRepeat(r));
  return REPEAT_CYCLE[(i + 1) % REPEAT_CYCLE.length];
}

/**
 * Range/surah loop (A–B loop ×N): how many times the WHOLE session bounds
 * play before the session closes. 1 = off; 2/3/5/10 = that many passes;
 * the chip cycles LOOP_CYCLE. Distinct from per-ayah `repeat`: loop ×3 on
 * a 1–10 range plays 1…10 three times (the memorization staple).
 */
export const LOOP_CYCLE = [1, 2, 3, 5, 10];

export function normalizeLoop(n) {
  const v = Math.floor(Number(n));
  return LOOP_CYCLE.includes(v) ? v : 1;
}

export function nextLoop(n) {
  const i = LOOP_CYCLE.indexOf(normalizeLoop(n));
  return LOOP_CYCLE[(i + 1) % LOOP_CYCLE.length];
}

/** Verse playback speed ladder (shared with the full-surah player's RATES).
 *  Anything finite clamps into 0.5–2 (the platform's sane range). */
export const VERSE_RATES = [1, 1.25, 1.5, 0.75];

export function normalizeSpeed(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, n));
}

export function nextSpeed(v) {
  const i = VERSE_RATES.indexOf(normalizeSpeed(v));
  return VERSE_RATES[(i + 1) % VERSE_RATES.length];
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

let session = null; // { surah, ayah, from, total, end, reciterId, reciterIdB, compare, comparePass, ranged, stopAt, surahsMeta, active, repeat, repeatsLeft, loop, loopsLeft, speed, continuous }
// Last surah that played to its natural end (bounds/roll/queue spent) —
// read once via consumeLastFinish() (kids-mode stars). Manual stops never
// set it; start() clears it.
let lastFinishSurah = null;

/** Take the pending natural-finish surah (or null) — single-read. */
export function consumeLastFinish() {
  const s = lastFinishSurah;
  lastFinishSurah = null;
  return s;
}
let ayahChangeCb = null; // (surah, ayah|null) — null = session over
let errorCb = null; // (surah, ayah) — verse audio failed

// (v5.2.0) Listen-and-repeat ("echo") mode: after each ayah finishes,
// the engine holds a silence for you to recite it back, then advances.
// `waitTimer` owns the pending advance; it is the ONLY timer in this
// module and is cleared on stop/skip/mode-off so a stale fire can never
// advance a dead or moved session (guarded by session token + key).
let waitTimer = null;
let waitToken = 0;
export const ECHO_PAUSE_MIN_MS = 3000;
export const ECHO_PAUSE_MAX_MS = 30000;
export const ECHO_PAUSE_DEFAULT_MS = 8000;

/* ------------------------------------------------------------------ */
/* (v5.10.4) Adaptive lookahead: how many upcoming ayahs to buffer.    */
/* One spare starves whenever a fetch outlasts the ayah being played   */
/* (measured live: a 12s stall on short ayahs). Instead of a           */
/* quota-eating synthetic speed test, the controller learns passively: */
/* every preload reports its preload-start → canplaythrough time (zero */
/* extra requests — the timing rides prefetches the player needed      */
/* anyway), folded into an EWMA; ayah durations come from the          */
/* session's own ended timestamps, and k itself is EWMA-smoothed       */
/* (k = α·k_prev + (1−α)·target: jumps up instantly on pain, glides    */
/* down gently on plenty).                                             */
/*   (v5.10.7) Bounds are now [2, 8], seed 5 — rationale, honestly:    */
/*   below 2 the controller cannot observe anything; above 8 the cure  */
/*   becomes the disease (each pooled fetch competes for the browser's */
/*   ~6 per-host connections, so a stampede throttles the AUDIBLE      */
/*   file, and ~150KB × N speculative buffers is real quota). Startup  */
/*   seeds 5 = main fetch + 5 spares saturating exactly a full         */
/*   connection window without queueing the first sound behind         */
/*   prefetches. The EWMA + smoothing do the adapting between.         */
/* ------------------------------------------------------------------ */
export const MAX_LOOKAHEAD = 8;
export const MIN_LOOKAHEAD = 2;
export const SEED_LOOKAHEAD = 5;
const NET_ALPHA = 0.3; // EWMA weight per preload sample
const AYAH_ALPHA = 0.2; // EWMA weight per played ayah
let netEwmaMs = null; // measured time-to-bufferable per file
let ayahEwmaMs = 6000; // measured play duration per ayah (neutral seed)
let playStampMs = 0; // when the current ayah started sounding
let samplesSubscribed = false;

/** EWMA step: pure, so tests pin the weighting exactly. */
export function ewmaUpdate(avg, sample, alpha) {
  const s = Math.floor(Number(sample));
  if (!Number.isFinite(s) || s < 0) return avg;
  // Null/undefined seeds from the sample; hostile avgs (NaN, negatives,
  // and null — Number(null) is 0, so == null must come first) reseed too.
  const a = avg == null || !Number.isFinite(Number(avg)) || avg < 0 ? s : avg;
  const w = Math.min(1, Math.max(0, Number(alpha)));
  return Math.round(a + w * (s - a));
}

/**
 * Lookahead depth from the fetch/ayah ratio. Unlearned network (no samples
 * yet — every session start) seeds SEED_LOOKAHEAD: the first sample only
 * arrives after the first spare completes, and short early ayahs starve
 * before that on slow links (measured live). Worst case the seed spends
 * ~4 extra files (~600KB) when the user stops within one ayah; a
 * continuing session consumes every warmed file, so there is no waste at
 * all on the common path. The EWMA takes over (usually down) as soon as
 * real samples land. Pure — tests pin the bands.
 */
export function lookaheadFor(netEwma, ayahEwma) {
  if (!Number.isFinite(Number(netEwma)) || netEwma <= 0) return SEED_LOOKAHEAD;
  const ayah = Number.isFinite(Number(ayahEwma)) && ayahEwma > 0 ? ayahEwma : 6000;
  // Depth follows need: each ayah consumes `ratio` ayahs-worth of fetch
  // time, so the buffer must hold more than `ratio` files to stay ahead.
  const ratio = netEwma / ayah;
  if (ratio > 4) return MAX_LOOKAHEAD;
  if (ratio > 2.5) return 5;
  if (ratio > 1.2) return 3;
  if (ratio > 0.5) return 2;
  return 1;
}

let kFloat = SEED_LOOKAHEAD; // smoothed depth — seeds 5, glides with samples
const K_SMOOTH_ALPHA = 0.5;

/**
 * (v5.10.5) Smooth k itself — k = α·k_prev + (1−α)·target — instead of
 * jumping band to band. Same EWMA family as the estimators, applied one
 * level up: when the measured ratio hovers on a band edge, the depth
 * glides instead of flapping 2↔3 every ayah (each flap pointlessly
 * re-warms and evicts). Converges in ~2 samples at α=0.5, so genuine
 * network shifts still track fast. Pure — tests pin convergence exactly.
 */
export function smoothK(prevK, target, alpha = K_SMOOTH_ALPHA) {
  const t = Math.max(1, Math.min(MAX_LOOKAHEAD, Math.floor(Number(target)) || 1));
  // Unseeded (null/undefined) takes the target; other hostile prevs clamp
  // through the float math below (null coerces to 0 via Number(), so the
  // == null check must come first — same trap ewmaUpdate had).
  const pk = prevK == null || !Number.isFinite(Number(prevK)) ? t : prevK;
  const w = Number.isFinite(Number(alpha)) ? Math.min(1, Math.max(0, Number(alpha))) : 0.5;
  return Math.max(1, Math.min(MAX_LOOKAHEAD, pk + w * (t - pk)));
}

/** Passive sample in (preload → canplaythrough ms). Exported for tests. */
export function notePreloadSample(ms) {
  netEwmaMs =
    netEwmaMs == null ? Math.floor(Number(ms)) || 0 : ewmaUpdate(netEwmaMs, ms, NET_ALPHA);
}

/** Test seam: reset the learned estimators between cases. */
export function resetPlaybackNetStatsForTests() {
  netEwmaMs = null;
  ayahEwmaMs = 6000;
  playStampMs = 0;
  kFloat = SEED_LOOKAHEAD;
  samplesSubscribed = false;
}

/** Clamp an echo pause into the sane window; garbage → default. */
export function normalizeEchoPause(ms) {
  const n = Math.floor(Number(ms));
  if (!Number.isFinite(n)) return ECHO_PAUSE_DEFAULT_MS;
  return Math.min(ECHO_PAUSE_MAX_MS, Math.max(ECHO_PAUSE_MIN_MS, n));
}

/* (v4.4) Sleep timer — listen mode fades out and stops after N minutes.
 * The pure math lives in domain/sleepTimer.js; this is the ticking half. */
let sleep = null; // { endsAtMs, minutes }
let sleepTick = null; // interval id

function applyVolumeNow() {
  const v = volumeAt(sleep ? { enabled: true, endsAtMs: sleep.endsAtMs } : null, Date.now());
  driverSetVolume(v);
  if (sleep && v <= 0) {
    clearSleepTimer();
    stop();
  }
}

/** Arm the listen-mode sleep timer (minutes from SLEEP_TIMER_CHOICES). */
export function armSleepTimer(minutes) {
  const m = SLEEP_TIMER_CHOICES.includes(minutes) ? minutes : 30;
  sleep = { minutes: m, endsAtMs: Date.now() + m * 60_000 };
  if (sleepTick) clearInterval(sleepTick);
  sleepTick = setInterval(applyVolumeNow, 1000);
  applyVolumeNow();
  return sleepSnapshot();
}

/** Cancel the sleep timer and restore full volume. */
export function clearSleepTimer() {
  sleep = null;
  if (sleepTick) clearInterval(sleepTick);
  sleepTick = null;
  driverSetVolume(1);
  return sleepSnapshot();
}

/** { enabled, minutes, endsAtMs, label } for the UI. */
export function sleepSnapshot() {
  if (!sleep) return { enabled: false, minutes: null, label: '' };
  return {
    enabled: true,
    minutes: sleep.minutes,
    label: countdownLabel({ enabled: true, endsAtMs: sleep.endsAtMs }, Date.now()),
  };
}

function notify(surah, ayah) {
  ayahChangeCb?.(surah, ayah);
}

/** Which reciter voice plays the CURRENT play (compare mode: pass 1 = voice B). */
export function currentReciterId() {
  if (!session) return null;
  if (session.compare === true && session.comparePass === 1 && session.reciterIdB)
    return session.reciterIdB;
  return session.reciterId;
}

function playCurrent(afterDispatch) {
  playCurrentSeq(afterDispatch);
}

let playSeq = 0;
let currentObjectUrl = null;

/** Revoke the previous play's object URL (never the CDN URL in flight). */
function dropObjectUrl() {
  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {
      /* already gone */
    }
    currentObjectUrl = null;
  }
}

/**
 * (v5.2.61) offline-first source resolution: a stored verse Blob wins and
 * plays from an object URL; anything else streams the CDN URL exactly as
 * before. Async with a sequence guard (player.js race discipline): a skip
 * landing mid-lookup drops the stale result — revoking its URL when it
 * created one — instead of double-playing.
 */
async function playCurrentSeq(afterDispatch) {
  const seq = ++playSeq;
  const reciter = currentReciterId();
  const g = globalAyahNumber(session.surahsMeta, session.surah, session.ayah);
  const mirrors = verseAudioCandidates(reciter, session.surah, session.ayah, g);
  const cdnUrl = mirrors[0] || null;
  let url = cdnUrl;
  let owned = null;
  if (g != null && reciter) {
    try {
      const blob = await getVerseAudio(reciter, g);
      if (blob) {
        owned = URL.createObjectURL(blob);
        url = owned;
      }
    } catch {
      /* storage failure reads as streaming */
    }
  }
  if (!session || seq !== playSeq) {
    if (owned) {
      try {
        URL.revokeObjectURL(owned);
      } catch {
        /* already gone */
      }
    }
    return;
  }
  // A new ayah or a new voice always restarts from the primary mirror;
  // repeats/echoes of the same ayah+voice keep the working mirror.
  const playKey = ayahKey(session.surah, session.ayah);
  if (session.lastPlayKey !== playKey || session.lastPlayReciter !== reciter) {
    session.mirrorIdx = 0;
    session.lastPlayKey = playKey;
    session.lastPlayReciter = reciter;
  }
  // Streaming (no offline copy): walk the mirror chain from the session's
  // current position — a retry after a dead primary resumes mid-chain.
  if (!owned) {
    url = mirrors[Math.min(session.mirrorIdx || 0, mirrors.length - 1)] || null;
  }
  if (!url) {
    failSession();
    return;
  }
  dropObjectUrl();
  currentObjectUrl = owned;
  session.paused = false;
  session.streamUrl = owned ? null : url;
  driverSetRate(session.speed);
  // (v5.10.4) duration stamp for the ayah EWMA (gap controller input):
  // taken at dispatch, so render + lookup overhead never inflates it.
  playStampMs = Date.now();
  // (v5.10.6) dispatched-play counter: the fast-up rule needs to tell a
  // session's first cold start (expected miss) from mid-session misses.
  session.plays = (session.plays || 0) + 1;
  driverPlay(url, ayahKey(session.surah, session.ayah));
  // (v5.10.6) deterministic audio-first: the highlight/store mirror runs
  // only AFTER the play call is dispatched, so no render can ever delay
  // the handoff. Callers without a mirror pass nothing (replays whose
  // key never changes, cold starts that want instant visual feedback).
  if (typeof afterDispatch === 'function') {
    try {
      afterDispatch();
    } catch (err) {
      console.error('[surah-playback] post-dispatch hook failed', err);
    }
  }
  prefetchNext();
}

/**
 * Pause mid-ayah (the missing pause button): the element freezes in place
 * and resume() continues it — no restart, no lost position. Pausing also
 * cancels a pending echo wait (resuming replays the ayah instead of
 * waking into silence). Natural 'ended' events can't fire while paused,
 * so the session can never advance underneath a pause.
 */
export function pause() {
  if (!session || !session.active || session.paused) return snapshot();
  clearEchoWait();
  session.paused = true;
  driverPause();
  notify(session.surah, session.ayah);
  return snapshot();
}

/** Resume a paused session: continue the frozen ayah in place. If the
 *  element already played through (pause landed in an echo wait), replay
 *  the ayah fresh instead of waking into another silence. */
export function resume() {
  if (!session || !session.active || !session.paused) return snapshot();
  session.paused = false;
  if (driverHasEnded()) playCurrent();
  else driverResume();
  notify(session.surah, session.ayah);
  return snapshot();
}

/**
 * Gapless handoff: while the current ayah plays, buffer the NEXT audio
 * file on the driver's hot spare so the advance swaps onto already-loaded
 * media — no fetch, no decode wait, no pipeline spin-up at the boundary.
 * Best-effort only — never throws, never plays. Drivers without a preload
 * slot (unit-test fakes) skip warming silently; the pure URL half lives in
 * peekNextUrl() so tests still assert the prefetch target without audio.
 */

/** The audio URL the engine will need NEXT (compare B-pass, repeat, or advance). */
export function peekNextUrl() {
  const t = peekNextTriple();
  if (!t) return null;
  return ayahAudioUrl(session.surahsMeta, t.reciter, t.surah, t.ayah);
}

/**
 * (v5.2.61) the triple behind peekNextUrl ({reciter, surah, ayah} or
 * null) — the offline-first prefetch needs the identity, not just the
 * URL, to probe storage before warming.
 */
function peekNextTriple() {
  if (!session || !session.active) return null;
  if (session.compare === true && session.comparePass === 0 && session.reciterIdB) {
    return { reciter: session.reciterIdB, surah: session.surah, ayah: session.ayah };
  }
  if (session.repeat === -1 || (session.repeat > 1 && session.repeatsLeft > 1)) {
    return { reciter: currentReciterId(), surah: session.surah, ayah: session.ayah };
  }
  const next = nextAyah(session.ayah, session.end);
  if (next != null) {
    return {
      reciter:
        session.compare === true && session.reciterIdB ? session.reciterId : currentReciterId(),
      surah: session.surah,
      ayah: next,
    };
  }
  const blockedPast = session.stopAt && session.surah + 1 > session.stopAt.surah;
  if (session.continuous === true && !session.ranged && session.surah < 114 && !blockedPast) {
    const meta = session.surahsMeta?.find((m) => Number(m.number) === session.surah + 1);
    const nextTotal = Math.floor(Number(meta?.ayahCount));
    if (Number.isFinite(nextTotal) && nextTotal >= 1) {
      return { reciter: session.reciterId, surah: session.surah + 1, ayah: 1 };
    }
  }
  if (session.loop > 1 && session.loopsLeft > 1) {
    return { reciter: session.reciterId, surah: session.surah, ayah: session.from };
  }
  if (Array.isArray(session.queue)) {
    for (let i = session.qIndex + 1; i < session.queue.length; i++) {
      const r = resolveQueueItem(session.queue, i, session.surahsMeta);
      if (r) return { reciter: session.reciterId, surah: r.surah, ayah: r.from };
    }
  }
  return null;
}

/**
 * (v5.10.4) The next-k triples for adaptive lookahead — plain sequential
 * listening ONLY (same surah bounds, plus the continuous roll). Repeat,
 * compare, queue, loop and echo modes keep the single-triple behavior
 * (their futures branch — warming guesses would waste quota), signaled
 * by returning [] so the caller falls back to peekNextTriple().
 */
export function peekNextTriples(k) {
  const want = Math.max(1, Math.min(MAX_LOOKAHEAD, Math.floor(Number(k)) || 1));
  if (!session || !session.active) return [];
  if (
    session.compare === true ||
    session.repeat !== 1 ||
    Array.isArray(session.queue) ||
    session.loop > 1 ||
    session.listenRepeat === true
  )
    return [];
  const out = [];
  let s = session.surah;
  let a = session.ayah;
  const end = session.end;
  for (let i = 0; i < want; i++) {
    const nx = nextAyah(a, end);
    if (nx != null) {
      a = nx;
    } else {
      // End of bounds: roll only under the exact advanceSurah gates.
      if (!(session.continuous === true && !session.ranged && s < 114)) break;
      if (session.stopAt && s + 1 > session.stopAt.surah) break;
      const meta = session.surahsMeta?.find((m) => Number(m.number) === s + 1);
      const t = Math.floor(Number(meta?.ayahCount));
      if (!Number.isFinite(t) || t < 1) break;
      s += 1;
      a = 1;
    }
    // Never warm past a cross-surah stop point.
    if (
      session.stopAt &&
      (s > session.stopAt.surah || (s === session.stopAt.surah && a > session.stopAt.ayah))
    )
      break;
    out.push({ reciter: currentReciterId(), surah: s, ayah: a });
  }
  return out;
}

function prefetchNext() {
  // (v5.10.6) fast-up on starvation: the just-dispatched play missed the
  // pool on a streaming file past the session's first ayah — the network
  // sagged faster than samples can report it. Assume fetch ≥ 1.5× ayah
  // NOW instead of re-stalling to learn it (one stall max, never a
  // series). Blob plays and first-ayah cold starts are not congestion.
  if (session?.active && !lastPlaySwapped()) {
    const blobPlay = !session.streamUrl && !!currentObjectUrl;
    if (!blobPlay && (session.plays || 0) > 1) {
      const floor = Math.round(ayahEwmaMs * 1.5);
      if (!Number.isFinite(netEwmaMs) || netEwmaMs < floor) netEwmaMs = floor;
    }
  }
  // (v5.10.7) lower bound 2: below it the controller cannot observe
  // anything (no spare ever completes to sample from). Complex sessions
  // keep their single triple below — their futures branch, so warming
  // guesses there would burn quota for nothing.
  const target = lookaheadFor(netEwmaMs, ayahEwmaMs);
  const alpha = target > kFloat ? 1 : 0.5;
  kFloat = smoothK(kFloat, target, alpha);
  const k = Math.max(MIN_LOOKAHEAD, Math.min(MAX_LOOKAHEAD, Math.round(kFloat)));
  let triples = k > 1 ? peekNextTriples(k) : [];
  if (!triples.length) {
    const single = peekNextTriple();
    triples = single ? [single] : [];
  }
  for (const triple of triples) warmTriple(triple);
  // Evict anything the new horizon no longer needs (skips/seeks must not
  // leave stale fetches burning quota).
  try {
    prunePool(triples.map((t) => ayahAudioUrl(session.surahsMeta, t.reciter, t.surah, t.ayah)));
  } catch {
    /* best-effort */
  }
}

/** Warm one upcoming triple (offline probe first — stored needs nothing). */
function warmTriple(triple) {
  const url = ayahAudioUrl(session.surahsMeta, triple.reciter, triple.surah, triple.ayah);
  if (!url) return;
  // (v5.2.61) offline-first prefetch: a stored next ayah needs no warming
  // (local reads are instant) — warm the CDN URL only when nothing is
  // stored, so no object URL is ever created just to prefetch.
  const g = globalAyahNumber(session.surahsMeta, triple.surah, triple.ayah);
  if (g == null || !triple.reciter) {
    driverPreload(url);
    return;
  }
  getVerseAudio(triple.reciter, g)
    .then((blob) => {
      if (!blob) driverPreload(url);
    })
    .catch(() => driverPreload(url));
}

function failSession() {
  const { surah, ayah } = session ?? {};
  // Error callbacks run BEFORE stop() resets state: handlers (e.g. the
  // first-ayah full-surah fallback in app/boot.js) still see the live
  // mirror (ayah === from) when deciding what to do.
  errorCb?.(surah, ayah);
  stop();
}

export function isActive() {
  return !!(session && session.active);
}

/** Snapshot for UI state: { active, surah, ayah, total, end, repeat,
 *  continuous, listenRepeat, waiting, reciterId, reciterIdB, compare,
 *  loop, speed } | inactive. `total` reports the EFFECTIVE end (the range
 *  bound when a range is playing) so progress readouts show x/range.
 *  `waiting` is the echo-mode "your turn" pause. */
export function snapshot() {
  if (!session)
    return {
      active: false,
      surah: null,
      ayah: null,
      total: 0,
      end: 0,
      repeat: 1,
      continuous: false,
      listenRepeat: false,
      waiting: false,
      reciterId: null,
      reciterIdB: null,
      compare: false,
      loop: 1,
      speed: 1,
      queue: null,
      qIndex: null,
      stopAt: null,
      paused: false,
      from: null,
    };
  return {
    active: session.active,
    surah: session.surah,
    ayah: session.ayah,
    from: session.from,
    total: session.end,
    end: session.end,
    repeat: session.repeat,
    continuous: session.continuous === true,
    listenRepeat: session.listenRepeat === true,
    waiting: session.waiting === true,
    reciterId: session.reciterId || null,
    reciterIdB: session.reciterIdB || null,
    compare: session.compare === true,
    loop: session.loop,
    speed: session.speed,
    queue: Array.isArray(session.queue) ? session.queue : null,
    qIndex: session.qIndex,
    stopAt: session.stopAt ? { ...session.stopAt } : null,
    paused: session.paused === true,
  };
}

/**
 * Start (or restart) a session. `from` defaults to ayah 1. `to` (v5.0.0)
 * optionally bounds the session to an ayah RANGE — the session ends
 * (or rolls to the next surah in listen mode) at `to` instead of the
 * surah's last ayah. Stopping any previous session first — there is
 * exactly one engine and one voice.
 */
export function start({
  surah,
  from = 1,
  to = null,
  total,
  reciterId,
  reciterIdB = null,
  compare = false,
  surahsMeta,
  repeat = 1,
  loop = 1,
  speed = 1,
  queue = null,
  qIndex = 0,
  stopAt = null,
}) {
  stop();
  const s = Math.floor(Number(surah));
  const t = Math.floor(Number(total));
  const f = Math.floor(Number(from));
  const e = Math.floor(Number(to));
  if (!Number.isFinite(s) || s < 1 || s > 114) throw new Error('surah out of range');
  if (!Number.isFinite(t) || t < 1) throw new Error('total out of range');
  // (v5.0.0) the range end: clamped into [from, total] so a hostile
  // data-attribute can never invent an ayah. Cross-surah stop (a LATER
  // surah) is resolved first: `to` is the END surah's ayah, not this
  // surah's — using it here chopped the starting leg (1:6→2:2 played only
  // 1:6). The starting surah always plays through to its last ayah.
  const crossSurah = (() => {
    const ss = Math.floor(Number(stopAt?.surah));
    return Number.isFinite(ss) && ss > s && ss <= 114;
  })();
  const end = crossSurah
    ? t
    : Number.isFinite(e) && e >= 1 && e <= t
      ? Math.max(e, Number.isFinite(f) && f >= 1 ? f : 1)
      : t;
  // Voice ids outside the verse CDN namespace would 404 per ayah — coerce.
  const b = typeof reciterIdB === 'string' && QURAN_RECITER_IDS.has(reciterIdB) ? reciterIdB : null;
  const startAyah = Number.isFinite(f) && f >= 1 && f <= t ? f : 1;
  // Cross-surah stop: { surah, ayah } the session must not play past.
  // Same-surah folds into `end`; a later surah auto-enables listen mode so
  // the session actually rolls there; an earlier surah is ignored.
  let stopPoint = null;
  {
    const ss = Math.floor(Number(stopAt?.surah));
    const sa = Math.floor(Number(stopAt?.ayah));
    if (Number.isFinite(ss) && ss >= 1 && ss <= 114 && Number.isFinite(sa) && sa >= 1) {
      if (ss === s) stopPoint = { surah: ss, ayah: sa };
      else if (ss > s) stopPoint = { surah: ss, ayah: sa };
    }
  }
  lastFinishSurah = null;
  // Same-surah stopAt folds into the end bound (never before `from`).
  const finalEnd =
    stopPoint && stopPoint.surah === s ? Math.max(startAyah, Math.min(end, stopPoint.ayah)) : end;
  session = {
    surah: s,
    ayah: startAyah,
    from: startAyah,
    total: t,
    end: finalEnd,
    // A bounded range (to < total) never rolls into the next surah —
    // "play 1–10 continuously" means repeat/stop at 10, not wander on.
    // (A cross-surah stopAt is the exception: it auto-enables the roll.)
    ranged: stopPoint && stopPoint.surah > s ? false : finalEnd < t,
    stopAt: stopPoint,
    reciterId: QURAN_RECITER_IDS.has(reciterId) ? reciterId : DEFAULT_RECITER,
    reciterIdB: b,
    compare: compare === true && !!b,
    comparePass: 0,
    surahsMeta: Array.isArray(surahsMeta) ? surahsMeta : null,
    active: true,
    repeat: normalizeRepeat(repeat),
    loop: normalizeLoop(loop),
    loopsLeft: normalizeLoop(loop),
    speed: normalizeSpeed(speed),
    queue: normalizeQueue(queue),
    qIndex: Number.isFinite(Math.floor(Number(qIndex))) ? Math.floor(Number(qIndex)) : 0,
    paused: false,
    // (v5.9.0) mirror-chain position for the CURRENT ayah's streaming
    // URLs — reset to the primary on every ayah/voice change, advanced
    // by onVerseFailed until the chain is spent.
    mirrorIdx: 0,
    streamUrl: null,
    // Cross-surah stopAt rolls surah-to-surah on its own — listen mode is
    // implied so the session actually travels there.
    continuous: !!(stopPoint && stopPoint.surah > s),
    // (v5.2.0) echo mode starts off; the toggle owns it mid-session.
    listenRepeat: false,
    waiting: false,
    echoPauseMs: ECHO_PAUSE_DEFAULT_MS,
  };
  session.repeatsLeft = session.repeat;
  // Register on the CURRENT driver each start — the driver can be swapped
  // (tests inject fakes; production always uses the real audio element).
  driverOnEnded(onVerseEnded);
  driverOnError(onVerseFailed);
  // (v5.10.4) passive throughput learning, once per module lifetime:
  // preload timings feed the lookahead EWMA. Real elements only ever
  // report; test fakes never fire canplaythrough, so suites stay silent.
  if (!samplesSubscribed) {
    samplesSubscribed = true;
    onPreloadSample(notePreloadSample);
  }
  notify(s, session.ayah);
  playCurrent();
  return snapshot();
}

/** (v4.4) Listen mode: keep playing surah after surah until stopped. */
export function setContinuous(enabled) {
  if (!session) return snapshot();
  session.continuous = enabled === true;
  return snapshot();
}

/**
 * (v5.2.0) Listen-and-repeat ("echo") mode: after each ayah's repeat
 * budget finishes, hold `pauseMs` of silence for the listener to recite
 * it back, then advance. Turning it off (or stopping/skipping) cancels a
 * pending pause immediately. While waiting, snapshot().waiting is true so
 * the console can show the "your turn" state.
 */
export function setListenRepeat(on, pauseMs = ECHO_PAUSE_DEFAULT_MS) {
  if (!session) return snapshot();
  clearEchoWait();
  session.listenRepeat = on === true;
  session.waiting = false;
  if (on === true) session.echoPauseMs = normalizeEchoPause(pauseMs);
  return snapshot();
}

function clearEchoWait() {
  if (waitTimer) clearTimeout(waitTimer);
  waitTimer = null;
  waitToken += 1;
  if (session) session.waiting = false;
}

/**
 * Live-set the bounds loop (A–B loop ×N) mid-session — restarts the pass
 * counter so the new budget applies from the next boundary, predictably.
 */
export function setLoop(n) {
  if (!session) return snapshot();
  clearEchoWait();
  session.loop = normalizeLoop(n);
  session.loopsLeft = session.loop;
  return snapshot();
}

/**
 * Live-set the verse playback speed (0.5–2). Applies instantly to the
 * running element — no restart, no lost position.
 */
export function setSpeed(v) {
  if (!session) return snapshot();
  session.speed = normalizeSpeed(v);
  driverSetRate(session.speed);
  prefetchNext();
  return snapshot();
}

/**
 * Load the next resolvable queue item after the current one (skipping junk
 * entries). Returns true and starts playing it, or false when the queue is
 * spent — the caller then stops the session.
 */
function advanceQueue() {
  if (!session || !session.active || !Array.isArray(session.queue)) return false;
  for (let i = session.qIndex + 1; i < session.queue.length; i++) {
    const r = resolveQueueItem(session.queue, i, session.surahsMeta);
    if (!r) continue;
    session.qIndex = i;
    session.surah = r.surah;
    session.ayah = r.from;
    session.from = r.from;
    session.total = r.total;
    session.end = r.end;
    session.ranged = r.end < r.total;
    session.repeatsLeft = session.repeat;
    session.loopsLeft = session.loop;
    session.comparePass = 0;
    playCurrent(() => notify(r.surah, r.from));
    return true;
  }
  return false;
}

/** Advance one ayah inside the session (shared by natural + echo paths). */
function advanceAyah() {
  const next = nextAyah(session.ayah, session.end);
  if (next == null) {
    // A bounded range never rolls on, even in listen mode.
    if (session.continuous && !session.ranged && advanceSurah()) return;
    // Loop armed with passes left: restart the bounds at `from` (a manual
    // skip-past-end still ends the session — only natural play loops).
    if (session.loop > 1 && session.loopsLeft > 1) {
      session.loopsLeft -= 1;
      session.ayah = session.from;
      session.repeatsLeft = session.repeat;
      session.comparePass = 0;
      playCurrent(() => notify(session.surah, session.from));
      return;
    }
    // A queued range list rolls into its next resolvable item.
    if (advanceQueue()) return;
    lastFinishSurah = session.surah;
    stop(); // surah-scoped: last ayah ends the session (notifies null)
    return;
  }
  // (v5.10.4) audio-first: kick off the next file BEFORE the store
  // dispatch + full re-render, so a heavy view rebuild can never hold
  // the handoff hostage. Sound leads the highlight by milliseconds —
  // imperceptible, and strictly better than the reverse.
  session.ayah = next;
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  playCurrent(() => notify(session.surah, next));
}

/** Advance the session to the next surah (listen mode + skip-past-end). */
function advanceSurah() {
  if (!session || !session.active) return false;
  if (session.surah >= 114) {
    lastFinishSurah = session.surah;
    stop();
    return false;
  }
  const nextS = session.surah + 1;
  // A cross-surah stopAt blocks rolling past its surah.
  if (session.stopAt && nextS > session.stopAt.surah) {
    lastFinishSurah = session.surah;
    stop();
    return false;
  }
  const meta = session.surahsMeta?.find((m) => Number(m.number) === nextS);
  const nextTotal = Math.floor(Number(meta?.ayahCount));
  if (!Number.isFinite(nextTotal) || nextTotal < 1) {
    lastFinishSurah = session.surah;
    stop();
    return false;
  }
  session.surah = nextS;
  session.ayah = 1;
  // The new surah owns its own bounds: total AND end both reset, so a
  // 7-ayah Fatiha rolling into 286-ayah Baqarah plays all 286 (and a long
  // surah rolling into a short one can never invent ayahs past its end).
  // Rolling INTO the stopAt surah clamps the end to the stop ayah.
  session.total = nextTotal;
  if (session.stopAt && nextS === session.stopAt.surah) {
    session.end = Math.max(1, Math.min(nextTotal, session.stopAt.ayah));
    session.ranged = session.end < nextTotal;
  } else {
    session.end = nextTotal;
    session.ranged = false;
  }
  session.from = 1;
  session.comparePass = 0;
  session.repeatsLeft = session.repeat;
  // In listen mode the loop budget applies per surah, then rolls on.
  session.loopsLeft = session.loop;
  playCurrent(() => notify(nextS, 1));
  return true;
}

/**
 * Live-switch the reciter voice mid-session (the "always the same reciter"
 * fix): updates the session voice and restarts the CURRENT ayah with it,
 * so the change is audible instantly instead of on the next manual play.
 * A compare B-voice switch restarts the current pass the same way.
 */
export function setReciter(reciterId) {
  if (!session) return snapshot();
  const id = QURAN_RECITER_IDS.has(reciterId) ? reciterId : session.reciterId;
  if (!id || id === session.reciterId) return snapshot();
  clearEchoWait();
  session.reciterId = id;
  session.comparePass = 0;
  playCurrent(() => notify(session.surah, session.ayah));
  return snapshot();
}

/** Live-set voice B for compare mode (restarts the current ayah when comparing). */
export function setReciterB(reciterIdB) {
  if (!session) return snapshot();
  const b = typeof reciterIdB === 'string' && QURAN_RECITER_IDS.has(reciterIdB) ? reciterIdB : null;
  session.reciterIdB = b;
  if (!b) session.compare = false;
  clearEchoWait();
  session.comparePass = 0;
  if (session.active) {
    playCurrent(() => notify(session.surah, session.ayah));
  }
  return snapshot();
}

/**
 * Compare-two-reciters mode: each ayah plays with voice A then the SAME
 * ayah with voice B before the session advances (× repeat budget). Needs a
 * B voice; turning it on without one is a no-op that reports off.
 */
export function setCompare(on) {
  if (!session) return snapshot();
  clearEchoWait();
  const next = on === true && !!session.reciterIdB;
  session.compare = next;
  session.comparePass = 0;
  if (session.active) {
    playCurrent(() => notify(session.surah, session.ayah));
  }
  return snapshot();
}

/** Stop the session (user tap, other audio starting, engine failure). */
export function stop() {
  if (!session) return;
  clearEchoWait();
  dropObjectUrl();
  const wasActive = session.active;
  session = null;
  // (B3) unregister the session handlers: with listener sets (not a
  // single slot) the engine must clean up after itself, or every start
  // would stack another onVerseFailed on the shared element.
  driverOffEnded(onVerseEnded);
  driverOffError(onVerseFailed);
  driverStop();
  if (wasActive) notify(null, null);
}

/** Live-toggle follow-highlight (the eye chip) mid-session. */
export function setFollow(enabled) {
  if (session) session.follow = enabled === true;
}

export function follow() {
  return session ? session.follow !== false : true;
}

/** Live-set the per-ayah repeat budget mid-session (also restarts the
 *  current ayah's loop budget — predictable, no hidden remainder). */
export function setRepeat(r) {
  if (!session) return snapshot();
  const wasWaiting = session.waiting === true;
  clearEchoWait();
  session.repeat = normalizeRepeat(r);
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  if (wasWaiting) {
    // A budget change mid-pause restarts the current ayah immediately —
    // leaving the session parked in silence with no timer would strand it.
    playCurrent(() => notify(session.surah, session.ayah));
  }
  return snapshot();
}

/**
 * Manual navigation inside a session (the repeat chip's exit hatches):
 * skip(+1) next ayah, skip(-1) previous — clamped to the surah; skipping
 * past the last ayah ends the session (surah-scoped, like natural play).
 * A skip resets the current ayah's repeat budget.
 */
export function skip(delta) {
  if (!session || !session.active) return snapshot();
  clearEchoWait();
  const d = Math.sign(Math.floor(Number(delta)) || 0);
  if (d === 0) return snapshot();
  const target = session.ayah + d;
  if (target > session.end) {
    if (session.continuous && !session.ranged && advanceSurah()) return snapshot();
    if (advanceQueue()) return snapshot();
    stop();
    return snapshot();
  }
  session.ayah = Math.max(1, target);
  session.repeatsLeft = session.repeat;
  session.comparePass = 0;
  playCurrent(() => notify(session.surah, session.ayah));
  return snapshot();
}

export function onAyahChange(cb) {
  ayahChangeCb = cb;
}

export function onError(cb) {
  errorCb = cb;
}

function onVerseEnded(finishedKey) {
  if (!session || !session.active) return;
  if (finishedKey !== ayahKey(session.surah, session.ayah)) return; // stale ended
  // (v5.10.4) ayah-duration sample for the EWMA: natural ends only (the
  // key guard above already excludes stale/foreign ends), noise-clamped.
  if (playStampMs > 0) {
    const dur = Date.now() - playStampMs;
    if (dur >= 300 && dur <= 300000) ayahEwmaMs = ewmaUpdate(ayahEwmaMs, dur, AYAH_ALPHA);
  }
  // Compare mode: voice A just finished → the SAME ayah with voice B plays
  // next (no budget consumed); voice B just finished → fall through to the
  // repeat/advance logic below with a fresh A-pass.
  if (session.compare === true && session.reciterIdB) {
    if (session.comparePass === 0) {
      session.comparePass = 1;
      playCurrent();
      return;
    }
    session.comparePass = 0;
  }
  // Hifz repeat budget: -1 loops the ayah forever; N plays it N times
  // before advancing. Loop replays keep the same key, so a stale 'ended'
  // from a previous ayah can never trigger a bogus replay.
  if (session.repeat === -1) {
    playCurrent();
    return;
  }
  if (session.repeat > 1 && session.repeatsLeft > 1) {
    session.repeatsLeft -= 1;
    playCurrent();
    return;
  }
  // (v5.2.0) echo pause: hold silence for the recite-back BEFORE leaving
  // the ayah. The token + key guard means only the pause scheduled by THIS
  // ayah's end can advance it — a stop/skip/mode-off in between wins.
  if (session.listenRepeat === true && nextAyah(session.ayah, session.end) != null) {
    const token = waitToken;
    const key = ayahKey(session.surah, session.ayah);
    session.waiting = true;
    notify(session.surah, session.ayah);
    waitTimer = setTimeout(() => {
      waitTimer = null;
      if (!session || !session.active || token !== waitToken) return;
      if (ayahKey(session.surah, session.ayah) !== key) return;
      session.waiting = false;
      advanceAyah();
    }, session.echoPauseMs);
    return;
  }
  advanceAyah();
}

function onVerseFailed() {
  if (!session || !session.active) return;
  // (v5.9.0) mirror walk: the failed URL is dead (404/CORS/drop) — try
  // the next candidate for the SAME ayah before admitting failure. The
  // offline Blob path never reaches here (a stored file cannot 404), so
  // mirrorIdx only advances over streaming URLs.
  if (!currentObjectUrl) {
    const reciter = currentReciterId();
    const g = globalAyahNumber(session.surahsMeta, session.surah, session.ayah);
    const mirrors = verseAudioCandidates(reciter, session.surah, session.ayah, g);
    const next = (session.mirrorIdx || 0) + 1;
    if (next < mirrors.length) {
      session.mirrorIdx = next;
      console.warn('[surahPlayback] ayah mirror fallback', {
        ayah: ayahKey(session.surah, session.ayah),
        mirror: next,
        url: mirrors[next],
      });
      playCurrent();
      return;
    }
    console.error('[surahPlayback] all ayah mirrors failed', {
      ayah: ayahKey(session.surah, session.ayah),
      tried: mirrors.length,
    });
  }
  failSession();
}
