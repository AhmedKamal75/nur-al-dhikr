/**
 * calendar.js
 * Gregorian <-> Hijri conversion using the civil tabular Islamic calendar
 * (a well-established astronomical approximation, base epoch 1 Muharram 1 AH
 * = 16 July 622 CE Julian). This is an *arithmetic* calendar and will
 * typically be accurate to within a day or two of local moon-sighting
 * announcements — always defer to a local authority for worship timing.
 */

const HIJRI_MONTHS_EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'];
const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

/** Gregorian calendar date -> Julian Day Number (integer, noon convention dropped for this use). */
function gregorianToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** Julian Day Number -> Gregorian calendar date. */
function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/** Julian Day Number -> civil tabular Hijri date { year, month, day } (1-indexed month/day). */
function jdnToHijri(jdn) {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

/** Civil tabular Hijri date -> Julian Day Number. */
function hijriToJDN(year, month, day) {
  return (
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 - 385
  );
}

/** Convert a JS Date (local) to a Hijri date object with formatted names. */
export function toHijri(date, adjustDays = 0) {
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate()) + adjustDays;
  const h = jdnToHijri(jdn);
  return {
    year: h.year,
    month: h.month, // 1-12
    day: h.day,
    monthName: { en: HIJRI_MONTHS_EN[h.month - 1], ar: HIJRI_MONTHS_AR[h.month - 1] }
  };
}

/** Convert a Hijri date back to a JS Date (local, midnight). */
export function toGregorian(hijriYear, hijriMonth, hijriDay, adjustDays = 0) {
  const jdn = hijriToJDN(hijriYear, hijriMonth, hijriDay) - adjustDays;
  const g = jdnToGregorian(jdn);
  return new Date(g.year, g.month - 1, g.day);
}

export function hijriMonthNames() {
  return { en: HIJRI_MONTHS_EN, ar: HIJRI_MONTHS_AR };
}

export function daysInHijriMonth(year, month) {
  const start = hijriToJDN(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = hijriToJDN(nextYear, nextMonth, 1);
  return end - start;
}

/**
 * Return the list of well-known Islamic occasions falling within the given Gregorian year,
 * each resolved to a concrete Gregorian Date via the tabular conversion.
 * Dates are estimates (±1–2 days versus local moon-sighting) — flagged in the UI.
 */
export function islamicEventsForYear(gregorianYear, adjustDays = 0) {
  const events = [];
  // scan a slightly wider Hijri year range since Hijri years don't align with Gregorian ones
  const approxHijriYear = toHijri(new Date(gregorianYear, 5, 1)).year;
  for (const hy of [approxHijriYear - 1, approxHijriYear, approxHijriYear + 1]) {
    const push = (month, day, key) => {
      const g = toGregorian(hy, month, day, adjustDays);
      if (g.getFullYear() === gregorianYear) events.push({ key, date: g, hijri: { year: hy, month, day } });
    };
    push(1, 1, 'hijriNewYear');
    push(1, 10, 'ashura');
    push(3, 12, 'mawlid');
    push(9, 1, 'ramadanStart');
    push(9, 27, 'laylatAlQadr');
    push(10, 1, 'eidFitr');
    push(12, 8, 'hajjStart');
    push(12, 9, 'arafah');
    push(12, 10, 'eidAdha');
  }
  events.sort((a, b) => a.date - b.date);
  return events;
}

export const EVENT_LABELS = Object.freeze({
  hijriNewYear: { en: 'Islamic New Year', ar: 'رأس السنة الهجرية' },
  ashura: { en: 'Day of Ashura', ar: 'يوم عاشوراء' },
  mawlid: { en: "Mawlid an-Nabi", ar: 'المولد النبوي' },
  ramadanStart: { en: 'Start of Ramadan', ar: 'بداية رمضان' },
  laylatAlQadr: { en: 'Laylat al-Qadr (estimated 27th)', ar: 'ليلة القدر (تقديرًا الليلة ٢٧)' },
  eidFitr: { en: 'Eid al-Fitr', ar: 'عيد الفطر' },
  hajjStart: { en: 'Hajj Begins', ar: 'بداية الحج' },
  arafah: { en: 'Day of Arafah', ar: 'يوم عرفة' },
  eidAdha: { en: 'Eid al-Adha', ar: 'عيد الأضحى' }
});

/** True if the given Hijri day-of-month is one of the three "White Days" (13, 14, 15). */
export function isWhiteDay(hijriDay) {
  return hijriDay === 13 || hijriDay === 14 || hijriDay === 15;
}

/** True if the given JS weekday (0=Sun..6=Sat) is a recommended fasting day (Mon/Thu). */
export function isSunnahFastDay(jsDate) {
  const day = jsDate.getDay();
  return day === 1 || day === 4;
}
