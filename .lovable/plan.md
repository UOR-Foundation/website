

## Address Profile Redesign

Transform the result view from a technical SERP into a social-network-style identity profile. Every address — whether it represents a human, an AI agent, or raw data — gets the same standardized profile layout.

### Layout Structure

```text
┌─────────────────────────────────────────────┐
│  [← search bar]                             │
├─────────────────────────────────────────────┤
│                                             │
│     ┌──────┐                                │
│     │ GLYPH│   Entity Name / Triword        │
│     │avatar│   @type badge · engine badge    │
│     └──────┘   "First discovered 3h ago"    │
│                                             │
│  ─────────────────────────────────────────  │
│  47 visitors · 12 reactions · 3 comments    │
│  [✦ Resonates 4] [◆ Useful 2] [◇] [★]      │
│  ─────────────────────────────────────────  │
│                                             │
│  IDENTITY CARD                              │
│  ┌─────────────────────────────────────┐    │
│  │ IPv6    fd00:0075:6f72:...    [copy]│    │
│  │ CID     bafyrei...            [copy]│    │
│  │ Triword alpha·bravo·charlie   [copy]│    │
│  │ Engine  wasm · v0.3.0               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ACTIONS                                    │
│  [🔮 Discuss in Oracle] [🌐 Inscribe IPFS] │
│  [🔄 Verify Integrity]                     │
│                                             │
│  CONTENT                    [Human|Machine] │
│  ┌─────────────────────────────────────┐    │
│  │  (content block, same as today)     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  DISCUSSION                                 │
│  (comments thread, expanded by default)     │
│                                             │
└─────────────────────────────────────────────┘
```

### What Changes

**1. Profile Header (new)**
- Large circular avatar derived from the Braille glyph (first 2 chars, rendered in a colored circle with a subtle glow)
- Triword as the "display name" in large display font
- `@type` shown as a colored badge (e.g. "User Content", "Oracle Exchange", "Chain of Proofs", "Concept")
- Discovered/Confirmed status integrated inline
- Timestamp shown as "First seen X ago"

**2. Social Stats + Reactions (promoted)**
- Visitor count, reaction count, comment count on a single prominent line directly under the header
- Reaction buttons immediately below — always visible, not tucked away
- This becomes the emotional center of the profile

**3. Identity Card (consolidated)**
- All technical identifiers (IPv6, CID, triword, engine) grouped in a clean bordered card
- Each row: label, monospace value, copy button
- Replaces the scattered metadata that currently sits in different spots

**4. Action Bar (consolidated)**
- "Discuss in Oracle", "Inscribe on IPFS", "Verify Integrity" grouped as a row of action buttons
- Cleaner than current scattered placement
- IPFS status shown inline when already inscribed

**5. Content Section (kept, moved down)**
- Human/Machine toggle and content view stays the same
- Positioned lower — profile identity comes first, content is "what this entity contains"

**6. Discussion Thread (always visible)**
- Comments section shown expanded by default (no toggle needed)
- Positioned at the bottom like a social feed
- Comment input always visible

### Files to Modify

- **`src/modules/oracle/pages/ResolvePage.tsx`** — Restructure the result block (lines ~1326–1784) into the profile layout described above. Consolidate scattered elements into organized sections.
- **`src/modules/oracle/components/AddressCommunity.tsx`** — Update to show comments expanded by default, remove the collapsible toggle, and accept a `prominent` prop for the header-level stats display.

### What Gets Removed
- The "Address" label at the top (replaced by profile header)
- Scattered metadata placement (consolidated into Identity Card)
- Comments toggle chevron (always expanded now)
- Redundant spacing between sections

### Design Principles
- Every address looks like visiting someone's profile on a social network
- The glyph avatar + triword name creates instant recognition
- Social signals (visitors, reactions) are the first thing you see after the name
- Technical identity (CID, IPv6) is present but secondary — in a card, not scattered
- Content is "what this entity is about" — like a bio section
- Discussion is natural — like a comment section on any social post

