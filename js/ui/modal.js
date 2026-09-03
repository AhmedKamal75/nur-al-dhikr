/**
 * components/modal.js
 * A single reusable modal/dialog host mounted once in index.html (#modal-root).
 * Views call openModal(html) to show contextual UI (card menu, collection
 * picker, confirmation dialogs, the editor form) without each owning its own
 * overlay/focus-trap logic.
 */

import { t } from '../core/i18n.js';
import { store } from '../core/state.js';
import { icon } from '../core/icons.js';

let lastFocused = null;
let trapHandler = null;

const FOCUSABLE_SELECTOR =
  'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export function openModal(innerHTML, { labelledBy = null } = {}) {
  const root = document.getElementById('modal-root');
  const reopening = root.classList.contains('is-open');
  // (v4.2) two lifecycle fixes for modal-on-modal re-opens (settings panels
  // re-rendered from inside themselves, tajweed drills re-opening on every
  // word tap, bookmark folder switches…):
  //  1. Detach the previous trap BEFORE overwriting the reference — each
  //     re-open used to orphan a capture-phase keydown listener (and the
  //     whole detached modal subtree it closed over) on document, forever.
  //  2. Keep the ORIGINAL opener as the focus-restore target: capturing
  //     activeElement again mid-session grabbed an element about to be
  //     destroyed by the re-render, so the final Esc dumped keyboard/SR
  //     users on <body> instead of the button that opened the flow.
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler, true);
    trapHandler = null;
  }
  if (!reopening || !lastFocused || !document.contains(lastFocused)) {
    lastFocused = document.activeElement;
  }
  // Auto-label: when the caller doesn't pass labelledBy, fall back to the
  // first <h2 id> inside the body — the confirm/prompt builders always
  // render one. Dialogs used to open UNNAMED, so a screen reader announced
  // "dialog" and focused "Cancel" with no clue what was being confirmed.
  let label = labelledBy;
  if (!label) {
    const m = /<h2[^>]*\bid="([^"]+)"/.exec(innerHTML);
    if (m) label = m[1];
  }
  root.innerHTML = `
    <div class="modal-overlay" data-action="modal-close-overlay">
      <div class="modal" role="dialog" aria-modal="true" ${label ? `aria-labelledby="${label}"` : ''} data-modal-panel tabindex="-1">
        <button type="button" class="modal__close icon-btn" data-action="modal-close" aria-label="${t('common.close', store.getState().settings.language)}">${icon('close', { size: 18 })}</button>
        <div class="modal__body">${innerHTML}</div>
      </div>
    </div>`;
  root.classList.add('is-open');
  // Lock background scroll: on iOS a swipe on the overlay used to scroll
  // the page behind the sheet (.modal__body's overscroll-behavior only
  // contains scrolls that START inside the body).
  document.body.classList.add('modal-open');

  const panel = root.querySelector('[data-modal-panel]');
  // Prefer the first focusable element *inside the body* (the actual form/menu
  // content) over the close button, which sits outside .modal__body precisely
  // so it's never the default focus target.
  const body = root.querySelector('.modal__body');
  const preferredTarget = body?.querySelector(FOCUSABLE_SELECTOR);
  (preferredTarget || panel)?.focus({ preventScroll: true });

  document.addEventListener('keydown', onModalKeydown);
  trapHandler = (e) => trapFocus(e, panel);
  document.addEventListener('keydown', trapHandler, true);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.remove('is-open');
  root.innerHTML = '';
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', onModalKeydown);
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler, true);
    trapHandler = null;
  }
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeModal();
}

/** Keep Tab/Shift+Tab cycling within the modal panel while it's open. */
function trapFocus(e, panel) {
  if (e.key !== 'Tab' || !panel) return;
  const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!panel.contains(document.activeElement)) {
    // Focus somehow left the panel (e.g. programmatic blur) — pull it back in.
    e.preventDefault();
    first.focus();
  }
}

export function isModalOpen() {
  return document.getElementById('modal-root')?.classList.contains('is-open');
}
