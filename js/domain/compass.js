/**
 * compass.js
 * Thin wrapper around the DeviceOrientationEvent API for a live magnetic
 * compass heading. No DOM writes here, no state.js dispatches — it just
 * turns raw sensor events into a single `heading` number (0-360, 0 = north)
 * delivered via callback, at native sensor frequency. The Qibla view patches
 * the DOM directly from that callback (see views/qibla.js) rather than
 * routing every event through the redux-style store: a device can fire
 * these events dozens of times a second, and funneling that through
 * dispatch() + a full innerHTML re-render would be wasted work for a value
 * nothing else in the app needs (compare the counter-announcer pattern in
 * tasbih.js, which exists for the same reason).
 */

let activeHandler = null;

/** Whether this browser exposes the DeviceOrientationEvent API at all. */
export function isSupported() {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

/**
 * iOS 13+ (Safari) requires an explicit user gesture + permission prompt
 * before orientation events fire. Most other browsers (Android Chrome, etc.)
 * expose heading data without asking.
 */
export function needsPermission() {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  );
}

/** Resolves true if permission was granted, false otherwise. Never throws. */
export async function requestPermission() {
  try {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Start listening for orientation changes. `onHeading(headingDeg, source)`
 * is called on every event with a 0-360 compass heading (best guess given
 * what the browser exposes) and WHICH NORTH that heading is measured
 * against — the distinction the declination hint (v3.26) exists for:
 *   - 'true':     anchored to geographic north (deviceorientationabsolute
 *                 with absolute=true) — the qibla bearing is true-north
 *                 based, so this needs no correction;
 *   - 'magnetic': a real compass reading against MAGNETIC north (iOS's
 *                 webkitCompassHeading) — correctable by the local
 *                 magnetic declination;
 *   - 'relative': alpha without an absolute anchor (device-relative only)
 *                 — not a compass reading at all; the needle uses it only
 *                 as a best-effort aid and the UI says so.
 * (Previously this param conflated "absolute orientation" with "true
 * north" — webkitCompassHeading is absolute in the ORIENTATION sense but
 * magnetic in the NORTH sense.)
 */
export function start(onHeading) {
  stop();
  // (v4.3) sticky source preference: some browsers fire BOTH events; a
  // relative `deviceorientation` arriving after an absolute reading used to
  // overwrite the source label, degrading the hint even while the needle
  // kept the better data. Once an absolute anchor is seen, relative events
  // no longer demote it (they still feed the needle if they are all the
  // browser ever sends).
  let haveAbsolute = false;
  activeHandler = (e) => {
    let heading = null;
    let source = 'relative';
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      // iOS Safari: already a 0-360 compass heading — but measured against
      // MAGNETIC north (Apple's own compass app applies declination on top
      // of this; we now do the same, explicitly, via js/wmm.js).
      heading = e.webkitCompassHeading;
      source = 'magnetic';
    } else if (typeof e.alpha === 'number') {
      // Standard DeviceOrientation: alpha is degrees counter-clockwise from
      // the device's arbitrary start position, so it must be inverted to
      // get a clockwise-from-north compass heading. Only absolute=true
      // events are anchored to geographic north.
      heading = 360 - e.alpha;
      source = e.absolute === true ? 'true' : 'relative';
    }
    if (heading == null || Number.isNaN(heading)) return;
    if (source === 'true') haveAbsolute = true;
    else if (haveAbsolute && source === 'relative') return; // never downgrade
    onHeading(((heading % 360) + 360) % 360, source);
  };
  // Prefer the (less common but more reliable) absolute event where
  // supported; both are registered because a browser that only fires one
  // of the two will simply never call the other's listener.
  window.addEventListener('deviceorientationabsolute', activeHandler, true);
  window.addEventListener('deviceorientation', activeHandler, true);
}

/** Stop listening. Safe to call even if never started. */
export function stop() {
  if (!activeHandler) return;
  window.removeEventListener('deviceorientationabsolute', activeHandler, true);
  window.removeEventListener('deviceorientation', activeHandler, true);
  activeHandler = null;
}
