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
  return typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
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
 * Start listening for orientation changes. `onHeading(headingDeg, isAbsolute)`
 * is called on every event with a 0-360 compass heading (best guess given
 * what the browser exposes) and whether that heading is anchored to true/
 * magnetic north (`absolute`) or only relative to the device's start
 * orientation (Safari's webkitCompassHeading counts as absolute here, since
 * it's already a true compass reading).
 */
export function start(onHeading) {
  stop();
  activeHandler = (e) => {
    let heading = null;
    let absolute = false;
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      // iOS Safari: already a 0-360 compass heading, no conversion needed.
      heading = e.webkitCompassHeading;
      absolute = true;
    } else if (typeof e.alpha === 'number') {
      // Standard DeviceOrientation: alpha is degrees counter-clockwise from
      // the device's arbitrary start position, so it must be inverted to
      // get a clockwise-from-north compass heading.
      heading = 360 - e.alpha;
      absolute = !!e.absolute;
    }
    if (heading == null || Number.isNaN(heading)) return;
    onHeading(((heading % 360) + 360) % 360, absolute);
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
