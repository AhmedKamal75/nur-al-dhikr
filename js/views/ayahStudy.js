/**
 * views/ayahStudy.js — the per-ayah detail modal: Arabic, translation,
 * play/copy/share/study actions, hifz row, tafsir tab (extracted from
 * views/mushafReader.js, Blueprint E step 2).
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { ayahAudioUrl } from '../services/mushaf.js';
import { buildAyahStudyExtras } from './tafsirPanel.js';

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
