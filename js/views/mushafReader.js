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
import {
  ayahCountPhrase,
  clamp,
  escapeHTML,
  pickLocale,
  toEasternArabicNumerals,
} from '../core/utils.js';
import { buildHash } from '../core/router.js';
import {
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
import {
  VIEWS,
  MUSHAF_PAGE_COUNT,
  MUSHAF_FONTS,
  MUSHAF_PAPERS,
  TRANSLATION_EDITIONS,
} from '../core/config.js';
import {
  fileConsole,
  firstAyahOnPage,
  buildFullscreenConsole,
  fsPlayButtonHTML,
  pageChapters,
} from './mushafPlayer.js';
// (v5.17.21, FIXED) The route's page resolution lives in the navigation part
// so the book and the jump drawer's "you are here" cannot drift apart — see
// mushafRoutePage() there.
import { mushafRoutePage } from './mushafJump.js';
import { renderAyahWords, buildBismillahHTML } from './tafsirPanel.js';
// (v5.17.54, merged-plan item 7) the inline study tray lives in its own
// module — this file stays under its 800-line cap (see
// tests/mushaf-structure.test.js).
import { buildStudyTray, isStudyTrayOpen } from './studyTray.js';
import { sleepSnapshot } from '../services/surahPlayback.js';
// (Blueprint E step 2) extracted view parts live in their own modules;
// this file re-exports the builders so existing importers keep working.
// Session transients moved to state.mushafSession (v5.2.9) and are set
// via actions.setMushafSession — no module setters remain here.
export { buildMushafBookmarks } from './mushafBookmarks.js';
import { BISMILLAH_AR, tajweedPrefsOf } from '../domain/tajweed.js';
import { resolveCompareTexts } from '../domain/translationCompare.js';
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

/**
 * (v5.4.0, P0-2b — ported from the v5.3.0 audit) the printed horizontal
 * sajdah-line accent rides ONLY over سُجَّدًا in As-Sajdah 15 — the
 * fifteen mawadi' keep their ۩ mark; this one ayah also carries the
 * printed line-over-word convention. Module scope (not function scope)
 * so the chapter closure below can never read them before init.
 */
const SAJDA_ACCENT_SURAH = 32;
const SAJDA_ACCENT_AYAH = 15;
const SAJDA_ACCENT_WORD = ['سُجَّدًا', 'سَجَدُوا'];

/** Distinct surah chapters + the multi-surah recitation picker live in
 *  the player part (mushafPlayer.js) — re-exported here so the modal
 *  handler and every test keep importing from the facade untouched. */
export { pageChapters, buildMushafPlayPick } from './mushafPlayer.js';

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
  const meta = state.mushaf.meta;
  // (v5.17.21, FIXED) `s`/`ay` resolve the PAGE, not merely the marker. The
  // deep link shipped reading them for a highlight and then still deriving the
  // page from the URL alone, so `#/mushaf?s=2&ay=255` opened Al-Fatihah 1
  // with nothing marked anywhere — a silent wrong answer about scripture
  // position, which in a mushaf is the worst kind of wrong. The map was
  // already loaded (mushaf-meta.json carries all 6,236 ayahPages entries);
  // mushafRoutePage() reads it, and the jump drawer resolves "you are here"
  // through the same call, so no two surfaces can disagree about where an
  // ayah is. `page` still wins when the URL carries one.
  const { page, surah: wantSurah, ayah: wantAyah } = mushafRoutePage(state);
  const pageDoc = state.mushaf.pages[String(page)];
  const prefs = state.settings.mushafPrefs;
  const font = MUSHAF_FONTS.find((f) => f.id === prefs.font) || MUSHAF_FONTS[0];
  const paper = MUSHAF_PAPERS.find((p) => p.id === prefs.paper) || MUSHAF_PAPERS[0];
  const fullscreen = state.mushafFullscreen === true;
  // Defense-in-depth (review v3.3 B1): prefs arrive sanitized from the
  // store, but never interpolate a raw settings value into a style
  // attribute — coerce to a clamped number so even a future code path
  // that skips sanitization cannot break out of the attribute.
  // (v5.2.87, P0-3) clamp widened 0.8–1.6 → 0.6–2.2: the store already
  // sanitizes to this range and the fullscreen auto-fit engine settles
  // anywhere inside it — the old clamp silently pinned fit results.
  // (v5.17.22) Elder Mode reaches the mushaf. A mushaf owning its own
  // typography is correct — it has its own size control, and the fullscreen
  // auto-fit needs a scale it can drive. But owning it silently meant the
  // app's accessibility promise lapsed on the one screen that matters most:
  // a hostile review measured mushaf chrome at 9.4px and IDENTICAL under
  // Elder Mode and 200%. So Elder Mode now raises the mushaf's own scale by
  // the same step the rest of the app uses, instead of being ignored.
  const elderStep = state.settings?.elderMode === true ? 1.18 : 1;
  const mushafScale = clamp((Number(prefs.fontScale) || 1) * elderStep, 0.6, 2.2);
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
      <h1 class="sr-only">${escapeHTML(t('mushaf.title', lang))}</h1>
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

  const chaptersOf = (doc, rov) =>
    doc.chapters
      .map((chapter) => {
        const showBanner = chapter.startsHere;
        // The Bismillah is a header for every surah that opens with one, and
        // that is not every surah. At-Tawbah has none. Al-Fatiha is the case
        // this guard originally missed: there the Basmala *is* ayah 1, so a
        // header band plus the numbered verse printed the same words twice on
        // the most-read page in the mushaf. data/mushaf/1.json has it right —
        // verse 1 carries the text and there is no separate header entry — so
        // the renderer was the thing corrupting correct data.
        const showBismillah = chapter.startsHere && chapter.number !== 9 && chapter.number !== 1;
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
        <span class="mushaf-surah-banner__flank" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/></svg></span>
        <span class="mushaf-surah-banner__frame">
          <span class="mushaf-surah-banner__name">${escapeHTML(chapter.titleAr)}</span>
          ${surahAyahCountLine(state, chapter, lang)}
        </span>
        <span class="mushaf-surah-banner__flank" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/></svg></span>
      </button>
        ${showBismillah ? buildBismillahHTML({ text: BISMILLAH_AR, surah: chapter.number, style: prefs.bismillahStyle, cls: 'mushaf-bismillah', lang, underline: prefs.wordByWordStudy && prefs.wordUnderline, tajweed: prefs.tajweedColoring, prefs: tajweedPrefsOf(state) }) : ''}
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
              lang,
              // (v5.4.0, P0-2b) the printed horizontal sajdah-line accent
              // rides ONLY over سُجَّدًا in As-Sajdah 15 — matched
              // harakat-folded inside renderAyahWords; the fifteen
              // mawadi' keep their ۩ mark (sajdaMark below).
              accentWord:
                Number(chapter.number) === SAJDA_ACCENT_SURAH &&
                Number(v.number) === SAJDA_ACCENT_AYAH
                  ? SAJDA_ACCENT_WORD
                  : null,
            });
            // One tab stop per ayah: in reading mode the ayah itself is the
            // button and the marker is decorative; in word-study mode each
            // word is tappable, so the ayah span steps aside and the marker
            // carries the single stop. (Both used to be buttons — a 15-ayah
            // page meant ~30 Tab stops.)
            // (v5.12.0 hostile review) roving: only the page's FIRST ayah
            // holds the stop — Left/Right walk the page in book order and
            // carry the stop along (events.js), so Tab crosses a 15-ayah
            // page in a single stop like the tafsir word runs.
            const rovIdx = rov.n++;
            const firstStop = rovIdx === 0 ? '0' : '-1';
            const focusAttrs = prefs.wordByWordStudy ? '' : `tabindex="${firstStop}" role="button"`;
            const markerAttrs = prefs.wordByWordStudy
              ? `tabindex="${firstStop}" role="button"`
              : 'aria-hidden="true"';
            // The printed sajda mark ۩ rides after the ayah-end marker at
            // the fifteen places of prostration, in the illumination gold.
            const sajdaMark = isSajda
              ? `<span class="mushaf-ayah__sajda" title="${t('mushaf.sajda', lang)}">\u06E9</span>`
              : '';
            const isTarget = wantSurah === Number(chapter.number) && wantAyah === Number(v.number);
            return `<span class="mushaf-ayah ${isMarked ? 'mushaf-ayah--bookmarked' : ''} ${isReciting ? 'mushaf-ayah--reciting' : ''}${isTarget ? ' mushaf-ayah--target' : ''}" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" ${focusAttrs} aria-label="${t('quran.ayah', lang)} ${toEasternArabicNumerals(v.number)}${isSajda ? ` — ${t('mushaf.sajda', lang)}` : ''}">${wordsHtml}<span class="mushaf-ayah__marker" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" ${markerAttrs}>\uFD3F${toEasternArabicNumerals(v.number)}\uFD3E</span>${sajdaMark}${isMarked ? '<span class="mushaf-ayah__bookmark-flag" aria-hidden="true">\u2726</span>' : ''}</span>`;
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
      <span class="mushaf-topbar__title" aria-label="${escapeHTML(headerName)} \u00B7 ${juzLabel}">
        ${escapeHTML(headerName)} \u00B7 ${juzLabel}
      </span>
      <button type="button" class="icon-btn" data-action="mushaf-open-jump" aria-label="${t('mushaf.jumpTo', lang)}" title="${t('mushaf.jumpTo', lang)}">
        ${icon('grid', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-page-find" aria-label="${t('mushaf.findOnPage', lang)}" title="${t('mushaf.findOnPage', lang)}">
        ${icon('search', { size: 18 })}
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
  // (v5.4.0, P0-3) the auto-fit engine reads this hook; CSS may target the
  // active typeface per page wrap (orthography per typeface, P0-2a).
  const fontAttr = ` data-mushaf-font="${font.id}"`;
  const pageArticle = (pageNum, doc) => `
      <article class="mushaf-page ${dir ? `mushaf-page--flip-${dir}` : ''} ${fsAnim ? `mushaf-page--fs-${fsAnim}` : ''} ${prefs.pageFlipAnimation ? '' : 'mushaf-page--no-anim'} ${doc ? '' : 'mushaf-page--pending'}" dir="rtl" lang="ar" style="${pageStyleVars}"${fontAttr}>
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
        <div class="mushaf-page__text">${doc ? chaptersOf(doc, { n: 0 }) : skeletonLines(lang, [88, 96, 80, 92, 84, 72, 90, 66])}</div>
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
  const study = state.studyTray;
  const studySurah = study ? Math.floor(Number(study.surah)) : null;
  const studyAyah = study ? Math.floor(Number(study.ayah)) : null;
  const studyDocs = leftDoc ? [rightDoc, leftDoc] : [rightDoc];
  const studyVerse =
    studySurah && studyAyah
      ? studyDocs
          .flatMap((doc) => doc?.chapters || [])
          .find((chapter) => Number(chapter.number) === studySurah)
          ?.verses?.find((verse) => Number(verse.number) === studyAyah)
      : null;
  // The study rail belongs to the READING surface, not to the optional
  // translation tray. This keeps an ayah tap contextual on the actual
  // Mushaf while leaving the paper itself visually untouched.
  const studyRail =
    !fullscreen && isStudyTrayOpen(state, studySurah, studyAyah)
      ? `<section class="mushaf-study-rail" aria-label="${escapeHTML(t('study.trayTitle', lang))}" aria-live="polite">
          ${buildStudyTray(state, studySurah, studyAyah, studyVerse?.text || null)}
        </section>`
      : '';
  // The translation tray remains a separate, page-wide reading aid. It never
  // becomes the hidden home of the active ayah's study state.
  const tray =
    !fullscreen && prefs.translationPanel
      ? `<div class="mushaf-tray">${buildTranslationTray(state, studyDocs, lang)}</div>`
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
    ${studyRail}
    ${tray}
    <nav class="mushaf-nav">
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-prev" ${canPrev ? '' : 'disabled'} aria-label="${isRTL(lang) ? t('mushaf.prevPage', lang) : `${t('mushaf.prevPage', lang)}. ${t('mushaf.bookOrderNote', lang)}`}" title="${t('mushaf.prevPage', lang)}">
        ${icon('chevronRight', { size: 22 })}
      </button>
      <p class="mushaf-nav__hint">${t('mushaf.swipeHint', lang)}</p>
      <button type="button" class="icon-btn mushaf-nav__btn" data-action="mushaf-next" ${canNext ? '' : 'disabled'} aria-label="${isRTL(lang) ? t('mushaf.nextPage', lang) : `${t('mushaf.nextPage', lang)}. ${t('mushaf.bookOrderNote', lang)}`}" title="${t('mushaf.nextPage', lang)}">
        ${icon('chevronLeft', { size: 22 })}
      </button>
    </nav>
  </section>`;
}

/**
 * (v4.5) "Juz 18 · 3/8" — the juz label with its eighth-of-juz position,
 * the hizb-quarter rhythm the printed mushaf carries in its margins.
 * Per page, because a spread's two pages can sit in different juz.
 */
function juzLabelFor(meta, page, juz, lang) {
  const eighth = juzEighth(meta?.juzFirstPage, page, juz);
  // (v5.17.21) The eighth is derived by dividing the juz's page span, not read
  // from a margin. Printing it as "1/8" in the page header gave an
  // approximation the visual authority of printed data — while the hizb
  // drawer, one screen away, carried an honest note saying positions are
  // approximate. One convention, applied twice: the fraction is marked as
  // estimated here too, and the raw number stays available on hover/tap.
  return `${t('mushaf.juz', lang)} ${numFor(lang, juz)} \u00B7 ${numFor(lang, eighth)}/${numFor(lang, 8)}${t('mushaf.approxMark', lang)}`;
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
/**
 * (v5.2.23) Fullscreen session visibility, pure and unit-tested: the
 * session console + position counter ride the WHOLE recitation session,
 * not just the pages showing the recited surah (turning the page must
 * never strand audio without controls — the player bar is CSS-hidden in
 * fullscreen). recitingThis only decides the main play button's
 * stop-this vs play-this reading.
 */
export function fsRecitationState(sp, visibleSurahNumbers) {
  const sessionActive = sp?.active === true;
  return {
    sessionActive,
    recitingThis:
      sessionActive && (visibleSurahNumbers || []).some((n) => Number(n) === Number(sp.surah)),
  };
}

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
  // (v5.2.23) the SESSION outlives the visible page: turning away from the
  // recited surah must never strand audio without controls (the player bar
  // is CSS-hidden in fullscreen and the console used to vanish with the
  // surah). sessionActive drives the console + counter; recitingThis only
  // decides whether the main play button reads stop-this or play-this.
  const { sessionActive, recitingThis } = fsRecitationState(
    sp,
    visibleSurahs.map((c) => c.number)
  );
  const qPos =
    recitingThis &&
    Array.isArray(sp.queue) &&
    sp.queue.length > 1 &&
    Number.isFinite(Number(sp.qIndex))
      ? ` · ${Number(sp.qIndex) + 1}/${sp.queue.length}`
      : '';
  // (v5.12.0) start-from-this-page (the button keeps stop while reciting).
  let pageFrom = null;
  if (!recitingThis && visibleSurahs.length === 1) {
    const docs = [leftPage, rightPage]
      .map((pg) => state.mushaf.pages?.[String(pg)])
      .filter(Boolean);
    const first = firstAyahOnPage(docs, headerChapter.number);
    if (Number.isFinite(first) && first > 1) pageFrom = first;
  }
  const playBtn = fsPlayButtonHTML({
    recitingThis,
    multiSurah: visibleSurahs.length > 1,
    surahNumber: headerChapter.number,
    pageFrom,
    lang,
  });
  // (v4.5) the page counter reads the SPREAD: "٣–٤ / ٦٠٤" in two-page
  // mode, the plain page number in single-page mode.
  const pageLabel = leftPage
    ? `${numFor(lang, rightPage)}\u2013${numFor(lang, leftPage)}`
    : numFor(lang, rightPage);
  // (v5.12.0 hostile review) book-order chevrons in LTR UI get the rule
  // in the accessible name (RTL needs no explanation); titles stay short.
  const orderName = (label) =>
    isRTL(lang) ? label : `${label}. ${t('mushaf.bookOrderNote', lang)}`;
  return `
    <button type="button" class="icon-btn mushaf-fs-exit" data-action="mushaf-toggle-fullscreen" aria-label="${t('mushaf.fullscreenExit', lang)}" title="${t('mushaf.fullscreenExit', lang)}">
      ${icon('compress', { size: 18 })}
    </button>
    <div class="mushaf-fs-controls" data-fs-controls>
      <button type="button" class="icon-btn" data-action="mushaf-open-settings" aria-label="${t('mushaf.settingsTitle', lang)}" title="${t('mushaf.settingsTitle', lang)}">
        ${icon('settings', { size: 18 })}
      </button>
      <!-- (v5.17.21) The jump drawer, in the mode you actually read in.
           Without it, fullscreen could turn pages by one and nothing else:
           reaching surah 36 meant exiting fullscreen, jumping, and
           re-entering — losing the auto-fit, re-running its bisection and
           re-arming the wake lock. Same action as the windowed topbar, so
           no new handler and no allowlist entry. -->
      <button type="button" class="icon-btn" data-action="mushaf-open-jump" aria-label="${t('mushaf.jumpTo', lang)}" title="${t('mushaf.jumpTo', lang)}">
        ${icon('grid', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-page-find" aria-label="${t('mushaf.findOnPage', lang)}" title="${t('mushaf.findOnPage', lang)}">
        ${icon('search', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-prev" ${canPrev ? '' : 'disabled'} aria-label="${orderName(t('mushaf.prevPage', lang))}" title="${t('mushaf.prevPage', lang)}">
        ${icon('chevronRight', { size: 20 })}
      </button>
      <span class="mushaf-fs-controls__page" dir="ltr">${pageLabel} / ${numFor(lang, MUSHAF_PAGE_COUNT)}</span>
      <button type="button" class="icon-btn" data-action="mushaf-next" ${canNext ? '' : 'disabled'} aria-label="${orderName(t('mushaf.nextPage', lang))}" title="${t('mushaf.nextPage', lang)}">
        ${icon('chevronLeft', { size: 20 })}
      </button>
      ${playBtn}
      ${sessionActive ? `<span class="mushaf-fs-controls__ayah" dir="ltr">${recitingThis ? `${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}` : `${escapeHTML(String(sp.surah))}:${escapeHTML(String(sp.ayah))} / ${escapeHTML(String(sp.total))}`}${escapeHTML(qPos)}</span>` : ''}
    </div>
    ${sessionActive ? buildFullscreenConsole(state, lang) : fileConsole(state, lang)}`;
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
        // (v5.2.74, UP-08) the compare second edition rides each tray row
        // once its overlay has landed — same resolver as the reader.
        // (v5.2.78, UP-06) up to two compare lines (B then C).
        const cmps = resolveCompareTexts(state, TRANSLATION_EDITIONS, chapter.number, v.number);
        const cmpHTML = cmps
          .map(
            (cmp) =>
              `<p class="mushaf-tray__text mushaf-tray__text--compare" dir="${cmp.edition.dir === 'rtl' ? 'rtl' : 'auto'}" lang="${cmp.lang}"><span class="ayah-card__compare-label">${escapeHTML(cmp.edition.native)}</span> ${escapeHTML(cmp.text)}</p>`
          )
          .join('');
        rows.push(`
      <div class="mushaf-tray__row">
        <span class="mushaf-tray__ref" dir="ltr">${escapeHTML(String(chapter.number))}:${escapeHTML(String(v.number))}</span>
        <p class="mushaf-tray__text" dir="auto">${escapeHTML(translation)}</p>
        ${cmpHTML}
        <button type="button" class="icon-btn icon-btn--sm" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" aria-label="${t('wordStudy.openTafsir', lang)}" title="${t('wordStudy.openTafsir', lang)}">
          ${icon('book', { size: 15 })}
        </button>
        ${(() => {
          // (v5.17.54, merged-plan item 7) the inline tray toggle: the same
          // study panel under this row. The book button above keeps the
          // modal path exactly as it was.
          const trayOpen = isStudyTrayOpen(state, chapter.number, v.number);
          return `<button type="button" class="icon-btn icon-btn--sm${trayOpen ? ' icon-btn--active' : ''}" data-action="study-tray-toggle" data-surah="${chapter.number}" data-ayah="${v.number}" aria-expanded="${trayOpen}" aria-label="${t('study.trayTitle', lang)}" title="${t('study.trayTitle', lang)}">
          ${icon(trayOpen ? 'chevronUp' : 'chevronDown', { size: 15 })}
        </button>`;
        })()}
      </div>
      ${isStudyTrayOpen(state, chapter.number, v.number) ? `<div class="mushaf-tray__study">${buildStudyTray(state, chapter.number, v.number, v.text)}</div>` : ''}`);
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
  // (v5.17.21, FIXED) Same route resolution as the page above: on a
  // `?s=&ay=` arrival the URL names no page, and "Memorise this surah" used
  // to offer Al-Fatihah while the book was open at 2:255.
  const { page } = mushafRoutePage(state);
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
      ${row('mushaf-open-page-find', 'mushaf.findOnPage', 'search')}
       ${row('mushaf-open-bookmarks', 'mushaf.bookmarks', 'bookmark')}
       ${row('word-bookmarks-open', 'wordStudy.savedWords', 'bookmark')}
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
      ${linkRow('nav.roots', 'book', VIEWS.ROOTS, {})}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionListen', lang)}</h3>
      ${
        follow
          ? row('recite-follow-toggle', 'audio.follow', 'eye')
          : row('recite-follow-toggle', 'audio.follow', 'eyeOff')
      }
      ${(() => {
        // (v5.12.0) speed + sleep live here too — the same chips as the
        // verse console, re-homed where listening happens (existing
        // actions, so no new handlers or allowlist entries).
        const speedRate = state.settings.audio?.verseRate ?? 1;
        const nap = sleepSnapshot();
        const napExtra = nap.enabled
          ? `<span class="mushaf-sheet__value" dir="ltr">${escapeHTML(nap.label)}</span>`
          : '';
        return (
          row(
            'recite-speed-cycle',
            'audio.speed',
            'gauge',
            `<span class="mushaf-sheet__value" dir="ltr">×${escapeHTML(String(speedRate))}</span>`
          ) + row('recite-sleep-cycle', 'audio.sleepTimer', 'bed', napExtra)
        );
      })()}
      ${linkRow('mushaf.reciters', 'volume', VIEWS.AUDIO)}
    </div>
    <div class="mushaf-sheet__group">
      <h3 class="mushaf-jump__heading">${t('mushaf.sectionTrack', lang)}</h3>
      ${row('mushaf-open-track', 'mushaf.khatma', 'target')}
    </div>
  </div>`;
}

// (v5.17.21) The jump drawer now lives in its own module because this file
// crossed its 800-line cap. Re-exported so every existing importer — the
// handler, the tests — keeps importing from the facade unchanged.
// (v5.17.21, FIXED) mushafRoutePage rides the facade too: the app layer
// resolves the mushaf route's page through this module (handlers/quran.js
// awaits the mushaf chunk for it), and a static import of the view from the
// app layer is exactly the boot-parse edge this lazy loader exists to avoid.
export { buildMushafJump, mushafRoutePage } from './mushafJump.js';

export { buildMushafTrack, buildKhatmaPlanForm } from './khatma.js';
export { buildMushafAyahDetail } from './ayahStudy.js';
