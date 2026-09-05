/**
 * shareCard.js
 * Renders a dua / adhkar as a beautiful shareable image on a <canvas> —
 * the feature people expect from a devotional app: send the words
 * themselves, styled like the app, not a bare screenshot.
 *
 * Design: cream "paper" ground, the user's chosen palette for accents
 * (the card is personal), a double-rule frame with the app's signature
 * Khatim (8-point star) dividers, Amiri for the Arabic (bundled since
 * v2.8), and the system UI face for everything Latin. Height is computed
 * from the measured text so nothing is ever truncated — the Word is never
 * cut to fit.
 *
 * Pure layout helper (wrapText) takes an injected measure function, so it
 * is unit-testable without a canvas.
 */

import { pickLocale } from '../core/utils.js';
import { GRADE_LABELS, PALETTES } from '../core/config.js';

const CARD_WIDTH = 1080;
const MARGIN = 72;
const CONTENT_W = CARD_WIDTH - MARGIN * 2;

const INK = '#201F1A';
const MUTED = '#57554B';
const PAPER = '#FAF9F5';

/** Chip colors mirroring the grade tokens in variables.css. */
const GRADE_COLORS = Object.freeze({
  Quran: '#0F766E',
  Sahih: '#15803D',
  Hasan: '#0369A1',
  Daif: '#B45309',
  Athar: '#6D28D9',
  Custom: '#57534E',
  Unknown: '#78716C',
});

const UI = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const ARABIC_FONT = '700 62px Amiri, "Traditional Arabic", "Noto Naskh Arabic", serif';
const ARABIC_LINE = Math.round(62 * 1.95); // generous leading for diacritics

/**
 * Greedy word-wrap driven by an injected measure(str) → width function.
 * A single word wider than maxWidth is kept on its own line (never split);
 * empty/whitespace-only input yields no lines.
 */
export function wrapText(text, maxWidth, measure) {
  const src = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  if (!src) return [];
  const words = src.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (!line || measure(candidate) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ---- tiny color helpers (canvas has no color-mix) ---- */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** Blend a hex color toward white by `ratio` (0 = unchanged, 1 = white). */
export function tint(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c) => Math.round(c + (255 - c) * ratio);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The app's signature Khatim star: two squares, one rotated 45°. */
function drawKhatim(ctx, cx, cy, r, color, lineWidth = 3) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  for (const rot of [0, Math.PI / 4]) {
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  ctx.restore();
}

function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('700 62px Amiri', 'بِسْمِ اللَّهِ'),
    document.fonts.load('400 34px Amiri', 'بِسْمِ اللَّهِ'),
  ])
    .then(() => document.fonts.ready)
    .catch(() => {});
}

function referenceLine(item) {
  const ref = item?.reference || {};
  return [ref.collection, ref.hadith]
    .filter((s) => typeof s === 'string' && s.trim())
    .join(' ')
    .trim();
}

/**
 * Render the card. Returns a canvas sized to the content (never crops).
 * @param {object} params
 * @param {object} params.item normalized content item
 * @param {string} params.lang 'en' | 'ar'
 * @param {{primary:string, accent:string}} params.palette the user's palette
 * @param {boolean} [params.showTransliteration]
 * @param {boolean} [params.showTranslation]
 */
export async function renderDuaCardCanvas({
  item,
  lang,
  palette,
  showTransliteration = true,
  showTranslation = true,
}) {
  await fontsReady();

  const primary = palette?.primary || '#0F766E';
  const measureCtx = document.createElement('canvas').getContext('2d');
  const measureWith = (font) => (str) => {
    measureCtx.font = font;
    return measureCtx.measureText(str).width;
  };

  const title = pickLocale(item.title, lang) || '';
  const arabic = item.arabic || '';
  const translit = showTransliteration && item.transliteration ? item.transliteration : '';
  const translation = showTranslation && item.translation ? pickLocale(item.translation, lang) : '';
  const refLine = referenceLine(item);
  const gradeLabel = GRADE_LABELS[item.grade] ? pickLocale(GRADE_LABELS[item.grade], lang) : '';

  const titleLines = wrapText(title, CONTENT_W, measureWith(`700 40px ${UI}`));
  const arabicLines = wrapText(arabic, CONTENT_W, measureWith(ARABIC_FONT));
  const translitLines = wrapText(translit, CONTENT_W - 60, measureWith(`italic 400 31px ${UI}`));
  const translationLines = wrapText(translation, CONTENT_W - 40, measureWith(`400 33px ${UI}`));
  const refLines = refLine ? wrapText(refLine, CONTENT_W, measureWith(`600 26px ${UI}`)) : [];

  /* ---- measure-first layout: height follows content ---- */
  const center = CARD_WIDTH / 2;
  let y = 96;

  y += 10; // app name (Arabic) 44px Amiri + latin caption
  const appNameArY = y;
  y += 40 + 30;
  const appNameEnY = y;
  y += 46;

  if (titleLines.length) y += titleLines.length * 50 + 8;
  y += 64; // star divider zone
  const arabicY = y;
  y += Math.max(arabicLines.length * ARABIC_LINE, arabicLines.length ? ARABIC_LINE : 0) + 26;
  if (translitLines.length) y += translitLines.length * 45 + 24;
  if (translationLines.length) y += translationLines.length * 47 + 10;
  y += 34;
  const refY = y;
  y += refLines.length ? refLines.length * 38 : 0;
  const chipY = y;
  y += gradeLabel ? 74 : 18;
  y += 66; // bottom divider zone
  const footerY = y;
  y += 90;

  const height = Math.max(1200, y);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  /* ---- ground ---- */
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, height);

  /* ---- double frame ---- */
  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.strokeRect(44, 44, CARD_WIDTH - 88, height - 88);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, CARD_WIDTH - 116, height - 116);
  ctx.globalAlpha = 1;

  /* ---- header ---- */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = primary;
  ctx.font = '700 44px Amiri, "Traditional Arabic", serif';
  ctx.fillText('نور الذكر', center, appNameArY);
  ctx.font = `600 21px ${UI}`;
  ctx.fillStyle = MUTED;
  try {
    ctx.letterSpacing = '7px';
  } catch {
    /* older engines */
  }
  ctx.fillText('NŪR AL-DHIKR', center, appNameEnY);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    /* older engines */
  }

  if (titleLines.length) {
    ctx.font = `700 40px ${UI}`;
    ctx.fillStyle = INK;
    titleLines.forEach((ln, i) => ctx.fillText(ln, center, arabicY - 64 + i * 50));
  }
  drawKhatim(ctx, center, arabicY - 26, 13, primary, 2.5);

  /* ---- Arabic (RTL, centered) ---- */
  ctx.font = ARABIC_FONT;
  ctx.fillStyle = INK;
  ctx.direction = 'rtl';
  arabicLines.forEach((ln, i) => ctx.fillText(ln, center, arabicY + 62 + i * ARABIC_LINE));
  ctx.direction = 'ltr';

  let cursor = arabicY + Math.max(arabicLines.length, 1) * ARABIC_LINE + 26;

  /* ---- transliteration ---- */
  if (translitLines.length) {
    ctx.font = `italic 400 31px ${UI}`;
    ctx.fillStyle = MUTED;
    translitLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 31 + i * 45));
    cursor += translitLines.length * 45 + 24;
  }

  /* ---- translation ---- */
  if (translationLines.length) {
    ctx.font = `400 33px ${UI}`;
    ctx.fillStyle = INK;
    translationLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 33 + i * 47));
    cursor += translationLines.length * 47 + 10;
  }

  /* ---- reference + grade chip ---- */
  if (refLines.length) {
    ctx.font = `600 26px ${UI}`;
    ctx.fillStyle = MUTED;
    refLines.forEach((ln, i) => ctx.fillText(ln, center, refY + 26 + i * 38));
  }

  if (gradeLabel) {
    ctx.font = `600 26px ${UI}`;
    const tw = ctx.measureText(gradeLabel).width;
    const chipW = tw + 52;
    const chipH = 48;
    const gradeColor = GRADE_COLORS[item.grade] || GRADE_COLORS.Unknown;
    ctx.fillStyle = tint(gradeColor, 0.9);
    roundRectPath(ctx, center - chipW / 2, chipY + 8, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.fillStyle = gradeColor;
    ctx.fillText(gradeLabel, center, chipY + 41);
  }

  /* ---- footer ---- */
  drawKhatim(ctx, center, footerY - 26, 10, primary, 2);
  ctx.font = `600 25px ${UI}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(
    lang === 'ar'
      ? 'نور الذكر — رفيقك اليومي للذكر'
      : 'Nūr al-Dhikr — your daily companion for remembrance',
    center,
    footerY + 8
  );

  return canvas;
}

/** Filesystem-safe name for the exported PNG. */
export function cardFilename(item) {
  const id = String(item?.id || 'dua')
    .replace(/[^a-z0-9-]+/gi, '-')
    .slice(0, 60);
  return `nur-al-dhikr-${id}.png`;
}

/**
 * Render + export as a PNG blob.
 * @returns {Promise<Blob>}
 */
export async function generateCardBlob(item, state) {
  const settings = state.settings || {};
  const palette = PALETTES.find((p) => p.id === settings.palette) || PALETTES[0];
  const canvas = await renderDuaCardCanvas({
    item,
    lang: settings.language || 'en',
    palette,
    showTransliteration: settings.showTransliteration !== false,
    showTranslation: settings.showTranslation !== false,
  });
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
        'image/png'
      );
    } catch (err) {
      reject(err);
    }
  });
}

/** Trigger a plain download of the blob (fallback when Web Share is absent). */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/* ---- v3.24.0: the shareable AYAH card ---------------------------------- *
 * The TODO asked for exactly this shape: a clean, static image (Arabic +
 * translation + a subtle attribution) from any ayah — pure canvas, no
 * server round-trip. Same visual language as the dua card (paper ground,
 * double rule, Khatim stars, Amiri for Arabic), its own measure-first
 * layout, and RTL-aware translation drawing for RTL editions (Urdu). */

/**
 * Pure payload builder: validates and caps everything an ayah card needs.
 * Returns null when the essentials are missing — a card with no Arabic
 * text would be a lie, so callers fall back to the text share path.
 */
export function buildAyahCardPayload({
  surahNumber,
  ayahNumber,
  surahName,
  surahNameAr,
  arabic,
  translation,
  editionName,
  editionDir,
}) {
  const s = Math.floor(Number(surahNumber));
  if (!(s >= 1 && s <= 114)) return null;
  const a = Math.floor(Number(ayahNumber));
  if (!(a >= 1 && a <= 286)) return null;
  const ar = typeof arabic === 'string' ? arabic.replace(/\s+/g, ' ').trim().slice(0, 2000) : '';
  if (!ar) return null;
  const tr =
    typeof translation === 'string' ? translation.replace(/\s+/g, ' ').trim().slice(0, 2000) : '';
  return {
    surahNumber: s,
    ayahNumber: a,
    ref: `${s}:${a}`,
    surahName:
      String(surahName || '')
        .trim()
        .slice(0, 80) || `Surah ${s}`,
    surahNameAr: String(surahNameAr || '')
      .trim()
      .slice(0, 80),
    arabic: ar,
    translation: tr,
    editionName: String(editionName || '')
      .trim()
      .slice(0, 80),
    dir: editionDir === 'rtl' ? 'rtl' : 'ltr',
  };
}

/** Deterministic filename for an ayah card. */
export function ayahCardFilename(payload) {
  const s = Math.floor(Number(payload?.surahNumber)) || 0;
  const a = Math.floor(Number(payload?.ayahNumber)) || 0;
  return `nur-al-dhikr-surah-${s}-ayah-${a}.png`;
}

/**
 * Render the ayah card. Height follows the measured content — the ayah is
 * never cut to fit (same contract as the dua card).
 */
export async function renderAyahCardCanvas({ payload, lang, palette }) {
  await fontsReady();

  const primary = palette?.primary || '#0F766E';
  const measureCtx = document.createElement('canvas').getContext('2d');
  const measureWith = (font) => (str) => {
    measureCtx.font = font;
    return measureCtx.measureText(str).width;
  };

  const title = `${payload.surahName} \u00B7 ${payload.ref}`;
  const titleLines = wrapText(title, CONTENT_W, measureWith(`700 34px ${UI}`));
  const arabicLines = wrapText(payload.arabic, CONTENT_W, measureWith(ARABIC_FONT));
  const translationLines = payload.translation
    ? wrapText(payload.translation, CONTENT_W - 40, measureWith(`400 33px ${UI}`))
    : [];
  const editionLines = payload.editionName
    ? wrapText(`\u2014 ${payload.editionName}`, CONTENT_W, measureWith(`italic 400 27px ${UI}`))
    : [];

  const center = CARD_WIDTH / 2;
  let y = 96 + 10 + 40 + 30 + 46; // app header block (same rhythm as the dua card)

  if (titleLines.length) y += titleLines.length * 44 + 8;
  y += 64; // star divider zone
  y += Math.max(arabicLines.length, 1) * ARABIC_LINE + 26;
  if (translationLines.length) y += translationLines.length * 47 + 10;
  if (editionLines.length) y += editionLines.length * 38 + 8;
  y += 34;
  y += 66; // bottom divider zone
  const footerY = y;
  y += 90;

  const height = Math.max(1200, y);

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  /* ground + double frame */
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.strokeRect(44, 44, CARD_WIDTH - 88, height - 88);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, CARD_WIDTH - 116, height - 116);
  ctx.globalAlpha = 1;

  /* app header (same block, same geometry as the dua card) */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const appNameArY = 96 + 10;
  const appNameEnY = appNameArY + 40 + 30;
  ctx.font = '700 44px Amiri, "Traditional Arabic", serif';
  ctx.fillStyle = INK;
  ctx.fillText('نور الذكر', center, appNameArY);
  ctx.font = `600 21px ${UI}`;
  ctx.fillStyle = MUTED;
  try {
    ctx.letterSpacing = '7px';
  } catch {
    /* older engines */
  }
  ctx.fillText('NŪR AL-DHIKR', center, appNameEnY);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    /* older engines */
  }

  /* title: surah name + reference */
  let cursor = appNameEnY + 46;
  if (titleLines.length) {
    ctx.font = `700 34px ${UI}`;
    ctx.fillStyle = INK;
    titleLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 34 + i * 44));
    cursor += titleLines.length * 44 + 8;
  }
  drawKhatim(ctx, center, cursor + 26, 13, primary, 2.5);
  cursor += 64;

  /* Arabic (RTL, centered) */
  ctx.font = ARABIC_FONT;
  ctx.fillStyle = INK;
  ctx.direction = 'rtl';
  arabicLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 62 + i * ARABIC_LINE));
  ctx.direction = 'ltr';
  cursor += Math.max(arabicLines.length, 1) * ARABIC_LINE + 26;

  /* translation (dir-aware: Urdu and other RTL editions draw RTL) */
  if (translationLines.length) {
    ctx.font = `400 33px ${UI}`;
    ctx.fillStyle = INK;
    ctx.direction = payload.dir;
    translationLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 33 + i * 47));
    ctx.direction = 'ltr';
    cursor += translationLines.length * 47 + 10;
  }

  /* subtle attribution: the translation's author */
  if (editionLines.length) {
    ctx.font = `italic 400 27px ${UI}`;
    ctx.fillStyle = MUTED;
    editionLines.forEach((ln, i) => ctx.fillText(ln, center, cursor + 27 + i * 38));
    cursor += editionLines.length * 38 + 8;
  }

  /* footer */
  drawKhatim(ctx, center, footerY - 26, 10, primary, 2);
  ctx.font = `600 25px ${UI}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(
    lang === 'ar'
      ? 'نور الذكر — رفيقك اليومي للذكر'
      : 'Nūr al-Dhikr — your daily companion for remembrance',
    center,
    footerY + 8
  );

  return canvas;
}

/** Render + export an ayah card as a PNG blob. */
export async function generateAyahCardBlob(payload, state) {
  const settings = state.settings || {};
  const palette = PALETTES.find((p) => p.id === settings.palette) || PALETTES[0];
  const canvas = await renderAyahCardCanvas({
    payload,
    lang: settings.language || 'en',
    palette,
  });
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
        'image/png'
      );
    } catch (err) {
      reject(err);
    }
  });
}
