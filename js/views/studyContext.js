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

export function studyContextOf(state) {
  const p = state?.activeParams || {};
  const from = p.from === 'mushaf' || p.from === 'quran' ? p.from : null;
  const surah = Math.floor(Number(p.fromSurah));
  const ayah = Math.floor(Number(p.fromAyah));
  if (!from || !(surah >= 1 && surah <= 114) || !(ayah >= 1 && ayah <= 286)) return null;
  return { from, surah, ayah };
}

export function studyContextParams(surah, ayah, from = 'mushaf') {
  const s = Math.floor(Number(surah));
  const a = Math.floor(Number(ayah));
  if (!(s >= 1 && s <= 114) || !(a >= 1 && a <= 286)) return {};
  return { from, fromSurah: String(s), fromAyah: String(a) };
}

export function mergeStudyContextParams(params, state) {
  const ctx = studyContextOf(state);
  return ctx ? { ...params, ...studyContextParams(ctx.surah, ctx.ayah, ctx.from) } : params;
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
