/**
 * locations.js (v4.4)
 * Multiple location profiles for prayer times — home / work / travel,
 * quick-switched from the Prayer view. The ACTIVE location stays exactly
 * where it always lived (settings.prayer.latitude/…), so every existing
 * consumer (times, qibla, alerts, khatma anchors) keeps working untouched;
 * profiles are just named snapshots the user can re-apply in one tap.
 *
 * Storage: state.locationProfiles — [{ id, name, latitude, longitude,
 * timezone, method, asr, locationName, createdAt }] capped at 5.
 * `method`/`asr` ride along so a profile restores the calculation
 * convention that matched the place, which is the entire point of saving
 * "travel" as a distinct profile.
 */

export const LOCATION_PROFILES_CAP = 5;
export const LOCATION_PROFILES_PRESETS = Object.freeze([
  { key: 'home', icon: 'home' },
  { key: 'work', icon: 'briefcase' },
  { key: 'travel', icon: 'plane' },
]);

const LAT_RE = /^-?\d+(\.\d+)?$/;

/** Build a profile snapshot from the active prayer settings. */
export function makeProfile({ id, name, prayer, ts = Date.now() }) {
  const p = prayer && typeof prayer === 'object' ? prayer : {};
  return {
    id: typeof id === 'string' && id ? id : `loc-${ts}`,
    name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 40) : 'Location',
    latitude: Number.isFinite(p.latitude) ? p.latitude : null,
    longitude: Number.isFinite(p.longitude) ? p.longitude : null,
    timezone: typeof p.timezone === 'string' ? p.timezone : '',
    method: typeof p.method === 'string' ? p.method : 'MWL',
    asr: typeof p.asr === 'string' ? p.asr : 'Standard',
    locationName: typeof p.locationName === 'string' ? p.locationName.slice(0, 80) : '',
    createdAt: ts,
  };
}

/** Defensively coerce a restored/imported profile list. */
export function sanitizeLocationProfiles(raw, cap = LOCATION_PROFILES_CAP) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) =>
      e && typeof e === 'object' && !Array.isArray(e)
        ? makeProfile({
            id: typeof e.id === 'string' ? e.id : undefined,
            name: e.name,
            prayer: {
              latitude: Number(e.latitude),
              longitude: Number(e.longitude),
              timezone: e.timezone,
              method: e.method,
              asr: e.asr,
              locationName: e.locationName,
            },
            ts: Number.isFinite(e.createdAt) ? e.createdAt : 0,
          })
        : null
    )
    .filter(
      (e) => e && e.latitude != null && e.longitude != null && String(e.latitude).match(LAT_RE)
    )
    .slice(0, cap);
}

/** True when the active prayer settings already match a profile (lat/lng). */
export function profileMatchesActive(profile, prayerSettings) {
  if (!profile || !prayerSettings) return false;
  return (
    Number(profile.latitude) === Number(prayerSettings.latitude) &&
    Number(profile.longitude) === Number(prayerSettings.longitude)
  );
}

/**
 * The prayer-settings patch that applying a profile produces. Deliberately
 * partial — alerts and other personal preferences are NOT overwritten by a
 * location switch, only the place + its calculation convention.
 */
export function profileToPrayerPatch(profile) {
  return {
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    method: profile.method,
    asr: profile.asr,
    locationName: profile.locationName,
  };
}

/**
 * Nearby-mosque handoff URL (v4.4 "Open in Maps"): zero storage, zero
 * dependency — just an OS map-app intent. google.com/maps/search works on
 * every desktop browser and hands off to the installed Maps app on
 * Android/iOS; ?q= carries the search term with the coordinates pinned.
 */
export function nearbyMosqueMapUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps/search/mosque/@${lat},${lng},14z`;
}
