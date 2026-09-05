/**
 * app.js — the application entry point.
 *
 * Since v4.0 this file is intentionally tiny: the composition root lives in
 * app/boot.js, the delegated event system in app/events.js, and every
 * feature controller in app/handlers/. This module exists (at this exact
 * path) because the service-worker precache gate and the entry-module link
 * gate both walk the import graph from js/app.js.
 */
import { boot } from './app/boot.js';
import { renderErrorScreen } from './app/drawer.js';

boot().catch((err) => {
  // Belt-and-braces twin of boot()'s own try/catch: a rejection BEFORE the
  // try block begins (or one thrown asynchronously past it) used to escape
  // as an unhandled rejection with a blank screen.
  renderErrorScreen(err);
});

// Global backstop: nothing in the app should ever reach this, but if a
// stray promise does reject outside the dispatcher boundary, log it loudly
// instead of letting it vanish into the console's noise. (Browser-only —
// the entry-link gate imports this module headless.)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[app] unhandled rejection:', event.reason);
  });
}
