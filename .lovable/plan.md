

## Solar-Aware Immersive Background Photos

### Problem
Current system uses fixed hour buckets (e.g., hour 17 = golden hour) regardless of actual sunrise/sunset times. In summer at high latitudes, sunset could be at 21:00; in winter at 16:00. The photos don't match what the user actually sees outside their window.

### Solution
Replace the fixed 24-hour grid with a **solar phase engine** that computes the sun's actual position based on the user's coordinates and date, then selects photos matching the real light conditions.

### How It Works

```text
Browser geolocation (or IP fallback)
  → latitude + longitude + date
  → Solar position calculator (sunrise, sunset, solar noon, civil twilight)
  → Current "light phase" with fractional progress:
      deep_night → pre_dawn → dawn → sunrise → golden_morning →
      bright_morning → midday → afternoon → golden_hour →
      sunset → dusk → twilight → night
  → Select Unsplash photo matching that phase
  → Crossfade on phase change (checked every 60s)
```

### Solar Calculator
Pure math — no API needed. Uses the standard solar declination + hour angle equations to compute sunrise/sunset/twilight times for any lat/lng/date. ~60 lines of trigonometry. Accounts for:
- Seasonal variation (summer vs winter day length)
- Latitude (polar regions, tropics, mid-latitudes)
- Civil twilight angles (-6 degrees)

### Expanded Photo Library
13 distinct light phases instead of 24 hourly buckets. Each phase has 3-4 curated Unsplash photos for daily rotation. All images are landscape/nature scenes matching that specific light condition. ~45 total curated photos (up from 24).

| Phase | Description | Example scenes |
|---|---|---|
| deep_night | Solar elevation < -18 deg | Milky Way, starscapes, aurora |
| pre_dawn | -18 to -12 deg | Deep blue horizon glow |
| dawn | -12 to -6 deg | Pink/purple sky, misty valleys |
| sunrise | -6 to +2 deg (rising) | Sun breaking horizon, warm rays |
| golden_morning | +2 to +10 deg | Long shadows, golden fields |
| bright_morning | +10 to +30 deg | Crisp daylight, dewy landscapes |
| midday | +30 deg to peak | Bright sun, vivid colors |
| afternoon | Peak to +20 deg (falling) | Warm light, clear skies |
| golden_hour | +10 to +2 deg (falling) | Amber glow, long shadows |
| sunset | +2 to -6 deg (falling) | Fiery horizon, silhouettes |
| dusk | -6 to -12 deg | Purple/pink afterglow |
| twilight | -12 to -18 deg | Deep blue, first stars |
| night | < -18 deg (falling) | Same as deep_night |

### Geolocation Strategy
1. Try `navigator.geolocation` (cached in localStorage for 24h)
2. Fallback: use timezone offset to estimate longitude, assume 40 deg N latitude
3. No external API calls needed

### Files Changed

| File | Change |
|---|---|
| `src/modules/oracle/lib/solar-position.ts` | New — sunrise/sunset/twilight calculator from lat/lng/date |
| `src/modules/oracle/lib/immersive-photos.ts` | Replace fixed hourly grid with phase-based photo selection using solar calculator; expand to ~45 curated Unsplash photos across 13 phases |
| `src/modules/oracle/components/ImmersiveBackground.tsx` | Request geolocation on mount; pass coords to photo selector; check phase every 60s instead of hour change |

No database changes. No new dependencies. Pure client-side math + expanded Unsplash curation.

