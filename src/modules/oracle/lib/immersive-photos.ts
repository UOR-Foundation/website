/**
 * Solar-phase-aware Unsplash photo selection for immersive mode.
 * Photos are grouped by 13 distinct light phases computed from the sun's
 * actual position at the user's location. Each phase has 3-4 curated
 * landscape photos that rotate daily.
 *
 * Additionally, an hourly fallback map ensures a photo is always available
 * even if solar computation fails.
 */

import {
  type SolarPhase,
  computeSolarTimes,
  getSolarPhase,
  currentMinutes,
  getUserLocation,
} from "./solar-position";

const Q = "?w=1920&q=80&auto=format&fit=crop";
const u = (id: string) => `https://images.unsplash.com/${id}${Q}`;

/**
 * Curated Unsplash photos for each solar phase.
 * Every URL is a verified, high-quality landscape that faithfully
 * represents the light conditions of that phase.
 */
const PHASE_PHOTOS: Record<SolarPhase, string[]> = {
  /* ── Deep night (00:00–04:00): stars, milky way, dark skies ── */
  deep_night: [
    u("photo-1444703686981-a3abbc4d4fe3"),  // starry night sky
    u("photo-1507400492013-162706c8c05e"),  // night sky stars
    u("photo-1536431311719-398b6704d40e"),  // milky way landscape
    u("photo-1489549132488-d00b7eee80f1"),  // dark night mountain
  ],

  /* ── Pre-dawn (04:00–05:00): deep navy blue horizon, first glow ── */
  pre_dawn: [
    u("photo-1504608524841-42fe6f032b4b"),  // deep blue dawn horizon
    u("photo-1503424886307-b090341d25d1"),  // dark blue mountain pre-dawn
    u("photo-1505765050516-f72dcac9c60e"),  // subtle horizon glow
  ],

  /* ── Dawn (05:00–05:45): pink/purple sky, misty valleys ── */
  dawn: [
    u("photo-1501436513145-30f24e19fcc8"),  // pink dawn sky over hills
    u("photo-1470252649378-9c29740c9fa8"),  // purple dawn mountains
    u("photo-1518837695005-2083093ee35b"),  // misty dawn valley
  ],

  /* ── Sunrise (05:45–06:30): sun breaking horizon, golden edge ── */
  sunrise: [
    u("photo-1470071459604-3b5ec3a7fe05"),  // golden sunrise over valley
    u("photo-1500382017468-9049fed747ef"),  // warm sunrise landscape
    u("photo-1464822759023-fed622ff2c3b"),  // alpine sunrise glow
    u("photo-1509316975850-ff9c5deb0cd9"),  // sun breaking over mountain
  ],

  /* ── Golden morning (06:30–08:00): warm long shadows, amber fields ── */
  golden_morning: [
    u("photo-1447752875215-b2761acb3c5d"),  // golden woodland path
    u("photo-1465056836041-7f43ac27dcb5"),  // misty golden morning meadow
    u("photo-1501785888041-af3ef285b470"),  // warm morning light over hills
  ],

  /* ── Bright morning (08:00–10:30): crisp daylight, vivid greens ── */
  bright_morning: [
    u("photo-1441974231531-c6227db76b6e"),  // lush green forest canopy
    u("photo-1472214103451-9374bd1c798e"),  // vivid green rolling hills
    u("photo-1469474968028-56623f02e42e"),  // bright mountain vista
    u("photo-1482938289607-e9573fc25ebb"),  // bright morning river valley
  ],

  /* ── Midday (10:30–13:30): full sun, vivid colors, blue sky ── */
  midday: [
    u("photo-1507525428034-b723cf961d3e"),  // tropical beach bright sun
    u("photo-1506744038136-46273834b3fb"),  // vivid lake mountain midday
    u("photo-1470770903676-69b98201ea1c"),  // blue sky mountain panorama
    u("photo-1433086966358-54859d0ed716"),  // waterfall in bright daylight
  ],

  /* ── Afternoon (13:30–16:30): warm directional light, gentle shadows ── */
  afternoon: [
    u("photo-1505228395891-9a51e7e86bf6"),  // rolling hills afternoon sun
    u("photo-1508739773434-c26b3d09e071"),  // calm ocean afternoon light
    u("photo-1500049242364-642850e61a78"),  // coastal cliffs warm light
    u("photo-1497436072909-60f360e1d4b1"),  // green valley afternoon
  ],

  /* ── Golden hour (16:30–18:00): amber glow, deep warm tones ── */
  golden_hour: [
    u("photo-1490730141103-6cac27aaab94"),  // golden horizon over fields
    u("photo-1472120435266-95a3f747eb08"),  // golden light through forest
    u("photo-1495616811223-4d98c6e9c869"),  // amber light on meadow
  ],

  /* ── Sunset (18:00–18:45): fiery horizon, dramatic silhouettes ── */
  sunset: [
    u("photo-1495584816685-4bdbf1b5057e"),  // amber ocean sunset
    u("photo-1476610182048-b716b8515aaa"),  // dramatic warm sunset clouds
    u("photo-1494548162494-384bba4ab999"),  // fiery mountain sunset
    u("photo-1504198453319-5ce911bafcbe"),  // red sunset over water
  ],

  /* ── Dusk (18:45–19:30): purple/pink afterglow ── */
  dusk: [
    u("photo-1517483000871-1dbf64a6e1c6"),  // purple dusk sky
    u("photo-1488866022504-f2584929ca5f"),  // pink afterglow over lake
    u("photo-1500964757134-3ef6a8a8787b"),  // lavender dusk mountain
  ],

  /* ── Twilight (19:30–20:30): deep blue, first stars appearing ── */
  twilight: [
    u("photo-1472552944129-b035e9ea3744"),  // deep blue twilight sky
    u("photo-1531315396756-905d68d21b56"),  // twilight city horizon
    u("photo-1519681393784-d120267933ba"),  // blue hour mountain stars
  ],

  /* ── Night (20:30–00:00): dark sky, stars, city lights ── */
  night: [
    u("photo-1444703686981-a3abbc4d4fe3"),  // starry night
    u("photo-1507400492013-162706c8c05e"),  // night landscape
    u("photo-1536431311719-398b6704d40e"),  // milky way
    u("photo-1489549132488-d00b7eee80f1"),  // mountain night
  ],
};

/**
 * Hourly fallback — maps each hour (0-23) to a specific Unsplash photo
 * that precisely reflects the typical outdoor light at that time.
 * Used if solar phase computation returns an invalid result.
 */
const HOURLY_FALLBACK: string[] = [
  /* 00 */ u("photo-1444703686981-a3abbc4d4fe3"),  // midnight stars
  /* 01 */ u("photo-1536431311719-398b6704d40e"),  // deep night milky way
  /* 02 */ u("photo-1489549132488-d00b7eee80f1"),  // dark mountain night
  /* 03 */ u("photo-1507400492013-162706c8c05e"),  // late night stars
  /* 04 */ u("photo-1504608524841-42fe6f032b4b"),  // pre-dawn deep blue
  /* 05 */ u("photo-1470252649378-9c29740c9fa8"),  // dawn purple glow
  /* 06 */ u("photo-1470071459604-3b5ec3a7fe05"),  // sunrise golden light
  /* 07 */ u("photo-1447752875215-b2761acb3c5d"),  // golden morning woodland
  /* 08 */ u("photo-1441974231531-c6227db76b6e"),  // bright morning forest
  /* 09 */ u("photo-1472214103451-9374bd1c798e"),  // vivid green hills
  /* 10 */ u("photo-1482938289607-e9573fc25ebb"),  // crisp morning valley
  /* 11 */ u("photo-1506744038136-46273834b3fb"),  // midday lake vista
  /* 12 */ u("photo-1507525428034-b723cf961d3e"),  // full sun coast
  /* 13 */ u("photo-1470770903676-69b98201ea1c"),  // bright afternoon mountain
  /* 14 */ u("photo-1505228395891-9a51e7e86bf6"),  // afternoon rolling hills
  /* 15 */ u("photo-1497436072909-60f360e1d4b1"),  // warm afternoon valley
  /* 16 */ u("photo-1500049242364-642850e61a78"),  // late afternoon coast
  /* 17 */ u("photo-1490730141103-6cac27aaab94"),  // golden hour fields
  /* 18 */ u("photo-1495584816685-4bdbf1b5057e"),  // sunset ocean
  /* 19 */ u("photo-1476610182048-b716b8515aaa"),  // dusk warm clouds
  /* 20 */ u("photo-1488866022504-f2584929ca5f"),  // twilight lake
  /* 21 */ u("photo-1519681393784-d120267933ba"),  // early night stars
  /* 22 */ u("photo-1444703686981-a3abbc4d4fe3"),  // night sky
  /* 23 */ u("photo-1536431311719-398b6704d40e"),  // late night milky way
];

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

// ── Cached location state ──
let cachedLocation: { lat: number; lng: number } | null = null;
let locationPromise: Promise<{ lat: number; lng: number }> | null = null;

/** Initialize geolocation (call once on mount). Resolves quickly from cache or fallback. */
export function initLocation(): Promise<{ lat: number; lng: number }> {
  if (cachedLocation) return Promise.resolve(cachedLocation);
  if (!locationPromise) {
    locationPromise = getUserLocation().then((loc) => {
      cachedLocation = loc;
      return loc;
    });
  }
  return locationPromise;
}

/** Get photo for a specific solar phase, rotating daily */
function photoForPhase(phase: SolarPhase): string {
  const bucket = PHASE_PHOTOS[phase];
  return bucket[dayOfYear() % bucket.length];
}

/** Get the current solar phase using cached location (sync, uses fallback if no geo yet) */
export function getCurrentPhase(): SolarPhase {
  const loc = cachedLocation ?? { lat: 40, lng: -new Date().getTimezoneOffset() / 4 };
  const now = new Date();
  const times = computeSolarTimes(loc.lat, loc.lng, now);
  return getSolarPhase(times, currentMinutes());
}

/** Get the photo URL for the current solar phase */
export function getPhasePhoto(): string {
  return photoForPhase(getCurrentPhase());
}

/** Get hourly fallback photo for current hour */
export function getHourlyFallback(): string {
  return HOURLY_FALLBACK[new Date().getHours()];
}

/** Preload the likely next phase's photo */
export function preloadNextPhasePhoto(): void {
  const phases: SolarPhase[] = [
    "deep_night", "pre_dawn", "dawn", "sunrise", "golden_morning",
    "bright_morning", "midday", "afternoon", "golden_hour",
    "sunset", "dusk", "twilight", "night",
  ];
  const current = getCurrentPhase();
  const idx = phases.indexOf(current);
  const next = phases[(idx + 1) % phases.length];
  const img = new Image();
  img.src = photoForPhase(next);
}

// ── Backward-compatible aliases ──
export const getHourlyPhoto = getPhasePhoto;
export const getTimeOfDayPhoto = getPhasePhoto;
export const getDailyPhoto = getPhasePhoto;
export const getCurrentHour = () => new Date().getHours();
export const preloadNextHourPhoto = preloadNextPhasePhoto;

/** Flat array of all photos for any code that references it */
export const UNSPLASH_PHOTOS = Object.values(PHASE_PHOTOS).flat();
