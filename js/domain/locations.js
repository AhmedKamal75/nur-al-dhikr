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

/**
 * (v5.14.0, V2) one-tap city directory for the no-location empty state,
 * grouped by region (v5.17.0). City-center coordinates — APPROXIMATE by
 * design (±tens of km), so times are estimates until the person grants
 * GPS or enters exact coordinates. Never replaces manual entry; the
 * honest label rides in the UI, not here. Regions: me, africa, europe,
 * asia, oceania, americas.
 */
export const CITY_REGIONS = Object.freeze([
  'me',
  'africa',
  'europe',
  'asia',
  'oceania',
  'americas',
]);

export const CITY_PRESETS = Object.freeze([
  { id: 'cairo', en: 'Cairo', ar: 'القاهرة', lat: 30.0444, lng: 31.2357, region: 'me' },
  { id: 'mecca', en: 'Mecca', ar: 'مكة المكرمة', lat: 21.4225, lng: 39.8262, region: 'me' },
  { id: 'medina', en: 'Medina', ar: 'المدينة المنورة', lat: 24.5247, lng: 39.5692, region: 'me' },
  { id: 'jerusalem', en: 'Jerusalem', ar: 'القدس', lat: 31.7683, lng: 35.2137, region: 'me' },
  { id: 'amman', en: 'Amman', ar: 'عمّان', lat: 31.9539, lng: 35.9106, region: 'me' },
  { id: 'istanbul', en: 'Istanbul', ar: 'إسطنبول', lat: 41.0082, lng: 28.9784, region: 'me' },
  { id: 'riyadh', en: 'Riyadh', ar: 'الرياض', lat: 24.7136, lng: 46.6753, region: 'me' },
  { id: 'jeddah', en: 'Jeddah', ar: 'جدة', lat: 21.4858, lng: 39.1925, region: 'me' },
  { id: 'dubai', en: 'Dubai', ar: 'دبي', lat: 25.2048, lng: 55.2708, region: 'me' },
  { id: 'doha', en: 'Doha', ar: 'الدوحة', lat: 25.2854, lng: 51.531, region: 'me' },
  { id: 'muscat', en: 'Muscat', ar: 'مسقط', lat: 23.588, lng: 58.3829, region: 'me' },
  { id: 'kuwait', en: 'Kuwait City', ar: 'مدينة الكويت', lat: 29.3759, lng: 47.9774, region: 'me' },
  { id: 'baghdad', en: 'Baghdad', ar: 'بغداد', lat: 33.3152, lng: 44.3661, region: 'me' },
  { id: 'ankara', en: 'Ankara', ar: 'أنقرة', lat: 39.9334, lng: 32.8597, region: 'me' },
  { id: 'izmir', en: 'Izmir', ar: 'إزمير', lat: 38.4237, lng: 27.1428, region: 'me' },
  { id: 'tehran', en: 'Tehran', ar: 'طهران', lat: 35.6892, lng: 51.389, region: 'me' },
  { id: 'baku', en: 'Baku', ar: 'باكو', lat: 40.4093, lng: 49.8671, region: 'me' },
  { id: 'khartoum', en: 'Khartoum', ar: 'الخرطوم', lat: 15.5007, lng: 32.5599, region: 'africa' },
  {
    id: 'casablanca',
    en: 'Casablanca',
    ar: 'الدار البيضاء',
    lat: 33.5731,
    lng: -7.5898,
    region: 'africa',
  },
  { id: 'algiers', en: 'Algiers', ar: 'الجزائر', lat: 36.7538, lng: 3.0588, region: 'africa' },
  { id: 'tunis', en: 'Tunis', ar: 'تونس', lat: 36.8065, lng: 10.1815, region: 'africa' },
  { id: 'dakar', en: 'Dakar', ar: 'دكار', lat: 14.7167, lng: -17.4677, region: 'africa' },
  { id: 'lagos', en: 'Lagos', ar: 'لاغوس', lat: 6.5244, lng: 3.3792, region: 'africa' },
  { id: 'nairobi', en: 'Nairobi', ar: 'نيروبي', lat: -1.2921, lng: 36.8219, region: 'africa' },
  {
    id: 'johannesburg',
    en: 'Johannesburg',
    ar: 'جوهانسبرغ',
    lat: -26.2041,
    lng: 28.0473,
    region: 'africa',
  },
  {
    id: 'addisababa',
    en: 'Addis Ababa',
    ar: 'أديس أبابا',
    lat: 9.0054,
    lng: 38.7636,
    region: 'africa',
  },
  { id: 'london', en: 'London', ar: 'لندن', lat: 51.5074, lng: -0.1278, region: 'europe' },
  { id: 'sarajevo', en: 'Sarajevo', ar: 'سراييفو', lat: 43.8563, lng: 18.4131, region: 'europe' },
  { id: 'paris', en: 'Paris', ar: 'باريس', lat: 48.8566, lng: 2.3522, region: 'europe' },
  { id: 'berlin', en: 'Berlin', ar: 'برلين', lat: 52.52, lng: 13.405, region: 'europe' },
  { id: 'madrid', en: 'Madrid', ar: 'مدريد', lat: 40.4168, lng: -3.7038, region: 'europe' },
  { id: 'rome', en: 'Rome', ar: 'روما', lat: 41.9028, lng: 12.4964, region: 'europe' },
  { id: 'amsterdam', en: 'Amsterdam', ar: 'أمستردام', lat: 52.3676, lng: 4.9041, region: 'europe' },
  { id: 'brussels', en: 'Brussels', ar: 'بروكسل', lat: 50.8503, lng: 4.3517, region: 'europe' },
  { id: 'vienna', en: 'Vienna', ar: 'فيينا', lat: 48.2082, lng: 16.3738, region: 'europe' },
  { id: 'athens', en: 'Athens', ar: 'أثينا', lat: 37.9838, lng: 23.7275, region: 'europe' },
  {
    id: 'stockholm',
    en: 'Stockholm',
    ar: 'ستوكهولم',
    lat: 59.3293,
    lng: 18.0686,
    region: 'europe',
  },
  { id: 'oslo', en: 'Oslo', ar: 'أوسلو', lat: 59.9139, lng: 10.7522, region: 'europe' },
  {
    id: 'copenhagen',
    en: 'Copenhagen',
    ar: 'كوبنهاغن',
    lat: 55.6761,
    lng: 12.5683,
    region: 'europe',
  },
  { id: 'dublin', en: 'Dublin', ar: 'دبلن', lat: 53.3498, lng: -6.2603, region: 'europe' },
  {
    id: 'manchester',
    en: 'Manchester',
    ar: 'مانشستر',
    lat: 53.4808,
    lng: -2.2426,
    region: 'europe',
  },
  {
    id: 'birmingham',
    en: 'Birmingham',
    ar: 'برمنغهام',
    lat: 52.4862,
    lng: -1.8904,
    region: 'europe',
  },
  { id: 'glasgow', en: 'Glasgow', ar: 'غلاسكو', lat: 55.8642, lng: -4.2518, region: 'europe' },
  { id: 'jakarta', en: 'Jakarta', ar: 'جاكرتا', lat: -6.2088, lng: 106.8456, region: 'asia' },
  { id: 'karachi', en: 'Karachi', ar: 'كراتشي', lat: 24.8607, lng: 67.0011, region: 'asia' },
  { id: 'delhi', en: 'Delhi', ar: 'دلهي', lat: 28.6139, lng: 77.209, region: 'asia' },
  { id: 'dhaka', en: 'Dhaka', ar: 'دكا', lat: 23.8103, lng: 90.4125, region: 'asia' },
  {
    id: 'kualalumpur',
    en: 'Kuala Lumpur',
    ar: 'كوالالمبور',
    lat: 3.139,
    lng: 101.6869,
    region: 'asia',
  },
  {
    id: 'islamabad',
    en: 'Islamabad',
    ar: 'إسلام آباد',
    lat: 33.6844,
    lng: 73.0479,
    region: 'asia',
  },
  { id: 'lahore', en: 'Lahore', ar: 'لاهور', lat: 31.5204, lng: 74.3587, region: 'asia' },
  { id: 'mumbai', en: 'Mumbai', ar: 'مومباي', lat: 19.076, lng: 72.8777, region: 'asia' },
  { id: 'singapore', en: 'Singapore', ar: 'سنغافورة', lat: 1.3521, lng: 103.8198, region: 'asia' },
  { id: 'kabul', en: 'Kabul', ar: 'كابل', lat: 34.5553, lng: 69.2075, region: 'asia' },
  { id: 'tashkent', en: 'Tashkent', ar: 'طشقند', lat: 41.2995, lng: 69.2401, region: 'asia' },
  { id: 'beijing', en: 'Beijing', ar: 'بكين', lat: 39.9042, lng: 116.4074, region: 'asia' },
  { id: 'tokyo', en: 'Tokyo', ar: 'طوكيو', lat: 35.6762, lng: 139.6503, region: 'asia' },
  { id: 'seoul', en: 'Seoul', ar: 'سيول', lat: 37.5665, lng: 126.978, region: 'asia' },
  { id: 'bangkok', en: 'Bangkok', ar: 'بانكوك', lat: 13.7563, lng: 100.5018, region: 'asia' },
  { id: 'manila', en: 'Manila', ar: 'مانيلا', lat: 14.5995, lng: 120.9842, region: 'asia' },
  { id: 'sydney', en: 'Sydney', ar: 'سيدني', lat: -33.8688, lng: 151.2093, region: 'oceania' },
  {
    id: 'melbourne',
    en: 'Melbourne',
    ar: 'ملبورن',
    lat: -37.8136,
    lng: 144.9631,
    region: 'oceania',
  },
  {
    id: 'auckland',
    en: 'Auckland',
    ar: 'أوكلاند',
    lat: -36.8485,
    lng: 174.7633,
    region: 'oceania',
  },
  { id: 'newyork', en: 'New York', ar: 'نيويورك', lat: 40.7128, lng: -74.006, region: 'americas' },
  {
    id: 'losangeles',
    en: 'Los Angeles',
    ar: 'لوس أنجلوس',
    lat: 34.0522,
    lng: -118.2437,
    region: 'americas',
  },
  { id: 'chicago', en: 'Chicago', ar: 'شيكاغو', lat: 41.8781, lng: -87.6298, region: 'americas' },
  { id: 'houston', en: 'Houston', ar: 'هيوستن', lat: 29.7604, lng: -95.3698, region: 'americas' },
  { id: 'toronto', en: 'Toronto', ar: 'تورونتو', lat: 43.6532, lng: -79.3832, region: 'americas' },
  {
    id: 'vancouver',
    en: 'Vancouver',
    ar: 'فانكوفر',
    lat: 49.2827,
    lng: -123.1207,
    region: 'americas',
  },
  {
    id: 'montreal',
    en: 'Montreal',
    ar: 'مونتريال',
    lat: 45.5017,
    lng: -73.5673,
    region: 'americas',
  },
  {
    id: 'saopaulo',
    en: 'São Paulo',
    ar: 'ساو باولو',
    lat: -23.5558,
    lng: -46.6396,
    region: 'americas',
  },
  {
    id: 'mexicocity',
    en: 'Mexico City',
    ar: 'مكسيكو',
    lat: 19.4326,
    lng: -99.1332,
    region: 'americas',
  },
  {
    id: 'buenosaires',
    en: 'Buenos Aires',
    ar: 'بوينس آيرس',
    lat: -34.6037,
    lng: -58.3816,
    region: 'americas',
  },
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
