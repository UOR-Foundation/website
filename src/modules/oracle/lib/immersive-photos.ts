/**
 * Hourly curated Unsplash landscapes for immersive mode.
 * 24 photos — one per hour — reflecting natural daylight progression.
 * Crossfades smoothly when the hour changes.
 */

const Q = "?w=1920&q=80&auto=format&fit=crop";
const u = (id: string) => `https://images.unsplash.com/photo-${id}${Q}`;

/**
 * 24-hour photo cycle. Each slot has multiple options; we rotate by day-of-year.
 * Curated for natural daylight fidelity:
 *   0–4   deep night / starscapes
 *   5–6   pre-dawn / first light
 *   7–8   golden sunrise
 *   9–11  bright morning
 *   12–14 midday / full sun
 *   15–16 warm afternoon
 *   17–18 golden hour
 *   19–20 sunset / dusk
 *   21–23 twilight → night
 */
const HOURLY_PHOTOS: string[][] = [
  /* 00 */ [u("1519681393784-d120267933ba"), u("1531306728370-e2ebd9d7bb99")],   // deep starry night, milky way
  /* 01 */ [u("1532767153706-98d5f4f5a8d2"), u("1475274047050-1d0c55b7b10c")],   // aurora, moonlit peaks
  /* 02 */ [u("1531306728370-e2ebd9d7bb99"), u("1519681393784-d120267933ba")],   // milky way arch, stars
  /* 03 */ [u("1475274047050-1d0c55b7b10c"), u("1532767153706-98d5f4f5a8d2")],   // moonlit snow, aurora
  /* 04 */ [u("1470252649378-9c29740c9fa8"), u("1518837695005-2083093ee35b")],   // pre-dawn mist, first light
  /* 05 */ [u("1501785888041-af3ef285b470"), u("1504198453319-5ce911bafcbe")],   // misty pink dawn, golden fog
  /* 06 */ [u("1495616811223-4d98c6e9c869"), u("1518837695005-2083093ee35b")],   // sunrise meadow, pastel clouds
  /* 07 */ [u("1470071459604-3b5ec3a7fe05"), u("1506744038136-46273834b3fb")],   // sunlit forest, bright valley
  /* 08 */ [u("1447752875215-b2761acb3c5d"), u("1500534314209-a25ddb2bd429")],   // woodland path, clear lake
  /* 09 */ [u("1472214103451-9374bd1c798e"), u("1506744038136-46273834b3fb")],   // green hills, Yosemite
  /* 10 */ [u("1500534314209-a25ddb2bd429"), u("1470071459604-3b5ec3a7fe05")],   // mountain lake, forest canopy
  /* 11 */ [u("1506744038136-46273834b3fb"), u("1472214103451-9374bd1c798e")],   // bright valley, rolling hills
  /* 12 */ [u("1469474968028-56623f02e42e"), u("1507525428034-b723cf961d3e")],   // warm valley, tropical coast
  /* 13 */ [u("1433086966358-54859d0ed716"), u("1464822759023-fed622ff2c3b")],   // waterfall, alpine panorama
  /* 14 */ [u("1507525428034-b723cf961d3e"), u("1500049242364-642850e61a78")],   // beach, coastal cliffs
  /* 15 */ [u("1500049242364-642850e61a78"), u("1469474968028-56623f02e42e")],   // coastal cliffs, sunlit valley
  /* 16 */ [u("1464822759023-fed622ff2c3b"), u("1433086966358-54859d0ed716")],   // alpine, waterfall
  /* 17 */ [u("1490730141103-6cac27aaab94"), u("1507400492013-162706c8c05e")],   // golden hour horizon, fields
  /* 18 */ [u("1495584816685-4bdbf1b5057e"), u("1476610182048-b716b8515aaa")],   // amber ocean sunset, cloud reflections
  /* 19 */ [u("1494548162494-384bba4ab999"), u("1490730141103-6cac27aaab94")],   // twilight mountains, golden horizon
  /* 20 */ [u("1507400492013-162706c8c05e"), u("1494548162494-384bba4ab999")],   // dusk lake, twilight purple
  /* 21 */ [u("1476610182048-b716b8515aaa"), u("1495584816685-4bdbf1b5057e")],   // warm sunset fade, amber sea
  /* 22 */ [u("1519681393784-d120267933ba"), u("1475274047050-1d0c55b7b10c")],   // early night stars, moonlit
  /* 23 */ [u("1532767153706-98d5f4f5a8d2"), u("1531306728370-e2ebd9d7bb99")],   // aurora, milky way
];

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get the photo URL for the current hour. Rotates by day within each hour slot. */
export function getHourlyPhoto(): string {
  const hour = new Date().getHours();
  const bucket = HOURLY_PHOTOS[hour];
  return bucket[dayOfYear() % bucket.length];
}

/** Get the current hour (for change-detection in components). */
export function getCurrentHour(): number {
  return new Date().getHours();
}

/** Preload the next hour's image for seamless crossfade. */
export function preloadNextHourPhoto(): void {
  const nextHour = (new Date().getHours() + 1) % 24;
  const bucket = HOURLY_PHOTOS[nextHour];
  const url = bucket[dayOfYear() % bucket.length];
  const img = new Image();
  img.src = url;
}

// Backward-compatible aliases
export const getTimeOfDayPhoto = getHourlyPhoto;
export const getDailyPhoto = getHourlyPhoto;

/** Kept for any code that references the flat array */
export const UNSPLASH_PHOTOS = HOURLY_PHOTOS.flat();
