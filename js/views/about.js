/**
 * views/about.js (v5.0.0 — rewritten for humans)
 * The About page answers what a person actually asks when they open it:
 * what is this, what can it do for me, does it respect me (privacy),
 * where does the content come from, and how do I keep it (offline /
 * install / backup). The "For AI assistants" section is retired — this
 * page speaks to the person holding the device.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { APP_VERSION, VIEWS } from '../core/config.js';
import { buildHash } from '../core/router.js';

/** A "what you can do" row — icon + plain sentence. */
function capabilityRow(iconName, textKey, lang) {
  return `
  <li class="about-cap">
    <span class="about-cap__icon">${icon(iconName, { size: 18 })}</span>
    <span>${t(textKey, lang)}</span>
  </li>`;
}

/**
 * (v5.2.0) Feature guide: every major area as a tappable row that opens
 * it. Titles reuse the nav dictionary; only the one-line helpers are new
 * keys (about.gd.*). All targets are param-less routes so a plain
 * `navigate` dispatch suffices — no new data-actions.
 */
const GUIDE_ROWS = [
  { view: 'MUSHAF', titleKey: 'about.guide.mushaf', iconName: 'book', descKey: 'about.gd.mushaf' },
  { view: 'QURAN', titleKey: 'nav.quran', iconName: 'quran', descKey: 'about.gd.quran' },
  { view: 'HADITH', titleKey: 'nav.hadith', iconName: 'library', descKey: 'about.gd.hadith' },
  { view: 'LIBRARY', titleKey: 'nav.library', iconName: 'heart', descKey: 'about.gd.library' },
  { view: 'PRAYER', titleKey: 'nav.prayer', iconName: 'mosque', descKey: 'about.gd.prayer' },
  { view: 'QIBLA', titleKey: 'nav.qibla', iconName: 'compass', descKey: 'about.gd.qibla' },
  { view: 'TASBIH', titleKey: 'nav.tasbih', iconName: 'bead', descKey: 'about.gd.tasbih' },
  { view: 'RAMADAN', titleKey: 'nav.ramadan', iconName: 'moon', descKey: 'about.gd.ramadan' },
  { view: 'ZAKAT', titleKey: 'nav.zakat', iconName: 'calculator', descKey: 'about.gd.zakat' },
  {
    view: 'JOURNAL',
    titleKey: 'about.guide.journal',
    iconName: 'feather',
    descKey: 'about.gd.journal',
  },
  {
    view: 'CALENDAR',
    titleKey: 'nav.calendar',
    iconName: 'calendar',
    descKey: 'about.gd.calendar',
  },
  {
    view: 'STATISTICS',
    titleKey: 'nav.statistics',
    iconName: 'stats',
    descKey: 'about.gd.statistics',
  },
];

function guideRow(row, lang) {
  const view = VIEWS[row.view];
  return `
  <a class="guide-row" href="${buildHash(view)}" data-action="navigate" data-view="${view}">
    <span class="guide-row__icon">${icon(row.iconName, { size: 20 })}</span>
    <span class="guide-row__text">
      <span class="guide-row__title">${t(row.titleKey, lang)}</span>
      <span class="guide-row__desc">${t(row.descKey, lang)}</span>
    </span>
    <span class="guide-row__go">${icon('chevronRight', { size: 16 })}</span>
  </a>`;
}

export function renderAbout(state) {
  const lang = state.settings.language;
  const docs = Object.values(state.library.documents);
  const sources = docs
    .map(
      (d) =>
        `<li>${escapeHTML(pickLocale(d.metadata.name, lang))} \u2014 ${escapeHTML(pickLocale(d.metadata.source, lang))}</li>`
    )
    .join('');

  return `
  <section class="view view--about">
    <div class="about-hero">
      <h1 class="view__title">${t('about.title', lang)}</h1>
      <p class="about-mission">${t('about.mission', lang)}</p>
      <p class="about-version">${t('about.version', lang)}: ${APP_VERSION}</p>
    </div>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.whatItIs', lang)}</h2></div>
      <p>${t('about.whatItIsBody', lang)}</p>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.capabilities', lang)}</h2></div>
      <ul class="about-caps">
        ${capabilityRow('quran', 'about.capQuran', lang)}
        ${capabilityRow('mosque', 'about.capPrayer', lang)}
        ${capabilityRow('library', 'about.capAdhkar', lang)}
        ${capabilityRow('edit', 'about.capManage', lang)}
        ${capabilityRow('bell', 'about.capSchedules', lang)}
        ${capabilityRow('stats', 'about.capProgress', lang)}
      </ul>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.guide', lang)}</h2></div>
      <p class="panel__subtext">${t('about.guideHint', lang)}</p>
      <div class="guide-list">
        ${GUIDE_ROWS.map((r) => guideRow(r, lang)).join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.privacy', lang)}</h2></div>
      <p>${t('about.privacyBody', lang)}</p>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.sources', lang)}</h2></div>
      <ul class="source-list">${sources}</ul>
      <p class="panel__subtext">${t('about.hadithSources', lang)}</p>
      <p class="panel__subtext">${t('about.verifyNote', lang)}</p>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.offline', lang)}</h2></div>
      <p>${t('about.offlineBody', lang)}</p>
    </section>

    <p class="about-builtwith">${t('about.builtWith', lang)}</p>
  </section>`;
}
