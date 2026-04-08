/**
 * Time-of-day curated Unsplash landscapes for immersive mode.
 * Buckets: dawn, morning, afternoon, evening, night.
 * Rotates within each bucket by day-of-year for variety.
 */

const Q = "?w=1920&q=80&auto=format&fit=crop";
const u = (id: string) => `https://images.unsplash.com/photo-${id}${Q}`;

type Period = "dawn" | "morning" | "afternoon" | "evening" | "night";

const TIME_PHOTOS: Record<Period, string[]> = {
  dawn: [
    u("1501785888041-af3ef285b470"),   // misty mountain lake, pink sky
    u("1504198453319-5ce911bafcbe"),   // golden fog over hills
    u("1495616811223-4d98c6e9c869"),   // soft sunrise meadow
    u("1470252649378-9c29740c9fa8"),   // dawn mist over water
    u("1518837695005-2083093ee35b"),   // pastel sunrise clouds
  ],
  morning: [
    u("1506744038136-46273834b3fb"),   // bright Yosemite valley
    u("1470071459604-3b5ec3a7fe05"),   // sunlit forest canopy
    u("1447752875215-b2761acb3c5d"),   // crisp woodland path
    u("1472214103451-9374bd1c798e"),   // green rolling hills, blue sky
    u("1500534314209-a25ddb2bd429"),   // clear mountain lake morning
  ],
  afternoon: [
    u("1469474968028-56623f02e42e"),   // warm sunlit valley
    u("1433086966358-54859d0ed716"),   // bright waterfall in forest
    u("1507525428034-b723cf961d3e"),   // vibrant tropical beach
    u("1464822759023-fed622ff2c3b"),   // dramatic alpine panorama
    u("1500049242364-642850e61a78"),   // rolling coastal cliffs
  ],
  evening: [
    u("1490730141103-6cac27aaab94"),   // golden hour sunset horizon
    u("1495584816685-4bdbf1b5057e"),   // amber sunset over ocean
    u("1507400492013-162706c8c05e"),   // golden fields at dusk
    u("1494548162494-384bba4ab999"),   // twilight mountains purple sky
    u("1476610182048-b716b8515aaa"),   // warm sunset cloud reflections
  ],
  night: [
    u("1519681393784-d120267933ba"),   // starry night over mountains
    u("1507400492013-162706c8c05e"),   // deep blue twilight lake
    u("1475274047050-1d0c55b7b10c"),   // moonlit snowy peaks
    u("1531306728370-e2ebd9d7bb99"),   // milky way desert arch
    u("1532767153706-98d5f4f5a8d2"),   // aurora borealis green
  ],
};

function getPeriod(hour: number): Period {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTimeOfDayPhoto(): string {
  const period = getPeriod(new Date().getHours());
  const bucket = TIME_PHOTOS[period];
  return bucket[dayOfYear() % bucket.length];
}

/** Backward-compatible alias */
export const getDailyPhoto = getTimeOfDayPhoto;

/** Kept for any code that references the flat array */
export const UNSPLASH_PHOTOS = Object.values(TIME_PHOTOS).flat();
