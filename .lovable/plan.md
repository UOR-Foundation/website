

## Adaptive Lens Intelligence System

### What This Builds

A personalized lens recommendation engine that learns from user behavior and generates dynamic, custom lenses — going far beyond the current 5 hardcoded presets. Each lens becomes a transparent, editable "recipe" with visible parameters that users can tune, and the system surfaces high-signal sources tailored to each lens perspective.

### Architecture

```text
┌─────────────────────────────────────────────┐
│           User Interaction Layer            │
│  dwell, scroll, lens switches, domains      │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│         Lens Intelligence Engine            │
│  (client-side, localStorage-backed)         │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Pattern     │  │ Dynamic Lens         │  │
│  │ Detector    │──│ Generator            │  │
│  └─────────────┘  └──────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Lens Blueprint (universal template)     ││
│  │ ─ tone, depth, structure, audience      ││
│  │ ─ preferred sources, citation style     ││
│  │ ─ focus areas, excluded topics          ││
│  └─────────────────────────────────────────┘│
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│     Edge Function (uor-knowledge)           │
│  Receives lens blueprint → builds prompt    │
└─────────────────────────────────────────────┘
```

### Changes

#### 1. Lens Blueprint Data Model
**File: `src/modules/oracle/lib/knowledge-lenses.ts`**

Extend `KnowledgeLens` into a full `LensBlueprint` with editable parameters:

```typescript
interface LensBlueprint {
  id: string;
  label: string;
  icon: string;
  description: string;
  isPreset: boolean;       // false for AI-generated lenses
  generatedReason?: string; // "You read 4 physics articles in expert mode"

  // ── Tunable Parameters (the transparent recipe) ──
  params: {
    tone: "neutral" | "vivid" | "technical" | "conversational" | "poetic";
    depth: "overview" | "standard" | "deep" | "exhaustive";
    audience: "beginner" | "curious" | "informed" | "expert";
    structure: "sections" | "narrative" | "qa" | "timeline" | "comparison";
    citationDensity: "minimal" | "moderate" | "thorough";
    focusAreas: string[];      // e.g. ["practical applications", "historical context"]
    excludeAreas: string[];    // e.g. ["mathematical proofs"]
  };

  // ── Recommended Sources ──
  recommendedSources?: Array<{
    domain: string;
    reason: string;       // "Highest signal-to-noise for physics"
    qualityScore: number; // from domain reputation system
  }>;
}
```

The 5 existing presets are mapped to this blueprint format. Dynamic lenses inherit the same structure. Users can always see and edit every parameter.

#### 2. Lens Intelligence Engine
**File: `src/modules/oracle/lib/lens-intelligence.ts` (new)**

Client-side engine that analyzes the attention profile to generate lens suggestions:

- **Pattern Detection**: Analyzes `AttentionProfile` data — dwell times, scroll depth, domain history, lens switch frequency — to detect behavioral patterns:
  - "User always switches from encyclopedia → expert for physics" → suggest "Physics Deep Dive" lens
  - "User reads magazine lens for 3min+ but only 30s on encyclopedia" → suggest magazine-first for similar domains
  - "User explores 5 biology topics in a row" → suggest a "Biology Research" lens with academic sources
  - "Cross-domain jump detected (art → physics)" → suggest "Interdisciplinary Bridge" lens

- **Dynamic Lens Generation**: Creates `LensBlueprint` objects with pre-filled parameters and a human-readable `generatedReason` explaining *why* this lens was suggested.

- **Source Recommendations**: Uses the existing domain reputation tiers (TIER1/2/3) from `uor-knowledge` to recommend high-signal sources for each lens. E.g., an "expert" physics lens recommends arxiv.org, nature.com; a "magazine" art lens recommends smithsonianmag.com, theatlantic.com.

- **Persistence**: Stores user-created/accepted lenses in localStorage alongside the attention profile. Lenses the user dismisses are deprioritized.

#### 3. Lens Inspector Panel
**File: `src/modules/oracle/components/LensInspector.tsx` (new)**

A slide-out panel (triggered by clicking a lens or a "customize" icon) showing:

- **Header**: Lens name + icon + one-line description
- **"How this lens works"** section: Plain-English explanation of what filters are active
- **Parameter Cards**: Each parameter (tone, depth, audience, structure, etc.) rendered as an interactive pill/slider:
  - Tone: segmented control with 5 options
  - Depth: slider from overview → exhaustive
  - Audience: segmented control
  - Focus areas: tag chips with + button to add custom
  - Excluded areas: tag chips with × to remove
- **Recommended Sources**: Cards showing domain, quality score bar, and reason — with toggle to include/exclude
- **"Why suggested"** badge (for AI-generated lenses): Shows the behavioral pattern that triggered this suggestion
- **Apply / Save as Custom**: Apply changes immediately, or save as a named custom lens

Design: Uses the existing `InfoCard` component pattern. Smooth framer-motion slide-in from the right. Matches the project's muted, elegant aesthetic.

#### 4. Enhanced Lens Switcher Bar
**File: `src/modules/oracle/components/ContextualArticleView.tsx`**

Upgrade the existing pill-based lens switcher:

- Preset lenses shown first as current pills
- AI-suggested lenses appear with a subtle sparkle (✦) indicator and a pulsing border, animated in via `AnimatePresence`
- User-saved custom lenses shown with a user icon
- Small "+" button at the end to create a custom lens from scratch
- Clicking any lens pill opens the Lens Inspector panel below/beside it
- Long-press or right-click opens inspector directly

#### 5. Edge Function: Blueprint-Driven Prompts
**File: `supabase/functions/uor-knowledge/index.ts`**

Extend the existing `buildLensPrompt` to accept a full `LensBlueprint.params` object instead of just a lens ID string:

- When `lens` is a string (backward compat): use existing hardcoded prompts
- When `lens` is an object with `params`: dynamically compose the system prompt from the parameter values:
  - Tone → writing style instructions
  - Depth → word count + detail level
  - Audience → vocabulary + explanation level
  - Structure → section organization
  - Focus/exclude areas → content emphasis instructions
  - Citation density → citation frequency rules
- Source recommendations are sent alongside so the prompt can prioritize them

#### 6. Coherence Engine Integration
**File: `src/modules/oracle/lib/coherence-engine.ts`**

Upgrade `computeCoherence` to call the new lens intelligence engine:

- Instead of the current simple 3-rule suggestion logic, delegate to `generateLensSuggestion()` which returns a full `LensBlueprint`
- The `CoherenceState` gets a new field: `suggestedBlueprint: LensBlueprint | null`
- The suggestion pill (`LensSuggestion.tsx`) is upgraded to show the lens name + reason, and clicking it opens the inspector for review before applying

### Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/knowledge-lenses.ts` | Extend with `LensBlueprint` type + preset-to-blueprint mapping |
| `src/modules/oracle/lib/lens-intelligence.ts` | **New** — Pattern detection + dynamic lens generation engine |
| `src/modules/oracle/components/LensInspector.tsx` | **New** — Transparent, editable lens recipe panel |
| `src/modules/oracle/components/ContextualArticleView.tsx` | Upgrade lens switcher with dynamic/custom lens support |
| `src/modules/oracle/components/LensSuggestion.tsx` | Upgrade to show blueprint details + inspector link |
| `src/modules/oracle/lib/coherence-engine.ts` | Integrate lens intelligence for richer suggestions |
| `supabase/functions/uor-knowledge/index.ts` | Accept blueprint params for dynamic prompt composition |
| `src/modules/oracle/pages/ResolvePage.tsx` | Wire blueprint state + inspector panel |

### User Experience Flow

1. User searches "quantum entanglement" → encyclopedia lens renders
2. User switches to "Deep Dive" → system records lens preference for physics
3. User searches "quantum computing", then "quantum cryptography" → system detects physics deep-dive pattern
4. A new lens pill appears with ✦: **"Quantum Researcher"** — _"You've been diving deep into quantum topics — this lens prioritizes arxiv.org and uses technical depth with minimal analogies"_
5. User taps it → Lens Inspector slides open showing all parameters pre-filled
6. User removes "historical context" from focus areas, adds "practical applications"
7. Taps "Apply" → article re-streams with the customized perspective
8. User saves it as "My Quantum Lens" → appears permanently in their lens bar

