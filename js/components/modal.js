/**
 * components/modal.js
 * A single reusable modal/dialog host mounted once in index.html (#modal-root).
 * Views call openModal(html) to show contextual UI (card menu, collection
 * picker, confirmation dialogs, the editor form) without each owning its own
 * overlay/focus-trap logic.
 */

import { icon } from '../icons.js';

let lastFocused = null;
let trapHandler = null;

const FOCUSABLE_SELECTOR =
  'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export function openModal(innerHTML, { labelledBy = null, size = 'default' } = {}) {
  const root = document.getElementById('modal-root');
  lastFocused = document.activeElement;
  root.innerHTML = `
    <div class="modal-overlay" data-action="modal-close-overlay">
      <div class="modal modal--${size}" role="dialog" aria-modal="true" ${labelledBy ? `aria-labelledby="${labelledBy}"` : ''} data-modal-panel>
        <button type="button" class="modal__close icon-btn" data-action="modal-close" aria-label="Close">${icon('close', { size: 18 })}</button>
        <div class="modal__body">${innerHTML}</div>
      </div>
    </div>`;
  root.classList.add('is-open');

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
