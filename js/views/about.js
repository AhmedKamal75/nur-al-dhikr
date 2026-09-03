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
import { APP_VERSION } from '../core/config.js';

/** A "what you can do" row — icon + plain sentence. */
function capabilityRow(iconName, textKey, lang) {
  return `
  <li class="about-cap">
    <span class="about-cap__icon">${icon(iconName, { size: 18 })}</span>
    <span>${t(textKey, lang)}</span>
  </li>`;
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
