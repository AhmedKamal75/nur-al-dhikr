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
import { t, isRTL } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { clamp, escapeHTML, pickLocale, toEasternArabicNumerals } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import {
  clampPage,
  isFirstPage,
  isLastPage,
  isSajdaAyah,
  mushafSpreadActive,
  spreadRightPage,
  spreadLeftPage,
  nextSpreadPage,
  prevSpreadPage,
  juzEighth,
} from '../services/mushaf.js';
import { VIEWS, MUSHAF_PAGE_COUNT, MUSHAF_FONTS, MUSHAF_PAPERS } from '../core/config.js';
import { sleepSnapshot } from '../services/surahPlayback.js';
import { renderAyahWords } from './tafsirPanel.js';
import {
  consoleSnapshot,
  recitationChipsHTML,
  recitationEchoHTML,
} from '../ui/recitationConsole.js';
// (Blueprint E step 2) extracted view parts live in their own modules;
// this file re-exports the builders so existing importers keep working.
// Session transients moved to state.mushafSession (v5.2.9) and are set
// via actions.setMushafSession — no module setters remain here.
export { buildMushafBookmarks } from './mushafBookmarks.js';
import { tajweedPrefsOf } from '../domain/tajweed.js';
import { skeletonMushafPage, skeletonLines } from '../ui/skeleton.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';

/** (v4.5.2) "Arabic for Arabic, English for English" in the mushaf CHROME:
 *  the banner, the medallions, the fullscreen counter and the jump
 *  drawer are UI chrome and follow the interface language — Western
 *  digits in English, Eastern in Arabic. The page ornaments that are
 *  part of the Arabic mushaf itself (ayah-end markers ﴿١﴾, the page
 *  number, the surah cartouche count) stay Eastern always, because they
 *  ARE the mushaf, whatever language its reader speaks. */
const numFor = (lang, n) => (lang === 'ar' ? toEasternArabicNumerals(n) : String(n));

/** Distinct surah chapters across the visible page docs, in book order —
 *  the source for the multi-surah recitation picker (a page often holds
 *  the tail of one surah plus the head of the next). */
export function pageChapters(docs) {
  const seen = new Set();
  const out = [];
  for (const doc of docs) {
    if (!doc || !Array.isArray(doc.chapters)) continue;
    for (const c of doc.chapters) {
      const n = Number(c?.number);
      if (!Number.isFinite(n) || seen.has(n)) continue;
      seen.add(n);
      out.push(c);
    }
  }
  return out;
}

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
 * (v5.2.16) One-shot animation tokens moved to ui/readingTokens.js — the
 * neutral module both layers may import. Setters stay re-exported here
 * so existing importers keep working untouched; renderMushaf() consumes
 * through the same consume-once readers the setters pair with.
 */
export { setFlipDirection, setFullscreenAnim } from '../ui/readingTokens.js';
import { consumeFlipDirection, consumeFullscreenAnim } from '../ui/readingTokens.js';

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
  const dir = consumeFlipDirection(); // single-use: consumed by this render
  const fsAnim = consumeFullscreenAnim();

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
        // The banner doubles as the surah's recite button (tap the cartouche
        // to listen from its start) — no extra chrome on the paper, just an
        // affordance with a matching label.
        const recitingBanner =
          state.surahPlayback?.active &&
          Number(state.surahPlayback.surah) === Number(chapter.number);
        const banner = showBanner
          ? `
      <button type="button" class="mushaf-surah-banner" data-action="surah-play" data-surah="${chapter.number}" aria-label="${escapeHTML(chapter.titleAr)} — ${t(recitingBanner ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}" title="${t(recitingBanner ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}">
        <span class="mushaf-surah-banner__flank" aria-hidden="true">◆</span>
        <span class="mushaf-surah-banner__frame">
          <span class="mushaf-surah-banner__name">${escapeHTML(chapter.titleAr)}</span>
          ${surahAyahCountLine(state, chapter, lang)}
        </span>
        <span class="mushaf-surah-banner__flank" aria-hidden="true">◆</span>
      </button>
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
  // A page (or spread) can hold several surahs — the topbar play button
  // recites the single surah directly, or opens the surah picker when the
  // visible pages hold more than one.
  const pageSurahs = pageChapters(leftDoc ? [rightDoc, leftDoc] : [rightDoc]);
  const recitingOnPage =
    state.surahPlayback?.active &&
    pageSurahs.some((c) => Number(c.number) === Number(state.surahPlayback.surah));
  const topbarPlay =
    pageSurahs.length > 1
      ? `<button type="button" class="icon-btn ${recitingOnPage ? 'icon-btn--playing' : ''}" data-action="mushaf-play-pick" aria-label="${t('mushaf.playSurahOnPage', lang)}" title="${t('mushaf.playSurahOnPage', lang)}">
        ${icon(recitingOnPage ? 'stop' : 'play', { size: 18 })}
      </button>`
      : `<button type="button" class="icon-btn ${recitingOnPage ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${headerChapter.number}" aria-label="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}" title="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}">
        ${icon(recitingOnPage ? 'stop' : 'play', { size: 18 })}
      </button>`;
  const topbar = `
    <header class="mushaf-topbar">
      <a class="icon-btn" href="${buildHash(VIEWS.HOME)}" data-action="navigate" data-view="${VIEWS.HOME}" aria-label="${t('nav.home', lang)}">
        ${icon(isRTL(lang) ? 'chevronRight' : 'chevronLeft', { size: 20 })}
      </a>
      <button type="button" class="mushaf-topbar__title" data-action="mushaf-open-jump">
        ${escapeHTML(headerName)} \u00B7 ${juzLabel}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-jump" aria-label="${t('mushaf.jumpTo', lang)}" title="${t('mushaf.jumpTo', lang)}">
        ${icon('grid', { size: 18 })}
      </button>
      ${topbarPlay}
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
          <span class="mushaf-page__lattice" aria-hidden="true"></span>
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
    ${buildFullscreenControls(state, rightPage, leftPage, headerChapter, pageSurahs, canPrev, canNext, lang)}
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
 *
 * Full parity with the windowed recitation console: while a session runs,
 * a second glass row carries the SAME chips as the player bar (ayah
 * prev/next, per-ayah repeat, follow, listen/continuous, echo, sleep,
 * voice picker, A/B compare, stop) so nothing is lost by going fullscreen.
 */
function buildFullscreenControls(
  state,
  rightPage,
  leftPage,
  headerChapter,
  visibleSurahs,
  canPrev,
  canNext,
  lang
) {
  const sp = state.surahPlayback;
  const recitingThis =
    sp?.active && visibleSurahs.some((c) => Number(c.number) === Number(sp.surah));
  const qPos =
    recitingThis &&
    Array.isArray(sp.queue) &&
    sp.queue.length > 1 &&
    Number.isFinite(Number(sp.qIndex))
      ? ` · ${Number(sp.qIndex) + 1}/${sp.queue.length}`
      : '';
  const reciteLabel = recitingThis ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang);
  // A spread page often holds 2+ surahs — direct-play only when there is
  // exactly one; otherwise the button opens the surah picker.
  const playBtn =
    visibleSurahs.length > 1
      ? `<button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="mushaf-play-pick" aria-label="${t('mushaf.playSurahOnPage', lang)}" title="${t('mushaf.playSurahOnPage', lang)}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 18 })}
      </button>`
      : `<button type="button" class="icon-btn ${recitingThis ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${headerChapter.number}" aria-label="${reciteLabel}" title="${reciteLabel}">
        ${icon(recitingThis ? 'stop' : 'play', { size: 18 })}
      </button>`;
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
      ${playBtn}
      ${recitingThis ? `<span class="mushaf-fs-controls__ayah" dir="ltr">${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}${escapeHTML(qPos)}</span>` : ''}
    </div>
    ${recitingThis ? buildFullscreenConsole(state, lang) : ''}`;
}

/** The fullscreen console's second glass row — the windowed player bar's
 *  recitation chips, re-homed over the book. Same actions, same labels
 *  (the single shared builder in ui/recitationConsole.js). */
function buildFullscreenConsole(state, lang) {
  const snap = consoleSnapshot(state.surahPlayback, state.settings, sleepSnapshot(), lang);
  return `
    <div class="mushaf-fs-console" data-fs-controls>
      ${recitationChipsHTML(snap, lang, { chip: 'mushaf-fs-chip', on: 'mushaf-fs-chip--on', btn: 'icon-btn' })}
    </div>
    ${recitationEchoHTML(snap, lang, 'mushaf-fs-echo')}`;
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

/**
 * Multi-surah picker for the recitation button: when the visible pages hold
 * more than one surah (tail of one + head of the next), each row recites
 * that surah from its start (or opens the ayah-range picker for a slice).
 * Pure template over the same page docs the reader renders.
 */
export function buildMushafPlayPick(state) {
  const lang = state.settings.language;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
  const right = spreadOn ? spreadRightPage(page) : page;
  const left = spreadOn ? spreadLeftPage(right) : null;
  const docs =
    left != null
      ? [state.mushaf.pages[String(right)], state.mushaf.pages[String(left)]]
      : [state.mushaf.pages[String(page)]];
  const surahs = pageChapters(docs);
  const activeSurah = state.surahPlayback?.active ? Number(state.surahPlayback.surah) : null;
  const rows = surahs
    .map((c) => {
      const n = Number(c.number);
      const active = activeSurah === n;
      const name = lang === 'ar' ? c.titleAr : `${c.titleEn || ''} · ${c.titleAr || ''}`;
      return `
      <div class="mushaf-pick-row">
        <span class="mushaf-pick-row__name">${escapeHTML(name)}</span>
        <button type="button" class="btn ${active ? 'btn--primary' : 'btn--secondary'} btn--sm" data-action="surah-play" data-surah="${n}">
          ${icon(active ? 'stop' : 'play', { size: 14 })} ${t(active ? 'audio.reciteStop' : 'audio.reciteSurah', lang)}
        </button>
        <button type="button" class="icon-btn" data-action="quran-range-open" data-surah="${n}" aria-label="${t('audio.rangeTitle', lang)}" title="${t('audio.rangeTitle', lang)}">
          ${icon('target', { size: 16 })}
        </button>
      </div>`;
    })
    .join('');
  return `
  <div class="mushaf-pick">
    <h2 id="modal-title-mushaf-pick">${t('mushaf.playSurahOnPage', lang)}</h2>
    <p class="panel__subtext">${t('mushaf.playSurahHint', lang)}</p>
    ${rows}
  </div>`;
}

/** Jump-to-surah / jump-to-juz / jump-to-page drawer, opened in the shared modal.
 *  Pure NAVIGATION: page form + surah list + juz list. Progress (khatma
 *  plan/history) lives in buildMushafTrack, opened from the ⋯ sheet. */
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
    <h3 class="mushaf-jump__heading">${t('mushaf.surahs', lang)}</h3>
    <div class="mushaf-jump__surah-list" role="group" aria-label="${t('mushaf.surahs', lang)}" data-roving>${surahButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.juzSection', lang)}</h3>
    <div class="mushaf-jump__juz-list" role="group" aria-label="${t('mushaf.juzSection', lang)}" data-roving>${juzButtons}</div>
  </div>`;
}

/**
 * Khatma progress panel (TRACK): reading progress + plan schedule +
 * completion history. Moved verbatim out of the Jump drawer so navigation
 * stays pure navigation; opened from the ⋯ sheet via `mushaf-open-track`.
 * Pure template — same status helpers, same actions, new home.
 */
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
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionGo', lang)}</h3>
      ${row('mushaf-open-jump', 'mushaf.jumpTo', 'grid')}
      ${row('mushaf-open-bookmarks', 'mushaf.bookmarks', 'bookmark')}
      ${linkRow('quran.searchShortcut', 'search', VIEWS.SEARCH)}
      ${linkRow('quran.viewInReader', 'list', VIEWS.QURAN)}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionDisplay', lang)}</h3>
      ${row('mushaf-open-settings', 'mushaf.settingsTitle', 'settings')}
      ${row('tajweed-open-settings', 'mushaf.tajweedSettings', 'sparkle')}
      ${toggleRow('spread', 'mushaf.spread', 'book')}
      ${toggleRow('translationPanel', 'mushaf.translation', 'book')}
      ${toggleRow('tajweedColoring', 'mushaf.tajweed', 'sparkle')}
      ${toggleRow('wordByWordStudy', 'mushaf.wordStudy', 'quran')}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionStudy', lang)}</h3>
      ${
        surah ? linkRow('mushaf.memorizeSurah', 'target', VIEWS.QURAN, { id: surah, mem: '1' }) : ''
      }
      ${row('practice-open', 'mushaf.tajweedPractice', 'sparkle')}
      ${linkRow('mushaf.mutashabihat', 'quran', VIEWS.MUTASHABIHAT, {})}
      ${linkRow('mushaf.roots', 'book', VIEWS.ROOTS, {})}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionListen', lang)}</h3>
      ${
        follow
          ? row('recite-follow-toggle', 'audio.follow', 'eye')
          : row('recite-follow-toggle', 'audio.follow', 'eyeOff')
      }
      ${linkRow('mushaf.reciters', 'volume', VIEWS.AUDIO)}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionTrack', lang)}</h3>
      ${row('mushaf-open-track', 'mushaf.khatma', 'target')}
    </div>
  </div>`;
}

export { buildMushafTrack, buildKhatmaPlanForm } from './khatma.js';
export { buildMushafAyahDetail } from './ayahStudy.js';
