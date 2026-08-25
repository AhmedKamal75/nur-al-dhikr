/**
 * theme.js
 * Applies the current settings (palette, shape, theme mode, font scale,
 * language direction, accessibility flags) to <html> as data-attributes and
 * CSS custom properties. CSS in variables.css reacts to these attributes —
 * this module never writes raw color values, only selects a palette id.
 */

import { PALETTES, SHAPES } from './config.js';
import { isRTL } from './i18n.js';

let mediaQuery = null;

function resolveMode(mode) {
  if (mode === 'auto') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

  root.style.setProperty('--font-scale', settings.fontScale ?? 1);
  root.style.setProperty('--arabic-font-scale', settings.arabicFontScale ?? 1);

  const palette = PALETTES.find((p) => p.id === settings.palette) || PALETTES[0];
  const shape = SHAPES.find((s) => s.id === settings.shape) || SHAPES[1];
  root.style.setProperty('--color-primary-raw', palette.primary);
  root.style.setProperty('--color-accent-raw', palette.accent);
  root.style.setProperty('--radius-card', shape.radius);

  // Update the theme-color meta tag so mobile browser chrome matches.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolvedMode === 'dark' ? '#0B0F0E' : '#FFFFFF');
}

/** Watch the OS color-scheme preference so 'auto' mode stays live. */
export function watchSystemTheme(onChange) {
  if (!window.matchMedia) return () => {};
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mediaQuery.addEventListener ? mediaQuery.addEventListener('change', handler) : mediaQuery.addListener(handler);
  return () => {
    mediaQuery.removeEventListener ? mediaQuery.removeEventListener('change', handler) : mediaQuery.removeListener(handler);
  };
}

export function paletteList() { return PALETTES; }
export function shapeList() { return SHAPES; }
