/**
 * domain/launchIntents.js — pure parsing for OS launch entry points
 * (item 24, v5.2.66): share_target GET params, file_handlers picks and
 * protocol_handlers URLs. Pure (search-string in, intent out) so unit
 * tests pin the contracts without a browser; the side effects (routing,
 * toasts, launchQueue) live in app/boot.js, the composition root.
 */

import { VIEWS } from '../core/config.js';

/** Custom protocol registered in manifest.json protocol_handlers. */
export const SHARE_PROTOCOL = 'web+nurdhikr:';

const KNOWN_VIEWS = new Set(Object.values(VIEWS));

/** Search boxes cap hand-typed queries at 200 (see handlers/navigation.js). */
const MAX_Q = 200;

/** Raw inbound fields cap — a shared novel must not become the URL. */
const MAX_FIELD = 2000;

function param(search, name, cap) {
  let v = '';
  try {
    v = new URLSearchParams(String(search || '')).get(name) ?? '';
  } catch {
    return '';
  }
  return v.trim().slice(0, cap);
}

/**
 * share_target (GET ./index.html?title=&text=&url=): route the shared
 * payload at the app's own Search view. prefers the body text, then the
 * URL, then the title. Null when nothing usable arrived.
 */
export function parseShareTarget(search) {
  const text = param(search, 'text', MAX_FIELD);
  const url = param(search, 'url', MAX_FIELD);
  const title = param(search, 'title', MAX_FIELD);
  const q = (text || url || title).slice(0, MAX_Q);
  if (!q) return null;
  return { q };
}

/**
 * protocol_handlers (./index.html?proto=%s): `web+nurdhikr:open?view=<id>`
 * (or the bare `web+nurdhikr:<id>`) deep-links a route; an optional `id`
 * segment rides along for book/surah surfaces. Unknown views, foreign
 * schemes and malformed values all fail closed to null (normal boot).
 */
export function parseProtocolLaunch(search) {
  const raw = param(search, 'proto', MAX_FIELD);
  if (!raw || !raw.toLowerCase().startsWith(SHARE_PROTOCOL)) return null;
  const rest = raw.slice(SHARE_PROTOCOL.length).replace(/^\/+/, '');
  const cut = rest.indexOf('?');
  const seg = (cut < 0 ? rest : rest.slice(0, cut)).toLowerCase();
  let view = null;
  if (KNOWN_VIEWS.has(seg)) {
    view = seg;
  } else if (seg === '' || seg === 'open') {
    const v = param(cut < 0 ? '' : rest.slice(cut), 'view', 64).toLowerCase();
    if (KNOWN_VIEWS.has(v)) view = v;
  }
  if (!view) return null;
  const out = { view, params: {} };
  const id = param(cut < 0 ? '' : rest.slice(cut), 'id', MAX_Q);
  if (id) out.params.id = id;
  return out;
}

/**
 * file_handlers (single-client .json): the OS hands over a
 * FileSystemFileHandle whose .name decides — MIME types are unreliable
 * across file managers, and parseBackup() downstream validates the bytes
 * anyway, so the extension gate stays deliberately thin.
 */
export function isBackupFile(name) {
  return typeof name === 'string' && name.toLowerCase().endsWith('.json');
}
