

## Enhancing the Galaxy Animation — Breathing Life Into It

The current animation is a single-speed continuous rotation at 18s. It's smooth but mechanical — it lacks the organic rhythms found in nature and living things. Here are three layered techniques I'll apply together to make it feel alive, intelligent, and transcendent:

### 1. Breathing Rhythm (Gentle Pulse)
Add a slow scale pulse to the entire galaxy wrapper — like breathing. A 8-second inhale/exhale cycle (scale 0.97 → 1.03) creates the sensation of a living organism. This is the single most powerful change: breathing = alive.

### 2. Varied Orbital Speeds
Instead of all 20 star groups rotating at the same 18s speed, alternate between slightly different durations (e.g., odd stars at 22s, even stars at 26s). This creates a subtle phase drift — the way real celestial bodies move at different speeds. It produces an emergent, ever-changing pattern that feels intelligent and non-repetitive.

### 3. Gentle Opacity Breathing on Dots
Add a very slow opacity fade (0.6 → 1.0 over ~6s) to the dots, staggered by position. This creates a soft luminous pulse — like stars gently glowing and dimming, or a heartbeat of light. It evokes warmth and presence.

### Technical Details

**CSS changes only** — no component changes needed:

- **`.galaxy-wrapper`**: Add `animation: breathe 8s ease-in-out infinite` keyframes (scale 0.97 ↔ 1.03)
- **`.circle`**: Slow the base rotation from 18s → 24s for a more contemplative pace
- **`.stars:nth-child(odd) .circle`**: 24s duration
- **`.stars:nth-child(even) .circle`**: 30s duration — creates the phase-drift effect
- **`.dot`**: Add `animation: glow 6s ease-in-out infinite` keyframes (opacity 0.55 ↔ 1.0), with `animation-delay` inherited from nth-child index so dots pulse in waves rather than unison

All changes in `src/modules/landing/components/galaxy.css`.

