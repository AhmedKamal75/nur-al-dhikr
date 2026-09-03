/**
 * views/mushafReader.js
 * The 604-page Madani Mushaf, rendered the way a REAL printed mushaf
 * looks (v4.4 "paper mushaf" redesign, modeled on the calm green/gold
 * language of the popular Azkar/Freezikr family of apps):
 *
 *   - a double illuminated frame with corner flourishes around the page,
 *   - a surah-name cartouche and a juz medallion in the top margins,
 *   - in-flow surah header bands + gilded Bismillah where a surah starts,
 *   - Eastern Arabic-Indic ayah-end markers ۝ and the printed sajda mark ۩
 *     at the fifteen mawadi' as-sujud,
 *   - the page number in an ornamental medallion at the foot, and
 *   - a paper-texture vignette so the page reads as PAPER, not a panel.
 *
 * This is the app's DEFAULT Qur'an reading experience; the classic list
 * reader (views/quran.js) stays one tap away in both directions, and
 * every study feature (translation tray, tafsir, word study, tajweed,
 * bookmarks, khatma, recitation, hifz entry, search, reciters) is
 * reachable from HERE as well as from there.
 *
 * (v4.4) TRUE fullscreen: `mushafFullscreen` makes the book fill the
 * entire viewport — width AND height — with every piece of app chrome
 * hidden, an animated expand/collapse transition, auto-fading controls,
 * keyboard page-turns and a screen wake lock. The handler owns the side
 * effects; this module stays a pure string template.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { clamp, escapeHTML, pickLocale, toEasternArabicNumerals } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import {
  clampPage,
  isFirstPage,
  isLastPage,
  isSajdaAyah,
  ayahAudioUrl,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
  juzEighth,
} from '../services/mushaf.js';
import { planStatus, justCompletedKhatma } from '../domain/khatma.js';
import { VIEWS, MUSHAF_PAGE_COUNT, MUSHAF_FONTS, MUSHAF_PAPERS } from '../core/config.js';
import { renderAyahWords, buildAyahStudyExtras } from './tafsirPanel.js';
import { tajweedPrefsOf } from '../domain/tajweed.js';
import { skeletonMushafPage, skeletonLines } from '../ui/skeleton.js';
import { emptyStateHTML, loadErrorStateHTML } from '../ui/emptyState.js';

/** (v4.5.2) "Arabic for Arabic, English for English" in the mushaf CHROME:
 *  the banner, the medallions, the fullscreen counter and the jump
 *  drawer are UI chrome and follow the interface language — Western
 *  digits in English, Eastern in Arabic. The page ornaments that are
 *  part of the Arabic mushaf itself (ayah-end markers ﴿١﴾, the page
 *  number, the surah cartouche count) stay Eastern always, because they
 *  ARE the mushaf, whatever language its reader speaks. */
const numFor = (lang, n) => (lang === 'ar' ? toEasternArabicNumerals(n) : String(n));

/** (v4.5.2) Arabic plural grammar for the ayah-count lines: 3–10 takes
 *  the plural (آيات), everything above takes the singular (آية) — “١١٠
 *  آيات” was wrong Arabic on 100+ surah headers. */
function ayahCountPhrase(n, lang) {
  if (lang === 'ar') {
    const word = n >= 3 && n <= 10 ? 'آيات' : 'آية';
    return `${toEasternArabicNumerals(n)} ${word}`;
  }
  return `${n} ayahs`;
}

/**
 * Which direction the page should animate in from, set by app.js right
 * before it dispatches a mushaf-prev/mushaf-next/swipe navigation. Read
 * (and consumed) exactly once by the next renderMushaf() call — the same
 * single-use transient-state pattern as the fullscreen animation below.
 */
let flipDirection = null;
export function setFlipDirection(dir) {
  flipDirection = dir;
}

/**
 * (v4.4) One-shot fullscreen transition direction: 'in' when entering
 * fullscreen (the page blooms out to fill the viewport), 'out' when
 * leaving (it settles back into its windowed column). Consumed once per
 * render, exactly like flipDirection.
 */
let fullscreenAnim = null;
export function setFullscreenAnim(dir) {
  fullscreenAnim = dir;
}

export function renderMushaf(state) {
  const lang = state.settings.language;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const meta = state.mushaf.meta;
  const pageDoc = state.mushaf.pages[String(page)];
  const prefs = state.settings.mushafPrefs;
  const font = MUSHAF_FONTS.find((f) => f.id === prefs.font) || MUSHAF_FONTS[0];
  const paper = MUSHAF_PAPERS.find((p) => p.id === prefs.paper) || MUSHAF_PAPERS[0];
  const fullscreen = state.mushafFullscreen === true;
  // Defense-in-depth (review v3.3 B1): prefs arrive sanitized from the
  // store, but never interpolate a raw settings value into a style
  // attribute — coerce to a clamped number so even a future code path
  // that skips sanitization cannot break out of the attribute.
  const mushafScale = clamp(Number(prefs.fontScale) || 1, 0.8, 1.6);
  const mushafLineScale = clamp(Number(prefs.lineSpacing) || 1, 0.85, 1.3);
  // Bookmark lookup set — built once per render, O(1) per ayah.
  const bookmarkedKeys = new Set(state.ayahBookmarks.map((b) => b.key));
  const dir = flipDirection;
  flipDirection = null; // single-use: consumed by this render
  const fsAnim = fullscreenAnim;
  fullscreenAnim = null;

  /* ---------------------------------------------------------------- */
  /* (v4.5) Double-page spread: on a wide viewport the book opens like  */
  /* a printed mushaf on a desk — page N on the right, N+1 facing it    */
  /* on the left. `page` (from the URL) may be either page of the pair; */
  /* the spread always renders from its right-hand (odd) page.          */
  /* ---------------------------------------------------------------- */
  const spread = mushafSpreadActive(prefs);
  const rightPage = spread ? spreadRightPage(page) : page;
  const leftPage = spread ? spreadLeftPage(rightPage) : null;
  const rightDoc = spread ? state.mushaf.pages[String(rightPage)] : pageDoc;
  const leftDoc = leftPage != null ? state.mushaf.pages[String(leftPage)] : null;

  if (!meta || !rightDoc) {
    // v4.1: a failed fetch renders an error + Retry — the skeleton used to
    // shimmer forever with no way forward.
    const failedTier = !meta ? 'mushaf-meta' : 'mushaf-page';
    if (state.loadErrors?.[failedTier]) {
      return `
    <section class="view view--mushaf">
      <div class="mushaf-loading">${loadErrorStateHTML({ lang, tierKey: failedTier, t })}</div>
    </section>`;
    }
    return `
    <section class="view view--mushaf">
      <div class="mushaf-loading">${skeletonMushafPage(lang)}</div>
    </section>`;
  }

  const headerChapter = rightDoc.chapters[0];
  const headerName = pickLocale({ en: headerChapter.titleEn, ar: headerChapter.titleAr }, lang);
  const juzLabel = juzLabelFor(meta, rightPage, rightDoc.juz, lang);

  const chaptersOf = (doc) =>
    doc.chapters
      .map((chapter) => {
        const showBanner = chapter.startsHere;
        const showBismillah = chapter.startsHere && chapter.number !== 9;
        // The printed mushaf announces a new surah with a header band:
        // an ornament-framed cartouche carrying the surah name, flanked by
        // decorative diamonds, with the Bismillah in gilded calligraphy
        // beneath it wherever the surah opens.
        const banner = showBanner
          ? `
      <div class="mushaf-surah-banner" role="heading" aria-level="2">
        <span class="mushaf-surah-banner__flank" aria-hidden="true">◆</span>
        <span class="mushaf-surah-banner__frame">
          <span class="mushaf-surah-banner__name">${escapeHTML(chapter.titleAr)}</span>
          ${surahAyahCountLine(state, chapter, lang)}
        </span>
        <span class="mushaf-surah-banner__flank" aria-hidden="true">◆</span>
      </div>
      ${showBismillah && prefs.bismillahStyle !== 'hidden' ? `<p class="mushaf-bismillah bismillah--${prefs.bismillahStyle}">\u0628ِ\u0633\u0652\u0645ِ \u0627\u0644\u0644\u0651\u064e\u0647ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645ِ</p>` : ''}
    `
          : '';

        const versesHtml = chapter.verses
          .map((v) => {
            const bmKey = `${chapter.number}:${v.number}`;
            const isMarked = bookmarkedKeys.has(bmKey);
            const isReciting = state.surahPlayback?.active && state.recitingAyahKey === bmKey;
            const isSajda = isSajdaAyah(chapter.number, v.number);
            const words = state.quranWords[String(chapter.number)]?.[String(v.number)];
            const wordsHtml = renderAyahWords(v.text, words, chapter.number, v.number, {
              // (v4.6.0) words are ALWAYS tappable — a tap answers the
              // tajweed question even when word-study data hasn't loaded.
              // The pref now governs the underline hint + tab-stop
              // strategy, not whether a tap does anything.
              tappable: true,
              underline: prefs.wordByWordStudy && prefs.wordUnderline,
              tajweed: prefs.tajweedColoring,
              prefs: tajweedPrefsOf(state),
            });
            // One tab stop per ayah: in reading mode the ayah itself is the
            // button and the marker is decorative; in word-study mode each
            // word is tappable, so the ayah span steps aside and the marker
            // carries the single stop. (Both used to be buttons — a 15-ayah
            // page meant ~30 Tab stops.)
            const focusAttrs = prefs.wordByWordStudy ? '' : 'tabindex="0" role="button"';
            const markerAttrs = prefs.wordByWordStudy
              ? 'tabindex="0" role="button"'
              : 'aria-hidden="true"';
            // The printed sajda mark ۩ rides after the ayah-end marker at
            // the fifteen places of prostration, in the illumination gold.
            const sajdaMark = isSajda
              ? `<span class="mushaf-ayah__sajda" title="${t('mushaf.sajda', lang)}">\u06E9</span>`
              : '';
            return `<span class="mushaf-ayah ${isMarked ? 'mushaf-ayah--bookmarked' : ''} ${isReciting ? 'mushaf-ayah--reciting' : ''}" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" ${focusAttrs} aria-label="${t('quran.ayah', lang)} ${toEasternArabicNumerals(v.number)}${isSajda ? ` — ${t('mushaf.sajda', lang)}` : ''}">${wordsHtml}<span class="mushaf-ayah__marker" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" ${markerAttrs}>\uFD3F${toEasternArabicNumerals(v.number)}\uFD3E</span>${sajdaMark}${isMarked ? '<span class="mushaf-ayah__bookmark-flag" aria-hidden="true">\u2726</span>' : ''}</span>`;
          })
          .join(' ');

        return `${banner}<span class="mushaf-verses">${versesHtml}</span>`;
      })
      .join(' ');

  /* ---------------------------------------------------------------- */
  /* The windowed (normal) shell: a calm app bar + the book + nav.     */
  /* Fullscreen swaps ALL of it for the book alone + fading controls.  */
  /* ---------------------------------------------------------------- */
  const topbar = `
    <header class="mushaf-topbar">
      <a class="icon-btn" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}" aria-label="${t('nav.home', lang)}">
        ${icon('chevronLeft', { size: 20 })}
      </a>
      <button type="button" class="mushaf-topbar__title" data-action="mushaf-open-jump">
        ${escapeHTML(headerName)} \u00B7 ${juzLabel}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-jump" aria-label="${t('mushaf.jumpTo', lang)}" title="${t('mushaf.jumpTo', lang)}">
        ${icon('grid', { size: 18 })}
      </button>
      <button type="button" class="icon-btn ${state.surahPlayback?.active && Number(state.surahPlayback.surah) === Number(headerChapter.number) ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${headerChapter.number}" aria-label="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}" title="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}">
        ${icon(state.surahPlayback?.active && Number(state.surahPlayback.surah) === Number(headerChapter.number) ? 'stop' : 'play', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-toggle-fullscreen" aria-label="${t('mushaf.fullscreenEnter', lang)}" title="${t('mushaf.fullscreenEnter', lang)}">
        ${icon('expand', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-more" aria-label="${t('mushaf.more', lang)}" title="${t('mushaf.more', lang)}" aria-haspopup="dialog">
        ${icon('more', { size: 18 })}
      </button>
    </header>`;

  /* The page(s) — one template per article, shared by both modes so the
     fullscreen transition animates THE SAME nodes (the CSS transition on
     .mushaf-page morphs them; a re-render into a different tree would make
     the animation a hard jump). In a spread the right page renders FIRST
     inside the RTL book container, so it lands on the physical right; a
     still-loading facing page holds its place as a pending paper sheet. */
  const pageStyleVars = `--mushaf-font-family:${font.family};--mushaf-font-scale:${mushafScale};--mushaf-line-scale:${mushafLineScale};`;
  const pageArticle = (pageNum, doc) => `
      <article class="mushaf-page ${dir ? `mushaf-page--flip-${dir}` : ''} ${fsAnim ? `mushaf-page--fs-${fsAnim}` : ''} ${prefs.pageFlipAnimation ? '' : 'mushaf-page--no-anim'} ${doc ? '' : 'mushaf-page--pending'}" dir="rtl" lang="ar" style="${pageStyleVars}">
        <div class="mushaf-page__frame" aria-hidden="true">
          <span class="mushaf-page__corner mushaf-page__corner--tl"></span>
          <span class="mushaf-page__corner mushaf-page__corner--tr"></span>
          <span class="mushaf-page__corner mushaf-page__corner--bl"></span>
          <span class="mushaf-page__corner mushaf-page__corner--br"></span>
        </div>
        <header class="mushaf-page__head" aria-hidden="true">
          <span class="mushaf-page__juz-medallion">${icon('rosette', { size: 11, className: 'mushaf-page__juz-rosette' })}${juzLabelFor(meta, pageNum, doc?.juz, lang)}</span>
          <span class="mushaf-page__surah-cartouche">${escapeHTML(doc?.chapters?.[0]?.titleAr ?? '')}${surahCartoucheCount(state, doc)}</span>
        </header>
        <div class="mushaf-page__text">${doc ? chaptersOf(doc) : skeletonLines(lang, [88, 96, 80, 92, 84, 72, 90, 66])}</div>
        <footer class="mushaf-page__footer">
          <span class="mushaf-page__number">${toEasternArabicNumerals(pageNum)}</span>
        </footer>
      </article>`;

  const bookHTML = `
    <div class="mushaf-book ${spread ? 'mushaf-book--spread' : ''}">
      ${pageArticle(rightPage, rightDoc)}
      ${leftPage != null ? pageArticle(leftPage, leftDoc) : ''}
    </div>`;

  // (v4.5) Spread navigation bounds: a spread turns TWO pages at once, so
  // the buttons disable on the pair granularity, not the single page.
  const canPrev = spread ? prevSpreadPage(rightPage) != null : !isFirstPage(page);
  const canNext = spread ? nextSpreadPage(rightPage) != null : !isLastPage(page);

  // (v4.4) translation tray — the Mushaf-side home of the classic
  // reader's inline translations: this page's ayahs, Arabic ref + the
  // translation, under the paper (never ON it). Windowed mode only;
  // fullscreen keeps the page pure, exactly like the printed book.
  const tray =
    !fullscreen && prefs.translationPanel
      ? `<div class="mushaf-tray">${buildTranslationTray(
          state,
          leftDoc ? [rightDoc, leftDoc] : [rightDoc],
          lang
        )}</div>`
      : '';

  if (fullscreen) {
    return `
  <section class="view view--mushaf view--mushaf-fullscreen" data-mushaf-fs>
    <h1 class="sr-only">${t('mushaf.title', lang)}</h1>
    <div class="mushaf-page-wrap" data-mushaf-paper="${paper.id}" style="--mushaf-paper-bg:${paper.bg};--mushaf-paper-ink:${paper.ink};--mushaf-paper-border:${paper.border};">
      ${bookHTML}
    </div>
    ${buildFullscreenControls(state, rightPage, leftPage, headerChapter, canPrev, canNext, lang)}
    <div class="mushaf-fs-taps" aria-hidden="true">
      <button type="button" class="mushaf-fs-tap mushaf-fs-tap--prev" data-action="mushaf-prev" tabindex="-1">${icon('chevronRight', { size: 22 })}</button>
      <button type="button" class="mushaf-fs-tap mushaf-fs-tap--next" data-action="mushaf-next" tabindex="-1">${icon('chevronLeft', { size: 22 })}</button>
    </div>
  </section>`;
  }

  return `
  <section class="view view--mushaf">
    <h1 class="sr-only">${t('mushaf.title', lang)}</h1>
    ${topbar}
    <div class="mushaf-page-wrap" data-mushaf-paper="${paper.id}" style="--mushaf-paper-bg:${paper.bg};--mushaf-paper-ink:${paper.ink};--mushaf-paper-border:${paper.border};">
      ${bookHTML}
    </div>
    ${tray}
    <nav class="mushaf-nav">
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-prev" ${canPrev ? '' : 'disabled'} aria-label="${t('mushaf.prevPage', lang)}">
        ${icon('chevronRight', { size: 22 })}
      </button>
      <p class="mushaf-nav__hint">${t('mushaf.swipeHint', lang)}</p>
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-next" ${canNext ? '' : 'disabled'} aria-label="${t('mushaf.nextPage', lang)}">
        ${icon('chevronLeft', { size: 22 })}
      </button>
    </nav>
  </section>`;
}

/** (v4.5) "{n} ayahs" for the jump drawer's surah rows — same source of
 *  truth (quran-meta) as the banner's count line, elided while it loads. */
function ayahCountLabelOf(state, number, lang) {
  const n = state.quran.meta?.surahs?.find((s) => Number(s.number) === Number(number))?.ayahCount;
  if (!Number.isFinite(n)) return '';
  return ayahCountPhrase(n, lang);
}

/**
 * (v4.5) "Juz 18 · 3/8" — the juz label with its eighth-of-juz position,
 * the hizb-quarter rhythm the printed mushaf carries in its margins.
 * Per page, because a spread's two pages can sit in different juz.
 */
function juzLabelFor(meta, page, juz, lang) {
  const eighth = juzEighth(meta?.juzFirstPage, page, juz);
  return `${t('mushaf.juz', lang)} ${numFor(lang, juz)} \u00B7 ${numFor(lang, eighth)}/${numFor(lang, 8)}`;
}

/**
 * (v4.5) "٧" beside the surah name in the page's top-margin cartouche —
 * the printed mushaf prints the ayah count with every surah head. The
 * cartouche itself is aria-hidden margin ornament; this line shares
 * quran-meta with the in-flow banner's count (surahAyahCountLine below)
 * and is elided the same way while meta is still in flight.
 */
function surahCartoucheCount(state, doc) {
  const n = doc?.chapters?.[0]
    ? state.quran.meta?.surahs?.find((s) => Number(s.number) === Number(doc.chapters[0].number))
        ?.ayahCount
    : null;
  if (!Number.isFinite(n)) return '';
  return ` \u00B7 ${toEasternArabicNumerals(n)}`;
}

/**
 * (v4.5) The ayah count under a starting surah's banner — the informative
 * line a printed mushaf sets beneath its surah cartouche. quran-meta is
 * loaded by ensureMushafData (audio URLs need it), so this resolves on
 * the first real render; until then the banner simply omits the line.
 */
function surahAyahCountLine(state, chapter, lang) {
  const n = state.quran.meta?.surahs?.find(
    (s) => Number(s.number) === Number(chapter.number)
  )?.ayahCount;
  if (!Number.isFinite(n)) return '';
  return `<span class="mushaf-surah-banner__meta">${escapeHTML(ayahCountPhrase(n, lang))}</span>`;
}

/** Flip-anim classes vs the fullscreen transition: the --no-anim pref
 *  (mushafPrefs.pageFlipAnimation) is scoped in CSS to the FLIP keyframes
 *  only, so turning page flips off never silences the fullscreen bloom. */

/**
 * (v4.4) The fullscreen control bar: auto-fading (body.mushaf-fs-idle
 * drives opacity from app/events.js), translucent over the book, and
 * carrying everything a fullscreen session needs — page turns, the page
 * counter, recitation play/stop with its live ayah counter, and exit.
 * The recitation console parity (repeat/follow/listen/sleep chips) lives
 * in the windowed player bar; here the counter + stop button keep the
 * session controllable without breaking the "only the mushaf" promise.
 */
function buildFullscreenControls(
  state,
  rightPage,
  leftPage,
  headerChapter,
  canPrev,
  canNext,
  lang
) {
  const sp = state.surahPlayback;
  const recitingThis = sp?.active && Number(sp.surah) === Number(headerChapter.number);
  const reciteLabel = recitingThis ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang);
  // (v4.5) the page counter reads the SPREAD: "٣–٤ / ٦٠٤" in two-page
  // mode, the plain page number in single-page mode.
  const pageLabel = leftPage
    ? `${numFor(lang, rightPage)}\u2013${numFor(lang, leftPage)}`
    : numFor(lang, rightPage);
  return `
    <div class="mushaf-fs-controls" data-fs-controls>
      <button type="button" class="icon-btn" data-action="mushaf-toggle-fullscreen" aria-label="${t('mushaf.fullscreenExit', lang)}" title="${t('mushaf.fullscreenExit', lang)}">
        ${icon('compress', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-prev" ${canPrev ? '' : 'disabled'} aria-label="${t('mushaf.prevPage', lang)}">
        ${icon('chevronRight', { size: 20 })}
      </button>
      <span class="mushaf-fs-controls__page" dir="ltr">${pageLabel} / ${numFor(lang, MUSHAF_PAGE_COUNT)}</span>
      <button type="button" class="icon-btn" data-action="mushaf-next" ${canNext ? '' : 'disabled'} aria-label="${t('mushaf.nextPage', lang)}">
        ${icon('chevronLeft', { size: 20 })}
      </button>
      <button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${headerChapter.number}" aria-label="${reciteLabel}" title="${reciteLabel}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 18 })}
      </button>
      ${recitingThis ? `<span class="mushaf-fs-controls__ayah" dir="ltr">${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}</span>` : ''}
    </div>`;
}

/**
 * (v4.4) The translation tray: every ayah on this page, numbered like the
 * printed mushaf (Eastern Arabic-Indic), Arabic excerpt + translation.
 * Reads state.quran.surahs (loaded lazily by ensureMushafData when the
 * tray is on); while a surah doc is still arriving it degrades to a
 * skeleton row rather than pretending to be empty.
 */
function buildTranslationTray(state, docs, lang) {
  const rows = [];
  let pending = 0;
  // (v4.5) every page of the spread contributes its ayahs, in book order.
  for (const pageDoc of docs) {
    for (const chapter of pageDoc.chapters) {
      const surahDoc = state.quran.surahs[String(chapter.number)];
      for (const v of chapter.verses) {
        const translation = surahDoc?.ayahs?.find(
          (a) => String(a.number) === String(v.number)
        )?.translation;
        if (translation == null) {
          pending += 1;
          continue;
        }
        rows.push(`
      <div class="mushaf-tray__row">
        <span class="mushaf-tray__ref" dir="ltr">${escapeHTML(String(chapter.number))}:${escapeHTML(String(v.number))}</span>
        <p class="mushaf-tray__text" dir="auto">${escapeHTML(translation)}</p>
        <button type="button" class="icon-btn icon-btn--sm" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" aria-label="${t('wordStudy.openTafsir', lang)}" title="${t('wordStudy.openTafsir', lang)}">
          ${icon('book', { size: 15 })}
        </button>
      </div>`);
      }
    }
  }
  if (pending) {
    rows.push(`
      <div class="mushaf-tray__row mushaf-tray__row--loading">
        ${skeletonLines(lang, [70, 90])}
      </div>`);
  }
  return `
    <h2 class="mushaf-tray__title">${icon('book', { size: 15 })} ${t('mushaf.translation', lang)}</h2>
    ${rows.join('')}`;
}

/** Jump-to-surah / jump-to-juz / jump-to-page drawer, opened in the shared modal. */
export function buildMushafJump(state) {
  const lang = state.settings.language;
  const meta = state.mushaf.meta;
  if (!meta) return skeletonLines(lang, [64, 88, 64, 88, 64]);

  const surahButtons = Object.entries(meta.chapterNames)
    .map(
      ([num, names]) => `
    <button type="button" class="mushaf-jump__surah" data-action="mushaf-jump-page" data-page="${meta.surahFirstPage[num] || 1}" data-roving-item>
      <span class="mushaf-jump__surah-num">${num}</span>
      <span class="mushaf-jump__surah-name">${escapeHTML(pickLocale(names, lang))}</span>
      <span class="mushaf-jump__surah-count">${ayahCountLabelOf(state, num, lang)}</span>
    </button>`
    )
    .join('');

  const juzButtons = Object.entries(meta.juzFirstPage)
    .map(
      ([juzNum, page]) => `
    <button type="button" class="mushaf-jump__juz" data-action="mushaf-jump-page" data-page="${page}" data-roving-item>${juzNum}</button>`
    )
    .join('');

  const readCount = Object.keys(state.mushafPagesRead).length;
  const pct = Math.round((readCount / MUSHAF_PAGE_COUNT) * 100);

  // Khatma plan block: pure status from js/khatma.js, rendered compactly.
  const status = planStatus({ pagesRead: state.mushafPagesRead, plan: state.khatmaPlan });
  const plan = state.khatmaPlan;
  const fmtDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  let planRows = '';
  if (plan) {
    const bits = [];
    if (plan.dailyTarget && status.todayEnd) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.todayTarget', lang, { a: status.todayStart, b: status.todayEnd })}</span>`
      );
    }
    if (plan.dailyTarget && status.pace != null) {
      bits.push(
        `<span class="mushaf-khatma__bit" dir="ltr">${t('khatma.pace', lang, { n: status.pace })}</span>`
      );
    }
    if (
      plan.targetDate &&
      status.requiredPerDay != null &&
      Number.isFinite(status.requiredPerDay)
    ) {
      bits.push(
        `<span class="mushaf-khatma__bit" dir="ltr">${t('khatma.neededPerDay', lang, { n: status.requiredPerDay })}</span>`
      );
    }
    if (plan.targetDate) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.deadline', lang, { date: fmtDate(plan.targetDate) })}</span>`
      );
    }
    if (status.projectedFinishISO) {
      bits.push(
        `<span class="mushaf-khatma__bit">${t('khatma.projected', lang, { date: fmtDate(status.projectedFinishISO) })}</span>`
      );
    }
    // One honest verdict, in priority order: finished > behind the daily
    // schedule > ahead of the daily schedule > pace/projection verdicts.
    let verdictText = '';
    let verdictCls = '';
    let verdictCelebrate = false;
    if (status.complete) {
      verdictText = t('khatma.completeBanner', lang);
      verdictCls = 'mushaf-khatma__verdict--done';
      // v3.12: one-shot bloom stamped only while the completion stamp in
      // khatmaHistory is fresh — later re-renders of the same banner stay
      // silent (see js/celebrate.js for the contract).
      verdictCelebrate = justCompletedKhatma(state);
    } else if (status.behindBy > 0) {
      verdictText = t('khatma.behind', lang, { n: status.behindBy });
      verdictCls = 'mushaf-khatma__verdict--warn';
    } else if (status.todayEnd && status.read >= status.todayEnd) {
      verdictText = t('khatma.ahead', lang);
      verdictCls = 'mushaf-khatma__verdict--good';
    } else if (status.onTrack === true) {
      verdictText = t('khatma.onTrack', lang);
      verdictCls = 'mushaf-khatma__verdict--good';
    } else if (status.onTrack === false) {
      verdictText = t('khatma.behindSchedule', lang);
      verdictCls = 'mushaf-khatma__verdict--warn';
    }
    planRows = `
    <div class="mushaf-khatma__bits">${bits.map((b) => `<span class="mushaf-khatma__bitwrap">${b}</span>`).join('')}</div>
    ${verdictText ? `<p class="mushaf-khatma__verdict ${verdictCls}${verdictCelebrate ? ' celebrate' : ''}">${verdictText}</p>` : ''}`;
  }

  const planButtons = `
    <div class="mushaf-khatma__actions">
      <button type="button" class="btn ${plan ? 'btn--secondary' : 'btn--primary'} btn--sm" data-action="khatma-open-plan">
        ${icon('target', { size: 14 })} ${t(plan ? 'khatma.editPlan' : 'khatma.setPlan', lang)}
      </button>
      ${plan ? `<button type="button" class="link-btn link-btn--sm" data-action="khatma-clear-plan">${t('khatma.clearPlan', lang)}</button>` : ''}
    </div>`;

  const historyLine = state.khatmaHistory?.length
    ? `<p class="mushaf-khatma__history">${icon('star', { size: 13 })} ${t('khatma.history', lang, { n: state.khatmaHistory.length })}${state.khatmaHistory[0]?.days ? ` · ${state.khatmaHistory[0].days === 1 ? t('khatma.lastDaysOne', lang) : t('khatma.lastDays', lang, { n: state.khatmaHistory[0].days })}` : ''}</p>`
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
    <div class="mushaf-khatma">
      <div class="mushaf-khatma__head">
        <span class="mushaf-khatma__label">${t('mushaf.khatma', lang)}</span>
        <button type="button" class="link-btn link-btn--sm" data-action="mushaf-reset-progress">${t('mushaf.khatmaReset', lang)}</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${t('mushaf.khatmaProgress', lang)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="--p:${(pct / 100).toFixed(3)}"></div>
      </div>
      <p class="mushaf-khatma__sub" dir="ltr">${readCount} / ${MUSHAF_PAGE_COUNT} · ${pct}%</p>
      ${planRows}
      ${planButtons}
      ${historyLine}
    </div>
    <h3 class="mushaf-jump__heading">${t('mushaf.surahs', lang)}</h3>
    <div class="mushaf-jump__surah-list" role="group" aria-label="${t('mushaf.surahs', lang)}" data-roving>${surahButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.juzSection', lang)}</h3>
    <div class="mushaf-jump__juz-list" role="group" aria-label="${t('mushaf.juzSection', lang)}" data-roving>${juzButtons}</div>
  </div>`;
}

/**
 * (v4.4) The Mushaf action sheet — the "everything this book does"
 * drawer behind the ⋯ button. Feature parity was the redesign's hard
 * requirement: every study tool available in the classic reader is one
 * tap from the mushaf, organized as labeled rows instead of a seventh
 * and eighth topbar button. Rows that open other views navigate there
 * (and Back returns — normal router behavior); rows that toggle flip
 * the persisted pref right here.
 */
export function buildMushafSheet(state) {
  const lang = state.settings.language;
  const prefs = state.settings.mushafPrefs;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const pageDoc = state.mushaf.pages[String(page)];
  const surah = pageDoc?.chapters?.[0]?.number || null;
  const follow = state.settings.audio?.ayahFollow ?? true;

  const row = (action, labelKey, iconName, extra = '') => `
    <button type="button" class="mushaf-sheet__row" data-action="${action}">
      ${icon(iconName, { size: 17 })}<span class="mushaf-sheet__label">${t(labelKey, lang)}</span>${extra}
    </button>`;
  // Link rows: real routes (router + Back button + deep links all work);
  // the delegated 'navigate' handler consumes data-view/data-* attrs.
  const linkRow = (labelKey, iconName, view, params = {}) => {
    const attrs = Object.entries(params)
      .map(([k, v]) => `data-${k}="${escapeHTML(String(v))}"`)
      .join(' ');
    return `
    <a class="mushaf-sheet__row" href="${buildHash(view, params)}" data-action="navigate" data-view="${view}" ${attrs}>
      ${icon(iconName, { size: 17 })}<span class="mushaf-sheet__label">${t(labelKey, lang)}</span>
    </a>`;
  };
  const toggleRow = (key, labelKey, iconName) => `
    <label class="mushaf-sheet__row mushaf-sheet__row--toggle">
      ${icon(iconName, { size: 17 })}<span class="mushaf-sheet__label">${t(labelKey, lang)}</span>
      <span class="switch">
        <input type="checkbox" data-action="toggle-mushaf-pref" data-key="${key}" ${prefs[key] ? 'checked' : ''} />
        <span class="switch__track"></span>
      </span>
    </label>`;

  return `
  <div class="mushaf-sheet">
    <h2 id="modal-title-mushaf-sheet">${t('mushaf.more', lang)}</h2>
    <div class="mushaf-sheet__group">
      ${row('mushaf-open-jump', 'mushaf.jumpTo', 'grid')}
      ${row('mushaf-open-bookmarks', 'mushaf.bookmarks', 'bookmark')}
      ${row('mushaf-open-settings', 'mushaf.settingsTitle', 'settings')}
      ${row('tajweed-open-settings', 'mushaf.tajweedSettings', 'sparkle')}
    </div>
    <div class="mushaf-sheet__group">
      ${toggleRow('spread', 'mushaf.spread', 'book')}
      ${toggleRow('translationPanel', 'mushaf.translation', 'book')}
      ${toggleRow('tajweedColoring', 'mushaf.tajweed', 'sparkle')}
      ${toggleRow('wordByWordStudy', 'mushaf.wordStudy', 'quran')}
      ${
        follow
          ? row('recite-follow-toggle', 'audio.follow', 'eye')
          : row('recite-follow-toggle', 'audio.follow', 'eyeOff')
      }
    </div>
    <div class="mushaf-sheet__group">
      ${
        surah ? linkRow('mushaf.memorizeSurah', 'target', VIEWS.QURAN, { id: surah, mem: '1' }) : ''
      }
      ${row('practice-open', 'mushaf.tajweedPractice', 'sparkle')}
      ${linkRow('mushaf.mutashabihat', 'quran', VIEWS.MUTASHABIHAT, {})}
      ${linkRow('mushaf.roots', 'book', VIEWS.ROOTS, {})}
      ${linkRow('quran.searchShortcut', 'search', VIEWS.SEARCH)}
      ${linkRow('mushaf.reciters', 'volume', VIEWS.AUDIO)}
      ${linkRow('quran.viewInReader', 'list', VIEWS.QURAN)}
    </div>
  </div>`;
}

/** Khatma plan editor, opened from the jump drawer. Pure template — the
 *  form is processed by the 'khatma-plan' handler in app.js. */
export function buildKhatmaPlanForm(state) {
  const lang = state.settings.language;
  const plan = state.khatmaPlan;
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const suggestion = 20;
  return `
  <div class="khatma-plan">
    <h2 id="modal-title-khatma-plan">${t('khatma.planTitle', lang)}</h2>
    <form class="editor-form" data-form="khatma-plan">
      <div class="khatma-plan__presets">
        <button type="button" class="btn btn--secondary btn--sm" data-action="khatma-ramadan-preset">
          ${icon('moon', { size: 14 })} ${t('khatma.ramadanPreset', lang)}
        </button>
        <span class="panel__subtext">${t('khatma.ramadanPresetHint', lang)}</span>
      </div>
      <label class="field-label" for="khatma-start-date">${t('khatma.startLabel', lang)}</label>
      <input class="input" type="date" id="khatma-start-date" name="startDate" value="${plan?.startDate || todayISO}" />

      <label class="field-label" for="khatma-target-date">${t('khatma.targetLabel', lang)}</label>
      <input class="input" type="date" id="khatma-target-date" name="targetDate" value="${plan?.targetDate || ''}" min="${todayISO}" />

      <label class="field-label" for="khatma-daily-target">${t('khatma.dailyLabel', lang)}</label>
      <input class="input" type="number" id="khatma-daily-target" name="dailyTarget" min="1" max="604" inputmode="numeric" placeholder="${suggestion}" value="${plan?.dailyTarget || ''}" />

      <p class="panel__subtext">${t('khatma.planHint', lang)}</p>
      <div class="khatma-plan__actions">
        <button type="submit" class="btn btn--primary">${icon('check', { size: 16 })} ${t('khatma.save', lang)}</button>
      </div>
    </form>
  </div>`;
}

/** Saved per-ayah bookmarks list, opened from the Mushaf topbar.
 *  Bookmarks can be filed into user-made folders and carry a short note;
 *  the currently-selected folder filter lives in module scope (rebuilt
 *  into the modal each time it re-opens or an action re-renders it).
 */
let bookmarkFolderFilter = '__all__';

export function setBookmarkFolderFilter(id) {
  bookmarkFolderFilter = id || '__all__';
}

export function buildMushafBookmarks(state) {
  const lang = state.settings.language;
  const meta = state.mushaf.meta;
  const folders = state.ayahBookmarkFolders || [];
  if (
    bookmarkFolderFilter !== '__all__' &&
    bookmarkFolderFilter !== '__unfiled__' &&
    !folders.some((f) => f.id === bookmarkFolderFilter)
  ) {
    bookmarkFolderFilter = '__all__';
  }

  const chip = (id, label, extra = '') => `
    <button type="button" class="chip chip--basis ${bookmarkFolderFilter === id ? 'chip--basis-active' : ''}" data-action="bookmark-filter-folder" data-folder="${escapeHTML(String(id))}" aria-pressed="${bookmarkFolderFilter === id}">
      ${extra}${escapeHTML(label)}
    </button>`;

  const folderChips = [
    chip('__all__', t('mushaf.allBookmarks', lang)),
    chip('__unfiled__', t('mushaf.unfiled', lang)),
    ...folders.map(
      (f) => `
      <span class="mushaf-folder-chip-wrap">
        ${chip(f.id, f.name, `<span class="chip__count">${state.ayahBookmarks.filter((b) => b.folderId === f.id).length}</span>`)}
        <button type="button" class="chip__x" data-action="bookmark-delete-folder" data-folder="${escapeHTML(f.id)}" aria-label="${t('common.delete', lang)}">×</button>
      </span>`
    ),
    `<button type="button" class="chip chip--basis chip--add" data-action="bookmark-new-folder">${icon('plus', { size: 12 })} ${t('mushaf.newFolder', lang)}</button>`,
  ].join('');

  const visible = state.ayahBookmarks
    .filter(
      (b) =>
        bookmarkFolderFilter === '__all__' ||
        (bookmarkFolderFilter === '__unfiled__' && !folders.some((f) => f.id === b.folderId)) ||
        b.folderId === bookmarkFolderFilter
    )
    .sort((a, b) => a.page - b.page || a.surah - b.surah || a.ayah - b.ayah);

  if (!state.ayahBookmarks.length) {
    return `
    <div class="mushaf-bookmarks">
      <h2 id="modal-title-mushaf-bookmarks">${t('mushaf.bookmarks', lang)}</h2>
      ${emptyStateHTML({
        iconName: 'bookmark',
        title: t('mushaf.noBookmarks', lang),
        hint: t('mushaf.noBookmarksHint', lang),
      })}
    </div>`;
  }

  const folderOptions = (selected) =>
    [
      `<option value="" ${!selected ? 'selected' : ''}>${t('mushaf.unfiled', lang)}</option>`,
      ...folders.map(
        (f) =>
          `<option value="${escapeHTML(f.id)}" ${selected === f.id ? 'selected' : ''}>${escapeHTML(f.name)}</option>`
      ),
    ].join('');

  const rows = visible
    .map((b) => {
      const names = meta?.chapterNames?.[String(b.surah)];
      const name = names ? pickLocale(names, lang) : '';
      return `
    <div class="mushaf-bookmark-row">
      <button type="button" class="mushaf-bookmark-row__main" data-action="mushaf-jump-page" data-page="${escapeHTML(String(b.page))}">
        <span class="mushaf-bookmark-row__ref" dir="ltr">${escapeHTML(String(b.surah))}:${escapeHTML(String(b.ayah))}</span>
        <span class="mushaf-bookmark-row__name">${escapeHTML(name)} · ${t('mushaf.pageShort', lang)} ${escapeHTML(String(b.page))}</span>
      </button>
      <input class="input mushaf-bookmark-row__note" type="text" dir="auto" maxlength="140"
        placeholder="${t('mushaf.notePh', lang)}" value="${escapeHTML(b.note || '')}"
        data-bind="bookmark-note" data-key="${escapeHTML(b.key)}" aria-label="${t('mushaf.noteLabel', lang)}" />
      <select class="select mushaf-bookmark-row__folder" data-bind="bookmark-folder" data-key="${escapeHTML(b.key)}" aria-label="${t('mushaf.folderLabel', lang)}">
        ${folderOptions(b.folderId)}
      </select>
      <button type="button" class="icon-btn icon-btn--sm" data-action="mushaf-remove-bookmark" data-key="${escapeHTML(b.key)}" aria-label="${t('common.delete', lang)}">
        ${icon('trash', { size: 14 })}
      </button>
    </div>`;
    })
    .join('');

  return `
  <div class="mushaf-bookmarks">
    <h2 id="modal-title-mushaf-bookmarks">${t('mushaf.bookmarks', lang)} <span class="chip__count">${state.ayahBookmarks.length}</span></h2>
    <div class="mushaf-folder-chips">${folderChips}</div>
    ${visible.length ? rows : `<p class="empty-hint">${t('mushaf.folderEmpty', lang)}</p>`}
  </div>`;
}

/**
 * (v4.5) Feature-parity hifz row for the ayah detail: the SAME spaced-
 * repetition actions the classic reader's toolbar carries (mark a surah
 * memorized, or log today's recall grade), one tap from the mushaf.
 */
function hifzRowFor(state, surahNumber, lang) {
  const rec = state.hifzRecords?.[String(surahNumber)];
  const num = String(parseInt(surahNumber, 10) || 0);
  return `
    <div class="mushaf-ayah-detail__hifz">
      ${
        rec
          ? `
      <button type="button" class="chip" data-action="hifz-review" data-surah="${num}" data-grade="easy" title="${t('hifz.recalled', lang)}">
        ${icon('check', { size: 13 })} ${t('hifz.recalled', lang)}
      </button>
      <button type="button" class="chip" data-action="hifz-review" data-surah="${num}" data-grade="again" title="${t('hifz.struggled', lang)}">
        ${icon('repeat', { size: 13 })} ${t('hifz.struggled', lang)}
      </button>`
          : `
      <button type="button" class="chip" data-action="hifz-mark" data-surah="${num}" title="${t('hifz.markMemorized', lang)}">
        ${icon('check', { size: 13 })} ${t('hifz.markMemorized', lang)}
      </button>`
      }
    </div>`;
}

/**
 * Per-ayah detail modal: Arabic (already on hand from the page data),
 * translation (from the classic reader's already-loaded surah data, if
 * available), play/copy actions. `surahDoc` is `state.quran.surahs[surah]`
 * — the caller is responsible for making sure it's loaded first so this
 * stays a pure template function.
 */
let activeTafsirTab = null;
export function setActiveTafsirTab(id) {
  activeTafsirTab = id;
}
export function getActiveTafsirTab() {
  return activeTafsirTab;
}

export function buildMushafAyahDetail(
  arabicText,
  surahDoc,
  surahNumber,
  ayahNumber,
  state,
  currentPage
) {
  const lang = state.settings.language;
  const ayah = surahDoc?.ayahs?.find((a) => String(a.number) === String(ayahNumber));
  const audioUrl = ayahAudioUrl(
    state.quran.meta?.surahs,
    state.settings.reciter,
    surahNumber,
    ayahNumber
  );
  const key = `${surahNumber}:${ayahNumber}`;
  const isMarked = state.ayahBookmarks.some((b) => b.key === key);

  return `
  <div class="mushaf-ayah-detail">
    <h2 id="modal-title-mushaf-ayah" class="sr-only">${surahDoc ? escapeHTML(pickLocale({ en: surahDoc.nameEn, ar: surahDoc.nameAr }, lang)) : ''} ${surahNumber}:${ayahNumber}</h2>
    <p class="mushaf-ayah-detail__ref" dir="ltr">${surahNumber}:${ayahNumber}${surahDoc ? ` \u2014 ${escapeHTML(pickLocale({ en: surahDoc.nameEn, ar: surahDoc.nameAr }, lang))}` : ''}</p>
    <p class="mushaf-ayah-detail__arabic" dir="rtl" lang="ar">${escapeHTML(arabicText)}</p>
    ${ayah?.translation ? `<p class="mushaf-ayah-detail__translation" dir="auto">${escapeHTML(ayah.translation)}</p>` : ''}
    <div class="mushaf-ayah-detail__actions">
      ${
        currentPage != null
          ? `
      <button type="button" class="btn ${isMarked ? 'btn--primary' : 'btn--secondary'} btn--sm" data-action="mushaf-toggle-bookmark" data-surah="${surahNumber}" data-ayah="${ayahNumber}" data-page="${currentPage}" aria-pressed="${isMarked}">
        ${icon('bookmark', { size: 16 })} ${t(isMarked ? 'mushaf.bookmarked' : 'mushaf.bookmarkAyah', lang)}
      </button>`
          : ''
      }
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
      <button type="button" class="btn btn--secondary btn--sm" data-action="practice-this-ayah" data-surah="${surahNumber}" data-ayah="${ayahNumber}">
        ${icon('sparkle', { size: 16 })} ${t('practice.thisAyah', lang)}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" data-action="ayah-share" data-surah="${surahNumber}" data-ayah="${ayahNumber}">
        ${icon('share', { size: 16 })} ${t('quran.shareAyah', lang)}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" data-action="mushaf-open-in-study" data-surah="${surahNumber}" data-ayah="${ayahNumber}">
        ${icon('list', { size: 16 })} ${t('mushaf.openInStudy', lang)}
      </button>
    </div>
    ${hifzRowFor(state, surahNumber, lang)}
    ${buildAyahStudyExtras(state, surahNumber, ayahNumber, activeTafsirTab)}
  </div>`;
}
