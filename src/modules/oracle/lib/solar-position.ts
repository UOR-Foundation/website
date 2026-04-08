/**
 * Solar position calculator — computes sunrise, sunset, and twilight times
 * for any latitude/longitude/date using standard astronomical equations.
 * No API calls needed — pure trigonometry.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Solar phases ordered from night → night across a full day cycle */
export type SolarPhase =
  | "deep_night"
  | "pre_dawn"
  | "dawn"
  | "sunrise"
  | "golden_morning"
  | "bright_morning"
  | "midday"
  | "afternoon"
  | "golden_hour"
  | "sunset"
  | "dusk"
  | "twilight"
  | "night";

export interface SolarTimes {
  astronomicalDawn: number;  // sun at -18°
  nauticalDawn: number;      // sun at -12°
  civilDawn: number;         // sun at -6°
  sunrise: number;           // sun at -0.833° (rising)
  goldenMorningEnd: number;  // sun at +10°
  brightMorningEnd: number;  // sun at +30°
  solarNoon: number;
  afternoonStart: number;    // sun at +30° (falling)
  goldenHourStart: number;   // sun at +10° (falling)
  sunset: number;            // sun at -0.833° (setting)
  civilDusk: number;         // sun at -6°
  nauticalDusk: number;      // sun at -12°
  astronomicalDusk: number;  // sun at -18°
}

/** Day of year (1-366) */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/** Solar declination in radians for a given day of year */
function solarDeclination(doy: number): number {
  return -23.44 * RAD * Math.cos((2 * Math.PI * (doy + 10)) / 365.25);
}

/** Equation of time in minutes */
function equationOfTime(doy: number): number {
  const b = (2 * Math.PI * (doy - 81)) / 365;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * Hour angle for a given solar elevation angle.
 * Returns NaN if the sun never reaches that elevation (polar day/night).
 */
function hourAngle(lat: number, decl: number, elevation: number): number {
  const latRad = lat * RAD;
  const cosH =
    (Math.sin(elevation * RAD) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));
  if (cosH > 1 || cosH < -1) return NaN;
  return Math.acos(cosH) * DEG;
}

/** Convert hour angle to time-of-day in minutes from midnight (local solar time) */
function haToMinutes(ha: number, eot: number, lng: number): [number, number] {
  const solarNoonMin = 720 - 4 * lng - eot;
  const rise = solarNoonMin - (ha / 15) * 60;
  const set = solarNoonMin + (ha / 15) * 60;
  return [rise, set];
}

/** Compute all solar times for a date and location. Times are in minutes from local midnight. */
export function computeSolarTimes(lat: number, lng: number, date: Date): SolarTimes {
  const doy = dayOfYear(date);
  const decl = solarDeclination(doy);
  const eot = equationOfTime(doy);

  // Timezone offset: JS gives negative for east, we need positive for east
  const tzOffsetMin = -date.getTimezoneOffset();
  const stdLng = tzOffsetMin / 4; // standard meridian for this timezone

  // Use timezone-corrected longitude
  const lngCorr = lng - stdLng;

  const solarNoonMin = 720 - 4 * lngCorr - eot;

  function timesForElevation(elev: number): [number, number] {
    const ha = hourAngle(lat, decl, elev);
    if (isNaN(ha)) return [NaN, NaN];
    return haToMinutes(ha, eot, lngCorr);
  }

  const [astDawn, astDusk] = timesForElevation(-18);
  const [nautDawn, nautDusk] = timesForElevation(-12);
  const [civDawn, civDusk] = timesForElevation(-6);
  const [sunriseMin, sunsetMin] = timesForElevation(-0.833);
  const [goldenMornEnd, goldenHourStart] = timesForElevation(10);
  const [brightMornEnd, afternoonStart] = timesForElevation(30);

  return {
    astronomicalDawn: astDawn,
    nauticalDawn: nautDawn,
    civilDawn: civDawn,
    sunrise: sunriseMin,
    goldenMorningEnd: isNaN(goldenMornEnd) ? sunriseMin + 60 : goldenMornEnd,
    brightMorningEnd: isNaN(brightMornEnd) ? solarNoonMin - 120 : brightMornEnd,
    solarNoon: solarNoonMin,
    afternoonStart: isNaN(afternoonStart) ? solarNoonMin + 120 : afternoonStart,
    goldenHourStart: isNaN(goldenHourStart) ? sunsetMin - 60 : goldenHourStart,
    sunset: sunsetMin,
    civilDusk: civDusk,
    nauticalDusk: nautDusk,
    astronomicalDusk: astDusk,
  };
}

/** Determine current solar phase from solar times and current minutes-from-midnight */
export function getSolarPhase(times: SolarTimes, minutesNow: number): SolarPhase {
  const t = minutesNow;

  // Handle polar cases where sunrise/sunset don't exist
  if (isNaN(times.sunrise) || isNaN(times.sunset)) {
    // If civil dawn exists, we're in perpetual twilight zone
    if (!isNaN(times.civilDawn)) return "dawn";
    // Otherwise perpetual night or day — check solar noon elevation
    return t > 360 && t < 1080 ? "midday" : "deep_night";
  }

  if (t < times.astronomicalDawn || isNaN(times.astronomicalDawn) && t < times.civilDawn - 60) return "deep_night";
  if (t < (isNaN(times.nauticalDawn) ? times.civilDawn - 30 : times.nauticalDawn)) return "pre_dawn";
  if (t < (isNaN(times.civilDawn) ? times.sunrise - 30 : times.civilDawn)) return "dawn";
  if (t < times.sunrise + 15) return "sunrise";
  if (t < times.goldenMorningEnd) return "golden_morning";
  if (t < times.brightMorningEnd) return "bright_morning";
  if (t < times.solarNoon + 60) return "midday";
  if (t < times.goldenHourStart) return "afternoon";
  if (t < times.sunset - 15) return "golden_hour";
  if (t < times.sunset + 15) return "sunset";
  if (t < (isNaN(times.civilDusk) ? times.sunset + 30 : times.civilDusk)) return "dusk";
  if (t < (isNaN(times.nauticalDusk) ? times.civilDusk + 30 : times.nauticalDusk)) return "twilight";
  if (t < (isNaN(times.astronomicalDusk) ? times.nauticalDusk + 30 : times.astronomicalDusk)) return "twilight";
  return "night";
}

/** Get minutes from midnight for current time */
export function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Get user location: try geolocation API, cache in localStorage, fallback to timezone estimate */
export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    // Check cache first
    const cached = localStorage.getItem("immersive_geo");
    if (cached) {
      try {
        const { lat, lng, ts } = JSON.parse(cached);
        // Cache valid for 24 hours
        if (Date.now() - ts < 86400000) {
          resolve({ lat, lng });
          return;
        }
      } catch { /* ignore */ }
    }

    // Fallback based on timezone
    const fallback = () => {
      const offsetHours = -new Date().getTimezoneOffset() / 60;
      resolve({ lat: 40, lng: offsetHours * 15 });
    };

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem("immersive_geo", JSON.stringify({ ...loc, ts: Date.now() }));
        resolve(loc);
      },
      () => fallback(),
      { timeout: 5000, maximumAge: 86400000 }
    );
  });
}
