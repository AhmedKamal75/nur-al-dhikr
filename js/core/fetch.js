/**
 * core/fetch.js — transport primitive: every runtime fetch in the app
 * goes through fetchWithTimeout (directly or via app/net.js), so no
 * mobile-network handoff can hang a surface forever. Kernel-level
 * (no store, no DOM) so services/, app/, and views/ can all use it
 * without layer violations.
 */
export const FETCH_TIMEOUT_MS = 15000;

function timeoutSignal(timeoutMs, external) {
  // Manual controller (not AbortSignal.timeout): the platform primitive's
  // internal timer does not hold the event loop in every runtime, and it
  // is missing in older browsers — a ref'd setTimeout escapes a hung
  // socket (B8) everywhere instead of pinning the lazyData in-flight
  // latches on a skeleton forever.
  const ctl = new AbortController();
  const timer = setTimeout(() => {
    try {
      ctl.abort(new Error(`Timed out after ${timeoutMs}ms`));
    } catch {
      /* already aborted */
    }
  }, timeoutMs);
  if (external) {
    if (external.aborted) ctl.abort(external.reason);
    else {
      const onExternal = () => ctl.abort(external.reason);
      external.addEventListener('abort', onExternal, { once: true });
      return {
        signal: ctl.signal,
        cleanup: () => {
          clearTimeout(timer);
          external.removeEventListener('abort', onExternal);
        },
      };
    }
  }
  return { signal: ctl.signal, cleanup: () => clearTimeout(timer) };
}

/** Raw Response with a guaranteed timeout. Extra init passes through. */
export async function fetchWithTimeout(
  url,
  { timeoutMs = FETCH_TIMEOUT_MS, signal, ...init } = {}
) {
  const { signal: sig, cleanup } = timeoutSignal(timeoutMs, signal);
  try {
    return await fetch(url, { ...init, signal: sig });
  } finally {
    cleanup();
  }
}
