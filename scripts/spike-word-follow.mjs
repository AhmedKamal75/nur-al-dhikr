#!/usr/bin/env node
/**
 * scripts/spike-word-follow.mjs — (v5.11.0 B) word-level follow feasibility
 * spike. Question: can the app highlight words in time with audio without
 * an API key, a proxy, or inventing timings?
 *
 * What it probes (all WITHOUT credentials — a 401/403 anywhere below is
 * the "auth wall" outcome and the verdict says so honestly):
 *   1. api.quran.com verse words (do we get per-word identity keyless?),
 *   2. ?audio=<recitation> segments (per-word [pos, startMs, endMs] for
 *      quran.com's OWN ayah files — keyless? which recitations?),
 *   3. the audio file host (reachable? CORS-open for fetch() downloads?
 *      Range-requestable for scrubbing?),
 *   4. coverage spot-checks (short/long/first/last verses, not just 2:255).
 *
 * Pure helpers (parseSegments, audioFileUrl, classifyVerdict) are exported
 * for unit tests — they are the exact shapes a future word-follow engine
 * would consume, pinned before any playback code promises anything.
 *
 * Usage: node scripts/spike-word-follow.mjs   (needs internet; ~30s)
 */
import { setTimeout as delay } from 'node:timers/promises';

export const API_BASE = 'https://api.quran.com/api/v4';
export const AUDIO_HOST = 'https://audio.qurancdn.com';

/** Absolute, validated audio URL from an api `audio.url` relative path. */
export function audioFileUrl(relative) {
  if (typeof relative !== 'string' || !relative) return null;
  // Belt-and-braces: refuse absolute URLs, traversal, and non-mp3 — the
  // field is third-party data and feeds an <audio> src downstream.
  if (/^(https?:)?\/\//i.test(relative) || relative.includes('..')) return null;
  if (!/^[A-Za-z0-9_+/().-]+\.mp3$/.test(relative)) return null;
  return `${AUDIO_HOST}/${relative}`;
}

/**
 * Normalize raw `audio.segments` ([seq, pos1, startMs, endMs]) into
 * [{ pos, startMs, endMs }]. Hostile rows (short, non-numeric, negative,
 * end <= start) are DROPPED, never repaired — a future highlighter must
 * show honest absence for an uncovered word, never a guessed span.
 */
export function parseSegments(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw.slice(0, 500)) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const pos = Math.floor(Number(row[1]));
    const startMs = Math.floor(Number(row[2]));
    const endMs = Math.floor(Number(row[3]));
    if (!Number.isFinite(pos) || pos < 1) continue;
    if (!Number.isFinite(startMs) || startMs < 0) continue;
    if (!Number.isFinite(endMs) || endMs <= startMs) continue;
    out.push({ pos, startMs, endMs });
  }
  return out;
}

/**
 * Verdict from probe evidence. Feasible ONLY when words + segments + a
 * playable, CORS-open, range-capable audio file are ALL keyless — and even
 * then ONLY for quran.com's own files: segment timings are measured
 * against one specific encoding and must never drive another CDN's bytes.
 */
export function classifyVerdict(ev) {
  const e = ev && typeof ev === 'object' ? ev : {};
  const reasons = [];
  if (!e.wordsKeyless) reasons.push('words endpoint needs auth');
  if (!e.segmentsKeyless) reasons.push('segments need auth');
  if (!e.audioReachable) reasons.push('ayah audio unreachable keyless');
  if (!e.audioCorsOpen) reasons.push('audio host blocks fetch() (no CORS)');
  if (!e.audioRangeOk) reasons.push('audio host ignores Range (no scrub/seek)');
  if (!e.coverageOk) reasons.push('segments missing on spot-checked verses');
  return {
    feasible: reasons.length === 0,
    reasons,
    conditions:
      reasons.length === 0
        ? [
            'play quran.com files only (audio.qurancdn.com) with their own segments',
            'restrict voices to segment-backed recitations (overlap with the 16 verse voices is partial)',
            'bundle segments as a data pack (offline-first) instead of hot-querying 6236 endpoints',
            'never apply one encoding\u2019s timings to another CDN\u2019s audio',
          ]
        : [],
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, status: res.status, body: await res.json() };
}

async function probeAudio(url) {
  const out = { reachable: false, corsOpen: false, rangeOk: false };
  try {
    const head = await fetch(url, { method: 'HEAD' });
    out.reachable = head.ok;
    const acao = head.headers.get('access-control-allow-origin');
    out.corsOpen = acao === '*';
  } catch {
    return out;
  }
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
    out.rangeOk = r.status === 206;
    await r.arrayBuffer().catch(() => null);
  } catch {
    /* HEAD already told us reachability */
  }
  return out;
}

async function main() {
  const evidence = {
    wordsKeyless: false,
    segmentsKeyless: false,
    segmentRecitations: [],
    audioReachable: false,
    audioCorsOpen: false,
    audioRangeOk: false,
    coverageOk: false,
  };
  // 1. Words, keyless.
  const words = await getJson(`${API_BASE}/verses/by_key/2:255?words=true&word_fields=text_uthmani`);
  evidence.wordsKeyless =
    words.ok && Array.isArray(words.body?.verse?.words) && words.body.verse.words.length > 0;
  console.log('words keyless:', evidence.wordsKeyless);
  // 2. Segments across a recitation sample (ids from /resources/recitations).
  const recitations = await getJson(`${API_BASE}/resources/recitations`);
  const ids = (recitations.body?.recitations || []).slice(0, 12).map((r) => r.id);
  for (const id of ids) {
    const v = await getJson(`${API_BASE}/verses/by_key/2:255?audio=${id}`);
    const segs = v.body?.verse?.audio;
    const parsed = parseSegments(segs?.segments);
    if (v.ok && parsed.length > 0) {
      evidence.segmentRecitations.push({
        id,
        url: segs.url,
        words: parsed.length,
      });
    }
    await delay(300); // stay polite to the free API
  }
  evidence.segmentsKeyless = evidence.segmentRecitations.length > 0;
  console.log('segment-backed recitations (sample):', JSON.stringify(evidence.segmentRecitations));
  // 3. Audio host: HEAD + CORS + Range on the first VALIDATED file
  // (some recitations answer protocol-relative mirror URLs, which
  // audioFileUrl() refuses — probe the first absolute qurancdn file).
  const playable = evidence.segmentRecitations.find((r) => audioFileUrl(r.url));
  if (playable) {
    const absolute = audioFileUrl(playable.url);
    console.log(`audio file (recitation ${playable.id}):`, absolute);
    if (absolute) {
      const p = await probeAudio(absolute);
      evidence.audioReachable = p.reachable;
      evidence.audioCorsOpen = p.corsOpen;
      evidence.audioRangeOk = p.rangeOk;
    }
  }
  console.log('audio reachable/CORS/range:', evidence.audioReachable, evidence.audioCorsOpen, evidence.audioRangeOk);
  // 4. Coverage spot-checks on one segment-backed recitation.
  if (playable) {
    const audioId = playable.id;
    let ok = 0;
    for (const key of ['1:1', '2:286', '36:58', '114:1']) {
      const v = await getJson(`${API_BASE}/verses/by_key/${key}?audio=${audioId}`);
      if (parseSegments(v.body?.verse?.audio?.segments).length > 0) ok += 1;
      await delay(300);
    }
    evidence.coverageOk = ok === 4;
    console.log(`coverage: ${ok}/4 spot verses have segments`);
  }
  const verdict = classifyVerdict(evidence);
  console.log('VERDICT:', JSON.stringify({ ...evidence, ...verdict }, null, 2));
  if (!verdict.feasible) process.exitCode = 1;
}

const isMain = process.argv[1]?.endsWith('spike-word-follow.mjs');
if (isMain) {
  main().catch((err) => {
    console.error('spike failed:', err?.message || err);
    process.exitCode = 2;
  });
}
