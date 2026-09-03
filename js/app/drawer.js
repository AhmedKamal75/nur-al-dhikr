/**
 * app/drawer.js — the mobile "More" drawer: open/close with focus
 * management and Tab containment.
 */

import { rt } from './rt.js';
import { t } from '../core/i18n.js';

/** The state storage key (mirrors core/storage.js — read directly here
 * because this path runs precisely when the rest of the app may not). */
const STATE_KEY = 'nurAlDhikr:v2:state';

/** Best-effort language for the last-resort screen: read the persisted
 * setting directly; English if nothing readable exists. */
function errorScreenLang() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw)?.settings?.language === 'ar' ? 'ar' : 'en';
  } catch {
    /* unreadable state — English fallback */
  }
  return 'en';
}

/* ------------------------------------------------------------------ */

export function openNavDrawer() {
  const active = document.activeElement;
  rt.navDrawerOpener = active && typeof active.focus === 'function' ? active : null;
  document.body.classList.add('nav-drawer-open');
  // Move focus into the sheet so keyboard/SR users land inside it, not on
  // the covered page behind the overlay.
  requestAnimationFrame(() => {
    const closeBtn = document.querySelector('.nav-drawer [data-action="nav-drawer-close"]');
    closeBtn?.focus();
  });
}

export function closeNavDrawer() {
  if (!document.body.classList.contains('nav-drawer-open')) return;
  document.body.classList.remove('nav-drawer-open');
  rt.navDrawerOpener?.focus();
  rt.navDrawerOpener = null;
}

/**
 * Renders directly to #main, bypassing renderer.js/views entirely, since
 * those are exactly what might be throwing. This is the last line of
 * defense: whatever broke, the user always gets a legible message and a
 * working way out, never a silent blank screen.
 */
export function renderErrorScreen(err) {
  console.error('[app] Unrecoverable render error:', err);
  // Headless (node) callers have no DOM — the log above is the whole
  // signal; never let this last-resort handler itself throw.
  if (typeof document === 'undefined') return;
  const lang = errorScreenLang();
  const main = document.getElementById('main') || document.body;
  main.innerHTML = `
    <div style="max-width:420px;margin:15vh auto;padding:24px;text-align:center;font-family:system-ui,sans-serif;">
      <p style="font-size:2rem;margin-bottom:8px;">\u26A0\uFE0F</p>
      <h1 style="font-size:1.25rem;margin-bottom:8px;">${t('error.screen.title', lang)}</h1>
      <p style="color:#555;font-size:0.9rem;margin-bottom:20px;">${t('error.screen.body', lang)}</p>
      <button id="error-reload-btn" style="margin:4px;padding:10px 20px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;">${t('error.screen.reload', lang)}</button>
      <button id="error-reset-btn" style="margin:4px;padding:10px 20px;border-radius:8px;border:none;background:#B91C1C;color:#fff;cursor:pointer;">${t('error.screen.reset', lang)}</button>
    </div>`;
  document
    .getElementById('error-reload-btn')
    ?.addEventListener('click', () => window.location.reload());
  document.getElementById('error-reset-btn')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
    window.location.hash = '';
    window.location.reload();
  });
}
