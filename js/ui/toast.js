/**
 * ui/toast.js
 * Brief, non-blocking status messages ("Copied to clipboard", "Saved").
 * Mounted into #toast-root (see index.html). Auto-dismisses; also announced
 * via aria-live for screen readers.
 *
 * DOM contract (assets/css/components.css §6): the root is a non-interactive
 * flex column; each message must be a `.toast` pill (pointer-events are
 * re-enabled there — the root's `none` used to swallow the action button's
 * clicks before this wrapper existed).
 *
 * An optional inline action can be attached — used by the PWA update flow
 * ("New version ready → Refresh"). While an action toast is visible, the
 * auto-dismiss timer is cancelled so the button stays tappable.
 *
 * (v4.2) two-slot layout: an ACTION toast (Refresh…) is sticky by design —
 * it used to be permanently wiped by the next unrelated "Copied" toast,
 * taking the update offer with it. Action toasts now live in their own slot;
 * transient toasts come and go without touching them. Failures can opt into
 * role="alert" (assertive announcement) instead of polite status.
 */

let hideTimer = null;

function clearToast() {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const pill = root.querySelector('.toast:not(.toast--sticky)');
  if (!pill) {
    // Nothing transient to clear (a sticky action toast may remain).
    root.classList.remove('is-visible');
    return;
  }
  pill.classList.add('toast--leaving');
  // Remove interactive content after the fade-out so a screen reader doesn't
  // keep announcing a button that can no longer be reached.
  setTimeout(() => {
    if (pill.parentNode) pill.remove();
    if (!root.firstElementChild) root.classList.remove('is-visible');
  }, 300);
}

export function showToast(
  message,
  { duration = 2200, actionLabel = null, onAction = null, assertive = false } = {}
) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const pill = document.createElement('div');
  pill.className = 'toast';
  pill.setAttribute('role', assertive ? 'alert' : 'status');

  const text = document.createElement('span');
  text.textContent = message;
  pill.appendChild(text);

  const hasAction = Boolean(actionLabel) && typeof onAction === 'function';
  if (hasAction) {
    pill.classList.add('toast--sticky');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      // (v4.3) do NOT clearTimeout here either: the pending timer (if any)
      // belongs to the transient toast in the OTHER slot, which must keep
      // its auto-dismiss schedule. This handler removes only this pill.
      pill.remove();
      root.classList.remove('is-visible', 'has-action');
      onAction();
    });
    pill.appendChild(btn);
  }

  if (hasAction) {
    // Replace only the (at most one) existing sticky toast; keep any
    // transient one — both slots are independent.
    root.querySelector('.toast--sticky')?.remove();
    root.appendChild(pill);
  } else {
    // Replace the transient toast; keep the sticky one intact.
    root.querySelector('.toast:not(.toast--sticky)')?.remove();
    root.insertBefore(pill, root.querySelector('.toast--sticky') || null);
    // (v4.3) only a TRANSIENT toast owns the auto-dismiss timer. The old
    // unconditional clearTimeout at the top of this function meant that
    // when an action toast (e.g. the PWA update offer) arrived while a
    // transient's dismiss timer was pending, that timer was cancelled and
    // never re-armed — the transient pill lived forever beside the sticky
    // one until some later transient happened to replace it.
    clearTimeout(hideTimer);
    hideTimer = setTimeout(clearToast, duration);
  }
  root.classList.add('is-visible');
  if (hasAction) root.classList.add('has-action');
}
