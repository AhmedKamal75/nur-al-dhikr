/**
 * Shared Qur'an study context.
 * A related study surface may be entered from an exact ayah in the Mushaf.
 * Keep that origin in the URL so the learner can always return to the text
 * they were studying instead of relying on browser-history luck.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

/**
 * Accept a reference only when the canonical metadata can prove that the
 * ayah exists. A global 1–286 bound is insufficient: most surahs are shorter.
 * Missing metadata fails closed; callers that support context deep links
 * ensure this small metadata file has loaded before rendering the return link.
 */
function exactAyahReference(surah, ayah, meta) {
  const s = Number(surah);
  const a = Number(ayah);
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1) {
    return null;
  }
  const record = Array.isArray(meta?.surahs) ? meta.surahs.find((item) => item.number === s) : null;
  if (!Number.isInteger(record?.ayahCount) || a > record.ayahCount) return null;
  return { surah: s, ayah: a };
}

export function studyContextOf(state) {
  const p = state?.activeParams || {};
  const from = p.from === 'mushaf' || p.from === 'quran' ? p.from : null;
  const reference = exactAyahReference(p.fromSurah, p.fromAyah, state?.quran?.meta);
  return from && reference ? { from, ...reference } : null;
}

export function studyContextParams(surah, ayah, from = 'mushaf', meta = null) {
  if (from !== 'mushaf' && from !== 'quran') return {};
  const reference = exactAyahReference(surah, ayah, meta);
  return reference
    ? { from, fromSurah: String(reference.surah), fromAyah: String(reference.ayah) }
    : {};
}

/**
 * The inline Study Tray already has the exact ayah that opened it. Carry that
 * source into its journey links even when the reader URL itself has no ayah
 * context query parameters. Never infer an ayah from a Mushaf page number.
 */
function studyTrayContextOf(state) {
  const from =
    state?.activeView === VIEWS.MUSHAF
      ? 'mushaf'
      : state?.activeView === VIEWS.QURAN
        ? 'quran'
        : null;
  const tray = state?.studyTray;
  if (!from || !tray) return null;
  const reference = exactAyahReference(tray.surah, tray.ayah, state?.quran?.meta);
  return reference ? { from, ...reference } : null;
}

export function mergeStudyContextParams(params, state) {
  const ctx = studyContextOf(state) || studyTrayContextOf(state);
  return ctx
    ? { ...params, ...studyContextParams(ctx.surah, ctx.ayah, ctx.from, state?.quran?.meta) }
    : params;
}

export function wordStudyContextParams(state) {
  const from =
    state?.activeView === VIEWS.MUSHAF
      ? 'mushaf'
      : state?.activeView === VIEWS.QURAN
        ? 'quran'
        : null;
  if (from) {
    const active = state?.activeWordStudy;
    return active ? studyContextParams(active.surah, active.ayah, from, state?.quran?.meta) : {};
  }
  return mergeStudyContextParams({}, state);
}

export function studyContextHTML(state) {
  const ctx = studyContextOf(state);
  if (!ctx) return '';
  const lang = state?.settings?.language || 'en';
  const view = ctx.from === 'quran' ? VIEWS.QURAN : VIEWS.MUSHAF;
  const href = buildHash(view, {
    ...(ctx.from === 'quran'
      ? { id: String(ctx.surah), ay: String(ctx.ayah) }
      : { s: String(ctx.surah), ay: String(ctx.ayah) }),
  });
  const label = t('study.returnToAyah', lang, { s: ctx.surah, a: ctx.ayah });
  return `
    <aside class="study-context" aria-label="${escapeHTML(t('study.contextTitle', lang))}">
      <div class="study-context__copy">
        <span class="study-context__kicker">${escapeHTML(t('study.contextTitle', lang))}</span>
        <span class="study-context__ref" dir="ltr">${ctx.surah}:${ctx.ayah}</span>
      </div>
      <a class="study-context__back" href="${href}" data-action="navigate" data-view="${view}" ${ctx.from === 'quran' ? `data-id="${ctx.surah}" data-ay="${ctx.ayah}"` : `data-s="${ctx.surah}" data-ay="${ctx.ayah}"`}>
        ${icon(lang === 'ar' ? 'chevronRight' : 'chevronLeft', { size: 14 })}
        <span>${escapeHTML(label)}</span>
      </a>
    </aside>`;
}
