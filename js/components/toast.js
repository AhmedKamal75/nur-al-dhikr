/**
 * components/toast.js
 * Brief, non-blocking status messages ("Copied to clipboard", "Saved").
 * Mounted into #toast-root (see index.html). Auto-dismisses; also announced
 * via aria-live for screen readers.
 */

let hideTimer = null;

export function showToast(message, { duration = 2200 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.textContent = message;
  root.classList.add('is-visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    root.classList.remove('is-visible');
  }, duration);
}
