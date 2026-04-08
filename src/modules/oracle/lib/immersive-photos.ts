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

interface PhotoEntry {
  url: string;
  description: string;
}

const p = (id: string, description: string): PhotoEntry => ({ url: u(id), description });

/**
 * Curated Unsplash photos for each solar phase.
 */
const PHASE_PHOTOS: Record<SolarPhase, PhotoEntry[]> = {
  deep_night: [
    p("photo-1444703686981-a3abbc4d4fe3", "Starry night sky over a mountain range"),
    p("photo-1507400492013-162706c8c05e", "Stars scattered across a clear night sky"),
    p("photo-1532978379173-523e16f371f2", "Milky Way arching over a desert landscape"),
    p("photo-1489549132488-d00b7eee80f1", "Dark mountain silhouette under night sky"),
  ],
  pre_dawn: [
    p("photo-1504608524841-42fe6f032b4b", "Deep blue horizon before dawn"),
    p("photo-1503424886307-b090341d25d1", "Dark blue mountain range at pre-dawn"),
    p("photo-1505765050516-f72dcac9c60e", "Subtle glow on the horizon at first light"),
  ],
  dawn: [
    p("photo-1501436513145-30f24e19fcc8", "Pink dawn sky over rolling hills"),
    p("photo-1470252649378-9c29740c9fa8", "Purple dawn light over mountain peaks"),
    p("photo-1518837695005-2083093ee35b", "Misty valley at dawn"),
  ],
  sunrise: [
    p("photo-1470071459604-3b5ec3a7fe05", "Golden sunrise over a misty valley"),
    p("photo-1500382017468-9049fed747ef", "Warm sunrise light over an open landscape"),
    p("photo-1464822759023-fed622ff2c3b", "Alpine peaks bathed in sunrise glow"),
    p("photo-1509316975850-ff9c5deb0cd9", "Sun breaking over a mountain ridge"),
  ],
  golden_morning: [
    p("photo-1447752875215-b2761acb3c5d", "Golden light filtering through woodland"),
    p("photo-1465056836041-7f43ac27dcb5", "Misty golden meadow at morning"),
    p("photo-1501785888041-af3ef285b470", "Warm morning light over green hills"),
  ],
  bright_morning: [
    p("photo-1441974231531-c6227db76b6e", "Lush green forest canopy in bright light"),
    p("photo-1472214103451-9374bd1c798e", "Vivid green rolling hills under clear sky"),
    p("photo-1469474968028-56623f02e42e", "Bright mountain vista with blue sky"),
    p("photo-1482938289607-e9573fc25ebb", "Bright morning river winding through a valley"),
  ],
  midday: [
    p("photo-1507525428034-b723cf961d3e", "Tropical beach under full midday sun"),
    p("photo-1506744038136-46273834b3fb", "Vivid lake and mountains at midday"),
    p("photo-1470770903676-69b98201ea1c", "Blue sky panorama over mountain range"),
    p("photo-1433086966358-54859d0ed716", "Waterfall cascading in bright daylight"),
  ],
  afternoon: [
    p("photo-1505228395891-9a51e7e86bf6", "Rolling hills in warm afternoon light"),
    p("photo-1508739773434-c26b3d09e071", "Calm ocean reflecting afternoon sun"),
    p("photo-1500049242364-642850e61a78", "Coastal cliffs in warm afternoon light"),
    p("photo-1497436072909-60f360e1d4b1", "Green valley under afternoon sky"),
  ],
  golden_hour: [
    p("photo-1490730141103-6cac27aaab94", "Golden horizon over open fields"),
    p("photo-1472120435266-95a3f747eb08", "Golden light streaming through a forest"),
    p("photo-1495616811223-4d98c6e9c869", "Amber light warming a meadow"),
  ],
  sunset: [
    p("photo-1495584816685-4bdbf1b5057e", "Amber sunset over the ocean"),
    p("photo-1476610182048-b716b8515aaa", "Dramatic warm sunset through clouds"),
    p("photo-1494548162494-384bba4ab999", "Fiery sunset behind mountain peaks"),
    p("photo-1504198453319-5ce911bafcbe", "Red sunset reflected on still water"),
  ],
  dusk: [
    p("photo-1517483000871-1dbf64a6e1c6", "Purple dusk sky fading to night"),
    p("photo-1488866022504-f2584929ca5f", "Pink afterglow reflected on a lake"),
    p("photo-1500964757134-3ef6a8a8787b", "Lavender dusk light over mountains"),
  ],
  twilight: [
    p("photo-1472552944129-b035e9ea3744", "Deep blue twilight sky"),
    p("photo-1531315396756-905d68d21b56", "Twilight glow over a city horizon"),
    p("photo-1519681393784-d120267933ba", "Blue hour stars over snow-capped mountains"),
  ],
  night: [
    p("photo-1444703686981-a3abbc4d4fe3", "Starry night sky over a mountain range"),
    p("photo-1507400492013-162706c8c05e", "Stars scattered across a clear night sky"),
    p("photo-1532978379173-523e16f371f2", "Milky Way arching over a desert landscape"),
    p("photo-1489549132488-d00b7eee80f1", "Dark mountain silhouette under night sky"),
  ],
};

/**
 * Hourly fallback — maps each hour (0-23) to a specific Unsplash photo
 * that precisely reflects the typical outdoor light at that time.
 * Used if solar phase computation returns an invalid result.
 */
const HOURLY_FALLBACK: string[] = [
  /* 00 */ u("photo-1444703686981-a3abbc4d4fe3"),  // midnight stars
  /* 01 */ u("photo-1532978379173-523e16f371f2"),  // deep night milky way
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
  /* 23 */ u("photo-1532978379173-523e16f371f2"),  // late night milky way
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

/** Get photo entry for a specific solar phase, rotating daily */
function photoEntryForPhase(phase: SolarPhase): PhotoEntry {
  const bucket = PHASE_PHOTOS[phase];
  return bucket[dayOfYear() % bucket.length];
}

/** Get photo for a specific solar phase, rotating daily */
function photoForPhase(phase: SolarPhase): string {
  return photoEntryForPhase(phase).url;
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

/** Get the description of the current phase photo */
export function getPhasePhotoDescription(): string {
  return photoEntryForPhase(getCurrentPhase()).description;
}

/** Get hourly fallback photo for current hour */
export function getHourlyFallback(): string {
  return HOURLY_FALLBACK[new Date().getHours()];
}

const ALL_PHASES: SolarPhase[] = [
  "deep_night", "pre_dawn", "dawn", "sunrise", "golden_morning",
  "bright_morning", "midday", "afternoon", "golden_hour",
  "sunset", "dusk", "twilight", "night",
];

/** Preload the likely next phase's photo */
export function preloadNextPhasePhoto(): void {
  const current = getCurrentPhase();
  const idx = ALL_PHASES.indexOf(current);
  const next = ALL_PHASES[(idx + 1) % ALL_PHASES.length];
  const img = new Image();
  img.src = photoForPhase(next);
}

/** Preload the current phase's photo (call on mount for instant display) */
export function preloadCurrentPhasePhoto(): void {
  const img = new Image();
  img.src = photoForPhase(getCurrentPhase());
  // Also preload the hourly fallback
  const fb = new Image();
  fb.src = HOURLY_FALLBACK[new Date().getHours()];
}

// ── Backward-compatible aliases ──
export const getHourlyPhoto = getPhasePhoto;
export const getTimeOfDayPhoto = getPhasePhoto;
export const getDailyPhoto = getPhasePhoto;
export const getCurrentHour = () => new Date().getHours();
export const preloadNextHourPhoto = preloadNextPhasePhoto;

/** Flat array of all photo URLs for any code that references it */
export const UNSPLASH_PHOTOS = Object.values(PHASE_PHOTOS).flat().map(e => e.url);
