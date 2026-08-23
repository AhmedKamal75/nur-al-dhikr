/**
 * views/mushafReader.js
 * A page-by-page "book" reader matching the real, printed 604-page Madani
 * Mushaf: exact page boundaries (data/mushaf/*.json, derived from a public
 * page-accurate dataset — see CHANGELOG), a surah-name/juz header, a
 * Bismillah banner wherever a surah begins on the page, and Eastern
 * Arabic-Indic page numbering, the way the physical book is laid out. This
 * is a second, alternate way to browse the same Qur'an data the classic
 * list reader (views/quran.js) already shows — verse translations and
 * per-ayah detail live in a tap-triggered modal here rather than inline, to
 * keep the page itself visually faithful to a real Mushaf page.
 */
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { escapeHTML, pickLocale, toEasternArabicNumerals } from '../utils.js';
import { buildHash } from '../router.js';
import { clampPage, isFirstPage, isLastPage, ayahAudioUrl } from '../mushaf.js';
import { VIEWS } from '../config.js';

export function renderMushaf(state) {
  const lang = state.settings.language;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const meta = state.mushaf.meta;
  const pageDoc = state.mushaf.pages[String(page)];

  if (!meta || !pageDoc) {
    return `
    <section class="view view--mushaf">
      <div class="mushaf-loading">${icon('quran', { size: 32 })}<p>${t('mushaf.loading', lang)}</p></div>
    </section>`;
  }

  const headerChapter = pageDoc.chapters[0];
  const juzLabel = `${t('mushaf.juz', lang)} ${toEasternArabicNumerals(pageDoc.juz)}`;

  const chaptersHtml = pageDoc.chapters
    .map((chapter) => {
      const showBanner = chapter.startsHere;
      const showBismillah = chapter.startsHere && chapter.number !== 9;
      const banner = showBanner
        ? `
      <div class="mushaf-surah-banner">
        <span class="mushaf-surah-banner__name">${escapeHTML(chapter.titleAr)}</span>
      </div>
      ${showBismillah ? `<p class="mushaf-bismillah">\u0628ِ\u0633\u0652\u0645ِ \u0627\u0644\u0644\u0651\u064e\u0647ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645ِ</p>` : ''}
    `
        : '';

      const versesHtml = chapter.verses
        .map((v) => {
          const isBookmarked = !!state.mushafAyahBookmarks[`${chapter.number}:${v.number}`];
          return `<span class="mushaf-ayah ${isBookmarked ? 'mushaf-ayah--bookmarked' : ''}" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" tabindex="0" role="button" aria-label="${chapter.number}:${v.number}">${escapeHTML(v.text)}<span class="mushaf-ayah__marker">${isBookmarked ? `<span class="mushaf-ayah__star">${icon('star-filled', { size: 11 })}</span>` : ''}\uFD3F${toEasternArabicNumerals(v.number)}\uFD3E</span></span>`;
        })
        .join(' ');

      return `${banner}<span class="mushaf-verses">${versesHtml}</span>`;
    })
    .join(' ');

  return `
  <section class="view view--mushaf">
    <header class="mushaf-topbar">
      <a class="icon-btn" href="${buildHash(VIEWS.QURAN)}" data-action="navigate" data-view="${VIEWS.QURAN}" aria-label="${t('mushaf.backToList', lang)}">
        ${icon('chevronLeft', { size: 20 })}
      </a>
      <button type="button" class="mushaf-topbar__title" data-action="mushaf-open-jump">
        ${escapeHTML(pickLocale({ en: headerChapter.titleEn, ar: headerChapter.titleAr }, lang))} \u00B7 ${juzLabel}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-jump" aria-label="${t('mushaf.jumpTo', lang)}">
        ${icon('grid', { size: 18 })}
      </button>
    </header>

    <div class="mushaf-page-wrap">
      <article class="mushaf-page" dir="rtl" lang="ar">
        <div class="mushaf-page__text">${chaptersHtml}</div>
        <footer class="mushaf-page__footer">
          <span class="mushaf-page__number">${toEasternArabicNumerals(page)}</span>
        </footer>
      </article>
    </div>

    <nav class="mushaf-nav">
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-prev" ${isFirstPage(page) ? 'disabled' : ''} aria-label="${t('mushaf.prevPage', lang)}">
        ${icon('chevronRight', { size: 22 })}
      </button>
      <p class="mushaf-nav__hint">${t('mushaf.swipeHint', lang)}</p>
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-next" ${isLastPage(page) ? 'disabled' : ''} aria-label="${t('mushaf.nextPage', lang)}">
        ${icon('chevronLeft', { size: 22 })}
      </button>
    </nav>
  </section>`;
}

/** Jump-to-surah / jump-to-juz / jump-to-page drawer, opened in the shared modal. */
export function buildMushafJump(state) {
  const lang = state.settings.language;
  const meta = state.mushaf.meta;
  if (!meta) return `<p>${t('mushaf.loading', lang)}</p>`;

  const surahButtons = Object.entries(meta.chapterNames)
    .map(
      ([num, names]) => `
    <button type="button" class="mushaf-jump__surah" data-action="mushaf-jump-page" data-page="${meta.surahFirstPage[num] || 1}">
      <span class="mushaf-jump__surah-num">${num}</span>
      <span class="mushaf-jump__surah-name">${escapeHTML(pickLocale(names, lang))}</span>
    </button>`
    )
    .join('');

  const juzButtons = Object.entries(meta.juzFirstPage)
    .map(
      ([juzNum, page]) => `
    <button type="button" class="mushaf-jump__juz" data-action="mushaf-jump-page" data-page="${page}">${juzNum}</button>`
    )
    .join('');

  const bookmarkEntries = Object.values(state.mushafAyahBookmarks || {}).sort(
    (a, b) => (a.page || 0) - (b.page || 0)
  );
  const bookmarksSection = bookmarkEntries.length
    ? `
    <h3 class="mushaf-jump__heading">${t('mushaf.bookmarkedAyahs', lang)}</h3>
    <div class="mushaf-jump__bookmark-list">
      ${bookmarkEntries
        .map(
          (b) => `
      <div class="mushaf-jump__bookmark-row">
        <button type="button" class="mushaf-jump__bookmark-main" data-action="mushaf-jump-page" data-page="${b.page}">
          <span class="mushaf-jump__bookmark-surah">${escapeHTML(pickLocale(meta.chapterNames[String(b.surah)], lang))}</span>
          <span class="mushaf-jump__bookmark-ref" dir="ltr">${b.surah}:${b.ayah}</span>
        </button>
        <button type="button" class="icon-btn icon-btn--sm" data-action="mushaf-jump-remove-bookmark" data-surah="${b.surah}" data-ayah="${b.ayah}" aria-label="${t('common.delete', lang)}">
          ${icon('trash', { size: 14 })}
        </button>
      </div>`
        )
        .join('')}
    </div>`
    : '';

  return `
  <div class="mushaf-jump">
    <h2 id="modal-title-mushaf-jump">${t('mushaf.jumpTo', lang)}</h2>
    <form class="mushaf-jump__page-form" data-form="mushaf-jump-page">
      <label for="mushaf-jump-page-input">${t('mushaf.pageLabel', lang)}</label>
      <div class="mushaf-jump__page-row">
        <input type="number" id="mushaf-jump-page-input" name="page" min="1" max="604" inputmode="numeric" value="${state.mushafBookmark.page || 1}" />
        <button type="submit" class="btn btn--primary btn--sm">${t('mushaf.go', lang)}</button>
      </div>
    </form>
    ${bookmarksSection}
    <h3 class="mushaf-jump__heading">${t('mushaf.surahs', lang)}</h3>
    <div class="mushaf-jump__surah-list">${surahButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.juzSection', lang)}</h3>
    <div class="mushaf-jump__juz-list">${juzButtons}</div>
  </div>`;
}

/**
 * Per-ayah detail modal: Arabic (already on hand from the page data),
 * translation (from the classic reader's already-loaded surah data, if
 * available), play/copy/bookmark actions. `surahDoc` is
 * `state.quran.surahs[surah]` — the caller is responsible for making sure
 * it's loaded first so this stays a pure template function. `page` is the
 * Mushaf page the ayah was tapped from, carried along so the bookmark
 * entry can jump straight back here later.
 */
export function buildMushafAyahDetail(arabicText, surahDoc, surahNumber, ayahNumber, state, page) {
  const lang = state.settings.language;
  const ayah = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayahNumber));
  const audioUrl = ayahAudioUrl(
    state.quran.meta?.surahs,
    state.settings.reciter,
    surahNumber,
    ayahNumber
  );
  const key = `${surahNumber}:${ayahNumber}`;
  const isBookmarked = !!state.mushafAyahBookmarks[key];

  return `
  <div class="mushaf-ayah-detail">
    <h2 id="modal-title-mushaf-ayah" class="sr-only">${surahDoc ? escapeHTML(pickLocale({ en: surahDoc.nameEn, ar: surahDoc.nameAr }, lang)) : ''} ${surahNumber}:${ayahNumber}</h2>
    <p class="mushaf-ayah-detail__ref" dir="ltr">${surahNumber}:${ayahNumber}${surahDoc ? ` \u2014 ${escapeHTML(pickLocale({ en: surahDoc.nameEn, ar: surahDoc.nameAr }, lang))}` : ''}</p>
    <p class="mushaf-ayah-detail__arabic" dir="rtl" lang="ar">${escapeHTML(arabicText)}</p>
    ${ayah?.translation ? `<p class="mushaf-ayah-detail__translation">${escapeHTML(ayah.translation)}</p>` : ''}
    <div class="mushaf-ayah-detail__actions">
      <button type="button" class="btn btn--secondary btn--sm ${isBookmarked ? 'btn--active' : ''}" data-action="mushaf-toggle-ayah-bookmark" data-surah="${surahNumber}" data-ayah="${ayahNumber}" data-page="${page || ''}" aria-pressed="${isBookmarked}">
        ${icon(isBookmarked ? 'star-filled' : 'star', { size: 16 })} ${t(isBookmarked ? 'mushaf.bookmarked' : 'mushaf.bookmark', lang)}
      </button>
      ${
        audioUrl
          ? `
      <button type="button" class="btn btn--secondary btn--sm" data-action="play-ayah" data-url="${escapeHTML(audioUrl)}" data-key="${escapeHTML(key)}">
        ${icon('volume', { size: 16 })} ${t('mushaf.listen', lang)}
      </button>`
          : ''
      }
      <button type="button" class="btn btn--secondary btn--sm" data-action="mushaf-copy-ayah" data-text="${escapeHTML(arabicText)}" data-surah="${surahNumber}" data-ayah="${ayahNumber}">
        ${icon('copy', { size: 16 })} ${t('card.copy', lang)}
      </button>
    </div>
  </div>`;
}
