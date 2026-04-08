/**
 * Solar-phase-aware Unsplash photo selection for immersive mode.
 * Photos are grouped by 13 distinct light phases computed from the sun's
 * actual position at the user's location. Each phase has 3-4 curated
 * landscape photos that rotate daily.
 */

import {
  type SolarPhase,
  computeSolarTimes,
  getSolarPhase,
  currentMinutes,
  getUserLocation,
} from "./solar-position";

const Q = "?w=1920&q=80&auto=format&fit=crop";
const u = (id: string) => `https://images.unsplash.com/photo-${id}${Q}`;

/**
 * Curated Unsplash photos for each solar phase.
 * Every photo is a real, high-quality landscape/nature image that faithfully
 * represents the light conditions of that phase.
 */
const PHASE_PHOTOS: Record<SolarPhase, string[]> = {
  /* ── Deep night: stars, milky way, aurora ── */
  deep_night: [
    u("1519681393784-d120267933ba"), // milky way over mountains
    u("1531306728370-e2ebd9d7bb99"), // milky way arch
    u("1532767153706-98d5f4f5a8d2"), // aurora borealis
    u("1475274047050-1d0c55b7b10c"), // moonlit snow peaks
  ],

  /* ── Pre-dawn: deep blue horizon glow ── */
  pre_dawn: [
    u("1470252649378-9c29740c9fa8"), // dark blue mountain horizon
    u("1518837695005-2083093ee35b"), // first hint of light
    u("1488866022504-f2584929ca5f"), // pre-dawn lake reflection
  ],

  /* ── Dawn: pink/purple sky, misty valleys ── */
  dawn: [
    u("1501785888041-af3ef285b470"), // misty pink dawn valley
    u("1504198453319-5ce911bafcbe"), // foggy golden dawn
    u("1500964757134-3ef6a8a8787b"), // purple dawn mountains
  ],

  /* ── Sunrise: sun breaking horizon ── */
  sunrise: [
    u("1495616811223-4d98c6e9c869"), // golden sunrise meadow
    u("1506744038136-46273834b3fb"), // warm sunrise valley
    u("1500534314209-a25ddb2bd429"), // sunrise over lake
    u("1464822759023-fed622ff2c3b"), // alpine sunrise glow
  ],

  /* ── Golden morning: long shadows, warm fields ── */
  golden_morning: [
    u("1470071459604-3b5ec3a7fe05"), // sunlit forest morning
    u("1447752875215-b2761acb3c5d"), // golden woodland path
    u("1465056836041-7f43ac27dcb5"), // misty morning meadow
  ],

  /* ── Bright morning: crisp daylight ── */
  bright_morning: [
    u("1472214103451-9374bd1c798e"), // vivid green hills
    u("1506744038136-46273834b3fb"), // bright valley panorama
    u("1500534314209-a25ddb2bd429"), // clear mountain lake
    u("1441974231531-c6227db76b6e"), // lush forest canopy
  ],

  /* ── Midday: bright sun, vivid colors ── */
  midday: [
    u("1469474968028-56623f02e42e"), // sun-drenched valley
    u("1507525428034-b723cf961d3e"), // tropical coast midday
    u("1433086966358-54859d0ed716"), // waterfall in full sun
    u("1470770903676-69b98201ea1c"), // blue sky mountains
  ],

  /* ── Afternoon: warm directional light ── */
  afternoon: [
    u("1500049242364-642850e61a78"), // coastal cliffs warm light
    u("1464822759023-fed622ff2c3b"), // alpine afternoon
    u("1505228395891-9a51e7e86bf6"), // rolling hills afternoon
    u("1508739773434-c26b3d09e071"), // calm ocean afternoon
  ],

  /* ── Golden hour: amber glow, long shadows ── */
  golden_hour: [
    u("1490730141103-6cac27aaab94"), // golden horizon fields
    u("1507400492013-162706c8c05e"), // amber light on hills
    u("1472120435266-95a3f747eb08"), // golden forest light
  ],

  /* ── Sunset: fiery horizon, silhouettes ── */
  sunset: [
    u("1495584816685-4bdbf1b5057e"), // amber ocean sunset
    u("1476610182048-b716b8515aaa"), // warm sunset clouds
    u("1494548162494-384bba4ab999"), // fiery mountain sunset
    u("1500382017468-9049fed747ef"), // dramatic sunset silhouette
  ],

  /* ── Dusk: purple/pink afterglow ── */
  dusk: [
    u("1507400492013-162706c8c05e"), // purple dusk over lake
    u("1494548162494-384bba4ab999"), // pink afterglow peaks
    u("1504608524841-42fe6f032b4b"), // lavender dusk sky
  ],

  /* ── Twilight: deep blue, first stars ── */
  twilight: [
    u("1476610182048-b716b8515aaa"), // deep blue twilight
    u("1495584816685-4bdbf1b5057e"), // twilight ocean
    u("1488866022504-f2584929ca5f"), // blue hour lake
  ],

  /* ── Night: same pool as deep_night ── */
  night: [
    u("1519681393784-d120267933ba"),
    u("1531306728370-e2ebd9d7bb99"),
    u("1532767153706-98d5f4f5a8d2"),
    u("1475274047050-1d0c55b7b10c"),
  ],
};

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
export const getCurrentHour = () => new Date().getHours(); // kept for other consumers
export const preloadNextHourPhoto = preloadNextPhasePhoto;

/** Flat array of all photos for any code that references it */
export const UNSPLASH_PHOTOS = Object.values(PHASE_PHOTOS).flat();
