

# Aesthetics Conformance Gate

## Concept

A new gate — `aesthetics-gate.ts` — that codifies your aesthetic sensibilities as **declarative, machine-verifiable constraints** derived from the Algebrica and Aman design languages. Rather than subjective judgment, each preference maps to a measurable property.

The gate also registers a new axiom **A14: Aesthetic Coherence** in the existing axiom registry, linking it canonically to the design system so it's swappable like all other axioms.

## Aesthetic Constraints — Derived from Algebrica + Aman

From studying both reference sites, the shared DNA is: **generous whitespace, large confident typography, monochrome restraint, extreme content hierarchy, and φ-proportioned rhythm**. Each of your stated preferences maps to a testable constraint:

```text
PREFERENCE                  CONSTRAINT                                    CHECK
─────────────────────────── ───────────────────────────────────────────── ──────────────
Coherence                   Color palette ≤ 5 hues (zinc + 1 accent)     Tailwind config token count
Harmony                     Spacing scale follows φ-progression           golden-ratio.ts constants
Golden ratio                Content measure 600-720px, optical center     CONTENT.bodyMaxWidth
Simplicity                  Max 3 font weights per page                   Tailwind font config
Clarity                     Body text ≥ 16px                              TYPE.body ≥ 16
No small font               Caption ≥ 11px, nothing below                 TYPE.caption ≥ 11
Visible text color           Contrast ratio ≥ 4.5:1 (WCAG AA)            Token pair analysis
No noise                    Max 2 shadow depths active per view           SHADOW token count
No excess text              Body max-width ≤ 720px (measure limit)        CONTENT constant
Proportioned layout         Hero aspect ratio = φ:1                       MEDIA.heroAspectRatio
Generous whitespace         Section spacing ≥ 2.618em (φ²)               RHYTHM constants
```

## Implementation

### File 1: `src/modules/canonical-compliance/gates/aesthetics-gate.ts` (new)

The gate runs ~12 declarative checks grouped into four categories:

**Typography Coherence** (3 checks)
- Body font ≥ 16px (from `TYPE.body`)
- Caption font ≥ 11px (from `TYPE.caption`)
- Line height for body text between 1.5-1.9 (from `LINE_HEIGHT.body`)

**Spatial Harmony** (3 checks)
- Spacing scale follows φ-progression (verify each step ≈ previous × 1.618 within 15% tolerance)
- Content measure between 600-720px
- Section spacing uses φ² (2.618em)

**Chromatic Restraint** (3 checks)
- Neutral palette uses zinc-scale (verify token names)
- Opacity hierarchy follows φ-inverse decay (verify 0.90 → 0.56 → 0.34 → 0.21 progression)
- Shadow scale ≤ 4 levels (no noise)

**Proportional Integrity** (3 checks)
- Hero aspect ratio = φ:1 (1.618)
- Float width = φ⁻¹ (38.2%)
- Optical center at 38.2% (φ⁻¹ vertical)

Each failing check produces a finding with severity and a recommendation. The gate reads directly from the existing `golden-ratio.ts` constants and `ALGEBRICA_TOKENS`, making it fully declarative.

### File 2: `src/modules/axioms/registry.ts` (update)

Add axiom **A14: Aesthetic Coherence** to the Algebrica design system:
- Category: `"visual"`
- Principle: "The system must be visually coherent, harmonious, and proportioned — generous whitespace, confident typography, chromatic restraint, and φ-derived spatial rhythm."
- Verification kind: `"constant-check"` targeting `golden-ratio.ts`
- Constraints: forbids small fonts (<11px), low-contrast text, excessive shadow depths, arbitrary spacing outside φ-scale

### File 3: `src/modules/canonical-compliance/gates/index.ts` (update)

Register the new gate via `import "./aesthetics-gate"`.

## What This Catches

The gate will flag violations like:
- Someone adds a 10px body font — **error**: "Body text 10px < minimum 16px"
- A new component uses arbitrary 15px spacing not in the φ-scale — **warning**: "Non-φ spacing detected"
- Opacity values drift from φ-inverse decay — **warning**: "Opacity hierarchy broken"
- Content width set to 900px — **warning**: "Content measure 900px exceeds 720px maximum"

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/gates/aesthetics-gate.ts` | Create | 12-check aesthetic conformance gate |
| `src/modules/axioms/registry.ts` | Update | Add A14 Aesthetic Coherence axiom |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register the new gate |

