/**
 * qibla.js
 * Pure great-circle geometry for finding the direction and distance to the
 * Kaaba (Masjid al-Haram, Mecca) from any point on Earth. No DOM, no
 * sensors — that lives in compass.js. Kept separate so this stays trivially
 * unit-testable.
 */

/** Coordinates of the Kaaba (Masjid al-Haram), Mecca, Saudi Arabia. */
export const KAABA = Object.freeze({ latitude: 21.4225241, longitude: 39.8261818 });

const EARTH_RADIUS_KM = 6371.0088;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Initial great-circle bearing (degrees, 0-360, clockwise from true north)
 * to travel from (latitude, longitude) toward the Kaaba. This is the
 * "compass heading to face" for prayer, not a straight line on a flat map.
 */
export function qiblaBearing(latitude, longitude) {
  const phi1 = toRad(latitude);
  const phi2 = toRad(KAABA.latitude);
  const deltaLambda = toRad(KAABA.longitude - longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return (toDeg(theta) + 360) % 360;
}

/** Great-circle distance in kilometers from (latitude, longitude) to the Kaaba. */
export function distanceToKaabaKm(latitude, longitude) {
  const phi1 = toRad(latitude);
  const phi2 = toRad(KAABA.latitude);
  const dPhi = toRad(KAABA.latitude - latitude);
  const dLambda = toRad(KAABA.longitude - longitude);

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

/**
 * Convert a 0-360 bearing into a compass label. English keeps the classic
 * 16-point abbreviations ("NNE"); Arabic uses the traditional 8-point names
 * (16-point abbreviations don't exist in Arabic usage).
 */
const COMPASS_POINTS_AR = [
  'شمال',
  'شمال شرق',
  'شرق',
  'جنوب شرق',
  'جنوب',
  'جنوب غرب',
  'غرب',
  'شمال غرب',
];
export function cardinalLabel(bearingDeg, lang = 'en') {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  if (lang === 'ar') {
    return COMPASS_POINTS_AR[Math.round(normalized / 45) % 8];
  }
  const idx = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[idx];
}

/**
 * Shortest signed angular difference (in degrees, -180..180) from `from` to
 * `to`, both 0-360 bearings. Positive means `to` is clockwise from `from`.
 * Used to decide which way (and how far) to turn the phone.
 */
export function angleDelta(from, to) {
  let diff = (to - from) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
