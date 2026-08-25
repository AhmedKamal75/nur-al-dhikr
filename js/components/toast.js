/**
 * components/toast.js
 * Brief, non-blocking status messages ("Copied to clipboard", "Saved").
 * Mounted into #toast-root (see index.html). Auto-dismisses; also announced
 * via aria-live for screen readers.
 *
 * An optional inline action can be attached — used by the PWA update flow
 * ("New version ready → Refresh"). While an action toast is visible, the
 * auto-dismiss timer is cancelled so the button stays tappable.
 */

let hideTimer = null;

function clearToast() {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.classList.remove('is-visible');
  // Remove interactive content after the fade-out so a screen reader doesn't
  // keep announcing a button that can no longer be reached.
  setTimeout(() => {
    if (!root.classList.contains('is-visible')) root.textContent = '';
  }, 300);
}

export function showToast(message, { duration = 2200, actionLabel = null, onAction = null } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  clearTimeout(hideTimer);

  root.textContent = '';
  const text = document.createElement('span');
  text.textContent = message;
  root.appendChild(text);

  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      clearTimeout(hideTimer);
      root.classList.remove('is-visible');
      root.textContent = '';
      onAction();
    });
    root.appendChild(btn);
    root.classList.add('has-action');
  } else {
    root.classList.remove('has-action');
  }

  root.classList.add('is-visible');

  if (!(actionLabel && typeof onAction === 'function')) {
    hideTimer = setTimeout(clearToast, duration);
  }
}
