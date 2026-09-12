/**
 * views/palette.js — command palette ("search all things", Spotlight-style).
 *
 * One overlay to reach everything: navigation destinations, surahs by
 * name/number, Quran ayahs, adhkar/duas, reciters, hadith books, and a few
 * global actions — grouped, keyboard-navigable (↑↓ + Enter + Esc), with
 * <mark> highlights on literal matches. Pure string builders over injected
 * data (no store reads here); the app layer (app/palette.js) wires the
 * overlay, shortcut, and live updates.
 */
import { escapeHTML, normalizeSearch } from '../core/utils.js';
import { buildHash } from '../core/router.js';
import { VIEWS } from '../core/config.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { search as searchLibrary, searchSurahs } from '../domain/search.js';
import { searchQuran } from '../domain/quranSearch.js';
import { searchReciters } from '../services/audioCatalog.js';
import { contentTitleFor } from '../domain/localeContent.js';

/** Navigation destinations searchable from the palette. */
const NAV_TARGETS = [
  { view: VIEWS.HOME, icon: 'home', label: 'nav.home' },
  { view: VIEWS.LIBRARY, icon: 'library', label: 'nav.library' },
  { view: VIEWS.QURAN, icon: 'quran', label: 'nav.quran' },
  { view: VIEWS.HADITH, icon: 'mosque', label: 'nav.hadith' },
  { view: VIEWS.SEARCH, icon: 'search', label: 'nav.search' },
  { view: VIEWS.AUDIO, icon: 'volume', label: 'nav.audio' },
  { view: VIEWS.TASBIH, icon: 'tasbih', label: 'nav.tasbih' },
  { view: VIEWS.PRAYER, icon: 'prayer-rug', label: 'nav.prayer' },
  { view: VIEWS.QIBLA, icon: 'compass', label: 'nav.qibla' },
  { view: VIEWS.CALENDAR, icon: 'calendar', label: 'nav.calendar' },
  { view: VIEWS.FAVORITES, icon: 'heart', label: 'nav.favorites' },
  { view: VIEWS.SETTINGS, icon: 'settings', label: 'nav.settings' },
];

/** Global actions offered from the palette. */
const PALETTE_ACTIONS = [
  { action: 'quick-theme-toggle', icon: 'moon', label: 'a11y.themeToggle' },
  { action: 'quiz-start', icon: 'star', label: 'quiz.start' },
];

/**
 * Wrap literal (case-insensitive) occurrences of each raw term in <mark>.
 * Normalization-aware matching is the providers' job; this only decorates
 * what is visibly present, so it never invents highlights.
 */
export function highlightMatch(text, terms) {
  let out = escapeHTML(String(text ?? ''));
  const seen = new Set();
  for (const raw of terms || []) {
    const term = escapeHTML(String(raw || '').trim());
    if (!term || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    const low = out.toLowerCase();
    let idx = low.indexOf(term.toLowerCase());
    while (idx !== -1) {
      out = `${out.slice(0, idx)}<mark>${out.slice(idx, idx + term.length)}</mark>${out.slice(idx + term.length)}`;
      const next = out.toLowerCase().indexOf(term.toLowerCase(), idx + 13 + term.length);
      idx = next;
    }
  }
  return out;
}

/**
 * Build grouped palette results. All data arrives injected (deps) so this
 * stays pure and unit-testable:
 *   { query, lang, libraryHits?, surahs?, ayahIndex?: {hits, surahs, meta} | null,
 *     reciters?, customs?, books?, history?, settingsReciter? }
 */
export function buildPaletteGroups(deps) {
  const { query = '', lang = 'en' } = deps;
  const q = normalizeSearch(query);
  const terms = q.split(' ').filter(Boolean);
  const groups = [];

  const matchText = (en, ar) => {
    if (!q) return true;
    const hay = normalizeSearch(`${en || ''} ${ar || ''}`);
    // Compact form too: "quran" must match the "Qur'an" label, whose
    // apostrophe normalizes to a space ("qur an").
    const flat = hay.replace(/ /g, '');
    return terms.every((term) => hay.includes(term) || flat.includes(term.replace(/ /g, '')));
  };

  // Go to — destinations (unfiltered on empty query).
  const navRows = NAV_TARGETS.filter((n) => matchText(t(n.label, 'en'), t(n.label, 'ar'))).map(
    (n) => ({
      kind: 'link',
      icon: n.icon,
      primary: t(n.label, lang),
      secondary: '',
      href: buildHash(n.view),
      action: 'navigate',
      data: { view: n.view },
    })
  );
  if (navRows.length)
    groups.push({ key: 'navigate', title: t('palette.navigate', lang), rows: navRows });

  if (!q) {
    // Empty query: recent searches double as suggestions.
    const history = (deps.history || []).slice(0, 5).map((h) => ({
      kind: 'button',
      icon: 'search',
      primary: h,
      secondary: '',
      action: 'run-search',
      data: { query: h },
    }));
    if (history.length)
      groups.push({ key: 'history', title: t('search.recent', lang), rows: history });
    groups.push({
      key: 'action',
      title: t('palette.action', lang),
      rows: PALETTE_ACTIONS.map((a) => ({
        kind: 'button',
        icon: a.icon,
        primary: t(a.label, lang),
        secondary: '',
        action: a.action,
        data: {},
      })),
    });
    return { groups, terms };
  }

  // Surahs — names in every script + number (the surah-list upgrade).
  const surahHits = searchSurahs(deps.surahs || [], query).slice(0, 4);
  if (surahHits.length) {
    groups.push({
      key: 'surah',
      title: t('palette.surah', lang),
      rows: surahHits.map((s) => ({
        kind: 'link',
        icon: 'quran',
        primary: `${s.number} · ${lang === 'ar' ? s.nameAr : s.nameTransliteration || s.nameEn}`,
        secondary: lang === 'ar' ? s.nameTransliteration || s.nameEn : s.nameAr,
        href: buildHash(VIEWS.QURAN, { id: s.number }),
        action: 'navigate',
        data: { view: VIEWS.QURAN, id: String(s.number) },
      })),
    });
  }

  // Quran ayahs (only when the full-text index is ready).
  if (deps.ayahIndex?.hits?.length) {
    groups.push({
      key: 'ayah',
      title: t('palette.ayah', lang),
      rows: deps.ayahIndex.hits.slice(0, 5).map((h) => ({
        kind: 'link',
        icon: 'book',
        primary: h.text.length > 120 ? `${h.text.slice(0, 120)}…` : h.text,
        secondary: h.ref,
        href: buildHash(VIEWS.QURAN, { id: h.s, ay: String(h.a) }),
        action: 'navigate',
        data: { view: VIEWS.QURAN, id: String(h.s), ay: String(h.a) },
      })),
    });
  }

  // Adhkar & duas (precomputed library hits from the app layer).
  const libHits = (deps.libraryHits || []).slice(0, 6);
  if (libHits.length) {
    groups.push({
      key: 'library',
      title: t('palette.library', lang),
      rows: libHits.map((h) => {
        const title = contentTitleFor(h.item, lang) || String(h.item?.arabic || '').slice(0, 60);
        return {
          kind: 'button',
          icon: 'book',
          primary: title,
          secondary: h.category ? String(h.category.name?.[lang] || h.category.name?.en || '') : '',
          action: 'open-focus',
          data: { categoryId: h.item?.category_id || '', itemId: h.itemId },
        };
      }),
    });
  }

  // Reciters (catalog + customs, when loaded).
  const recHits = (deps.reciters || []).slice(0, 4);
  if (recHits.length) {
    groups.push({
      key: 'reciter',
      title: t('palette.reciter', lang),
      rows: recHits.map((r) => ({
        kind: 'button',
        icon: 'volume',
        primary: lang === 'ar' && r.nameAr ? r.nameAr : r.nameEn,
        secondary: r.rewaya || '',
        action: 'audio-pick-moshaf',
        data: { id: r.id },
      })),
    });
  }

  // Hadith books.
  const bookHits = (deps.books || []).filter((b) => matchText(b.name?.en, b.name?.ar)).slice(0, 3);
  if (bookHits.length) {
    groups.push({
      key: 'book',
      title: t('palette.book', lang),
      rows: bookHits.map((b) => ({
        kind: 'link',
        icon: 'mosque',
        primary: lang === 'ar' ? b.name?.ar || b.name?.en : b.name?.en || b.name?.ar,
        secondary: '',
        href: buildHash(VIEWS.HADITH, { id: b.id }),
        action: 'navigate',
        data: { view: VIEWS.HADITH, id: b.id },
      })),
    });
  }

  // Actions (filtered like everything else).
  const actRows = PALETTE_ACTIONS.filter((a) => matchText(t(a.label, 'en'), t(a.label, 'ar'))).map(
    (a) => ({
      kind: 'button',
      icon: a.icon,
      primary: t(a.label, lang),
      secondary: '',
      action: a.action,
      data: {},
    })
  );
  if (actRows.length)
    groups.push({ key: 'action', title: t('palette.action', lang), rows: actRows });

  return { groups, terms };
}

/** Render one selectable row (flat index assigned by the renderer). */
function paletteRowHTML(row, terms, idx, active) {
  const primary = highlightMatch(row.primary, terms);
  const secondary = row.secondary
    ? `<span class="palette__sub">${highlightMatch(row.secondary, terms)}</span>`
    : '';
  const cls = `palette__item${active === idx ? ' palette__item--active' : ''}`;
  const dataAttrs = Object.entries(row.data || {})
    .map(([k, v]) => `data-${k}="${escapeHTML(String(v ?? ''))}"`)
    .join(' ');
  const inner = `${icon(row.icon || 'search', { size: 16 })}<span class="palette__text"><span class="palette__main">${primary}</span>${secondary}</span>`;
  if (row.kind === 'link') {
    return `<a class="${cls}" href="${escapeHTML(row.href)}" data-action="${escapeHTML(row.action)}" ${dataAttrs} data-idx="${idx}">${inner}</a>`;
  }
  return `<button type="button" class="${cls}" data-action="${escapeHTML(row.action)}" ${dataAttrs} data-idx="${idx}">${inner}</button>`;
}

/** Render groups with a running flat index; activeIdx highlights one row. */
export function paletteGroupsHTML(groups, terms, lang, activeIdx = 0) {
  let idx = 0;
  return groups
    .map(
      (g) => `
    <p class="palette__group">${escapeHTML(g.title)}</p>
    ${g.rows
      .map((r) => {
        const html = paletteRowHTML(r, terms, idx, activeIdx);
        idx += 1;
        return html;
      })
      .join('')}`
    )
    .join('');
}

/** Count selectable rows (for keyboard wrap-around). */
export function paletteRowCount(groups) {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}

/** The overlay shell: input + live results + hint footer. */
export function paletteShellHTML(lang) {
  return `
  <div class="palette">
    <h2 id="palette-title" class="sr-only">${escapeHTML(t('nav.search', lang))}</h2>
    <input type="search" class="palette__input" id="palette-input"
      placeholder="${escapeHTML(t('search.placeholder', lang))}" aria-label="${escapeHTML(t('search.placeholder', lang))}"
      autocomplete="off" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-activedescendant="" />
    <div class="palette__results" id="palette-results" role="listbox" aria-label="${escapeHTML(t('nav.search', lang))}"></div>
    <p class="palette__hint">${escapeHTML(t('palette.hint', lang))}</p>
  </div>`;
}

// Re-exported for the app layer so providers stay in one module.
export { searchLibrary, searchSurahs, searchQuran, searchReciters };
