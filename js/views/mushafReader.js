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
import { planStatus, justCompletedKhatma } from '../khatma.js';
import { VIEWS, MUSHAF_PAGE_COUNT, MUSHAF_FONTS, MUSHAF_PAPERS } from '../config.js';
import { renderAyahWords, buildAyahStudyExtras } from './tafsirPanel.js';
import { skeletonMushafPage, skeletonLines } from '../components/skeleton.js';

/**
 * Which direction the page should animate in from, set by app.js right
 * before it dispatches a mushaf-prev/mushaf-next/swipe navigation. Read
 * (and consumed) exactly once by the next renderMushaf() call — the same
 * single-use transient-state pattern as bookmarkFolderFilter below.
 */
let flipDirection = null;
export function setFlipDirection(dir) {
  flipDirection = dir;
}

export function renderMushaf(state) {
  const lang = state.settings.language;
  const page = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
  const meta = state.mushaf.meta;
  const pageDoc = state.mushaf.pages[String(page)];
  const prefs = state.settings.mushafPrefs;
  const font = MUSHAF_FONTS.find((f) => f.id === prefs.font) || MUSHAF_FONTS[0];
  const paper = MUSHAF_PAPERS.find((p) => p.id === prefs.paper) || MUSHAF_PAPERS[0];
  // Defense-in-depth (review v3.3 B1): prefs arrive sanitized from the
  // store, but never interpolate a raw settings value into a style
  // attribute — coerce to a clamped number so even a future code path
  // that skips sanitization cannot break out of the attribute.
  const clampNum = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const mushafScale = clampNum(prefs.fontScale, 0.8, 1.6, 1);
  const mushafLineScale = clampNum(prefs.lineSpacing, 0.85, 1.3, 1);
  // Bookmark lookup set — built once per render, O(1) per ayah.
  const bookmarkedKeys = new Set(state.ayahBookmarks.map((b) => b.key));
  const dir = flipDirection;
  flipDirection = null; // single-use: consumed by this render

  if (!meta || !pageDoc) {
    return `
    <section class="view view--mushaf">
      <div class="mushaf-loading">${skeletonMushafPage(lang)}</div>
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
      ${showBismillah && prefs.bismillahStyle !== 'hidden' ? `<p class="mushaf-bismillah bismillah--${prefs.bismillahStyle}">\u0628ِ\u0633\u0652\u0645ِ \u0627\u0644\u0644\u0651\u064e\u0647ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646ِ \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645ِ</p>` : ''}
    `
        : '';

      const versesHtml = chapter.verses
        .map((v) => {
          const bmKey = `${chapter.number}:${v.number}`;
          const isMarked = bookmarkedKeys.has(bmKey);
          const isReciting = state.surahPlayback?.active && state.recitingAyahKey === bmKey;
          const words = state.quranWords[String(chapter.number)]?.[String(v.number)];
          const wordsHtml = renderAyahWords(v.text, words, chapter.number, v.number, {
            tappable: prefs.wordByWordStudy,
            underline: prefs.wordUnderline,
            tajweed: prefs.tajweedColoring,
          });
          const focusAttrs = prefs.wordByWordStudy ? '' : 'tabindex="0" role="button"';
          return `<span class="mushaf-ayah ${isMarked ? 'mushaf-ayah--bookmarked' : ''} ${isReciting ? 'mushaf-ayah--reciting' : ''}" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" ${focusAttrs} aria-label="${chapter.number}:${v.number}">${wordsHtml}<span class="mushaf-ayah__marker" data-action="mushaf-ayah-tap" data-surah="${chapter.number}" data-ayah="${v.number}" tabindex="0" role="button">\uFD3F${toEasternArabicNumerals(v.number)}\uFD3E</span>${isMarked ? '<span class="mushaf-ayah__bookmark-flag" aria-hidden="true">\u2726</span>' : ''}</span>`;
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
      <button type="button" class="icon-btn mushaf-topbar__bookmarks-btn ${state.ayahBookmarks.length ? 'icon-btn--badged' : ''}" data-action="mushaf-open-bookmarks" aria-label="${t('mushaf.bookmarks', lang)}">
        ${icon('bookmark', { size: 18 })}
      </button>
      <button type="button" class="icon-btn ${state.surahPlayback?.active && Number(state.surahPlayback.surah) === Number(headerChapter.number) ? 'icon-btn--playing' : ''}" data-action="surah-play" data-surah="${headerChapter.number}" aria-label="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}" title="${state.surahPlayback?.active ? t('audio.reciteStop', lang) : t('audio.reciteSurah', lang)}">
        ${icon(state.surahPlayback?.active && Number(state.surahPlayback.surah) === Number(headerChapter.number) ? 'stop' : 'play', { size: 18 })}
      </button>
      <button type="button" class="icon-btn ${(state.settings.audio?.ayahFollow ?? true) ? 'icon-btn--recite-follow' : ''}" data-action="recite-follow-toggle" aria-pressed="${state.settings.audio?.ayahFollow ?? true}" aria-label="${t('audio.follow', lang)}" title="${t('audio.follow', lang)}">
        ${icon((state.settings.audio?.ayahFollow ?? true) ? 'eye' : 'eyeOff', { size: 18 })}
      </button>
      <button type="button" class="icon-btn" data-action="mushaf-open-settings" aria-label="${t('mushaf.settingsTitle', lang)}">
        ${icon('settings', { size: 18 })}
      </button>
    </header>

    <div class="mushaf-page-wrap" data-mushaf-paper="${paper.id}" style="--mushaf-paper-bg:${paper.bg};--mushaf-paper-ink:${paper.ink};--mushaf-paper-border:${paper.border};">
      <article class="mushaf-page ${dir ? `mushaf-page--flip-${dir}` : ''} ${prefs.pageFlipAnimation ? '' : 'mushaf-page--no-anim'}" dir="rtl" lang="ar" style="--mushaf-font-family:${font.family};--mushaf-font-scale:${mushafScale};--mushaf-line-scale:${mushafLineScale};">
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
  if (!meta) return skeletonLines(lang, [64, 88, 64, 88, 64]);

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
      <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar__fill" style="width:${pct}%"></div>
      </div>
      <p class="mushaf-khatma__sub" dir="ltr">${readCount} / ${MUSHAF_PAGE_COUNT} · ${pct}%</p>
      ${planRows}
      ${planButtons}
      ${historyLine}
    </div>
    <h3 class="mushaf-jump__heading">${t('mushaf.surahs', lang)}</h3>
    <div class="mushaf-jump__surah-list">${surahButtons}</div>
    <h3 class="mushaf-jump__heading">${t('mushaf.juzSection', lang)}</h3>
    <div class="mushaf-jump__juz-list">${juzButtons}</div>
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
    <button type="button" class="chip chip--basis ${bookmarkFolderFilter === id ? 'chip--basis-active' : ''}" data-action="bookmark-filter-folder" data-folder="${id}">
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
      <div class="empty-state">
        ${icon('bookmark', { size: 32 })}
        <p>${t('mushaf.noBookmarks', lang)}</p>
        <p class="panel__subtext">${t('mushaf.noBookmarksHint', lang)}</p>
      </div>
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
      <button type="button" class="mushaf-bookmark-row__main" data-action="mushaf-jump-page" data-page="${b.page}">
        <span class="mushaf-bookmark-row__ref" dir="ltr">${b.surah}:${b.ayah}</span>
        <span class="mushaf-bookmark-row__name">${escapeHTML(name)} · ${t('mushaf.pageShort', lang)} ${b.page}</span>
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
    </div>
    ${buildAyahStudyExtras(state, surahNumber, ayahNumber, activeTafsirTab)}
  </div>`;
}
