

## Time-of-Day Immersive Backgrounds

### Problem
Currently `getDailyPhoto()` picks one photo per calendar day from a flat 10-image array. The photo doesn't reflect the user's local time — a sunset image might appear at 8am, breaking the immersive illusion.

### Design
Replace the single flat array with **5 time-of-day buckets**, each containing 4-5 curated Unsplash landscape photos. The function picks the bucket based on the current hour, then rotates within that bucket by day so users don't see the same image every morning.

| Period | Hours | Mood | Example Scenes |
|--------|-------|------|----------------|
| Dawn | 5–7 | Soft pink/gold, misty | Misty lake sunrise, golden meadow, mountain dawn |
| Morning | 7–12 | Bright, crisp, blue sky | Sunlit valley, dewy forest, clear mountain lake |
| Afternoon | 12–17 | Warm, vibrant, full light | Rolling hills, coastal cliffs, alpine panorama |
| Evening | 17–20 | Golden hour, amber/orange | Sunset over ocean, golden fields, twilight mountains |
| Night | 20–5 | Deep blue, stars, moonlit | Starry sky, moonlit lake, aurora, night desert |

### Implementation

**File:** `src/modules/oracle/lib/immersive-photos.ts`

- Replace `UNSPLASH_PHOTOS` flat array with a `TIME_PHOTOS` object keyed by period
- Each period has 4-5 hand-picked Unsplash URLs matching that time-of-day mood
- Update `getDailyPhoto()` → `getTimeOfDayPhoto()`:
  1. Get current hour from `new Date().getHours()`
  2. Map hour to period (dawn/morning/afternoon/evening/night)
  3. Pick from that period's array using day-of-year rotation
- Keep the old export name (`getDailyPhoto`) as an alias pointing to the new function for backward compatibility

**No other files change** — `ImmersiveSearchView`, `ImmersiveBackground`, and `ResolvePage` all import `getDailyPhoto` and will automatically get time-appropriate photos.

### Photo Selection (Unsplash, no API key needed)

All photos use the static `images.unsplash.com/photo-{id}?w=1920&q=80` pattern. Each will be a curated, high-resolution landscape that matches the time-of-day mood — dawn mists, bright morning skies, warm afternoon light, golden-hour sunsets, and starry nights.

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/immersive-photos.ts` | Replace flat array with 5 time-of-day buckets; update selection logic |

