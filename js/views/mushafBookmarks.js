/**
 * views/mushafBookmarks.js — the Mushaf bookmark manager with folders
 * (extracted from views/mushafReader.js, Blueprint E step 2). Pure
 * string templates; the folder filter is explicit user choice held in
 * module scope, corrected read-only at render (B12).
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { escapeHTML, pickLocale } from '../core/utils.js';
import { emptyStateHTML } from '../ui/emptyState.js';

/** Saved per-ayah bookmarks list, opened from the Mushaf topbar.
 *  Bookmarks can be filed into user-made folders and carry a short note.
 *  (v5.2.9) the folder filter lives in state.mushafSession — set by the
 *  bookmark manager UI, read here. A deleted folder's id corrects to
 *  __all__ read-only at render (B12: render never owns state).
 */
export function buildMushafBookmarks(state) {
  const lang = state.settings.language;
  const meta = state.mushaf.meta;
  const folders = state.ayahBookmarkFolders || [];
  const chosen = state.mushafSession?.bookmarkFilter || '__all__';
  // (B12) a deleted folder's filter corrects to __all__ LOCALLY — the old
  // code wrote the correction back mid-render, so render owned state that
  // only tests could reset.
  const effectiveFilter =
    chosen !== '__all__' && chosen !== '__unfiled__' && !folders.some((f) => f.id === chosen)
      ? '__all__'
      : chosen;

  const chip = (id, label, extra = '') => `
    <button type="button" class="chip chip--basis ${effectiveFilter === id ? 'chip--basis-active' : ''}" data-action="bookmark-filter-folder" data-folder="${escapeHTML(String(id))}" aria-pressed="${effectiveFilter === id}">
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
        effectiveFilter === '__all__' ||
        (effectiveFilter === '__unfiled__' && !folders.some((f) => f.id === b.folderId)) ||
        b.folderId === effectiveFilter
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
