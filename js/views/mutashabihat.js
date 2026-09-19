/**
 * views/mutashabihat.js (v4.4)
 * Look-alike (mutashabihat) drill — a hifz practice mode for ayat that
 * resemble each other. Pairs are COMPUTED from the Qur'an text (see
 * domain/mutashabihat.js); nothing here is hand-curated, so the drill can
 * never drift from the actual text.
 *
 * Two modes in one view:
 *  - Drill: "which surah does this ayah belong to?" — the confusion the
 *    drill trains is exactly the pair it came from.
 *  - Study: the pair side by side with the shared run highlighted.
 */

import { t } from '../core/i18n.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import {
  buildSimilarPairs,
  buildDrillRound,
  diffWords,
  lapsedAyahKeys,
  filterLapsedPairs,
} from '../domain/mutashabihat.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

function surahName(state, n) {
  const meta = state.quran.meta?.surahs?.find((s) => s.number === Number(n));
  const lang = state.settings.language;
  return meta
    ? pickLocale({ en: meta.nameTransliteration || meta.nameEn, ar: meta.nameAr }, lang)
    : `Surah ${n}`;
}

function todaySeed() {
  const d = new Date();
  return d.getFullYear() + (d.getMonth() + 1) * 31 + d.getDate() * 7;
}

function drillBlock(state) {
  const lang = state.settings.language;
  const pairs = buildSimilarPairs(state.quran.surahs);
  if (!pairs.length) return '';
  const seed = state.mutashabihat.seed ?? todaySeed();
  const names = {};
  for (let i = 1; i <= 114; i++) names[i] = surahName(state, i);
  // (v5.2.75, UP-09) lapse-weighted pool: drills draw from pairs touching
  // ayahs with recorded lapses when the pool is selected (and non-trivial).
  const pool = state.mutashabihat.pool === 'lapsed' ? 'lapsed' : 'all';
  const lapseKeys = lapsedAyahKeys(state.hifzAyahRecords);
  const lapsedCount = filterLapsedPairs(pairs, lapseKeys).length;
  const round = buildDrillRound(pairs, { seed, surahNames: names, pool, lapseKeys });
  if (!round) return '';
  const { picked, reveal } = state.mutashabihat;
  const score = `${state.mutashabihat.right} / ${state.mutashabihat.right + state.mutashabihat.wrong}`;

  return `
  <section class="panel panel--drill">
    <div class="panel__header">
      <h2>${t('mutashabihat.drill', lang)}</h2>
      <span class="view__meta" dir="ltr" role="status">${score}</span>
    </div>
    <p class="panel__subtext">${t('mutashabihat.drillHint', lang)}</p>
    <div class="chip-row" role="group" aria-label="${t('mutashabihat.drill', lang)}">
      <button type="button" class="chip ${pool !== 'lapsed' ? 'chip--active' : ''}" data-action="mutashabihat-pool" data-pool="all" aria-pressed="${pool !== 'lapsed'}">${t('mutashabihat.poolAll', lang)}</button>
      ${
        lapsedCount >= 3
          ? `<button type="button" class="chip ${pool === 'lapsed' ? 'chip--active' : ''}" data-action="mutashabihat-pool" data-pool="lapsed" aria-pressed="${pool === 'lapsed'}">${t('mutashabihat.poolLapsed', lang, { n: lapsedCount })}</button>`
          : ''
      }
    </div>
    <p class="drill__ayah" lang="ar" dir="rtl">${escapeHTML(round.question.text)}</p>
    ${
      state.settings.showTranslation && round.question.translation
        ? `<p class="drill__translation" dir="auto">${escapeHTML(round.question.translation)}</p>`
        : ''
    }
    <div class="drill__options" role="group" aria-label="${t('mutashabihat.pickSurah', lang)}">
      ${round.options
        .map(
          (o) => `
      <button type="button" class="btn btn--ghost drill__option${
        reveal
          ? o.s === round.answer
            ? ' drill__option--right'
            : picked === o.s
              ? ' drill__option--wrong'
              : ''
          : ''
      }" data-action="mutashabihat-pick" data-surah="${o.s}" ${reveal ? 'disabled' : ''}>
        ${escapeHTML(o.name)}
      </button>`
        )
        .join('')}
    </div>
    ${
      reveal
        ? `
    <p class="drill__verdict" role="status">${
      picked === round.answer
        ? t('mutashabihat.correct', lang)
        : t('mutashabihat.incorrect', lang, { surah: surahName(state, round.answer) })
    }</p>
    <div class="drill__pair">
      <div class="drill__pair-item">
        <span class="drill__pair-ref">${escapeHTML(surahName(state, round.question.s))} ${round.question.s}:${round.question.a}</span>
        <p lang="ar" dir="rtl" class="drill__pair-text">${diffWords(
          round.question.text,
          round.sharedWords
        )
          .map(
            (w) =>
              `<span class="${w.shared ? 'drill__word--shared' : 'drill__word--diff'}">${escapeHTML(w.word)}</span>`
          )
          .join(' ')}</p>
      </div>
      <div class="drill__pair-item">
        <span class="drill__pair-ref">${escapeHTML(surahName(state, round.sibling.s))} ${round.sibling.s}:${round.sibling.a}</span>
        <p lang="ar" dir="rtl" class="drill__pair-text">${diffWords(
          round.sibling.text,
          round.sharedWords
        )
          .map(
            (w) =>
              `<span class="${w.shared ? 'drill__word--shared' : 'drill__word--diff'}">${escapeHTML(w.word)}</span>`
          )
          .join(' ')}</p>
      </div>
    </div>
    <p class="panel__subtext">${t('mutashabihat.sharedRunHint', lang)}</p>
    <button type="button" class="btn btn--primary btn--sm" data-action="mutashabihat-next">${t('mutashabihat.next', lang)}</button>`
        : ''
    }
  </section>`;
}

export function renderMutashabihat(state) {
  const lang = state.settings.language;
  // (v5.4.0 — ported from the v5.3.0 audit) the old gate demanded ALL 114
  // surah docs (or the full-text search index) before rendering anything
  // — on a partial bundle, or while a bulk preload fails offline, the
  // view sat on "Loading the Qur'an corpus…" forever: an offline-honesty
  // violation (APP-FLOW Law 4: never an infinite spinner, never a silent
  // fail). The drill only needs the docs ALREADY in memory — it computes
  // its pairs from them — so render whatever portion is loaded and say so.
  const loadedCount = Object.keys(state.quran.surahs || {}).length;
  if (loadedCount === 0) {
    const failed = Boolean(state.loadErrors?.['quran-corpus'] || state.loadErrors?.['quran-surah']);
    return `
    <section class="view view--mutashabihat">
      <h1 class="view__title">${t('mutashabihat.title', lang)}</h1>
      ${
        failed
          ? loadErrorStateHTML({ lang, tierKey: 'quran-corpus', t })
          : `<p class="empty-hint">${t('mutashabihat.loadingCorpus', lang)}</p>`
      }
    </section>`;
  }

  return `
  <section class="view view--mutashabihat">
    <h1 class="view__title">${t('mutashabihat.title', lang)}</h1>
    ${
      loadedCount < 114
        ? `<p class="panel__subtext">${t('mutashabihat.partial', lang, { n: loadedCount })}</p>`
        : ''
    }
    <p class="view__subtitle">${t('mutashabihat.subtitle', lang)}</p>
    ${
      drillBlock(state) ||
      emptyStateHTML({
        iconName: 'quran',
        title: t('mutashabihat.noPairs', lang),
        // (v5.12.1 UX audit S13) the back-to-Quran link lived outside the
        // empty block; folded in as its action (existing mushaf view).
        actionHTML: `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.MUSHAF)}" data-action="navigate" data-view="${VIEWS.MUSHAF}">${t('mutashabihat.backToQuran', lang)}</a>`,
      })
    }
  </section>`;
}
