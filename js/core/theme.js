/**
 * theme.js
 * Applies the current settings (palette, shape, theme mode, font scale,
 * language direction, accessibility flags) to <html> as data-attributes and
 * CSS custom properties. CSS in variables.css reacts to these attributes —
 * this module never writes raw color values, only selects a palette id.
 */

import { PALETTES, SHAPES } from './config.js';
import { isRTL, t } from './i18n.js';

let mediaQuery = null;

function resolveMode(mode) {
  if (mode === 'auto') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

export function applyTheme(settings) {
  const root = document.documentElement;
  const resolvedMode = resolveMode(settings.themeMode);

  root.setAttribute('data-theme', resolvedMode);
  root.setAttribute('data-palette', settings.palette);
  root.setAttribute('data-shape', settings.shape);
  root.setAttribute('data-reduce-motion', String(!!settings.reduceMotion));
  root.setAttribute('data-high-contrast', String(!!settings.highContrast));
  root.setAttribute('lang', settings.language);
  root.setAttribute('dir', isRTL(settings.language) ? 'rtl' : 'ltr');

  // (v4.3) the static index.html landmarks were English-only: the skip
  // link ("Skip to content") and the bottom-nav aria-label ("Primary")
  // both have dictionary keys that nothing ever applied — Arabic keyboard
  // and screen-reader users got English chrome on every launch.
  const skip = document.querySelector('.skip-link');
  if (skip) skip.textContent = t('common.skipToContent', settings.language);
  const nav = document.getElementById('bottomnav');
  if (nav) nav.setAttribute('aria-label', t('a11y.mainNav', settings.language));

  root.style.setProperty('--font-scale', settings.fontScale ?? 1);
  root.style.setProperty('--arabic-font-scale', settings.arabicFontScale ?? 1);

  const palette = PALETTES.find((p) => p.id === settings.palette) || PALETTES[0];
  const shape = SHAPES.find((s) => s.id === settings.shape) || SHAPES[1];
  root.style.setProperty('--color-primary-raw', palette.primary);
  root.style.setProperty('--color-accent-raw', palette.accent);
  root.style.setProperty('--radius-card', shape.radius);

  // Update the theme-color meta tag so mobile browser chrome matches the
  // ACTUAL surface. v4.0 hardcoded #FFFFFF/#0B0F0E here while index.html,
  // manifest.json and variables.css all said #faf9f5/#0c0f0d — the chrome
  // visibly jumped a shade on every launch and the install splash never
  // matched. Reading the resolved --color-bg keeps all four in lockstep.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#faf9f5';
    meta.setAttribute('content', bg);
  }
}

/** Watch the OS color-scheme preference so 'auto' mode stays live. */
export function watchSystemTheme(onChange) {
  if (!window.matchMedia) return () => {};
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mediaQuery.addEventListener
    ? mediaQuery.addEventListener('change', handler)
    : mediaQuery.addListener(handler);
  return () => {
    mediaQuery.removeEventListener
      ? mediaQuery.removeEventListener('change', handler)
      : mediaQuery.removeListener(handler);
  };
}
