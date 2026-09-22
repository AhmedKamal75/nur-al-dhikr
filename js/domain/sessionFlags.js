/**
 * domain/sessionFlags.js — session-scoped one-shot UI flags.
 *
 * Plain module state: never persisted, never synced, gone on reload.
 * Exists because views/ must not import app/ (layer rule) while both the
 * app layer (handlers) and views need to share transient latches like
 * "the continue card was already resumed this session".
 */
const flags = Object.create(null);
const values = Object.create(null);

export function sessionFlag(name) {
  return flags[name] === true;
}

export function setSessionFlag(name) {
  flags[name] = true;
}

/** Session-scoped key→value memory (e.g. last study tab per ayah). Unbounded callers must cap keys. */
export function sessionValue(key) {
  return Object.hasOwn(values, key) ? values[key] : undefined;
}

export function setSessionValue(key, value, { cap = 50 } = {}) {
  if (!Object.hasOwn(values, key) && Object.keys(values).length >= cap) {
    delete values[Object.keys(values)[0]];
  }
  values[key] = value;
}

/** Test-only: drop all session flags so cases isolate. */
export function resetSessionFlagsForTests() {
  for (const k of Object.keys(flags)) delete flags[k];
  for (const k of Object.keys(values)) delete values[k];
}
