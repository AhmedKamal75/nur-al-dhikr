/**
 * views/certificate.js (v4.4)
 * Printable/exportable memorization certificate. Rendered from the SAME
 * milestone computation as the badges (domain/milestones.js) so paper and
 * progress can never disagree. Print CSS (cards.css, @media print) hides
 * the app chrome; the browser's own "Save as PDF" does the export.
 */

import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML } from '../core/utils.js';
import { certificateData } from '../domain/milestones.js';
import { toHijri } from '../domain/calendar.js';
import { emptyStateHTML } from '../ui/emptyState.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';

const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];
const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

function hijriTodayLabel(lang, toHijri) {
  const h = typeof toHijri === 'function' ? toHijri(new Date()) : null;
  if (!h) return '';
  const months = lang === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  return `${h.day} ${months[h.month - 1] || ''} ${h.year}`;
}

export function renderCertificate(state) {
  const lang = state.settings.language;
  const pagesMeta = state.mushaf.meta?.pages || [];
  const data = certificateData({
    hifzRecords: state.hifzRecords,
    mushafPagesRead: state.mushafPagesRead,
    pagesMeta,
  });

  if (!data) {
    return `
    <section class="view view--certificate">
      <h1 class="view__title">${t('certificate.title', lang)}</h1>
      ${emptyStateHTML({
        iconName: 'award',
        title: t('certificate.nothingYet', lang),
        hint: t('certificate.nothingYetHint', lang),
        actionHTML: `<a class="btn btn--primary btn--sm" href="${buildHash(VIEWS.MUSHAF)}" data-action="navigate" data-view="${VIEWS.MUSHAF}">${t('certificate.goRead', lang)}</a>`,
      })}
    </section>`;
  }

  const name = state.settings.profileName?.trim() || t('certificate.unnamed', lang);
  const juzLabel =
    data.juzList.length === 30
      ? t('certificate.wholeQuran', lang)
      : data.juzList.map((j) => `${t('certificate.juz', lang)} ${j}`).join(' · ');
  const surahLabel = t('certificate.surahCount', lang, { n: data.surahCount });

  return `
  <section class="view view--certificate">
    <h1 class="view__title">${t('certificate.title', lang)}</h1>
    <div class="cert" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <header class="cert__head">
        <span class="cert__mark">${icon('quran', { size: 30 })}</span>
        <p class="cert__bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <h2 class="cert__title">${t('certificate.heading', lang)}</h2>
      </header>
      <p class="cert__name-label">${t('certificate.presentedTo', lang)}</p>
      <p class="cert__name">${escapeHTML(name)}</p>
      <div class="cert__body">
        <p>${t('certificate.line1', lang)}</p>
        <p class="cert__achievements">
          ${juzLabel ? `<span class="cert__chip">${escapeHTML(juzLabel)}</span>` : ''}
          <span class="cert__chip">${escapeHTML(surahLabel)}</span>
        </p>
        <p>${t('certificate.line2', lang, { n: data.pagesRead })}</p>
      </div>
      <footer class="cert__foot">
        <span>${escapeHTML(hijriTodayLabel(lang, toHijri))}</span>
        <span class="cert__app">Nūr al-Dhikr</span>
      </footer>
    </div>
    <div class="panel__actions cert__actions no-print">
      <button type="button" class="btn btn--primary btn--sm" data-action="certificate-print">${icon('printer', { size: 15 })} ${t('certificate.print', lang)}</button>
      <a class="btn btn--ghost btn--sm" href="${buildHash(VIEWS.MUSHAF)}" data-action="navigate" data-view="${VIEWS.MUSHAF}">${t('certificate.back', lang)}</a>
    </div>
    <p class="panel__subtext no-print">${t('certificate.printHint', lang)}</p>
  </section>`;
}
