

## Homepage Narrative Flow Analysis

### Current Order
1. **Hero** — "Your Universal Coordinate System for Information"
2. **Mission** (dark) — "We maintain the open spec for content-addressed data identity"
3. **How It Works** — Explains deterministic addressing, no central registry
4. **Where It Applies** — 6 application domain cards
5. **Get Involved** — 3 pillars (Framework, Research, Launchpad)
6. **Featured Projects** (dark) — 3 project cards from the ecosystem
7. **Ready to Build?** — CTA buttons + UOR Community member grid

### Assessment

The flow is **mostly strong** but has two structural issues that break the narrative momentum:

**Issue 1: "Get Involved" (Pillars) appears before proof of traction.**
You're asking the reader to commit before showing them that others already have. The Featured Projects and Community grid are the social proof. They should come *before* the ask.

**Issue 2: "Featured Projects" and "UOR Community" are separated.**
Projects and people are both proof that the ecosystem is real. Grouping them together creates a stronger "this is alive" signal before the final CTA.

### Recommended Order

```text
Current                          Proposed
─────────────────────────────    ─────────────────────────────
1. Hero                          1. Hero              (same)
2. Mission (dark)                2. Mission (dark)    (same)
3. How It Works                  3. How It Works      (same)
4. Where It Applies              4. Where It Applies  (same)
5. Get Involved (Pillars)    →   5. Featured Projects (dark) ↑
6. Featured Projects (dark)  →   6. UOR Community     (moved up from CTA)
7. Ready to Build + Community →  7. Get Involved (Pillars)   ↓
                                 8. Ready to Build (CTA only, no community)
```

### Why This Works

The story becomes a clean funnel:

1. **Hook** — What is this? (Hero)
2. **Why it exists** — Mission
3. **How it works** — Mechanism
4. **Where it applies** — Inspiration / use cases
5. **Who's building on it** — Projects (proof it works)
6. **Who's behind it** — Community (proof it's credible)
7. **How to participate** — Pillars (now earned, not premature)
8. **Start now** — Clean CTA with action buttons only

This follows the classic persuasion arc: **Intrigue → Educate → Prove → Ask.**

### Technical Changes

**File: `src/modules/landing/pages/IndexPage.tsx`**
- Reorder components: move `ProjectsShowcase` and a new `CommunitySection` above `PillarsSection`
- `CTASection` becomes a lean CTA block (buttons only)

**File: `src/modules/landing/components/CommunitySection.tsx`** (new)
- Extract the UOR Community member grid from `CTASection` into its own standalone section
- Light background, same grid layout and styling

**File: `src/modules/landing/components/CTASection.tsx`**
- Remove the community member grid
- Keep only the "Ready to Build?" heading, subtitle, and three action buttons
- Clean, focused closing section

No content or copy changes needed. No new data files. Just structural reorganization.

