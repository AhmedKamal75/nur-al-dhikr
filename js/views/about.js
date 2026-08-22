/**
 * views/about.js
 */
import { t } from '../i18n.js';
import { escapeHTML, pickLocale } from '../utils.js';
import { APP_VERSION } from '../config.js';

export function renderAbout(state) {
  const lang = state.settings.language;
  const docs = Object.values(state.library.documents);
  const sources = docs.map((d) => `<li>${escapeHTML(pickLocale(d.metadata.name, lang))} \u2014 ${escapeHTML(pickLocale(d.metadata.source, lang))}</li>`).join('');

  return `
  <section class="view view--about">
    <h1 class="view__title">${t('about.title', lang)}</h1>
    <p class="about-mission">${t('about.mission', lang)}</p>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.privacy', lang)}</h2></div>
      <p>${t('about.privacyBody', lang)}</p>
    </section>

    <section class="panel">
      <div class="panel__header"><h2>${t('about.sources', lang)}</h2></div>
      <ul class="source-list">${sources}</ul>
    </section>

    <p class="about-version">${t('about.version', lang)}: ${APP_VERSION}</p>
    <p class="about-builtwith">${t('about.builtWith', lang)}</p>
  </section>`;
}
