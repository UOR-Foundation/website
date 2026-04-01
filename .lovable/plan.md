

# Deepen Foundation Aesthetic — 11 Principles Alignment

## Assessment

Comparing the 11 Foundation principles against the current site, most are already well-addressed (dark palette, gold accents, prime grid, uppercase typography, mathematical spacing). Here are the gaps:

| Principle | Status | Gap |
|-----------|--------|-----|
| 1. Intellectual Minimalism | Mostly done | Community section has faces/photos — violates principle 10 |
| 2. Monumental Scale, Minimal Detail | Partial | Sections feel equally weighted; hero needs more breathing room |
| 3. System-First Aesthetic | Partial | Cards lack "analytical module" feel; no system-state language |
| 4. Mathematical & Abstract | Good | Prime grid exists; could add coordinate labels |
| 5. Structured Irregularity | Good | Prime spacing in place |
| 6. Restrained Color | Good | Gold palette done |
| 7. Language as Design | Partial | Some copy still reads like marketing ("Ready to Build?") |
| 8. Calm, Predictable Motion | Good | Prime timing done |
| 9. Layered Reality | Partial | No hover-reveal of deeper structure |
| 10. Absence of Human-Centric Design | **Violated** | Community section shows faces prominently |
| 11. Retro-Futuristic Rationalism | Good | Clean and rational |

## Changes

### 1. Community Section — System-First Redesign
**File:** `src/modules/landing/components/CommunitySection.tsx`

Replace face photos with a contributor grid that feels like a system registry. Each contributor becomes a small monospaced entry showing initials in a gold-bordered square + name + role. No photos. The `+150` becomes a system counter: `+150 nodes`. This shifts from human-centric to system-first while still crediting people.

### 2. Project Cards — Analytical Module Styling
**File:** `src/modules/landing/components/ProjectsShowcase.tsx`

Add `panel-active` class to project cards for gold-tinted hover borders. Add a faint monospaced index number (`01`, `02`, `03`) in the top-right corner of each card, making them feel like indexed system modules.

### 3. Copy Tone — Declarative System Language
**Files:** `CTASection.tsx`, `PillarsSection.tsx`

- CTA heading: "Ready to Build?" → "Begin Verification"
- CTA subtitle: "Verify your first address in five minutes, then join the community." → "Derive your first address. Verify its structure. Five minutes."
- Pillar CTA labels already say "Explore" / "Join" which are fine

### 4. Hover-Reveal Deeper Structure (Layered Reality)
**File:** `src/modules/landing/components/ApplicationsSection.tsx`

On hover of each application card, reveal a faint monospaced "system ID" line (e.g., `sys.semantic-web.v1`) below the description. This creates the "surface vs underlying system" layered reality effect. Pure CSS transition, appears on hover only.

### 5. Coordinate Axis Labels on Prime Grid
**File:** `src/modules/landing/components/PrimeGrid.tsx`

Add faint axis markers at the edges: column numbers at top (every 7th column), row numbers on left (every 7th row), in ultra-low-opacity monospaced text. This makes the grid feel like a coordinate system you're looking through, reinforcing "mathematical instrument revealing hidden structure."

### 6. Section Divider Enhancement — ProjectsShowcase
**File:** `src/modules/landing/components/ProjectsShowcase.tsx`

Replace the flat `bg-foreground/8` divider with `rule-prime` class (already exists but not applied here).

### 7. CommunitySection + HighlightsSection — Add section-depth
**Files:** `CommunitySection.tsx`, `HighlightsSection.tsx` (if on dark bg)

Add `section-depth` class to CommunitySection for the radial depth gradient, making it feel like looking into a deeper layer of the system.

## Technical Details

**Community Section redesign:**
- Remove `<img>` tags and photo imports
- Render contributors as small rectangular cells with initials + name
- Monospaced font for initials, system-registry visual language
- Gold border on the cell, very thin (1px), with `panel-active` hover behavior

**Hover-reveal system IDs:**
- Add a `<span>` with `opacity-0 group-hover:opacity-100 transition-opacity` 
- Content is a deterministic system path derived from the title

**Files modified:**
| File | Change |
|------|--------|
| `CommunitySection.tsx` | System-registry redesign, remove photos |
| `ProjectsShowcase.tsx` | panel-active, index numbers, rule-prime divider |
| `CTASection.tsx` | Declarative copy |
| `ApplicationsSection.tsx` | Hover-reveal system IDs |
| `PrimeGrid.tsx` | Coordinate axis labels |

