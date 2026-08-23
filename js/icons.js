/**
 * icons.js
 * A small set of hand-drawn (not copied) line icons as inline SVG strings,
 * keyed by name. Kept separate from renderer.js purely for file size.
 * All icons share a 24x24 viewBox and use currentColor so they inherit theme color.
 */

const PATHS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
  library:
    '<rect x="4" y="4" width="6" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.5-4.5"/>',
  heart:
    '<path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2.4 4 6 4c2 0 3.5 1 6 3.4C14.5 5 16 4 18 4c3.6 0 5.6 3.6 4 7.1-2.5 4.8-10 9.4-10 9.4Z"/>',
  'heart-filled':
    '<path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2.4 4 6 4c2 0 3.5 1 6 3.4C14.5 5 16 4 18 4c3.6 0 5.6 3.6 4 7.1-2.5 4.8-10 9.4-10 9.4Z" fill="currentColor"/>',
  bookmark: '<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z"/>',
  stats: '<path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/>',
  tasbih:
    '<circle cx="12" cy="4.5" r="1.6"/><circle cx="18" cy="8" r="1.6"/><circle cx="19.5" cy="14.5" r="1.6"/><circle cx="15.5" cy="19.5" r="1.6"/><circle cx="8.5" cy="19.5" r="1.6"/><circle cx="4.5" cy="14.5" r="1.6"/><circle cx="6" cy="8" r="1.6"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-2 5.6-5.6 2 2-5.6 5.6-2Z"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4.6a7.7 7.7 0 0 0-1.7-1L14.8 3h-4l-.5 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-.6-2 3.4L6.2 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-.6a7.7 7.7 0 0 0 1.7 1l.5 2.6h4l.5-2.6a7.7 7.7 0 0 0 1.7-1l2.4.6 2-3.4-2-1.6Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  edit: '<path d="M4 20.5h16"/><path d="M14.5 4.5 19 9l-9.5 9.5H5V14l9.5-9.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash:
    '<path d="M5 7.5h14M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M7 7.5 8 20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5.5 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v.5"/>',
  share:
    '<circle cx="18" cy="5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="19" r="2.3"/><path d="m8.1 10.8 7.8-4.1M8.1 13.2l7.8 4.1"/>',
  play: '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  chevronLeft: '<path d="M15 5 8 12l7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 13l4.5 4.5L19 7"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  sunrise:
    '<path d="M12 3v5"/><path d="m6 10 1.5 1.5M18 10l-1.5 1.5"/><circle cx="12" cy="14" r="4"/><path d="M3 20.5h18"/>',
  sunset:
    '<path d="M12 3v5" opacity="0"/><path d="m6 10 1.5 1.5M18 10l-1.5 1.5"/><circle cx="12" cy="14" r="4"/><path d="M3 20.5h18"/><path d="M9 3.5h6"/>',
  droplet: '<path d="M12 3.5s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11Z"/>',
  'prayer-rug':
    '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M8 9v11M16 9v11" /><circle cx="12" cy="6.3" r="0.9" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/>',
  'star-filled':
    '<path d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" fill="currentColor"/>',
  'crescent-star':
    '<path d="M15.3 4.3A7.7 7.7 0 1 0 15.3 19a9.2 9.2 0 0 1 0-14.7Z"/><path d="M19 3.2c.25 1.35.95 2.05 2.25 2.3C19.95 5.75 19.25 6.45 19 7.8c-.25-1.35-.95-2.05-2.25-2.3C18.05 5.25 18.75 4.55 19 3.2Z" fill="currentColor" stroke="none"/>',
  calculator:
    '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><rect x="7.3" y="6" width="9.4" height="3.4" rx="0.6"/><circle cx="8.4" cy="13" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none"/><circle cx="15.6" cy="13" r="0.9" fill="currentColor" stroke="none"/><circle cx="8.4" cy="16.7" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none"/><circle cx="15.6" cy="16.7" r="0.9" fill="currentColor" stroke="none"/>',
  book: '<path d="M5 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-1.5H5Z"/><path d="M19 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-1.5h6Z"/>',
  'book-open':
    '<path d="M3 6a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H3Z"/><path d="M21 6a2 2 0 0 0-2-2h-4.5a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H21Z"/>',
  utensils: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3s-2 1.5-2 5 2 3.5 2 3.5V21"/>',
  food: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3s-2 1.5-2 5 2 3.5 2 3.5V21"/>',
  bead: '<circle cx="12" cy="6" r="2.6"/><circle cx="17.5" cy="9.5" r="2.6"/><circle cx="17.5" cy="15.5" r="2.6"/><circle cx="12" cy="19" r="2.6"/><circle cx="6.5" cy="15.5" r="2.6"/><circle cx="6.5" cy="9.5" r="2.6"/>',
  bed: '<path d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 19v2M21 19v2M3 14h18"/><rect x="5" y="8" width="6" height="4" rx="1"/>',
  mosque:
    '<path d="M12 3.5a3 3 0 0 1 3 3v1.5H9V6.5a3 3 0 0 1 3-3Z"/><path d="M4 20.5v-7a8 8 0 0 1 16 0v7"/><path d="M4 20.5h16M9 20.5v-5a3 3 0 0 1 6 0v5"/><path d="M12 2v1.2"/>',
  ocean:
    '<path d="M3 15.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M3 19.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M12 4v8"/><path d="m8.5 8 3.5 4 3.5-4"/>',
  shirt: '<path d="M8 4 4 7l2 3 2-1.3V20h8V8.7L18 10l2-3-4-3-2 1.5h-4L8 4Z"/>',
  sparkle:
    '<path d="M12 3c.6 3.3 2.7 5.4 6 6-3.3.6-5.4 2.7-6 6-.6-3.3-2.7-5.4-6-6 3.3-.6 5.4-2.7 6-6Z"/><path d="M19 15.5c.3 1.5 1.2 2.4 2.7 2.7-1.5.3-2.4 1.2-2.7 2.7-.3-1.5-1.2-2.4-2.7-2.7 1.5-.3 2.4-1.2 2.7-2.7Z"/>',
  'cloud-rain':
    '<path d="M7 15.5a4.5 4.5 0 0 1 .5-9 5.5 5.5 0 0 1 10.6 1.6A3.8 3.8 0 0 1 17.5 15.5Z"/><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2"/>',
  rain: '<path d="M7 15.5a4.5 4.5 0 0 1 .5-9 5.5 5.5 0 0 1 10.6 1.6A3.8 3.8 0 0 1 17.5 15.5Z"/><path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2"/>',
  'heart-pulse':
    '<path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2.4 4 6 4c2 0 3.5 1 6 3.4C14.5 5 16 4 18 4c3.6 0 5.6 3.6 4 7.1-2.5 4.8-10 9.4-10 9.4Z"/><path d="M5 12h3l1.5-3 2 6 1.5-3H19"/>',
  hands:
    '<path d="M8 21c-1.7 0-3-1.4-3-3v-4l-1.6-3.5A1.4 1.4 0 0 1 5 8.6L7 12M16 21c1.7 0 3-1.4 3-3v-4l1.6-3.5A1.4 1.4 0 0 0 19 8.6L17 12M8 21h8M8 12V5a1.4 1.4 0 0 1 2.8 0v4M13.2 9V5a1.4 1.4 0 0 1 2.8 0v7"/>',
  shield: '<path d="M12 3.5 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-2.5Z"/>',
  download: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20.5h14"/>',
  upload: '<path d="M12 20V9"/><path d="m7 13 5-5 5 5"/><path d="M5 20.5h14"/>',
  bell: '<path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  target:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  flame: '<path d="M12 3s-5 4.5-5 9.5a5 5 0 0 0 10 0c0-1.5-1-2.5-1-2.5S15 12 12 12c1-3 0-9 0-9Z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  location:
    '<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/>',
  'volume-x': '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m16 9 5 5M21 9l-5 5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  quran:
    '<path d="M3 6a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H3Z"/><path d="M21 6a2 2 0 0 0-2-2h-4.5a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H21Z"/><path d="M16.2 6.3a2 2 0 1 0 2.2 2.6"/>',
};

/** Return an inline <svg> string for the given icon name (falls back to a blank square). */
export function icon(name, { size = 20, className = '' } = {}) {
  const body = PATHS[name] || '<rect x="4" y="4" width="16" height="16" rx="2"/>';
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function hasIcon(name) {
  return name in PATHS;
}
